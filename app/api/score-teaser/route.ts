import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { extractText } from "unpdf";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Clean AI response text - removes markdown code blocks
 */
function cleanJsonResponse(text: string): string {
  return text
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();
}

/**
 * POST /api/score-teaser
 * 
 * Quick resume scoring using the SAME analysis logic as the optimizer,
 * but returning only the score and summary.
 */
export async function POST(request: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY is not configured");
    return NextResponse.json(
      { error: "Service temporarily unavailable. Please try again later." },
      { status: 503 }
    );
  }

  try {
    const formData = await request.formData();
    
    let cvText = formData.get("cvText") as string || "";
    const cvFile = formData.get("cvFile") as File | null;
    const targetRole = formData.get("targetRole") as string || "";

    // Extract text from PDF if file provided
    if (cvFile && !cvText) {
      try {
        const arrayBuffer = await cvFile.arrayBuffer();
        const { text } = await extractText(arrayBuffer);
        cvText = Array.isArray(text) ? text.join("\n") : text;
      } catch (pdfError) {
        console.error("PDF parsing error:", pdfError);
        return NextResponse.json(
          { error: "Failed to read PDF. Please try a different file." },
          { status: 400 }
        );
      }
    }

    if (!cvText || cvText.trim().length < 50) {
      return NextResponse.json(
        { error: "Please provide a valid resume with more content." },
        { status: 400 }
      );
    }

    if (!targetRole || targetRole.trim().length < 2) {
      return NextResponse.json(
        { error: "Please select a target role." },
        { status: 400 }
      );
    }

    // Use the SAME analysis prompt structure as the main optimizer
    // This ensures consistent scoring methodology
    const analysisPrompt = `You are an expert HR consultant analyzing a resume for a specific target role.

## Resume:
${cvText.slice(0, 8000)}

## Target Role:
${targetRole.trim()}

## Your Task:
Analyze how well this resume matches the TARGET ROLE requirements. Consider:

1. **Keyword Coverage**: Does the resume contain keywords, skills, and technologies typically required for "${targetRole}"?
2. **Experience Relevance**: Does the work history show relevant experience for this role?
3. **Seniority Fit**: Does the candidate's experience level match the role expectations?
4. **Clarity & Impact**: Are achievements quantified? Are responsibilities clearly stated?
5. **Missing Must-Haves**: What critical skills/experiences for "${targetRole}" are NOT demonstrated?

SCORING GUIDANCE:
- 85-100: Excellent match - resume strongly demonstrates required skills and experience for ${targetRole}
- 70-84: Good match - most requirements met, minor gaps
- 55-69: Moderate match - some relevant experience but significant gaps for this specific role
- 40-54: Weak match - limited relevant experience for ${targetRole}
- 0-39: Poor match - resume doesn't align with ${targetRole} requirements

The score must be ROLE-SPECIFIC. The same resume should score differently for "Software Engineer" vs "Product Manager" vs "Sales Representative" based on what skills and experience each role requires.

Return ONLY a JSON object with exactly these fields:
{
  "overallScore": <number 0-100 - role-specific match score>,
  "summary": "<one sentence explaining why this score for this specific role, mentioning key matches or gaps>"
}

Return ONLY the JSON object, no markdown, no other text.`;

    // Use gpt-4o for better analysis (same as optimizer)
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: analysisPrompt,
        },
      ],
      temperature: 0.5,
      max_tokens: 300,
    });

    const content = response.choices[0]?.message?.content || "";
    
    if (!content) {
      return NextResponse.json({
        score: 60,
        summary: `Your resume has been analyzed for ${targetRole}. Sign up to see detailed insights.`,
        analyzedAt: Date.now(),
      });
    }

    // Parse JSON response
    let parsed;
    try {
      const cleaned = cleanJsonResponse(content);
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found");
      }
    } catch {
      console.error("Failed to parse response:", content);
      return NextResponse.json({
        score: 60,
        summary: `Your resume has been analyzed for ${targetRole}. Sign up to see detailed insights.`,
        analyzedAt: Date.now(),
      });
    }

    const score = Math.min(100, Math.max(0, Math.round(Number(parsed.overallScore) || 60)));
    const summary = String(parsed.summary || `Analysis complete for ${targetRole}.`).slice(0, 250);

    return NextResponse.json({
      score,
      summary,
      targetRole: targetRole.trim(),
      analyzedAt: Date.now(),
    });

  } catch (error) {
    console.error("Score teaser error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
