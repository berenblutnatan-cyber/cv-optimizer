import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const runtime = "nodejs";

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
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Missing required environment variable: OPENAI_API_KEY" },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => null);
    const cvText = (body?.cvText as string | undefined) ?? "";
    const jobDescription = (body?.jobDescription as string | undefined) ?? "";
    const jobTitle = (body?.jobTitle as string | undefined) ?? "";
    const companyName = (body?.companyName as string | undefined) ?? "";

    if (!cvText.trim()) return NextResponse.json({ error: "Missing cvText" }, { status: 400 });
    
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

    const prompt = `I will provide:
1) My CV
2) The target role${hasJobDescription ? " and job description" : ""}
${companyName.trim() ? "3) The company name" : ""}

Your task:
Create a concise, high-impact cover letter tailored specifically to this role${companyName.trim() ? " and company" : ""}.

STRICT REQUIREMENTS:
- Length: 220–300 words MAX (never exceed one page)
- Tone: confident, natural, human, and professional — NOT generic, NOT flowery, NOT robotic
- Style: clear, direct, impact-focused (avoid buzzwords and clichés)
- Voice: first-person, active voice
- Do NOT sound like AI wrote this
- Do NOT over-explain or repeat my CV
- Do NOT use corporate fluff (e.g. "passionate", "synergy", "fast-paced environment")

STRUCTURE:
1. Opening (2–3 sentences)
   - Directly state the role
   - One sharp hook linking my background to ${companyName.trim() ? "the company's mission/product" : "typical requirements for this role"}

2. Core Value (1 short paragraph)
   - 2–3 concrete strengths or achievements from my CV
   - ${hasJobDescription ? "Tie each explicitly to what the job description prioritizes" : "Tie each to what is typically valued for this role"}
   - Focus on outcomes and impact, not responsibilities

3. ${companyName.trim() ? "Company Fit (1 short paragraph)\n   - Why this company specifically (product, market, strategy, culture)\n   - Show understanding of what they do — no generic praise" : "Role Fit (1 short paragraph)\n   - Why this role specifically and how your experience aligns\n   - Show understanding of typical challenges and priorities"}

4. Closing (2 sentences)
   - Clear interest and confidence
   - Polite, professional close (no desperation)

FORMATTING & LOOK:
- Use a clean, professional layout suitable for PDF or email
- Font recommendation: Arial, Calibri, or Times New Roman
- Font size: 10.5–11.5
- Normal margins
- No emojis, no bullet points, no bold inside paragraphs

FINAL CHECK BEFORE RETURNING:
- Read like a real human wrote it in one sitting
- Sounds like someone who understands the role deeply
- Could realistically be sent to a top-tier company

If something in my CV is weak or missing, subtly work around it without calling attention to gaps.

--- INPUTS ---

Role title:
${effectiveJobTitle}

${companySection}

${jobContextSection}

CV:
${cvText}

Return ONLY the cover letter text.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const coverLetter = response.choices[0]?.message?.content?.trim() ?? "";
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
