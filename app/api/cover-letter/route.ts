import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@clerk/nextjs/server";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const runtime = "nodejs";

// Stays public: anonymous users can generate a cover letter from the public
// /results page (only the PDF download requires sign-in). Spend is bounded by
// a KV rate limit (per user when signed in, per IP otherwise) and input caps.
const HOURLY_CAP = 10;
const MAX_CV_LENGTH = 30_000;
const MAX_JD_LENGTH = 30_000;

function cleanTitle(raw: string) {
  return raw
    .replace(/[*_`~]/g, "") // strip markdown emphasis
    .replace(/\s+/g, " ")
    .trim();
}

function inferJobTitleFromDescription(desc: string, companyName: string) {
  const lines = desc.replace(/\r\n/g, "\n").split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return "";
  let first = lines[0];
  if (companyName) {
    const re = new RegExp(companyName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "ig");
    first = first.replace(re, "").trim();
  }
  first = first.replace(/^the job posting for (the )?(position|role)\s*(of)?/i, "").trim();
  first = first.replace(/^job posting[:\-]?\s*/i, "").trim();
  first = first.replace(/^position[:\-]?\s*/i, "").trim();
  first = first.replace(/^role[:\-]?\s*/i, "").trim();
  first = first.replace(/\s*\|\s*/g, " ").replace(/\s*-\s*/g, " ").trim();
  first = cleanTitle(first);
  if (first.length > 80) first = first.slice(0, 80).trim();
  return first;
}

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
    const hasJobDescription = jobDescription.trim().length > 0;
    const hasJobTitle = jobTitle.trim().length > 0;
    
    if (!hasJobDescription && !hasJobTitle) {
      return NextResponse.json({ error: "Please provide either a job title or job description" }, { status: 400 });
    }

    const effectiveJobTitle =
      cleanTitle(jobTitle).trim() || inferJobTitleFromDescription(jobDescription, companyName) || "Role";
    
    const effectiveCompany = companyName.trim() || "Target Company";

    // Build dynamic prompt based on available information
    const jobContextSection = hasJobDescription 
      ? `Job description:\n${jobDescription}`
      : `[No job description provided. Create a cover letter targeting the "${effectiveJobTitle}" role, using typical responsibilities and requirements for this position.]`;

    const companySection = companyName.trim()
      ? `Company:\n${effectiveCompany}`
      : `[Company name not specified. Keep company references generic but professional.]`;

    const prompt = `Create an EXCEPTIONAL, personalized cover letter that makes the recruiter excited to interview this candidate.

═══════════════════════════════════════════════════════════════
STRUCTURE (Exactly 4 paragraphs, 250-350 words total)
═══════════════════════════════════════════════════════════════

**PARAGRAPH 1 - OPENING (Hook the reader immediately)**
- Open with genuine enthusiasm for THIS specific role at THIS company
- Mention how you found the position (or a compelling reason for interest)
- One powerful sentence on why you're a strong fit
- Make them want to keep reading!

**PARAGRAPH 2 - YOUR VALUE (Prove your worth)**
- 2-3 most relevant achievements that DIRECTLY match job requirements
- Use SPECIFIC metrics and results (%, $, numbers from the CV)
- Connect each achievement to what THEY need
- Show, don't tell - concrete examples, not adjectives

**PARAGRAPH 3 - WHY THIS COMPANY (Show you did your research)**
${companyName.trim() ? `- Demonstrate knowledge of ${effectiveCompany} (their mission, products, recent news, challenges)
- Explain why you want to work at ${effectiveCompany} specifically
- What unique value YOU will bring to THEIR team
- This paragraph should be IMPOSSIBLE to reuse for another company` : `- Show understanding of what companies in this space typically value
- Explain why this role excites you specifically
- What unique value you bring based on your background`}

**PARAGRAPH 4 - CLOSING (Confident call to action)**
- Express genuine enthusiasm and confidence (not desperation)
- Clear call to action - request an interview/discussion
- Professional sign-off

═══════════════════════════════════════════════════════════════
TONE & STYLE REQUIREMENTS
═══════════════════════════════════════════════════════════════
✅ Professional but conversational and engaging
✅ Confident without being arrogant
✅ Show personality while maintaining professionalism
✅ Mirror language from the job description naturally
✅ Sound like a REAL HUMAN wrote this, not AI
✅ Every sentence must add value - no filler

❌ AVOID THESE CLICHÉS (instant rejection triggers):
- "I'm a team player" / "hard worker" / "passionate about..."
- "I believe I would be a great fit" / "I am confident that..."
- "fast-paced environment" / "synergy" / "leverage"
- "I am writing to express my interest" / "To whom it may concern"
- Generic statements that could apply to any job
- Desperate language ("I really need this job", "please consider me")

═══════════════════════════════════════════════════════════════
QUALITY CHECKLIST (Verify before returning)
═══════════════════════════════════════════════════════════════
□ Highly personalized to ${effectiveJobTitle} at ${effectiveCompany}
□ Contains 2-3 specific achievements with metrics from the CV
□ Shows genuine research/knowledge about the company
□ Could NOT be used for any other job application
□ 250-350 words (concise but impactful)
□ Reads naturally, like written by an intelligent human
□ Makes the recruiter WANT to interview this person

═══════════════════════════════════════════════════════════════
INPUTS
═══════════════════════════════════════════════════════════════

**Role:** ${effectiveJobTitle}

**Company:** ${effectiveCompany}

**Job Requirements:**
${hasJobDescription ? jobDescription : "[No description provided - use typical requirements for this role]"}

**Candidate's CV:**
${cvText}

═══════════════════════════════════════════════════════════════
OUTPUT
═══════════════════════════════════════════════════════════════
Return ONLY the cover letter text, ready to send. No headers, no explanations, just the letter.
Start with "Dear Hiring Manager," or "Dear [Company] Team," if appropriate.`;

    const response = await anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 2048,
      system: "You are an expert cover letter writer who creates personalized, compelling letters that get interviews. Your letters are: 1) Highly specific to the role and company, 2) Full of concrete achievements with metrics, 3) Show genuine company research, 4) Sound authentically human, 5) 250-350 words, 4 paragraphs. Never use clichés like 'team player', 'passionate', or 'I believe I would be a great fit'. Every letter should be impossible to reuse for another application.",
      messages: [{ role: "user", content: prompt }],
    });

    const coverLetter = response.content[0].type === 'text' ? response.content[0].text.trim() : "";
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
