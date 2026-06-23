import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MAX_MESSAGES = 200;
const MAX_CONTENT = 24_000;

type IncomingMessage = {
  role?: string;
  content?: string;
  display?: string | null;
  tools?: unknown;
};

function cleanMessages(raw: unknown): { role: string; content: string; display: string | null; tools: unknown }[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (m): m is IncomingMessage =>
        !!m &&
        ((m as IncomingMessage).role === "user" || (m as IncomingMessage).role === "assistant") &&
        typeof (m as IncomingMessage).content === "string"
    )
    .slice(0, MAX_MESSAGES)
    .map((m) => ({
      role: m.role as string,
      content: (m.content as string).slice(0, MAX_CONTENT),
      display: m.display ? String(m.display).slice(0, 500) : null,
      tools: m.tools,
    }));
}

// GET /api/chats/[id] — load one owned chat (transcript + CV snapshot).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const session = await prisma.chatSession.findFirst({
    where: { id, userId },
    select: {
      id: true,
      title: true,
      resume: true,
      updatedAt: true,
      messages: {
        orderBy: { position: "asc" },
        select: { id: true, role: true, content: true, display: true, tools: true },
      },
    },
  });
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ chat: session });
}

// PUT /api/chats/[id] — replace transcript + CV snapshot for an owned chat.
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const owned = await prisma.chatSession.findFirst({ where: { id, userId }, select: { id: true } });
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: { messages?: unknown; resume?: unknown; title?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const messages = cleanMessages(body.messages);

  await prisma.$transaction([
    prisma.chatMessage.deleteMany({ where: { sessionId: id } }),
    prisma.chatMessage.createMany({
      data: messages.map((m, i) => ({
        sessionId: id,
        role: m.role,
        content: m.content,
        display: m.display,
        tools: (m.tools ?? Prisma.DbNull) as Prisma.InputJsonValue,
        position: i,
      })),
    }),
    prisma.chatSession.update({
      where: { id },
      data: {
        resume: (body.resume ?? Prisma.DbNull) as Prisma.InputJsonValue,
        ...(body.title?.trim() ? { title: body.title.trim().slice(0, 60) } : {}),
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}

// DELETE /api/chats/[id] — delete an owned chat (messages cascade).
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const owned = await prisma.chatSession.findFirst({ where: { id, userId }, select: { id: true } });
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.chatSession.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
