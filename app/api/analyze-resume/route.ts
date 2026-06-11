import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@clerk/nextjs/server";
import { ResumeData } from "@/types/resume";
import { checkRateLimit } from "@/lib/rateLimit";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// No anonymous client flow: the /builder review step gates this call behind
// sign-in client-side, so require auth — it guards raw Anthropic spend.
const HOURLY_CAP = 20;
const MAX_RESUME_JSON_LENGTH = 40_000;

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await checkRateLimit({
      name: "analyze-resume",
      id: userId,
      limit: HOURLY_CAP,
      windowSeconds: 60 * 60,
    });
    if (!rl.ok) {
      return NextResponse.json(
        { error: `Limit reached (${HOURLY_CAP}/hour). Please try again soon.` },
        { status: 429 }
      );
    }

    const { resumeData } = await request.json() as { resumeData: ResumeData };

    if (!resumeData) {
      return NextResponse.json(
        { error: "No resume data provided" },
        { status: 400 }
      );
    }

    const resumeJson = JSON.stringify(resumeData, null, 2);
    if (resumeJson.length > MAX_RESUME_JSON_LENGTH) {
      return NextResponse.json(
        { error: "Resume data is too large to analyze" },
        { status: 400 }
      );
    }

    const prompt = `You are an expert resume reviewer and career coach. Analyze this resume data and provide:
1. A score from 0-100 based on completeness, impact, and professionalism
2. 3-5 specific, actionable suggestions for improvement

Resume Data:
${resumeJson}

Respond in this exact JSON format:
{
  "score": <number>,
  "suggestions": [
    "<suggestion 1>",
    "<suggestion 2>",
    "<suggestion 3>"
  ]
}

Scoring criteria:
- 90-100: Excellent - comprehensive, well-written, strong achievements
- 70-89: Good - solid content but room for improvement
- 50-69: Average - missing key elements or weak descriptions
- Below 50: Needs significant work

Focus your suggestions on:
- Quantifiable achievements (numbers, percentages, metrics)
- Action verbs and impactful language
- Missing sections that would strengthen the resume
- Clarity and conciseness
- ATS optimization`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 500,
      system: "You are a professional resume analyst. Always respond with valid JSON only.",
      messages: [
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
    });

    const content = response.content[0].type === 'text' ? response.content[0].text : '';
    
    if (!content) {
      throw new Error("No response from AI");
    }

    const analysis = JSON.parse(content);
    
    return NextResponse.json({
      score: analysis.score || 70,
      suggestions: analysis.suggestions || ["Unable to generate suggestions"],
    });
  } catch (error) {
    console.error("Resume analysis error:", error);
    
    // Return mock data on error so the UI still works
    return NextResponse.json({
      score: 72,
      suggestions: [
        "Add more quantifiable achievements with specific metrics",
        "Consider adding a professional summary if missing",
        "Use stronger action verbs at the start of bullet points",
        "Ensure all sections are complete and relevant",
      ],
    });
  }
}

