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
      } catch {
        // Ignore parse errors
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

    // DEBUG: Log what job context we received
    console.log("=== JOB CONTEXT DEBUG ===");
    console.log("Received jobTitle:", jobTitle);
    console.log("Received jobDescription length:", jobDescription?.length || 0);
    console.log("Final effectiveJobTitle:", effectiveJobTitle);
    console.log("========================");

    // Analyze CV against job description using OpenAI - COMPREHENSIVE OPTIMIZATION
    const analysisPrompt = `You are a SENIOR TECHNICAL RECRUITER and ATS AUDITOR who also transforms resumes.
You must FIRST score the original CV ruthlessly, THEN optimize it.

════════════════════════════════════════════════════════════════════════════════
PHASE 1: SCORE THE ORIGINAL CV (Do This FIRST - Before Any Optimization!)
════════════════════════════════════════════════════════════════════════════════
⚠️ CRITICAL: Calculate overallScore based ONLY on the original CV below. 
Do NOT score your improvements.

**TARGET ROLE: ${effectiveJobTitle}**

### ⭐ STEP 1: DIRECT TITLE MATCH CHECK (The "Golden Ticket")
────────────────────────────────────────────────────
Look at the candidate's **CURRENT or MOST RECENT** job title (the FIRST job in their experience).
⚠️ IGNORE older history like Military Service, Internships from years ago, etc.

**Does their CURRENT title semantically match "${effectiveJobTitle}"?**

Examples of MATCHES:
- "Product Analyst" → "Product Analyst" ✅ MATCH
- "Product Analyst" → "Strategic Product Analyst" ✅ MATCH
- "Data Analyst" → "Product Analyst" ✅ CLOSE MATCH (same family)
- "Junior Product Analyst" → "Product Analyst" ✅ MATCH (seniority differs, role same)

**IF TITLE MATCHES:** 
→ BYPASS all "Domain Mismatch" penalties!
→ BASE SCORE = 70 (minimum)
→ Proceed directly to Step 3 for skill/seniority adjustments

**IF TITLE DOES NOT MATCH:** 
→ Proceed to Step 2

### STEP 2: DOMAIN CHECK (Only if Step 1 failed)
────────────────────────────────────────────────────
If the candidate is pivoting careers (e.g., Military → Tech, Teacher → Analyst):

**Check for Transferable Skills:**
- Data Analysis, SQL, Python, Excel → +15 points
- Leadership, Project Management → +10 points  
- Relevant degree (Business, Data Science, CS) → +10 points
- Bootcamp/Certification in target field → +10 points

**If NONE of the above AND unrelated field:**
- Chef → Coder with no tech background → MAX 35
- Lawyer → Engineer with no tech → MAX 35

### STEP 3: SENIORITY & SKILLS ADJUSTMENT
────────────────────────────────────────────────────
**Seniority Check:**
- Junior applying for Entry/Junior/Mid → NO PENALTY (this is normal!)
- Junior applying for Senior/Lead → Cap at 60
- Mid applying for Senior → Cap at 70
- Matches/Exceeds requirements → +5 to +10 bonus

**Skills Check (for "${effectiveJobTitle}"):**
- Has critical keywords from job description (SQL, Python, Tableau, etc.)? → +10 to +15 points
- Relevant degree or certification? → +5 to +10 points
- Missing major required skills? → -10 to -15 points

### STEP 4: FINAL SCORE BANDS (HIGH VARIANCE!)
────────────────────────────────────────────────────
**Be decisive! Good fits get HIGH scores. Bad fits get LOW scores.**

| Score | Fit Level | Who Gets This |
|-------|-----------|---------------|
| 85-95 | GREAT FIT | Same role + right seniority + strong skills |
| 75-84 | GOOD FIT | Same role family, minor gaps |
| 60-74 | PARTIAL FIT | Related field OR seniority gap, but potential |
| 45-59 | WEAK FIT | Career pivot, limited overlap |
| 20-44 | NO FIT | Different domain, no relevant experience |

### CALIBRATION EXAMPLES (USE HIGH VARIANCE!):
────────────────────────────────────────────────────
**GREAT FIT (80-95):**
- "Product Analyst" → "Product Analyst": **85-92**
- "Senior React Dev" → "Senior React Dev": **88-95**
- "Data Analyst" → "Data Analyst": **82-90**

**GOOD FIT (70-84):**
- "Product Analyst" → "Senior Product Analyst": **72-80** (seniority gap)
- "Data Analyst" → "Product Analyst": **70-78** (close family)
- "Junior Dev" → "Mid Dev": **68-75** (reasonable stretch)

**PARTIAL FIT (50-70):**
- "Business Analyst" → "Product Manager": **58-68** (related but different)
- "Military Officer" → "Project Manager": **55-65** (leadership transfers)
- "Mid Dev" → "Senior Dev": **52-62** (experience gap)

**WEAK/NO FIT (20-50):**
- "Marketing Manager" → "Software Engineer": **30-40** (different domain)
- "Chef" → "Product Analyst": **22-32** (no overlap)
- "Lawyer" → "Developer": **25-35** (career change)

════════════════════════════════════════════════════════════════════════════════
PHASE 2: OPTIMIZE THE CV (Do This AFTER Scoring)
════════════════════════════════════════════════════════════════════════════════
Now transform the CV to maximize interview chances.

## CANDIDATE'S CURRENT CV (Score THIS version):
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
## CANDIDATE'S ADDITIONAL CONTEXT (FROM AI DEEP DIVE - USE THIS TO ENHANCE THE CV!):

### Hidden Achievements the candidate wants highlighted:
${deepDiveAnswers.achievements || "Not provided"}

### Skills & Tools NOT currently on CV (ADD THESE!):
${deepDiveAnswers.hiddenSkills || "Not provided"}

### Candidate's Unique Value Proposition:
${deepDiveAnswers.uniqueValue || "Not provided"}

IMPORTANT: The above information was provided directly by the candidate. You MUST incorporate this into the optimized CV:
- Add the unlisted skills to the Skills section
- Weave the achievements into relevant experience bullets with metrics
- Use the unique value proposition in the Professional Summary
` : ""}

