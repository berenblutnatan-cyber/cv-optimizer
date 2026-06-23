import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { isUnlimited } from "@/lib/subscription";
import { awardXp } from "@/lib/gamification";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";
import { extractBalancedJson } from "@/lib/extractJson";
import { resumeToText, type ResumeData } from "@/types/resume";
import { buildInterviewPrompt, INTERVIEW_SYSTEM_PROMPT, type InterviewQuestion } from "@/lib/interviewPrep";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const maxDuration = 60;
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const HOURLY_CAP = 15;

async function generate(opts: { cvText: string; role: string; jobText?: string; full: boolean }) {
  const response = await anthropic.messages.create({
    model: "claude-opus-4-8",
    max_tokens: opts.full ? 2500 : 500,
    system: INTERVIEW_SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildInterviewPrompt(opts) }],
  });
  const content = response.content[0]?.type === "text" ? response.content[0].text : "";
  const json = extractBalancedJson(content);
  if (!json) return null;
  try {
    return JSON.parse(json) as { questions?: unknown; pitch?: unknown };
  } catch {
    return null;
  }
}

function normalizeQuestions(raw: unknown, full: boolean): InterviewQuestion[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((q): InterviewQuestion | null => {
      const obj = q as Record<string, unknown>;
      const question = typeof obj.question === "string" ? obj.question.trim() : "";
      if (!question) return null;
      // Free tier: never leak STAR answers into the payload.
      if (!full) return { question };
      const starAnswer = typeof obj.starAnswer === "string" ? obj.starAnswer.trim() : undefined;
      return { question, starAnswer };
    })
    .filter((q): q is InterviewQuestion => q !== null);
}

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Service temporarily unavailable." }, { status: 503 });
  }

  const { userId } = await auth();
  const body = await request.json().catch(() => ({}));
  const resumeData = body?.resumeData as ResumeData | undefined;
  const cvTextInput = typeof body?.cvText === "string" ? body.cvText : "";
  const cvText = (resumeData && Array.isArray(resumeData.experience) ? resumeToText(resumeData) : cvTextInput).slice(0, 8000);
  const role = String(body?.role ?? "").slice(0, 120);
  const jobText = typeof body?.jobText === "string" ? body.jobText.slice(0, 6000) : "";
  const unlock = body?.unlock === true;

  if (cvText.trim().length < 40) {
    return NextResponse.json({ error: "Add more to your CV before generating interview prep." }, { status: 400 });
  }

  // ── Paid unlock: full STAR answers + pitch. Auth + 1 credit (subscribers bypass). ──
  if (unlock) {
    if (!userId) {
      return NextResponse.json({ error: "Sign in to unlock full prep", code: "AUTH_REQUIRED" }, { status: 401 });
    }
    const unlimited = await isUnlimited(userId);
    try {
      await prisma.$transaction(async (tx) => {
        if (!unlimited) {
          const user = await tx.user.findUnique({ where: { id: userId }, select: { credits: true } });
          if (!user || user.credits <= 0) throw new Error("INSUFFICIENT_CREDITS");
          await tx.user.update({ where: { id: userId }, data: { credits: { decrement: 1 } } });
        }
      });
    } catch (err) {
      if (err instanceof Error && err.message === "INSUFFICIENT_CREDITS") {
        return NextResponse.json({ error: "Insufficient credits", code: "INSUFFICIENT_CREDITS" }, { status: 402 });
      }
      console.error("[interview-prep] credit tx failed:", err);
      return NextResponse.json({ error: "Failed to unlock" }, { status: 500 });
    }

    const result = await generate({ cvText, role, jobText, full: true });
    if (!result) {
      // The credit was spent but generation failed — refund it.
      await prisma.user.update({ where: { id: userId }, data: { credits: { increment: 1 } } }).catch(() => null);
      return NextResponse.json({ error: "Couldn't generate — your credit was not charged. Try again." }, { status: 502 });
    }
    await awardXp(userId, "unlock").catch(() => null);
    return NextResponse.json({
      questions: normalizeQuestions(result.questions, true),
      pitch: typeof result.pitch === "string" ? result.pitch : undefined,
      locked: false,
    });
  }

  // ── Free preview: 3 questions, NO answers in the payload. Rate-limited. ──
  const rl = await checkRateLimit({
    name: "interview-prep",
    id: userId ?? `ip:${clientIp(request)}`,
    limit: HOURLY_CAP,
    windowSeconds: 60 * 60,
  });
  if (!rl.ok) {
    return NextResponse.json({ error: `Limit reached (${HOURLY_CAP}/hour). Try again soon.` }, { status: 429 });
  }

  const result = await generate({ cvText, role, jobText, full: false });
  if (!result) {
    return NextResponse.json({ error: "Couldn't generate — try again." }, { status: 502 });
  }
  return NextResponse.json({
    questions: normalizeQuestions(result.questions, false).slice(0, 3),
    locked: true,
  });
}
