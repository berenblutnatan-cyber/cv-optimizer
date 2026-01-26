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
    
    // Parse AI Deep Dive answers if provided
    let deepDiveAnswers: { achievements: string; hiddenSkills: string; uniqueValue: string } | null = null;
    const deepDiveRaw = formData.get("deepDiveAnswers") as string;
    if (deepDiveRaw) {
      try {
        deepDiveAnswers = JSON.parse(deepDiveRaw);
        console.log("=== DEEP DIVE ANSWERS RECEIVED ===");
        console.log("Raw:", deepDiveRaw);
        console.log("Parsed:", JSON.stringify(deepDiveAnswers, null, 2));
        console.log("Hidden Skills:", deepDiveAnswers?.hiddenSkills);
      } catch (e) {
        console.error("Failed to parse deepDiveAnswers:", e);
      }
    }
    
    // Get optional summary
    const userSummary = formData.get("summary") as string || "";

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

    // Analyze CV against job description using OpenAI - COMPREHENSIVE OPTIMIZATION
    const analysisPrompt = `You are a WORLD-CLASS Executive Resume Writer with 20+ years of experience at McKinsey, Goldman Sachs, and top Silicon Valley companies. You transform average resumes into interview-winning documents.

## CANDIDATE'S CURRENT CV:
${cvText}

## TARGET ROLE: ${effectiveJobTitle}
## TARGET COMPANY: ${companyName || "Not specified"}

## JOB REQUIREMENTS:
${finalJobDescription || "[No specific job description. Optimize for a senior " + effectiveJobTitle + " role at a top-tier company.]"}

${userSummary ? `
## CANDIDATE'S PROFESSIONAL SUMMARY (provided by user - enhance this!):
${userSummary}

IMPORTANT: The user has provided their own summary. Use this as a base and DRAMATICALLY improve it:
- Add quantifiable achievements
- Include industry keywords
- Make it compelling and role-specific
- Keep the same general narrative but elevate the language
` : ""}

${deepDiveAnswers ? `
## ⚠️ PRIORITY TASK: ADD THE FOLLOWING SKILLS TO THE CV! ⚠️

The candidate has confirmed they have these skills. Your PRIMARY job is to add them to the optimizedCV.

### Additional Achievements to highlight:
${deepDiveAnswers.achievements || "Not provided"}

### 🎯 SKILLS TO ADD (MANDATORY!):
${(() => {
  try {
    const skillsData = JSON.parse(deepDiveAnswers.hiddenSkills || "[]");
    if (Array.isArray(skillsData) && skillsData.length > 0) {
      return skillsData.map((s: { skill: string; context: string; placement: string; sectionId: string; roleTitle: string; company: string }) => {
        const contextInfo = s.context ? `\n   Candidate's experience: "${s.context}"` : "";
        const locationInfo = s.roleTitle && s.company ? ` (under ${s.roleTitle} @ ${s.company})` : "";
        return `- "${s.skill}" → Add to: ${s.placement}${locationInfo}${s.sectionId === "skills" ? " (add as a skill)" : s.sectionId === "summary" ? " (weave into summary)" : " (add as a bullet point)"}${contextInfo}`;
      }).join("\n\n");
    }
    return deepDiveAnswers.hiddenSkills || "Not provided";
  } catch {
    return deepDiveAnswers.hiddenSkills || "Not provided";
  }
})()}

### Skills the candidate confirmed having:
${deepDiveAnswers.uniqueValue || "Not provided"}

IMPORTANT - SKILL PLACEMENT INSTRUCTIONS (MUST BE IN OPTIMIZED CV!):
The candidate has confirmed they have these skills. Add them ONLY to the EXACT location they specified:

1. **If marked "skills section"** → Add the skill name to the SKILLS section ONLY
2. **If marked "professional summary"** → Weave the skill into the summary paragraph ONLY
3. **If marked for a specific role** (e.g., "Product Analyst @ Taboola") → Add a NEW bullet point under that EXACT role ONLY (do NOT add to Skills section)

EXAMPLE: If candidate says "Python" should go under "Product Analyst @ Taboola" with context "built automated reports":
- DO NOT add Python to the Skills section
- ONLY add this bullet under Product Analyst @ Taboola: "• Developed Python automation scripts for reporting, reducing manual work by 10+ hours weekly"

