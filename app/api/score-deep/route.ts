import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@clerk/nextjs/server";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";
import { runAuditPass } from "@/lib/optimizer/pipeline";
import { resumeToText, type ResumeData } from "@/types/resume";
import type { GoalWeighting } from "@/lib/optimizer/localChecks";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Opus can exceed Vercel's default timeout — give headroom or it 504s mid-flight.
export const maxDuration = 60;
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// The "Run full check" payoff behind the live local meter. Diagnosis is the
// free/rate-limited hook (per user when signed in, per IP otherwise) — APPLYING
// the AI fixes it surfaces is the paywall (handled client-side in the panel).
const HOURLY_CAP = 15;

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Service temporarily unavailable." }, { status: 503 });
  }

  try {
    const { userId } = await auth();
    const rl = await checkRateLimit({
      name: "score-deep",
      id: userId ?? `ip:${clientIp(request)}`,
      limit: HOURLY_CAP,
      windowSeconds: 60 * 60,
    });
    if (!rl.ok) {
      return NextResponse.json(
        { error: `Limit reached (${HOURLY_CAP}/hour). Please try again soon.` },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const resumeData = body?.resumeData as ResumeData | undefined;
    const jobText = typeof body?.jobText === "string" ? body.jobText.slice(0, 8000) : "";
    const jobTitle = typeof body?.jobTitle === "string" ? body.jobTitle.slice(0, 100) : "";
    const goal = body?.goal as GoalWeighting | undefined;
    void goal; // goal weighting is applied client-side to the merged problem list

    if (!resumeData || typeof resumeData !== "object" || !Array.isArray(resumeData.experience)) {
      return NextResponse.json({ error: "Missing resume data." }, { status: 400 });
    }

    const cvText = resumeToText(resumeData);
    if (cvText.trim().length < 40) {
      return NextResponse.json({ error: "Add more to your CV before running a full check." }, { status: 400 });
    }

    // Pass 1 of the optimizer pipeline — the SAME rubric and audit /api/analyze
    // runs (no scoring drift), with the structured extras (requirement coverage,
    // per-section critiques) included for richer panel rendering.
    const audit = await runAuditPass(anthropic, {
      cvText,
      resumeData,
      jobTitle,
      jobDescription: jobText,
      mode: jobText || jobTitle ? "specific_role" : "quick",
    });

    return NextResponse.json({
      overallScore: audit.originalScore.total,
      summary: audit.summary.slice(0, 280),
      strengths: audit.strengths,
      improvements: audit.improvements.map((imp, i) => ({ ...imp, id: `deep:${i}` })),
      missingKeySkills: audit.missingKeySkills,
      // Rich extras (additive — existing consumers ignore them).
      jdRequirements: audit.jdRequirements,
      coverage: audit.coverage,
      sectionCritiques: audit.sectionCritiques,
    });
  } catch (error) {
    console.error("score-deep error:", error);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
