import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { FREE_CREDITS_FOR_NEW_USER } from "@/lib/credits";

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

function deriveTitle(
  messages: { role: string; content: string; display: string | null }[],
  fallback?: string
): string {
  if (fallback?.trim()) return fallback.trim().slice(0, 60);
  const firstUser = messages.find((m) => m.role === "user");
  const t = (firstUser?.display || firstUser?.content || "New chat").replace(/\s+/g, " ").trim();
  return (t || "New chat").slice(0, 60);
}

// The ChatSession FK needs a User row. The app calls /api/sync-user at init, so
// it usually exists — but upsert defensively (with the Clerk email) so saving a
// chat never fails on a missing user.
async function ensureUser(userId: string): Promise<void> {
  const existing = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (existing) return;
  const cu = await currentUser();
  const email = cu?.emailAddresses?.[0]?.emailAddress ?? `${userId}@placeholder.local`;
  await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: { id: userId, email, credits: FREE_CREDITS_FOR_NEW_USER },
  });
}

// GET /api/chats — list the signed-in user's saved chats, newest first.
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sessions = await prisma.chatSession.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: 100,
    select: {
      id: true,
      title: true,
      updatedAt: true,
      _count: { select: { messages: true } },
    },
  });
  return NextResponse.json({
    chats: sessions.map((s) => ({
      id: s.id,
      title: s.title,
      updatedAt: s.updatedAt,
      messageCount: s._count.messages,
    })),
  });
}

// POST /api/chats — create a saved chat from the current transcript + CV.
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { messages?: unknown; resume?: unknown; title?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const messages = cleanMessages(body.messages);
  await ensureUser(userId);

  const session = await prisma.chatSession.create({
    data: {
      userId,
      title: deriveTitle(messages, body.title),
      resume: (body.resume ?? Prisma.DbNull) as Prisma.InputJsonValue,
      messages: {
        create: messages.map((m, i) => ({
          role: m.role,
          content: m.content,
          display: m.display,
          tools: (m.tools ?? Prisma.DbNull) as Prisma.InputJsonValue,
          position: i,
        })),
      },
    },
    select: { id: true, title: true, updatedAt: true },
  });
  return NextResponse.json({ id: session.id, title: session.title, updatedAt: session.updatedAt });
}
