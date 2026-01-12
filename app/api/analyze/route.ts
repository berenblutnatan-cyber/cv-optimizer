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
        // Try to fetch the job posting page content
        const pageResponse = await fetch(jobUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        });
        if (pageResponse.ok) {
          const html = await pageResponse.text();
          // Extract text content (basic extraction)
          const textContent = html
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 15000); // Limit content length
          
          // Use OpenAI to extract the job description from the page content
          const extractResponse = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "user",
                content: `Extract the job description from this webpage content. Include job title, company, requirements, qualifications, and responsibilities. Return only the extracted job description, no other commentary.\n\nWebpage content:\n${textContent}`
              }
            ],
            temperature: 0.3,
          });
          finalJobDescription = extractResponse.choices[0]?.message?.content || "";
        } else {
          throw new Error("Failed to fetch URL");
        }
      } catch (urlError) {
        console.error("Error fetching job URL:", urlError);
        return NextResponse.json(
          { error: "Failed to fetch job description from URL. Please paste the job description manually." },
          { status: 400 }
        );
      }
    }

    // Validation: Need at least jobDescription OR jobTitle to proceed
    const hasJobContext = finalJobDescription?.trim() || jobTitle?.trim();
    
    if (!hasJobContext) {
      return NextResponse.json(
        { error: "Please provide a Job Title, Job Description, or URL to continue." },
        { status: 400 }
      );
    }

    const effectiveJobTitle =
      cleanTitle(jobTitle) ||
      (finalJobDescription ? inferJobTitleFromDescription(finalJobDescription, companyName) : "") ||
      "Role";

    // Analyze CV against job description using OpenAI
    const analysisPrompt = `Analyze this CV against the job requirements and provide structured feedback.

CV:
${cvText}

Job Title: ${effectiveJobTitle}
Company: ${companyName || "N/A"}
Job Description: ${finalJobDescription || "General optimization for job title above"}

Task:
1. Analyze CV-job match based on EXISTING experience only
2. Identify missing skills from job description
3. Extract CV entry titles for skill placement
4. Suggest 3-5 wording improvements (use job keywords, highlight achievements)

Rules:
- Never fabricate experience
- Only rephrase existing content
- Preserve original CV format in optimizedCV
- Keep exact dates, names, structure

Return JSON:
{
  "overallScore": <0-100 match score>,
  "summary": "<1 sentence: match quality, key gaps, clarity>",
  "strengths": ["<3 existing strengths matching role>"],
  "improvements": ["<3 ways to better communicate existing experience>"],
  "missingKeySkills": ["<max 10 skills/tools explicitly required but missing>"],
  "cv_entries": {
    "summary": {"exists": <true/false>},
    "work_experience": [{"title": "<exact job title>", "organization": "<company>"}],
    "education": [{"title": "<exact degree>", "organization": "<institution>"}],
    "projects": [{"title": "<exact project name>"}]
  },
  "suggestedChanges": [
    {
      "id": "chg_1",
      "section": "<section name>",
      "original": "<exact text from CV>",
      "suggested": "<improved version with job keywords>",
      "reason": "<why this helps>"
    }
  ],
  "keywords": {
    "present": ["<job keywords in CV>"],
    "missing": ["<important keywords not in CV>"]
  },
  "optimizedCV": "<complete CV with all suggestedChanges applied, preserving format>"
}

Constraints:
- suggestedChanges: exactly 3-5 items
- Each "original" must be verbatim from CV
- Limit missingKeySkills to high-impact items only
- Extract only existing CV entries (no inference)`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert CV analyst. Always respond with valid JSON only. Be concise but thorough."
        },
        {
          role: "user",
          content: analysisPrompt,
        },
      ],
      temperature: 0.5,
      response_format: { type: "json_object" },
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
