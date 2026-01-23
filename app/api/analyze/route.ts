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

    // Analyze CV against job description using OpenAI - COMPREHENSIVE OPTIMIZATION
    const analysisPrompt = `You are a Senior Technical Recruiter and ATS Auditor who also transforms resumes.
You must FIRST score the original CV, THEN optimize it.

════════════════════════════════════════════════════════════════════════════════
PHASE 1: SCORE THE ORIGINAL CV (Before Any Optimization!)
════════════════════════════════════════════════════════════════════════════════
⚠️ Score based ONLY on the original CV. Do NOT score your improvements.

### SCORING PHILOSOPHY
- **80+ is HARD to achieve** - Reserved for near-perfect matches
- **60-79 is the "Good Fit" zone** - Same role family, reasonable experience
- **40-59 is "Needs Work"** - Gaps exist but potential is there  
- **Below 40 is "Mismatch"** - Career change or fundamental gaps

### STEP 1: KNOCKOUT CHECK (Apply ONLY if there's a FUNDAMENTAL mismatch)
────────────────────────────────────────────────────
These caps apply ONLY when the career track is completely different:

| Current Background | Target Role | MAX SCORE |
|--------------------|-------------|-----------|
| Analyst (any type) | Software Engineer/Developer | MAX 45 |
| Product Manager | Software Engineer | MAX 40 |
| Marketing/Sales/BD | Technical Engineering Role | MAX 35 |
| Legal/HR/Finance | Technical Role | MAX 30 |
| Completely unrelated field | Any role | MAX 35 |

⚠️ If roles ARE in the same family (e.g., Dev→Dev, Analyst→Analyst, PM→PM), skip this step!

### STEP 2: SENIORITY CHECK (Apply when there's a level gap)
────────────────────────────────────────────────────
| Candidate Level | Target Level | MAX SCORE |
|-----------------|--------------|-----------|
| Junior (0-2 YOE) | Senior (5+ req) | MAX 45 |
| Junior (0-2 YOE) | Mid (3+ req) | MAX 60 |
| Mid (2-4 YOE) | Senior (5+ req) | MAX 65 |
| Mid (2-4 YOE) | Lead/Staff | MAX 55 |

⚠️ If seniority MATCHES or EXCEEDS requirements, skip this step!

### STEP 3: TECH STACK CHECK (Deductions for missing skills)
────────────────────────────────────────────────────
- If candidate has <50% of required tech stack: -10 points
- If candidate has <25% of required tech stack: -20 points

### STEP 4: CALCULATE FINAL SCORE
────────────────────────────────────────────────────
**FOR GOOD MATCHES (same role family + right seniority):**
- Start at 75 (baseline for a match)
- +5 to +15 for exceeding requirements
- -5 to -15 for minor gaps (some missing skills, slightly less experience)
- Result: Typically 60-85 range

**FOR MISMATCHES (different career track OR major seniority gap):**
- Apply the MAX SCORE cap from Steps 1-2
- Then adjust within that cap based on transferable skills

### SCORE BANDS
────────────────────────────────────────────────────
| Score | Who Gets This |
|-------|---------------|
| 85-100 | RARE: Perfect role match + exceeds seniority + 90%+ tech stack |
| 75-84 | STRONG: Same role, right seniority, 70%+ tech stack |
| 65-74 | GOOD: Same role family, minor experience gap OR some skill gaps |
| 55-64 | MODERATE: Related role, noticeable gaps but has potential |
| 45-54 | WEAK: Adjacent field OR significant seniority gap |
| 30-44 | POOR: Career change scenario, limited transferable skills |
| 0-29 | REJECT: Completely unrelated, no relevant experience |

### CALIBRATION EXAMPLES
────────────────────────────────────────────────────
**MISMATCHES (Use low scores):**
- Product Analyst → Senior Software Engineer: **35-45** (different track)
- Marketing Manager → Developer: **28-35** (different field)
- Lawyer → Software Engineer: **25-32** (completely different)
- Junior Dev (1y) → Senior Dev (5+ req): **40-48** (huge seniority gap)

**GOOD MATCHES (Use 60-80 range):**
- Senior Python Dev → Senior Python Dev: **80-90** (great match!)
- Senior Java Dev → Senior Python Dev: **68-76** (same role, tech gap)
- Mid React Dev → Mid React Dev: **75-82** (solid match)
- Senior Dev → Senior Dev (different stack): **65-75** (role match, skill gap)
- Data Analyst → Data Analyst (same level): **72-80** (good match!)
- Product Manager → Product Manager: **75-85** (same role!)

**BORDERLINE (Use 50-65 range):**
- Mid Dev → Senior Dev: **55-65** (close but seniority gap)
- Junior Dev → Mid Dev: **55-62** (reasonable stretch)
- Data Scientist → ML Engineer: **60-70** (related but different)

════════════════════════════════════════════════════════════════════════════════
PHASE 2: OPTIMIZE THE CV (Do This AFTER Scoring)
════════════════════════════════════════════════════════════════════════════════
Now transform the CV to maximize interview chances (but the score stays based on ORIGINAL).

## CANDIDATE'S CURRENT CV (Score THIS version, not your improvements):
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

## ⚠️ CRITICAL PRESERVATION RULES (MANDATORY - DO NOT VIOLATE!):
**ZERO TOLERANCE FOR CONTENT DELETION!**

### SECTIONS THAT MUST APPEAR IN optimizedCV (if present in original):
- ✅ PROFESSIONAL SUMMARY (mandatory)
- ✅ EXPERIENCE - ALL jobs, ALL bullets
- ✅ EDUCATION - ALL entries
- ✅ SKILLS - ALL skills (add more, never remove)
- ✅ MILITARY SERVICE / ARMY - MUST KEEP if present!
- ✅ VOLUNTEERING / VOLUNTEER WORK - MUST KEEP if present!
- ✅ AWARDS / HONORS / ACHIEVEMENTS - MUST KEEP if present!
- ✅ PROJECTS - MUST KEEP if present!
- ✅ CERTIFICATIONS - MUST KEEP if present!
- ✅ LANGUAGES - MUST KEEP if present!
- ✅ PUBLICATIONS - MUST KEEP if present!

### CONTACT INFO - DO NOT MODIFY:
- ✅ Name: Keep EXACTLY as written
- ✅ Email: Keep EXACTLY as written  
- ✅ Phone: Keep EXACTLY as written
- ✅ LinkedIn URL: Keep EXACTLY as written (do not reformat or shorten)
- ✅ Location: Keep as written

### JOB TITLES - DO NOT SHORTEN OR GENERALIZE:
- ❌ WRONG: "Creator of XYZ Podcast" → "Creator"
- ✅ CORRECT: "Creator of XYZ Podcast" → "Creator of XYZ Podcast" (keep full context!)
- ❌ WRONG: "Founder & CEO of TechStartup Inc." → "Founder"
- ✅ CORRECT: Keep the FULL title with company/project names intact
- Only fix obvious typos. NEVER simplify or abbreviate titles.

### SKILLS - DO NOT INVENT PROFICIENCY LEVELS:
- ❌ WRONG: Adding random skill levels like "Python: 85%" or "JavaScript: Level 7"
- ✅ CORRECT: List skills as plain text without arbitrary percentages
- If the original CV has skill levels, keep them as-is
- If the original has NO levels, do NOT add any - just list the skill names
- Do NOT invent "Expert/Intermediate/Beginner" labels unless the user wrote them

### VERIFICATION CHECKLIST (Apply before output):
1. Count sections in ORIGINAL → Count sections in OUTPUT → Must be EQUAL or MORE
2. Count jobs in ORIGINAL → Count jobs in OUTPUT → Must be EQUAL
3. Count education entries in ORIGINAL → OUTPUT → Must be EQUAL
4. If original has Military/Volunteering/Awards → OUTPUT MUST have them

If the original has 5 bullet points for a job → the optimized version must have AT LEAST 5 bullets (can add more)
If the original has 3 skills → the optimized version must have AT LEAST 3 skills (can add more)

You are REFINING and ENHANCING, never reducing or summarizing!

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
  "overallScore": <PHASE 1 SCORE using calibration above. 80+ is RARE. Good matches=65-79. Mismatches=below 45>,
  "summary": "<Honest assessment. For good matches: highlight strengths. For mismatches: acknowledge the gap>",
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
