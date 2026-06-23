import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@clerk/nextjs/server";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";
import { buildOptimizerPrompt, OPTIMIZER_SYSTEM_PROMPT } from "@/lib/optimizer/prompt";
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

type DeepImprovement = { id: string; text: string; scoreImpact: number; category: "ats" | "impact" | "clarity" };

function cleanJson(text: string): string {
  return text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
}

function goalEmphasis(goal?: GoalWeighting): string {
  if (goal === "ats")
    return "\nEMPHASIS: weight ATS keyword coverage, standard sections, and skills alignment most heavily.";
  if (goal === "recruiter")
    return "\nEMPHASIS: weight recruiter-facing impact, quantified achievements, and clarity most heavily.";
  return "";
}

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

    if (!resumeData || typeof resumeData !== "object" || !Array.isArray(resumeData.experience)) {
      return NextResponse.json({ error: "Missing resume data." }, { status: 400 });
    }

    const cvText = resumeToText(resumeData);
    if (cvText.trim().length < 40) {
      return NextResponse.json({ error: "Add more to your CV before running a full check." }, { status: 400 });
    }

    // Reuse the EXACT optimizer rubric (no scoring drift vs /api/analyze), then
    // override the output to diagnosis-only — no CV rewrite, so it stays cheap.
    const { analysisPrompt } = buildOptimizerPrompt({
      cvText,
      jobTitle,
      jobDescription: jobText,
      mode: jobText || jobTitle ? "specific_role" : "quick",
    });

    const diagnosisPrompt = `${analysisPrompt}

════════════════════════════════════════════════════════════════════════════════
DIAGNOSIS-ONLY OUTPUT (OVERRIDE — ignore the OUTPUT FORMAT / optimizedCV section above)
════════════════════════════════════════════════════════════════════════════════
Do NOT rewrite or output the CV. Return ONLY this JSON object and nothing else:
{
  "overallScore": <0-100 from PHASE 1 scoring>,
  "summary": "<2 sentences: strongest matching area, then the single most critical gap. Max 40 words.>",
  "strengths": ["<specific>", "<specific>", "<specific>"],
  "improvements": [
    { "text": "<specific gap + why it matters for this role>", "scoreImpact": <integer 1-15>, "category": "ats" | "impact" | "clarity" }
  ],
  "missingKeySkills": ["<critical gap>", "..."]
}
Return 5-8 improvements sorted by scoreImpact DESCENDING. Max 5 missing skills.${goalEmphasis(goal)}
Return ONLY the JSON object.`;

    const response = await anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 2000,
      system: OPTIMIZER_SYSTEM_PROMPT,
      messages: [{ role: "user", content: diagnosisPrompt }],
    });

    const content = response.content[0]?.type === "text" ? response.content[0].text : "";
    let parsed: Record<string, unknown> = {};
    try {
      const match = cleanJson(content).match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
    } catch {
      return NextResponse.json({ error: "Couldn't analyze right now — try again." }, { status: 502 });
    }

    const rawImprovements = Array.isArray(parsed.improvements) ? parsed.improvements : [];
    const improvements: DeepImprovement[] = rawImprovements
      .map((it, i): DeepImprovement | null => {
        const obj = it as Record<string, unknown>;
        const text = typeof obj.text === "string" ? obj.text : "";
        if (!text) return null;
        const cat = obj.category === "impact" || obj.category === "clarity" ? obj.category : "ats";
        const impact = Math.max(1, Math.min(15, Math.round(Number(obj.scoreImpact) || 5)));
        return { id: `deep:${i}`, text, scoreImpact: impact, category: cat };
      })
      .filter((x): x is DeepImprovement => x !== null);

    const overallScore = Math.max(0, Math.min(100, Math.round(Number(parsed.overallScore) || 0)));
    const strengths = Array.isArray(parsed.strengths)
      ? (parsed.strengths as unknown[]).map((s) => String(s)).filter(Boolean).slice(0, 4)
      : [];
    const missingKeySkills = Array.isArray(parsed.missingKeySkills)
      ? (parsed.missingKeySkills as unknown[]).map((s) => String(s)).filter(Boolean).slice(0, 5)
      : [];
    const summary = typeof parsed.summary === "string" ? parsed.summary.slice(0, 280) : "";

    return NextResponse.json({ overallScore, summary, strengths, improvements, missingKeySkills });
  } catch (error) {
    console.error("score-deep error:", error);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