## YOUR MISSION:
Transform this CV into a POWERFUL, interview-winning document that will make recruiters stop and take notice. You must create a NOTICEABLY BETTER version.

## ⚠️ STRICT CONTENT PRESERVATION RULES (MANDATORY - ZERO TOLERANCE!)
**ANTI-DELETION POLICY: You are ONLY allowed to ENHANCE text, NEVER delete entries!**

### 🔢 RULE 1: ARRAY FLATTENING - NO COLLAPSING! (CRITICAL!)
────────────────────────────────────────────────────
**When merging Military into Experience, FLATTEN the arrays - do NOT collapse!**

**MATH RULE:**
- If input has 2 civilian jobs + 3 military roles = Output MUST have 5 DISTINCT entries
- If input has 3 jobs + 2 volunteer roles = Output MUST have 5 DISTINCT entries
- NEVER combine multiple roles into one "summary" entry

**Example of WRONG behavior (COLLAPSING - DO NOT DO THIS!):**
- Input: Captain (2020-2022), Lieutenant (2018-2020), Commander (2016-2018)
- ❌ WRONG: One entry called "Military Service | Air Force | 2016-2022" (collapsed 3 into 1!)
- ✅ CORRECT: THREE separate entries:
  1. Captain | Air Force | 2020-2022
  2. Lieutenant | Air Force | 2018-2020  
  3. Commander | Air Force | 2016-2018

**Each role is a SEPARATE entry with its own:**
- Title/Role
- Organization/Unit
- Date range
- Bullet points

### 🎖️ RULE 2: CONTENT PRESERVATION (No Collapsing!)
────────────────────────────────────────────────────
Military/Volunteering sections are OPTIONAL - merge into Experience or keep separate, your choice.
BUT the CONTENT must be preserved - each role stays as its own entry!