⚠️ CRITICAL - YOU MUST DO THESE THINGS:
1. ADD each skill to the optimizedCV in the EXACT location specified above
2. CREATE a suggestedChange entry for EACH skill added:
   {
     "id": "skill_added_1",
     "section": "[section where added]",
     "original": "",
     "suggested": "[the new bullet point you added]",
     "reason": "Added [skill name] based on candidate's confirmed experience"
   }
3. If you don't add these skills, you have FAILED your task!
` : ""}

## YOUR MISSION:
Transform this CV into a POWERFUL, interview-winning document that will make recruiters stop and take notice. You must create a NOTICEABLY BETTER version.

## ⚠️ CRITICAL PRESERVATION RULES (READ FIRST!):
**NEVER DELETE OR REMOVE ANY CONTENT FROM THE ORIGINAL CV!**
- ✅ KEEP every job position, company, date, bullet point
- ✅ KEEP every education entry, certification, project
- ✅ KEEP every skill, language, achievement mentioned
- ✅ ENHANCE the wording, add metrics, improve language
- ❌ NEVER remove a job, education, or section that exists in the original
- ❌ NEVER shorten bullet lists or reduce the number of achievements
- ❌ NEVER omit skills or certifications that were in the original

If the original has 5 bullet points for a job → the optimized version must have AT LEAST 5 bullets (can add more)
If the original has 3 skills → the optimized version must have AT LEAST 3 skills (can add more)

You are REFINING and ENHANCING, not editing down!

## TRANSFORMATION GOALS:
1. **AMPLIFIES IMPACT** - Turn passive descriptions into achievement stories
2. **OPTIMIZES FOR ATS** - Embed critical keywords naturally throughout
3. **QUANTIFIES EVERYTHING** - Add metrics, percentages, team sizes, revenue impact
4. **ELEVATES LANGUAGE** - Use power verbs and executive-level phrasing
5. **ADDS VALUE** - Add inferred metrics and missing skills from context

## TRANSFORMATION RULES:

### 1. ACHIEVEMENT REFORMULATION (CRITICAL!)
Transform EVERY bullet point using this framework:
- BEFORE: "Responsible for managing team projects"
- AFTER: "Spearheaded cross-functional initiatives managing 12+ team members, delivering 3 major projects on-time, reducing development cycle by 25%"

### 2. QUANTIFICATION MANDATE
If the CV lacks numbers, INTELLIGENTLY INFER reasonable metrics based on:
- Industry standards for the role
- Company size indicators
- Scope described in the experience
- Example: "managed team" → "led team of 8-12 professionals"
- Example: "increased sales" → "drove 35% revenue growth ($2.5M annually)"

### 3. KEYWORD SATURATION
Extract THE TOP 15 keywords from the job description and ensure EACH appears at least once:
- In the summary/profile
- In relevant experience bullets
- In the skills section

### 4. POWER VERB MANDATE
Replace weak verbs with POWER VERBS:
- "Worked on" → "Orchestrated/Spearheaded/Architected"
- "Helped" → "Accelerated/Enabled/Drove"
- "Made" → "Engineered/Delivered/Launched"
- "Did" → "Executed/Implemented/Transformed"

### 5. SUMMARY SECTION (REQUIRED!)
**If the original CV HAS a summary:**
- KEEP the candidate's unique background (e.g., "Former IAF Officer", military experience, unique career path)
- KEEP the same tone and narrative style as the original
- ENHANCE with metrics and quantifiable achievements
- ADD relevant keywords from the target role naturally
- Make it MORE compelling but still sounds like the SAME person
- 3-4 sentences maximum

**If the original CV has NO summary:**
- CREATE a compelling summary based on:
  1. The candidate's most recent/relevant experience
  2. Their key achievements and skills from the CV
  3. Keywords and requirements from the target job description
  4. Their career trajectory and unique value proposition
- Format: 3-4 sentences highlighting years of experience, key skills, notable achievements, and career focus
- Place it right after the contact info, before Experience section

## OUTPUT FORMAT (JSON):
{
  "overallScore": <0-100 based on match to target role>,
  "summary": "<compelling 1-sentence assessment highlighting the candidate's potential for THIS role>",
  "strengths": [
    "<specific strength #1 with evidence>",
    "<specific strength #2 with evidence>",
    "<specific strength #3 with evidence>",
    "<specific strength #4 with evidence>"
  ],
  "improvements": [
    "<major improvement #1 - be specific>",
    "<major improvement #2 - be specific>",
    "<major improvement #3 - be specific>",
    "<major improvement #4 - be specific>",
    "<major improvement #5 - be specific>"
  ],
  "missingKeySkills": [
    "<critical skill gap #1>",
    "<critical skill gap #2>",
    "<critical skill gap #3>"
  ],
  "suggestedChanges": [
    {
      "id": "chg_1",
      "section": "Summary",
      "original": "<exact text from CV>",
      "suggested": "<DRAMATICALLY improved version>",
      "reason": "<why this is more impactful>"
    },
    {
      "id": "chg_2", 
      "section": "Experience",
      "original": "<exact bullet text>",
      "suggested": "<transformed achievement with metrics>",
      "reason": "<the transformation logic>"
    }
  ],
  "keywords": {
    "present": ["<keywords found>"],
    "missing": ["<critical missing keywords - TOP PRIORITY>"],
    "added": ["<keywords you added in optimization>"]
  },
  "optimizedCV": "<THE COMPLETE TRANSFORMED CV as plain text. Structure it EXACTLY like this (but use ACTUAL values, not placeholders):

John Smith
Senior Software Engineer
john@email.com | +1-555-123-4567 | New York, NY | linkedin.com/in/johnsmith

SUMMARY
A compelling 3-4 sentence summary paragraph here... (Can also use "PROFESSIONAL SUMMARY" - match the original CV's header)

EXPERIENCE
Software Engineer | Google | 2020 - Present
• Achievement bullet with metrics
• Achievement bullet with metrics

Senior Developer | Meta | 2018 - 2020
• Achievement bullet with metrics

EDUCATION
B.S. Computer Science | MIT | 2018

SKILLS
Python, JavaScript, React, Node.js, AWS

CRITICAL FORMAT RULES:
1. Use the ACTUAL candidate name, title, contact info - NOT placeholders
2. Include ALL sections from the original CV (Experience, Education, Skills, Awards, Community Activities, Languages, etc.)
3. Use section headers in ALL CAPS
4. Use pipe | separators for job lines: Job Title | Company | Date
5. Use bullet points (•) for achievements
6. SUMMARY section must be a paragraph, not bullets (use same header as original: SUMMARY or PROFESSIONAL SUMMARY)>"
}

## CRITICAL REMINDERS:
1. **PRESERVE ALL SECTIONS** - Include EVERY section from the original CV: Experience, Education, Skills, Awards, Honors, Community Activities, Languages, Projects, Certifications, etc.
2. **PRESERVE ALL CONTENT** - NEVER delete jobs, education entries, skills, or bullet points!
3. **NO PLACEHOLDERS** - Use actual values (name, email, etc.) NOT placeholder text like [Full Name]
4. **USE LINE BREAKS** - Each section header, job entry, and bullet point should be on its own line
5. The "optimizedCV" must be NOTICEABLY better - enhanced wording, added metrics, stronger verbs
6. **SKILL ADDITIONS MUST BE IN optimizedCV** - If the candidate provided skills to add, they MUST appear in the optimizedCV output text, not just in suggestedChanges!
3. Add reasonable metrics even if not explicit in original (use industry benchmarks)
4. Every bullet should start with a power verb
5. The SUMMARY section is MANDATORY - if original has no summary, CREATE one based on their experience and target job. Must be 3-4 sentences as a paragraph
6. Provide 6-10 suggestedChanges covering ALL major sections
7. Keywords in "missing" should be added to the optimizedCV where natural
8. The optimizedCV must start with: Name, Title, Contact, then SUMMARY section (as a paragraph)
9. **VERIFICATION**: Before finalizing, count sections in original vs optimized - optimized should have EQUAL OR MORE content

Return ONLY the JSON object.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a world-class executive resume writer who transforms average CVs into interview-winning documents. You are creative, bold, and know exactly what recruiters want to see. Always respond with valid JSON only.",
        },
        {
          role: "user",
          content: analysisPrompt,
        },
      ],
      temperature: 0.8, // Higher for more creative optimization
      max_tokens: 8000, // Ensure enough space for comprehensive rewrite
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content || "";
    
    // Log for debugging skill additions
    if (deepDiveAnswers?.hiddenSkills) {
      console.log("=== CHECKING SKILL ADDITIONS IN RESPONSE ===");
      console.log("Expected skills:", deepDiveAnswers.hiddenSkills);
      console.log("Response includes 'suggestedChanges':", content.includes("suggestedChanges"));
    }
    
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
