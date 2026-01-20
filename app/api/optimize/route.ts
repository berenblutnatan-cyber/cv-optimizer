import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // ============================================================
    // MODE A: Simple Text Improvement (For the Builder UI)
    // ============================================================
    if (body.text) {
      const { text, context } = body;
      
      const builderSystemPrompt = `You are an expert resume writer. Improve the provided text while:
      1. Keeping approximately the same length.
      2. Using strong action verbs.
      3. Making it ATS-friendly.
      4. Removing filler words.
      5. Correcting grammar/spelling.
      
      Context: ${context || "resume section"}
      
      IMPORTANT: Return ONLY the improved text. Do not add explanations or quotes.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: builderSystemPrompt },
          { role: "user", content: text },
        ],
        temperature: 0.7,
      });

      const improvedText = response.choices[0]?.message?.content?.trim();
      return NextResponse.json({ improvedText });
    }

    // ============================================================
    // MODE B: Full Optimizer & Job Matcher (The "Money Maker")
    // ============================================================
    if (body.resumeData) {
      const { resumeData, jobDescription } = body;
      
      // Determine if this is a targeted optimization or a general polish
      const isTargeted = !!jobDescription && jobDescription.length > 50;

      const optimizerSystemPrompt = `
      You are a ruthlessly efficient Senior Technical Recruiter. Your job is to filter candidates, not to be nice.
      
      ${isTargeted 
        ? `TASK: Critically evaluate the RESUME against the JOB DESCRIPTION (JD).
           
           SCORING RUBRIC (Strict Enforcement):
           - 90-100: "Unicorn". Perfect match on Job Title + All Hard Skills + Years of Experience.
           - 75-89: "Strong Contender". Matches Core Tech Stack, but maybe lacks 1 minor skill or has a slightly different title (e.g., Backend vs Fullstack).
           - 60-74: "Transferable". Has relevant domain knowledge but LACKS critical hard skills (e.g., Product Analyst applying for Dev, or Python dev applying for Java role).
           - 0-59: "Reject". Mismatched Role (e.g., Marketing applying for Engineering) or missing ALL core requirements.

           CRITICAL SCORING RULES:
           1. **Role Mismatch Penalty:** If the candidate's current job title is fundamentally different from the target role (e.g., "Analyst" vs "Engineer"), CAP the score at 70, regardless of keywords.
           2. **Tech Stack Gap:** If the JD requires a specific language (e.g., React/Node) and the CV does not mention it, deduct 20 points immediately.
           3. **Do not hallucinate matches:** If a skill is implied but not written, do not count it.

           OUTPUT GENERATION:
           1. Calculate the strict "score" based on the rubric above.
           2. Identify "Missing Keywords" (Critical hard skills found in JD but absent in CV).
           3. Rewrite the "Professional Summary" to bridge the gap (if possible) or highlight the pivot.
           4. Provide 3 brutally honest improvements.` 
        : `TASK: Audit and elevate this RESUME to an executive standard.
           1. Focus on impact, quantification, and clarity.
           2. Provide a general "Readiness Score" (0-100).
           3. Polish the Professional Summary.
           4. Provide 3 general improvement tips.`
      }

      OUTPUT FORMAT:
      You must respond with a STRICTLY VALID JSON object:
      {
        "score": number, // Integer 0-100
        "headline": "string (A punchy 1-sentence analysis of the fit)",
        "tailoredSummary": "string (The rewritten, optimized bio)",
        "missingKeywords": ["string", "string", "string"], 
        "keyImprovements": ["string", "string", "string"]
      }
      `;

      const userMessage = `
      RESUME DATA: 
      ${JSON.stringify(resumeData)}

      ${isTargeted ? `TARGET JOB DESCRIPTION: \n${jobDescription}` : ''}
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: optimizerSystemPrompt },
          { role: "user", content: userMessage },
        ],
        response_format: { type: "json_object" }, // Crucial for frontend stability
        temperature: 0.7,
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });

  } catch (error) {
    console.error("AI Optimization Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Optimization failed" },
      { status: 500 }
    );
  }
}
