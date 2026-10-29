import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@clerk/nextjs/server";
import { isInsufficient, withCharge } from "@/lib/billing/ledger";
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

// Forced tool for the PAID pack — guaranteed-parseable output, so the
// generate-failed → credit-refund path can't trigger on JSON scraping.
const EMIT_PREP_TOOL = {
  name: "emit_interview_prep",
  description: "Return the complete interview-prep pack.",
  input_schema: {
    type: "object" as const,
    properties: {
      questions: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            question: { type: "string" as const },
            starAnswer: { type: "string" as const },
          },
          required: ["question", "starAnswer"],
        },
      },
      pitch: { type: "string" as const },
    },
    required: ["questions", "pitch"],
  },
};

async function generate(opts: { cvText: string; role: string; jobText?: string; full: boolean }) {
  if (opts.full) {
    const response = await anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 4000,
      system: INTERVIEW_SYSTEM_PROMPT,
      tools: [EMIT_PREP_TOOL],
      tool_choice: { type: "tool", name: "emit_interview_prep" },
      messages: [{ role: "user", content: buildInterviewPrompt(opts) }],
    });
    const toolUse = response.content.find((c) => c.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") return null;
    return toolUse.input as { questions?: unknown; pitch?: unknown };
  }
  // Free preview stays on the cheap plain-text call (trivial payload).
  const response = await anthropic.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 500,
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
    // Reserve-then-work: charged before the model call, refunded if it fails.
    let result: Awaited<ReturnType<typeof generate>> = null;
    try {
      ({ result } = await withCharge({ userId, reason: "interview_prep", key: `interview-prep:${crypto.randomUUID()}` }, () => generate({ cvText, role, jobText, full: true })));
    } catch (err) {
      if (isInsufficient(err)) {
        return NextResponse.json({ error: "Insufficient credits", code: "INSUFFICIENT_CREDITS" }, { status: 402 });
      }
      console.error("[interview-prep] unlock failed:", err);
      return NextResponse.json({ error: "Couldn't generate — your credit was not charged. Try again." }, { status: 502 });
    }
    if (!result) {
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
