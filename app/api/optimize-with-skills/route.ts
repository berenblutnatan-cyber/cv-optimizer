import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { extractText } from "unpdf";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const runtime = "nodejs";

type SkillPlacement = {
  skill: string;
  targetCvEntry: {
    section: "summary" | "work_experience" | "education" | "projects";
    title?: string;
    organization?: string;
  };
  userProvidedContext: string;
};

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Missing required environment variable: OPENAI_API_KEY" },
        { status: 500 }
      );
    }

    const formData = await request.formData();

    let cvText = (formData.get("cvText") as string) || "";
    const cvFile = formData.get("cv") as File | null;
    const skillPlacementsRaw = (formData.get("skillPlacements") as string) || "[]";
    const jobTitle = (formData.get("jobTitle") as string) || "";
    const jobDescription = (formData.get("jobDescription") as string) || "";

    // Extract text from PDF if provided and cvText not present
    if (cvFile && !cvText) {
      try {
        const arrayBuffer = await cvFile.arrayBuffer();
        const { text } = await extractText(arrayBuffer);
        cvText = Array.isArray(text) ? text.join("\n") : text;
      } catch (pdfError) {
        console.error("PDF parsing error:", pdfError);
        return NextResponse.json(
          { error: "Failed to parse PDF. Please try pasting your CV text instead." },
          { status: 400 }
        );
      }
    }

    if (!cvText) {
      return NextResponse.json(
        { error: "No CV content provided" },
        { status: 400 }
      );
    }

    let skillPlacements: SkillPlacement[] = [];
    try {
      skillPlacements = JSON.parse(skillPlacementsRaw);
      if (!Array.isArray(skillPlacements)) {
        throw new Error("skillPlacements must be an array");
      }
    } catch {
      return NextResponse.json(
        { error: "Invalid skillPlacements payload" },
        { status: 400 }
      );
    }

    if (skillPlacements.length === 0) {
      return NextResponse.json(
        { error: "No skill placements provided" },
        { status: 400 }
      );
    }

    // Build the optimization prompt
    const skillPlacementInstructions = skillPlacements
      .map((sp, idx) => {
        const entryLocation = sp.targetCvEntry.section === "summary"
          ? "Professional Summary section"
          : sp.targetCvEntry.organization
          ? `${sp.targetCvEntry.title} at ${sp.targetCvEntry.organization}`
          : sp.targetCvEntry.title || sp.targetCvEntry.section;
        
        return `${idx + 1}. Skill: "${sp.skill}"
   - Add to: ${entryLocation}
   - Context: ${sp.userProvidedContext}`;
      })
      .join("\n\n");

    const optimizationPrompt = `You are an expert resume writer. Your task is to add missing skills to an existing CV by enhancing specific CV entries that the user has selected.

## Original CV:
${cvText}

## Target Role:
${jobTitle || "General optimization"}

## Job Description (for context):
${jobDescription || "[Not provided]"}

## Skills to Add:
The user has identified the following missing skills and provided context about how their experience relates to each skill. You must add content ONLY to the specific CV entries the user selected.

${skillPlacementInstructions}

## CRITICAL RULES - You MUST Follow These:

1. **Add content ONLY under the selected CV entry for each skill**
   - If the user selected "Product Analyst at Taboola" for SQL, add SQL-related bullets ONLY under that specific role
   - Do NOT move experience between different roles, education entries, or projects

2. **Do NOT create new roles, education entries, or projects**
   - Only enhance existing entries that the user selected
   - Do NOT add new companies, degrees, or project sections

3. **Do NOT move experience across sections**
   - If a skill should go under work experience, keep it there
   - If a skill should go under education, keep it there
   - Do NOT reorganize the CV structure

4. **Rewrite user-provided context into professional resume bullets**
   - Transform the user's informal description into 1-2 strong bullet points
   - Use action verbs and quantifiable results when possible
   - Keep the tone consistent with the rest of the CV

5. **Do NOT exaggerate seniority or invent tools**
   - Only use what the user described
   - Do NOT add technologies, metrics, or achievements the user didn't mention
   - Stay truthful to the user's actual experience

6. **Preserve the original CV format and structure**
   - Keep all existing content intact
   - Add new bullets seamlessly within the selected entries
   - Maintain the same formatting style (bullet points, dates, etc.)

## Output Format:

Return a JSON object with this structure:
{
  "optimizedCV": "<the complete CV with the new skill-related content added to the selected entries only>",
  "changesApplied": [
    {
      "skill": "<skill name>",
      "location": "<where it was added, e.g., 'Product Analyst at Taboola'>",
      "bulletsAdded": ["<new bullet 1>", "<new bullet 2>"]
    }
  ]
}

Return ONLY valid JSON, no other text.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a professional resume writer. You help candidates accurately represent their real experience. You NEVER fabricate or exaggerate. Always respond with valid JSON.",
        },
        {
          role: "user",
          content: optimizationPrompt,
        },
      ],
      temperature: 0.5,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      throw new Error("No response from OpenAI");
    }

    const result = JSON.parse(content);

    // Convert skill placements into suggested changes format for the UI
    const skillPlacementChanges = skillPlacements.map((sp, idx) => {
      const entryLocation = sp.targetCvEntry.section === "summary"
        ? "Professional Summary"
        : sp.targetCvEntry.organization
        ? `${sp.targetCvEntry.title} at ${sp.targetCvEntry.organization}`
        : sp.targetCvEntry.title || sp.targetCvEntry.section;
      
      // Format bullets properly
      const bullets = result.changesApplied?.[idx]?.bulletsAdded;
      const formattedContent = bullets 
        ? bullets.map((bullet: string) => `• ${bullet}`).join('\n')
        : sp.userProvidedContext;
      
      return {
        id: `skill_${idx + 1}`,
        skill: sp.skill,
        section: entryLocation,
        original: sp.skill,
        suggested: formattedContent,
        reason: `Added to ${entryLocation} based on your experience`
      };
    });

    return NextResponse.json({
      success: true,
      optimizedCV: result.optimizedCV || cvText,
      changesApplied: result.changesApplied || [],
      skillPlacementChanges,
    });
  } catch (error) {
    console.error("Optimize with skills error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Optimization failed" },
      { status: 500 }
    );
  }
}

