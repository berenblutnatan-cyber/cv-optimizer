import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@clerk/nextjs/server";
import { extractText } from "unpdf";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";
import { buildScoringRubric } from "@/lib/review/rubric";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Opus calls can exceed Vercel's default function timeout; give headroom
// so the route returns a result instead of a mid-flight 504.
export const maxDuration = 60;
export const dynamic = "force-dynamic";

// Stays public: this is the /score lead magnet (listed in proxy.ts
// isPublicRoute). Spend is bounded by a KV rate limit (per user when signed
// in, per IP otherwise) plus input-size caps — cvText is already sliced to
// 8000 chars when the prompt is built.
const HOURLY_CAP = 10;
const MAX_FILE_BYTES = 5 * 1024 * 1024; // matches the "max 5MB" shown on /score
const MAX_ROLE_LENGTH = 100;

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
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY is not configured");
    return NextResponse.json(
      { error: "Service temporarily unavailable. Please try again later." },
      { status: 503 }
    );
  }

  try {
    const { userId } = await auth();
    const rl = await checkRateLimit({
      name: "score-teaser",
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

    const formData = await request.formData();

    let cvText = formData.get("cvText") as string || "";
    const cvFile = formData.get("cvFile") as File | null;
    const targetRole = formData.get("targetRole") as string || "";

    if (cvFile && cvFile.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: "File is too large. Please upload a PDF under 5MB." },
        { status: 400 }
      );
    }
    if (targetRole.trim().length > MAX_ROLE_LENGTH) {
      return NextResponse.json(
        { error: "Please select a target role." },
        { status: 400 }
      );
    }

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

    // ONE rubric, shared with the studio review, /results and the live meter
    // (lib/review/rubric.ts). Before this, the teaser carried its own harsher
    // copy with different band boundaries, so the same CV scored differently
    // on /score than it did anywhere else in the product.
    const analysisPrompt = `You are a Senior Technical Recruiter and ATS Auditor
screening this candidate against their target role.

## Resume:
${cvText.slice(0, 8000)}

## Target Role:
${targetRole.trim()}

${buildScoringRubric({ targetRole: targetRole.trim() })}

════════════════════════════════════════════════════════════════════════════════
OUTPUT FORMAT
════════════════════════════════════════════════════════════════════════════════
Return ONLY a JSON object with exactly these fields:
{
  "overallScore": <number 0-100, scored strictly against the rubric above>,
  "summary": "<one brutally honest sentence explaining the score: name the specific mismatch or gap if there is one>"
}

Return ONLY the JSON object, no markdown, no other text.`;

    const systemPrompt = "You are a Senior Technical Recruiter and ATS Auditor. Apply harsh, realistic scoring. Always respond with valid JSON only.";

    // Use Claude for better analysis
    const response = await anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 400,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: analysisPrompt,
        },
      ],
    });

    const content = response.content[0].type === 'text' ? response.content[0].text : "";
    
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