- ✅ You CAN merge Military into Experience section
- ✅ You CAN keep Military as separate section  
- ✅ You CAN enhance/rewrite descriptions
- ❌ You CANNOT collapse 3 roles into 1 entry
- ❌ You CANNOT summarize multiple positions into one

**KEY: 3 military roles = 3 entries in output (wherever you put them)**

### 📋 RULE 3: SECTIONS IN OUTPUT
────────────────────────────────────────────────────
Required sections:
- ✅ PROFESSIONAL SUMMARY (mandatory - create if missing)
- ✅ EXPERIENCE - ALL jobs + any merged military/volunteer roles
- ✅ EDUCATION - ALL entries with GPA if present
- ✅ SKILLS - ALL skills (add more, never remove)

Optional sections (keep if in original, or merge into Experience):
- MILITARY SERVICE - keep separate OR merge into Experience
- VOLUNTEERING - keep separate OR merge into Experience
- AWARDS / HONORS
- PROJECTS
- CERTIFICATIONS
- ✅ LANGUAGES - EVERY language

### ✏️ RULE 4: WHAT YOU CAN CHANGE
────────────────────────────────────────────────────
- ✅ Rewrite bullet points with better action verbs
- ✅ Add metrics and quantifiable achievements
- ✅ Add keywords from job description
- ✅ Improve grammar and professional tone
- ✅ ADD new bullet points (never remove existing ones)
- ✅ ADD new skills (never remove existing ones)

### 🚫 RULE 5: WHAT YOU CANNOT CHANGE
────────────────────────────────────────────────────
- ❌ Delete ANY job/role/position
- ❌ Delete ANY military entry
- ❌ Delete ANY volunteering entry
- ❌ Delete ANY education entry
- ❌ Delete ANY bullet point
- ❌ Merge sections together
- ❌ Shorten job titles
- ❌ Modify contact info (name, email, phone, LinkedIn)
- ❌ Add fake skill percentages

### 🔗 RULE 6: CONTACT & LINKS IMMUNITY (SACRED!)
────────────────────────────────────────────────────
The contact information is UNTOUCHABLE. Return it EXACTLY as provided:

- **LinkedIn URL:** Copy VERBATIM. Do NOT reformat, shorten, or "clean up" the URL.
  - ❌ WRONG: "linkedin.com/in/johnsmith" → "LinkedIn Profile"
  - ❌ WRONG: "https://www.linkedin.com/in/john-smith-123" → "linkedin.com/in/john"
  - ✅ CORRECT: "https://www.linkedin.com/in/john-smith-123" → "https://www.linkedin.com/in/john-smith-123"

- **Email:** Copy EXACTLY as written
- **Phone:** Copy EXACTLY as written (including country codes, formatting)
- **Portfolio/Website:** Copy EXACTLY as written
- **GitHub:** Copy EXACTLY as written

**If the original has a LinkedIn URL, the output MUST have the EXACT same URL!**

### 🎓 RULE 7: EDUCATION FIDELITY (GPA & GRADES ARE SACRED!)
────────────────────────────────────────────────────
In the Education section, you MUST preserve ALL academic details:

- **GPA:** If original says "GPA: 3.8" or "GPA: 95", output MUST include it!
- **Grades:** If original says "Grade: 110/110" or "Average: 92", KEEP IT!
- **Honors:** If original says "Magna Cum Laude" or "Dean's List", KEEP IT!
- **Thesis:** If original mentions thesis title, KEEP IT!
- **Relevant Coursework:** If listed, KEEP IT!

**Examples:**
- ❌ WRONG: "B.S. Computer Science | MIT | 2020" (removed GPA)
- ✅ CORRECT: "B.S. Computer Science | MIT | 2020 | GPA: 3.9"

- ❌ WRONG: Deciding GPA is "irrelevant" and deleting it
- ✅ CORRECT: Always include GPA/Grades if the original had them

**The user included their GPA for a reason - NEVER remove it!**

### 📊 PRE-OUTPUT VERIFICATION (Do this before responding!):
────────────────────────────────────────────────────
1. COUNT all roles/jobs in original (Experience + Military + Volunteering combined)
2. COUNT all entries in your output Experience section
3. **MATH CHECK:** If you merged Military into Experience:
   - Original: 2 jobs + 3 military = 5 total
   - Output Experience MUST have 5 entries (not 3!)
