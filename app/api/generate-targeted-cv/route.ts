import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { awardXp } from "@/lib/gamification";
import {
  buildRolePrompt,
  normalizeRoleCard,
  type GeneratedCardOutput,
} from "@/lib/multiRole";
import { extractBalancedJson } from "@/lib/extractJson";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_ROLES = 5;
const DAILY_CEILING = 10; // see plan section J — soft guard against runaway spend

async function generateOne(role: string, baseCvText: string): Promise<GeneratedCardOutput> {
  const prompt = buildRolePrompt({ role, baseCvText });
  const response = await anthropic.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 3500,
    system:
      "You rewrite resumes for a target role. Use only facts in the source. Return strict JSON only — no prose, no markdown, no backticks.",
    messages: [{ role: "user", content: prompt }],
  });
  const content = response.content[0]?.type === "text" ? response.content[0].text : "";
  const jsonText = extractBalancedJson(content);
  if (!jsonText) throw new Error("No JSON in response");
  const parsed = JSON.parse(jsonText);
  return normalizeRoleCard(role, parsed);
}

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Missing ANTHROPIC_API_KEY" }, { status: 500 });
  }
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { baseCvText?: string; roles?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const baseCvText = String(body.baseCvText ?? "").trim();
  const roles = (body.roles ?? [])
    .filter((r) => typeof r === "string" && r.trim())
    .map((r) => r.trim())
    .slice(0, MAX_ROLES);

  if (!baseCvText) {
    return NextResponse.json({ error: "baseCvText is required" }, { status: 400 });
  }
  if (roles.length === 0) {
    return NextResponse.json({ error: "At least one role is required" }, { status: 400 });
  }

  // Daily ceiling: rough but adequate. Counts generations in last 24h.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const todayCount = await prisma.generatedResume.count({
    where: { userId, createdAt: { gte: since } },
  });
  if (todayCount + roles.length > DAILY_CEILING) {
    return NextResponse.json(
      { error: "Daily generation cap reached. Try again tomorrow.", code: "DAILY_CAP" },
      { status: 429 }
    );
  }

  // Run all role rewrites in parallel and persist as we go. The first
  // resolved row (lowest createdAt) is auto-unlocked; the rest are blurred
  // and require a credit spend to unlock individually.
  const results = await Promise.allSettled(
    roles.map(async (role) => generateOne(role, baseCvText))
  );

  const created: Array<{
    id: string;
    role: string;
    score: number | null;
    unlocked: boolean;
    content: GeneratedCardOutput["resumeData"];
    error: string | null;
  }> = [];

  let alreadyUnlockedOne = false;
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const role = roles[i];
    if (r.status === "fulfilled") {
      const row = await prisma.generatedResume.create({
        data: {
          userId,
          role,
          content: r.value.resumeData,
          score: r.value.score,
          unlocked: !alreadyUnlockedOne,
          error: null,
        },
        select: { id: true, role: true, score: true, unlocked: true, content: true, error: true },
      });
      if (!alreadyUnlockedOne) alreadyUnlockedOne = true;
      created.push(row as (typeof created)[number]);
    } else {
      const message = r.reason instanceof Error ? r.reason.message : "unknown";
      const row = await prisma.generatedResume.create({
        data: {
          userId,
          role,
          content: {},
          score: null,
          unlocked: false,
          error: message.slice(0, 240),
        },
        select: { id: true, role: true, score: true, unlocked: true, content: true, error: true },
      });
      created.push(row as (typeof created)[number]);
    }
  }

  // XP outside the persistence — best-effort.
  const successCount = created.filter((c) => c.error === null).length;
  if (successCount > 0) {
    await awardXp(userId, "generate_role", successCount).catch(() => null);
  }

  return NextResponse.json({ ok: true, cards: created });
}
