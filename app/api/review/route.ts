import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@clerk/nextjs/server";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";
import {
  EMIT_REVIEW_TOOL,
  REVIEW_SYSTEM_PROMPT,
  REVIEW_TOOL_NAME,
  buildReviewPrompt,
} from "@/lib/review/prompt";
import { reviewFromModel, mergeReviewBlocks } from "@/lib/review/fromModel";
import type { ReviewResponse } from "@/lib/review/types";
import type { ResumeData } from "@/types/resume";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Opus on a full CV runs well past Vercel's default timeout.
export const maxDuration = 60;
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Public on purpose: the diagnosis IS the hook — someone who just uploaded a
// CV has to see what's wrong with it before they'll sign up or pay. No credit
// is charged here; the spend gate sits on APPLYING AI rewrites and on export,
// matching StudioBuilder's existing deterministic-free / AI-gated split.
const HOURLY_CAP_USER = 30;
const HOURLY_CAP_ANON = 10;

/** Minimal structural guard — the body is client-supplied. */
function asResumeData(v: unknown): ResumeData | null {
  if (!v || typeof v !== "object") return null;
  const d = v as Partial<ResumeData>;
  if (!Array.isArray(d.experience) || !Array.isArray(d.education) || !Array.isArray(d.skills)) {
    return null;
  }
  return {
    personalInfo: (d.personalInfo ?? {}) as ResumeData["personalInfo"],
    summary: typeof d.summary === "string" ? d.summary : "",
    experience: d.experience,
    education: d.education,
    skills: d.skills,
    projects: Array.isArray(d.projects) ? d.projects : [],
    certifications: Array.isArray(d.certifications) ? d.certifications : [],
    languages: Array.isArray(d.languages) ? d.languages : [],
    customSections: Array.isArray(d.customSections) ? d.customSections : [],
  };
}

/** Is there enough here to review honestly? */
function hasReviewableContent(cv: ResumeData): boolean {
  const bullets = cv.experience.reduce((n, e) => n + e.description.length, 0);
  return cv.experience.length > 0 || bullets > 0 || cv.summary.trim().length > 40;
}

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json<ReviewResponse>(
      { success: false, error: "Service temporarily unavailable." },
      { status: 503 }
    );
  }

  try {
    const { userId } = await auth();

    const rl = await checkRateLimit({
      name: "review",
      id: userId ?? `ip:${clientIp(request)}`,
      limit: userId ? HOURLY_CAP_USER : HOURLY_CAP_ANON,
      windowSeconds: 60 * 60,
    });
    if (!rl.ok) {
      return NextResponse.json<ReviewResponse>(
        {
          success: false,
          error: "You've run a lot of reviews this hour — give it a few minutes.",
          code: "RATE_LIMITED",
        },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const resumeData = asResumeData(body?.resumeData);
    if (!resumeData) {
      return NextResponse.json<ReviewResponse>(
        { success: false, error: "No CV supplied." },
        { status: 400 }
      );
    }
    if (!hasReviewableContent(resumeData)) {
      return NextResponse.json<ReviewResponse>(
        {
          success: false,
          error: "There isn't enough on this CV to review yet — add a role or two first.",
          code: "TOO_EMPTY",
        },
        { status: 400 }
      );
    }

    const jobTitle = typeof body?.jobTitle === "string" ? body.jobTitle.slice(0, 200) : undefined;
    const jobDescription =
      typeof body?.jobDescription === "string" ? body.jobDescription.slice(0, 8000) : undefined;
    const rawOverflow = Number(body?.overflowLines);
    const overflowLines =
      Number.isFinite(rawOverflow) && rawOverflow > 0 ? Math.min(60, Math.round(rawOverflow)) : undefined;

    const response = await anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 8000,
      system: REVIEW_SYSTEM_PROMPT,
      tools: [EMIT_REVIEW_TOOL],
      // Forced tool use: the model cannot answer in prose, so there is no
      // JSON to extract and nothing to coerce.
      tool_choice: { type: "tool", name: REVIEW_TOOL_NAME },
      messages: [
        {
          role: "user",
          content: buildReviewPrompt({ resumeData, jobTitle, jobDescription, overflowLines }),
        },
      ],
    });

    // ALL emit_review blocks, not just the first: the model routinely splits
    // this schema across several tool calls, and the verdicts array often
    // lands in the last one.
    const blocks = response.content
      .filter((c) => c.type === "tool_use" && c.name === REVIEW_TOOL_NAME)
      .map((c) => (c as { input: Record<string, unknown> }).input);

    if (blocks.length === 0) {
      return NextResponse.json<ReviewResponse>(
        { success: false, error: "The review didn't come back — try again." },
        { status: 502 }
      );
    }

    // Every index the model produced is validated against the real CV here.
    const { review, stats } = reviewFromModel(resumeData, mergeReviewBlocks(blocks), {
      overflowLines,
    });

    if (stats.droppedUnresolved > 0 || stats.droppedSacred > 0) {
      // Not user-facing, but worth seeing in logs: a model that keeps missing
      // targets is a prompt problem, and silence would hide it.
      console.warn(
        `[review] dropped ${stats.droppedUnresolved} unresolved, ${stats.droppedSacred} sacred, ` +
          `${stats.droppedWouldEmpty} would-empty, ${stats.droppedNoReplacement} no-replacement ` +
          `of ${stats.received} verdicts`
      );
    }

    return NextResponse.json<ReviewResponse>({ success: true, review });
  } catch (err) {
    console.error("[review] failed:", err);
    return NextResponse.json<ReviewResponse>(
      { success: false, error: "Couldn't review your CV just now — try again." },
      { status: 500 }
    );
  }
}
