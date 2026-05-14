import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
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

      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system: builderSystemPrompt,
        messages: [
          { role: "user", content: text },
        ],
        temperature: 0.7,
      });

      const content = response.content[0].type === 'text' ? response.content[0].text : '';
      return NextResponse.json({ improvedText: content.trim() });
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

- **Tech Stack Gap (PROPORTIONAL - consider JD skill count):**
  Count total required skills in JD. Scale expectations:
  → JD has 15-20+ skills: Missing 40% is normal, only penalize if <55% match (-15 pts)
  → JD has 10-14 skills: Penalize if <65% match (-20 pts)
  → JD has 5-9 skills: Penalize if <75% match (-25 pts)
  → JD has 1-4 skills: Penalize if <85% match (-30 pts)
  → DO NOT penalize when candidate has equivalent/similar technologies
  → Relevant domain experience partially compensates for specific tool gaps

STEP 2: SENIORITY CALCULATION (HIGH IMPACT!)
────────────────────────────────────────────────
Calculate EXPERIENCE GAP = (JD required years) - (candidate's relevant years).
This is a MAJOR scoring factor with HARD CAPS:

| Experience Gap | Impact | HARD CAP |
|----------------|--------|----------|
| 0 or negative (meets/exceeds) | +5 to +10 bonus | None |
| 1-2 years short | -10 points | Cap at 75 |
| 3-4 years short | -20 points | Cap at 60 |
| 5+ years short (e.g., 0 YOE vs 5+ req) | -30 points | Cap at 45 |
| Intern/Student → Any Senior role | -35 points | Cap at 40 |

⚠️ The cap is ABSOLUTE - score CANNOT exceed it regardless of other factors.
A candidate with 0 experience for a 5+ year role scores MAX 45 even with perfect skills.

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
- Rewrite Summary (3-4 lines) to target the JD using keywords naturally
- Enhance bullet points with action verbs and metrics where reasonable
- Bridge gaps identified in Phase 1 through strategic positioning

════════════════════════════════════════════════════════════════════════════════
OUTPUT FORMAT (Valid JSON)
════════════════════════════════════════════════════════════════════════════════
YOU MUST RESPOND WITH VALID JSON ONLY. NO MARKDOWN, NO EXPLANATIONS. JUST THE JSON OBJECT:

{
  "score": number, // THE PHASE 1 SCORE (Original baseline - be harsh!)
  "headline": "string (2 sentences: First sentence names the STRONGEST matching area specifically. Second sentence names the MOST CRITICAL gap to improve. Be precise - reference specific skills, roles, or experience.)",
  "tailoredSummary": "string (3-4 line optimized summary targeting the JD - comprehensive narrative, not just 1-2 lines)",
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
      
      Respond with ONLY valid JSON, no other text or markdown.
      `;

      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        system: optimizerSystemPrompt,
        messages: [
          { role: "user", content: userMessage },
        ],
        temperature: 0.3, // Very low temperature for consistent, strict scoring
      });

      const content = response.content[0].type === 'text' ? response.content[0].text : '{}';
      const result = JSON.parse(content);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  } catch (error) {
    console.error("Optimizer Error:", error);
    return NextResponse.json({ error: "Failed to optimize" }, { status: 500 });
  }
}
