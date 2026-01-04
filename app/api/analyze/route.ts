import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { extractText } from "unpdf";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
  // Remove common separators + company name
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
  // Keep it reasonably short
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

    const formData = await request.formData();
    
    let cvText = formData.get("cvText") as string || "";
    const cvFile = formData.get("cv") as File | null;
    const mode = (formData.get("mode") as string) || "specific_role";
    const jobDescription = formData.get("jobDescription") as string || "";
    const jobUrl = formData.get("jobUrl") as string || "";
    const jobTitle = formData.get("jobTitle") as string || "";
    const companyName = formData.get("companyName") as string || "";

    // Extract text from PDF if provided
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

    // Get job description from URL if provided
    let finalJobDescription = jobDescription;
    if (jobUrl && !jobDescription) {
      try {
        const urlResponse = await openai.responses.create({
          model: "gpt-4o",
          tools: [{ type: "web_search_preview" }],
          tool_choice: { type: "web_search_preview" },
          input: `Go to this job posting URL and extract the full job description including title, company, requirements, qualifications, and responsibilities.

Job posting URL: ${jobUrl}
User-provided job title (may be empty): ${jobTitle}`,
        });

        let urlContent = "";
        for (const item of urlResponse.output) {
          if (item.type === "message" && item.content) {
            for (const block of item.content) {
              if (block.type === "output_text") {
                urlContent += block.text;
              }
            }
          }
        }
        finalJobDescription = urlContent;
      } catch (urlError) {
        console.error("Error fetching job URL:", urlError);
        return NextResponse.json(
          { error: "Failed to fetch job description from URL. Please paste the job description manually." },
          { status: 400 }
        );
      }
    }

    if (!finalJobDescription) {
      // Allow title-only optimization
      if (!jobTitle && mode === "title_only") {
        return NextResponse.json({ error: "No job title provided" }, { status: 400 });
      }
      if (mode === "specific_role") {
        return NextResponse.json(
          { error: "No job description provided for specific-role mode" },
          { status: 400 }
        );
      }
    }

    const effectiveJobTitle =
      cleanTitle(jobTitle) ||
      (finalJobDescription ? inferJobTitleFromDescription(finalJobDescription, companyName) : "") ||
      "Role";

    // Analyze CV against job description using OpenAI
    const analysisPrompt = `You are an expert HR consultant and CV optimization specialist. Analyze the following CV against the job description and provide detailed, actionable feedback.

## CV:
${cvText}

## Job Title (provided by user, may be empty):
${effectiveJobTitle}

## Company (may be empty):
${companyName}

## Job Description (may be empty if user wants general optimization for the job title):
${finalJobDescription || "[No job description provided. Optimize generally for the job title above.]"}

## Your Task:
Analyze how well this CV matches the role requirements and suggest how to BETTER COMMUNICATE the candidate's EXISTING experience to fit.

If the job description is missing but a job title is provided, infer typical responsibilities, keywords, and skills for that title and optimize the CV for that general role profile (still following all critical rules).

CRITICAL RULES:
- NEVER invent, fabricate, or make up new experiences, skills, or achievements
- ONLY rephrase, reorganize, or highlight existing content from the CV
- Focus on using keywords from the job description to describe existing experiences
- Suggest better ways to frame existing accomplishments
- If the candidate lacks certain requirements, note it honestly - do NOT add fake experience
- VERY IMPORTANT: Preserve the CV's ORIGINAL FORMAT in "optimizedCV"
  - Keep the same section headings, ordering, and overall structure as the input CV text
  - Keep the same bullet style (e.g. •, -, *, numbering), indentation, and line breaks as much as possible
  - Keep dates, company names, and role titles exactly as written unless a suggested change is a direct rewrite of that exact text
  - Do NOT rewrite the CV into a new template or add new sections; only make minimal, in-place wording edits
  - The output should look like the same CV, just improved wording in the existing places

Return your analysis as a JSON object with this exact structure:
{
  "overallScore": <number 0-100 representing match score for THIS role based on ACTUAL CV evidence>,
  "summary": "<one sentence match assessment and why (keywords + evidence + clarity)>",
  "strengths": [
    "<existing strength that matches the role>",
    "<existing strength that matches the role>",
    "<existing strength that matches the role>"
  ],
  "improvements": [
    "<how to better communicate existing experience>",
    "<how to better communicate existing experience>",
    "<how to better communicate existing experience>"
  ],
  "missingKeySkills": [
    "<skill/technology/tool/methodology that is clearly expected in the job description but not mentioned in the CV>",
    "<keep this list short (max 15), high-signal, and avoid generic soft skills unless explicitly required>"
  ],
  "suggestedChanges": [
    {
      "id": "<stable id like 'chg_1', 'chg_2'...>",
      "section": "<section name like 'Summary', 'Experience', 'Skills'>",
      "original": "<exact original text from CV>",
      "suggested": "<rephrased version using job-relevant keywords - SAME experience, better wording>",
      "reason": "<why this rephrasing helps match the job better>"
    }
  ],
  "keywords": {
    "present": ["<keyword from job that IS in CV>"],
    "missing": ["<important keyword from job NOT in CV - candidate should add IF they have this skill>"]
  },
  "optimizedCV": "<the complete CV with ALL suggested changes applied, preserving the original format>"
}

Remember: You are helping the candidate present their REAL experience more effectively, not creating a fictional CV.

Scoring guidance (overallScore):
- This is a role-specific match score based on what the CV actually demonstrates.
- Weigh: role-relevant keyword coverage, evidence of required skills/responsibilities in experience bullets, seniority/years fit, clarity/readability, and missing must-haves.
- Penalize: vague wording, missing core requirements, lack of measurable outcomes, and unclear scope.
- Do NOT reward invented experience; only what is supported in the CV text.

For suggestedChanges:
- Provide ONLY 3-5 changes total (suggestedChanges.length must be between 3 and 5)
- Each change must have exactly ONE "suggested" rewrite
- The "original" MUST be copied EXACTLY from the CV (verbatim substring) so it can be replaced later
- Do NOT propose changes that require adding new achievements/skills; only rewrite the same content
- Prefer changes that improve clarity, impact, and include role-relevant keywords when appropriate
- After listing suggestedChanges, produce "optimizedCV" by applying ALL suggested changes to the original CV (in-place replacements).

Return ONLY the JSON object, no other text.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: analysisPrompt,
        },
      ],
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content || "";
    
    // Parse the JSON response
    let analysis;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      console.log("Raw response:", content);
      return NextResponse.json(
        { error: "Failed to parse analysis results. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      analysis,
      meta: {
        mode: mode === "title_only" ? "title_only" : "specific_role",
        jobTitle: effectiveJobTitle,
        jobUrl,
        companyName,
        cvTextUsed: cvText,
        jobDescriptionUsed: finalJobDescription || "",
      },
    });

  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Analysis failed" },
      { status: 500 }
    );
  }
}
