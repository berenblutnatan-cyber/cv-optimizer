import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { isStatus } from "@/lib/applications";

export const dynamic = "force-dynamic";

// PATCH /api/applications/:id — update fields / move status (ownership-checked).
export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.jobApplication.findUnique({
    where: { id },
    select: { id: true, userId: true, appliedAt: true },
  });
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (typeof body.company === "string") data.company = body.company.trim().slice(0, 200);
  if (typeof body.title === "string") data.title = body.title.trim().slice(0, 200);
  if ("url" in body) data.url = body.url ? String(body.url).slice(0, 2000) : null;
  if ("location" in body) data.location = body.location ? String(body.location).slice(0, 200) : null;
  if ("salary" in body) data.salary = body.salary ? String(body.salary).slice(0, 100) : null;
  if ("notes" in body) data.notes = body.notes ? String(body.notes).slice(0, 4000) : null;
  if (isStatus(body.status)) {
    data.status = body.status;
    // Stamp appliedAt the first time it moves to APPLIED.
    if (body.status === "APPLIED" && !existing.appliedAt) data.appliedAt = new Date();
  }

  const application = await prisma.jobApplication.update({ where: { id }, data });
  return NextResponse.json({ application });
}

// DELETE /api/applications/:id
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.jobApplication.findUnique({ where: { id }, select: { userId: true } });
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await prisma.jobApplication.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
