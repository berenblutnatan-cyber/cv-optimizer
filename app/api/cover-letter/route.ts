import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@clerk/nextjs/server";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";
import { buildCoverLetterPrompt, COVER_LETTER_SYSTEM_PROMPT } from "@/lib/coverLetterPrompt";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Opus calls can exceed Vercel's default function timeout; give headroom
// so the route returns a result instead of a mid-flight 504.
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export const runtime = "nodejs";

// Stays public: anonymous users can generate a cover letter from the public
// /results page (only the PDF download requires sign-in). Spend is bounded by
// a KV rate limit (per user when signed in, per IP otherwise) and input caps.
const HOURLY_CAP = 10;
const MAX_CV_LENGTH = 30_000;
const MAX_JD_LENGTH = 30_000;

export async function POST(request: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "Missing required environment variable: ANTHROPIC_API_KEY" },
        { status: 500 }
      );
    }

    const { userId } = await auth();
    const rl = await checkRateLimit({
      name: "cover-letter",
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

    const body = await request.json().catch(() => null);
    const cvText = (body?.cvText as string | undefined) ?? "";
    const jobDescription = (body?.jobDescription as string | undefined) ?? "";
    const jobTitle = ((body?.jobTitle as string | undefined) ?? "").slice(0, 200);
    const companyName = ((body?.companyName as string | undefined) ?? "").slice(0, 200);

    if (!cvText.trim()) return NextResponse.json({ error: "Missing cvText" }, { status: 400 });
    if (cvText.length > MAX_CV_LENGTH) {
      return NextResponse.json({ error: "CV text is too long" }, { status: 400 });
    }
    if (jobDescription.length > MAX_JD_LENGTH) {
      return NextResponse.json({ error: "Job description is too long" }, { status: 400 });
    }

    // Either job description OR job title is required (not both)
    if (!jobDescription.trim() && !jobTitle.trim()) {
      return NextResponse.json({ error: "Please provide either a job title or job description" }, { status: 400 });
    }

    const { prompt } = buildCoverLetterPrompt({ cvText, jobTitle, jobDescription, companyName });

    const response = await anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 2048,
      system: COVER_LETTER_SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
    });

    const coverLetter = response.content[0].type === "text" ? response.content[0].text.trim() : "";
    if (!coverLetter) {
      return NextResponse.json({ error: "Empty cover letter result" }, { status: 500 });
    }

    return NextResponse.json({ success: true, coverLetter });
  } catch (error) {
    console.error("Cover letter error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Cover letter failed" },
      { status: 500 }
    );
  }
}
