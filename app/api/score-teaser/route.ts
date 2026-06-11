import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@clerk/nextjs/server";
import { extractText } from "unpdf";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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

    // Use the SAME analysis prompt structure as the main optimizer
    // This ensures consistent scoring methodology
    const analysisPrompt = `You are a Senior Technical Recruiter and ATS Auditor.
Your goal is to screen candidates ruthlessly based on their TARGET ROLE.

════════════════════════════════════════════════════════════════════════════════
STRICT SCORING AUDIT (Look at ORIGINAL Resume Data)
════════════════════════════════════════════════════════════════════════════════
**⚠️ CRITICAL: Apply HARSH scoring rules. This must match the logic used in the full optimizer.**

## Resume:
${cvText.slice(0, 8000)}

## Target Role:
${targetRole.trim()}

STEP 1: KNOCKOUT CHECK (Immediate Disqualifiers)
────────────────────────────────────────────────
- **Domain Mismatch:** Is the candidate's current role fundamentally different from the target?
  Examples: Lawyer → Engineer, Sales → Developer, Teacher → Data Scientist, Analyst → Software Engineer
  → IF YES: Score MUST be < 35. This is an IMMEDIATE REJECT.

- **Tech Stack Gap:** Does the CV miss >50% of critical hard skills typically required for "${targetRole}"?
  → IF YES: Deduct 30 points from whatever score you calculate.

STEP 2: SENIORITY CALCULATION
────────────────────────────────────────────────
Estimate candidate's years of RELEVANT experience and compare to typical role requirements:

| Candidate Level | Target Level | MAX SCORE |
|-----------------|--------------|-----------|
| Junior (0-2 YOE) | Senior (5+ req) | 45 |
| Junior (0-2 YOE) | Mid (3+ req) | 55 |
| Mid (2-4 YOE) | Senior (5+ req) | 60 |
| Mid (2-4 YOE) | Lead/Staff | 50 |
| Intern/Student | Any Full-Time | 40 |

STEP 3: ROLE FAMILY CHECK
────────────────────────────────────────────────
These are DIFFERENT job families - do NOT treat them as equivalent:
- Engineering: Software Engineer, Developer, Architect, DevOps
- Analytics: Data Analyst, Product Analyst, Business Analyst, BI Analyst  
- Data Science: Data Scientist, ML Engineer
- Product: Product Manager, Product Owner
- Design: UX/UI Designer

| Career Change | MAX SCORE |
|---------------|-----------|
| Analyst → Engineer | 50 |
| PM → Engineer | 45 |
| Designer → Engineer | 40 |
| Unrelated (Sales, Legal, HR) → Engineer | 30 |

STEP 4: FINAL BASELINE SCORE (Apply all caps above)
────────────────────────────────────────────────
- **85-100 (Exceptional):** Perfect role + seniority + tech stack match for ${targetRole}
- **70-84 (Strong):** Same role family, meets seniority, minor skill gaps
- **55-69 (Moderate):** Adjacent role OR minor seniority gap, some skill overlap
- **40-54 (Weak):** Different role family OR significant gaps
- **0-39 (Reject):** Failed knockout check OR multiple major mismatches

CONCRETE EXAMPLES (Use these as calibration):
- Product Analyst (3y) → Senior Software Engineer: Score 30-40
- Junior Dev (1y) → Senior Dev (5y+ req): Score 35-45
- Senior Java Dev → Senior Python Dev: Score 60-70
- Marketing Manager → Software Engineer: Score 20-30
- Senior React Dev → Senior React Dev: Score 80-95

════════════════════════════════════════════════════════════════════════════════
OUTPUT FORMAT
════════════════════════════════════════════════════════════════════════════════
Return ONLY a JSON object with exactly these fields:
{
  "overallScore": <number 0-100 - HARSH, STRICT score based on the rubric above>,
  "summary": "<one brutally honest sentence explaining the score: mention specific knockout/mismatch if found>"
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
