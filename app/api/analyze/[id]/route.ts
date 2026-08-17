// Read-back + review-state persistence for a saved analysis.
//
// GET   — the full stored payload (raw DeepAnalysis) for /results/[id].
// PATCH — merge review state (suggestion applied/dismissed map) into raw so a
//         refresh restores exactly where the user left off.
//
// Auth-scoped to the owning user; analyses are never shared.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const analysis = await prisma.analysis.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      jobTitle: true,
      overallScore: true,
      optimizedScore: true,
      raw: true,
      createdAt: true,
    },
  });
  if (!analysis || analysis.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: analysis.id,
    jobTitle: analysis.jobTitle,
    overallScore: analysis.overallScore,
    optimizedScore: analysis.optimizedScore,
    raw: analysis.raw,
    createdAt: analysis.createdAt,
  });
}

type SuggestionState = Record<string, "applied" | "dismissed">;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const rawState = body?.suggestionState;
  if (!rawState || typeof rawState !== "object" || Array.isArray(rawState)) {
    return NextResponse.json({ error: "Missing suggestionState" }, { status: 400 });
  }
  // Validate: id → "applied" | "dismissed" only, bounded size.
  const suggestionState: SuggestionState = {};
  for (const [key, value] of Object.entries(rawState as Record<string, unknown>).slice(0, 100)) {
    if (value === "applied" || value === "dismissed") suggestionState[String(key).slice(0, 60)] = value;
  }

  const analysis = await prisma.analysis.findUnique({
    where: { id },
    select: { userId: true, raw: true },
  });
  if (!analysis || analysis.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const raw = (analysis.raw ?? {}) as Record<string, unknown>;
  await prisma.analysis.update({
    where: { id },
    data: { raw: { ...raw, suggestionState } as Prisma.InputJsonValue },
  });

  return NextResponse.json({ ok: true });
}
