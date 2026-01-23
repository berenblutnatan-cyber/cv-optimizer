import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // ============================================================
    // MODE A: Builder Text Improvement (Unchanged)
    // ============================================================
    if (body.text) {
      const { text, context } = body;
      const builderSystemPrompt = `You are an expert resume writer. Improve the provided text while:
      1. Keeping approximately the same length.
      2. Using strong action verbs.
      3. Making it ATS-friendly.
      4. Correcting grammar/spelling.
      Context: ${context || "resume section"}
      IMPORTANT: Return ONLY the improved text.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: builderSystemPrompt },
          { role: "user", content: text },
        ],
        temperature: 0.7,
      });

      return NextResponse.json({ improvedText: response.choices[0]?.message?.content?.trim() });
    }

    // ============================================================
    // MODE B: Full Optimizer & Scoring (The Fix)
    // ============================================================
    if (body.resumeData) {
      const { resumeData, jobDescription } = body;
      const isTargeted = !!jobDescription && jobDescription.length > 50;

      const optimizerSystemPrompt = `
You are a Senior Technical Recruiter and ATS Auditor.
Your goal is to screen candidates ruthlessly based on the Job Description (JD).

════════════════════════════════════════════════════════════════════════════════
PHASE 1: THE AUDIT (Strict Scoring on ORIGINAL Resume - Do This FIRST!)
════════════════════════════════════════════════════════════════════════════════
**⚠️ CRITICAL: Look ONLY at the provided "RESUME DATA". Do NOT consider your potential improvements yet.**

${isTargeted ? `
STEP 1: KNOCKOUT CHECK (Immediate Disqualifiers)
────────────────────────────────────────────────
- **Domain Mismatch:** Is the candidate's current role fundamentally different from the target?
  Examples: Lawyer → Engineer, Sales → Developer, Teacher → Data Scientist, Analyst → Software Engineer
  → IF YES: Score MUST be < 35. This is an IMMEDIATE REJECT.

- **Tech Stack Gap:** Does the CV miss >50% of the critical hard skills/languages in the JD?
  → IF YES: Deduct 30 points from whatever score you calculate.

STEP 2: SENIORITY CALCULATION
────────────────────────────────────────────────
Compare candidate's RELEVANT years of experience vs JD requirements:

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
- **85-100 (Exceptional):** Perfect role + seniority + tech stack match
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
` : `
GENERAL AUDIT (No JD provided):
- Impact quantification (metrics, numbers): 30 points
- Clarity and professional presentation: 25 points  
- Skills articulation: 20 points
- Career progression: 15 points
- ATS-friendliness: 10 points
`}

════════════════════════════════════════════════════════════════════════════════
PHASE 2: THE OPTIMIZATION (Rewrite - Do This AFTER scoring)
════════════════════════════════════════════════════════════════════════════════
**Now that you have scored the ORIGINAL, create the optimized version.**

PRESERVATION RULES (MUST FOLLOW):
1. ❌ DO NOT DELETE sections: Military Service, Volunteering, Awards, Projects - KEEP THEM ALL
2. ❌ DO NOT SIMPLIFY job titles: "Creator of XYZ Podcast" stays exactly as written
3. ❌ DO NOT MODIFY contact info: Name, Email, Phone, LinkedIn URL - keep VERBATIM
4. ❌ DO NOT HALLUCINATE: No inventing dates, companies, titles, or skills

OPTIMIZATION STRATEGY:
- Rewrite Summary to target the JD using keywords naturally
- Enhance bullet points with action verbs and metrics where reasonable
- Bridge gaps identified in Phase 1 through strategic positioning

════════════════════════════════════════════════════════════════════════════════
OUTPUT FORMAT (Valid JSON)
════════════════════════════════════════════════════════════════════════════════
{
  "score": number, // THE PHASE 1 SCORE (Original baseline - be harsh!)
  "headline": "string (Brutally honest 1-sentence assessment of the ORIGINAL CV's fit)",
  "tailoredSummary": "string (Optimized summary targeting the JD)",
  "missingKeywords": ["critical skill 1", "critical skill 2"],
  "keyImprovements": ["specific improvement 1", "specific improvement 2", "specific improvement 3"],
  "experience": [...], // Return ALL, optimized but not deleted
  "military": [...], // Return if present
  "education": [...],
  "projects": [...],
  "volunteering": [...],
  "awards": [...]
}
      `;

      const userMessage = `
      RESUME DATA (ORIGINAL): 
      ${JSON.stringify(resumeData)}

      ${isTargeted ? `TARGET JOB DESCRIPTION: \n${jobDescription}` : ''}
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: optimizerSystemPrompt },
          { role: "user", content: userMessage },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3, // Very low temperature for consistent, strict scoring
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  } catch (error) {
    console.error("Optimizer Error:", error);
    return NextResponse.json({ error: "Failed to optimize" }, { status: 500 });
  }
}