4. CHECK: Did you collapse multiple roles into one? If yes, UNDO IT!
5. CHECK LinkedIn URL → Must be IDENTICAL to original
6. CHECK GPA/Grades in Education → Must be present if original had them
7. CHECK each military role appears as its own entry with own dates

**FAILURE CONDITIONS:**
- If output has FEWER entries than input → FAILED (you collapsed roles!)
- If 3 military roles became 1 entry → FAILED (undo the merge!)
- If LinkedIn URL is missing or modified → FAILED
- If GPA/Grades are missing from Education → FAILED

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

### 5. PROFESSIONAL SUMMARY REWRITE
Create a COMPELLING 3-4 sentence summary that:
- Opens with years of experience + core expertise
- Highlights 2-3 key achievements with metrics
- Aligns perfectly with the target role
- Includes 3-5 critical keywords

## OUTPUT FORMAT (JSON):
{
  "overallScore": <Score from Phase 1 algorithm - use calibration examples>,
  "summary": "<Honest 1-sentence assessment of the original CV's fit for the TARGET ROLE>",
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
  "optimizedCV": "<THE COMPLETE TRANSFORMED CV in this EXACT format:

[Full Name - EXACT as original]
[Professional Title]
[email - EXACT] | [phone - EXACT] | [location] | [linkedin URL - EXACT, no reformatting]

PROFESSIONAL SUMMARY
[A compelling 3-4 sentence summary highlighting years of experience, key achievements with metrics, and career focus aligned to target role]

EXPERIENCE
[Job Title] | [Company] | [Date Range]
• [Achievement bullet with metrics]
• [Achievement bullet with metrics]
[...ALL jobs from original, enhanced but not removed...]

EDUCATION
[Degree] | [Institution] | [Date]
[...ALL education entries from original...]

SKILLS
[Skill 1], [Skill 2], [Skill 3]... [...ALL skills from original plus additions...]

MILITARY SERVICE (if in original - MANDATORY to include!)
[Role] | [Unit] | [Date Range]
• [Enhanced bullet]

VOLUNTEERING (if in original - MANDATORY to include!)
[Role] | [Organization] | [Date Range]
• [Enhanced bullet]

AWARDS & HONORS (if in original - MANDATORY to include!)
• [Award name - Year]

CERTIFICATIONS (if in original - MANDATORY to include!)
• [Certification name]

LANGUAGES (if in original - MANDATORY to include!)
• [Language - Level]

IMPORTANT: 
1. PROFESSIONAL SUMMARY is MANDATORY
2. ALL sections from the original MUST appear in output
3. Contact info (email, phone, linkedin) must be VERBATIM from original>"
}

## CRITICAL REMINDERS:
1. **PRESERVE EVERYTHING** - The optimizedCV must contain ALL content from the original. NEVER delete jobs, education, skills, or bullets!
2. The "optimizedCV" must be NOTICEABLY better - enhanced wording, added metrics, stronger verbs
3. Add reasonable metrics even if not explicit in original (use industry benchmarks)
4. Every bullet should start with a power verb
5. The PROFESSIONAL SUMMARY section is MANDATORY - it MUST appear in the optimizedCV as a complete paragraph (3-4 sentences)
6. Provide 6-10 suggestedChanges covering ALL major sections
7. Keywords in "missing" should be added to the optimizedCV where natural
8. The optimizedCV must start with: Name, Title, Contact, then "PROFESSIONAL SUMMARY" header followed by the summary paragraph
9. **VERIFICATION**: Before finalizing, count sections in original vs optimized - optimized should have EQUAL OR MORE content
10. **MILITARY/VOLUNTEERING/AWARDS**: If the original CV has these sections, they MUST appear in optimizedCV - this is NON-NEGOTIABLE!
11. **CONTACT INFO**: Email, phone, and LinkedIn URL must be copied EXACTLY - do not modify or reformat URLs!

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
