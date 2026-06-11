import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { extractText } from "unpdf";
import { fetchJobDescription } from "@/lib/jobFetcher";
import { auth, currentUser } from "@clerk/nextjs/server";
import { sendOptimizeNotification } from "@/lib/email";
import { getPostHogClient } from "@/lib/posthog-server";
import { prisma } from "@/lib/prisma";
import { extractBalancedJson } from "@/lib/extractJson";
import { FREE_CREDITS_FOR_NEW_USER } from "@/lib/credits";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Fire a server-side optimize_failed event so failures stay visible in PostHog
// even when the client never reports them (e.g. user closes the tab on error).
function fireOptimizeFailedServer(
  userId: string,
  reason: "truncated" | "parse_error" | "no_json" | "model_error",
  props: Record<string, unknown> = {}
) {
  try {
    const ph = getPostHogClient();
    if (!ph) return;
    ph.capture({
      distinctId: userId,
      event: "optimize_failed_server",
      properties: { failure_reason: reason, ...props },
    });
    void ph.shutdown();
  } catch (err) {
    console.error("[analyze] failed to fire optimize_failed_server:", err);
  }
}

// Normalize the `improvements` field into the redesign-v2 shape. Accepts:
//   - new shape: Array<{ text, scoreImpact, category }>
//   - legacy: string[]
//   - mixed bag with missing fields
// Always returns a non-empty list (or [] if there is truly nothing).
export type NormalizedImprovement = {
  id: string;
  text: string;
  scoreImpact: number;
  category: "ats" | "impact" | "clarity";
};

function normalizeImprovements(raw: unknown): NormalizedImprovement[] {
  if (!Array.isArray(raw)) return [];
  const out: NormalizedImprovement[] = [];
  raw.forEach((item, i) => {
    if (typeof item === "string") {
      out.push({
        id: `imp_${i}`,
        text: item,
        scoreImpact: 0,
        category: "impact",
      });
    } else if (item && typeof item === "object") {
      const obj = item as Record<string, unknown>;
      const text = String(obj.text ?? obj.improvement ?? "").trim();
      if (!text) return;
      let scoreImpact = Number(obj.scoreImpact ?? obj.score_impact ?? 0);
      if (!Number.isFinite(scoreImpact)) scoreImpact = 0;
      scoreImpact = Math.max(0, Math.min(15, Math.round(scoreImpact)));
      const catRaw = String(obj.category ?? "impact").toLowerCase();
      const category: NormalizedImprovement["category"] =
        catRaw === "ats" || catRaw === "clarity" ? catRaw : "impact";
      out.push({ id: `imp_${i}`, text, scoreImpact, category });
    }
  });
  // Stable sort: highest impact first, fall back to original order.
  return out
    .map((imp, idx) => ({ imp, idx }))
    .sort((a, b) => b.imp.scoreImpact - a.imp.scoreImpact || a.idx - b.idx)
    .map(({ imp }) => imp);
}

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
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "Missing required environment variable: ANTHROPIC_API_KEY" },
        { status: 500 }
      );
    }

    // Auth + credits are enforced HERE, not by a separate client-side
    // /api/use-credit call — otherwise skipping that call gives unlimited free
    // optimizations. The optimizer UI already requires sign-in before calling.
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = await currentUser();
    const userEmail = user?.emailAddresses[0]?.emailAddress || "no-email";

    // Ensure the User row exists (mirrors /api/use-credit) and check the
    // balance up front so we don't burn a Claude call for a user with 0.
    // The actual decrement happens AFTER the work succeeds, in the same
    // transaction that persists the analysis (see below) — failures are
    // never charged, so no refund endpoint is needed.
    const dbUser = await prisma.user.upsert({
      where: { id: userId },
      update: { email: userEmail },
      create: {
        id: userId,
        email: userEmail,
        credits: FREE_CREDITS_FOR_NEW_USER,
      },
    });
    if (dbUser.credits <= 0) {
      return NextResponse.json(
        { error: "Insufficient credits", code: "INSUFFICIENT_CREDITS" },
        { status: 402 }
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

    let finalJobDescription = jobDescription;
    if (jobUrl && !jobDescription) {
      const result = await fetchJobDescription(jobUrl, anthropic);
      if (!result.ok) {
        return NextResponse.json(
          result.hint ? { error: result.error, hint: result.hint } : { error: result.error },
          { status: result.status }
        );
      }
      finalJobDescription = result.description;
    }

    // Validation: Quick mode skips role requirement; targeted modes still need jobTitle or jobDescription.
    const isQuickMode = mode === "quick";
    const hasJobContext = finalJobDescription?.trim() || jobTitle?.trim();

    if (!isQuickMode && !hasJobContext) {
      return NextResponse.json(
        { error: "Please provide a Job Title, Job Description, or URL to continue." },
        { status: 400 }
      );
    }

    const effectiveJobTitle =
      cleanTitle(jobTitle) ||
      (finalJobDescription ? inferJobTitleFromDescription(finalJobDescription, companyName) : "") ||
      (isQuickMode ? "General Role" : "Role");

    // DEBUG: Log what job context we received
    console.log("=== JOB CONTEXT DEBUG ===");
    console.log("Received jobTitle:", jobTitle);
    console.log("Received jobDescription length:", jobDescription?.length || 0);
    console.log("Final effectiveJobTitle:", effectiveJobTitle);
    console.log("========================");

    const quickModeOverride = isQuickMode
      ? `\n════════════════════════════════════════════════════════════════════════════════
QUICK-OPTIMIZE MODE (no target role provided)
════════════════════════════════════════════════════════════════════════════════
The candidate did NOT supply a specific target role. They want a polished,
generally-strong CV — not a job-specific tailor.

DO THIS INSTEAD OF JOB-MATCH SCORING:
1. Infer the candidate's current/desired role from the most recent position in their CV.
   Use that as "TARGET ROLE" below.
2. Score them as "best-in-class CV for someone in their own field" (NOT as a job-match).
3. Use the same bands but interpret them as overall CV quality, not role fit:
   - 85-95: Excellent CV, recruiter-ready, ATS-optimized
   - 75-84: Strong CV with minor polish needed
   - 60-74: Decent baseline, several gaps in impact/keywords
   - 45-59: Weak presentation, lacks metrics/structure
   - 20-44: Needs substantial rewrite
4. SKIP the domain-mismatch penalties (no domain to mismatch against).
5. SKIP the seniority gap penalty (no job seniority to compare to).
6. Focus optimization on: impact framing, action verbs, metrics surfacing,
   ATS keyword coverage for the inferred role, summary strength, clarity.
7. \`missingKeySkills\` should list skills typically expected for the inferred
   role that the CV doesn't surface (not role-specific gaps).

════════════════════════════════════════════════════════════════════════════════
`
      : "";

    // Analyze CV against job description using OpenAI - COMPREHENSIVE OPTIMIZATION
    const analysisPrompt = `${quickModeOverride}You are a SENIOR TECHNICAL RECRUITER and ATS AUDITOR who also transforms resumes.
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
**Seniority Check (HIGH IMPACT - seniority gaps are a major factor!):**

First, calculate the EXPERIENCE GAP = (JD required years) - (candidate's relevant years).

| Experience Gap | Impact on Score |
|----------------|-----------------|
| 0 or negative (meets/exceeds) | +5 to +10 bonus |
| 1-2 years short | -10 points, cap at 75 |
| 3-4 years short | -20 points, cap at 60 |
| 5+ years short (e.g., 0 YOE vs 5+ req) | -30 points, cap at 45 |
| Intern/Student → Any Senior role | -35 points, cap at 40 |

**⚠️ This is a HARD CAP - the final score CANNOT exceed the cap regardless of other factors.**
- A candidate with 0 relevant experience applying for a 5+ year role should score NO HIGHER than 45, even with a perfect title and skill match.
- The experience gap penalty STACKS with domain mismatch penalties.

**Skills Check (for "${effectiveJobTitle}") - PROPORTIONAL SCORING:**

First, count how many distinct required skills/technologies are listed in the JD.

**Scaling by number of required skills:**
- JD lists 15-20+ skills: Expect ~55-65% match. Having 60% is GOOD. Don't punish heavily for gaps.
- JD lists 10-14 skills: Expect ~65-75% match.
- JD lists 5-9 skills: Expect ~75-85% match.
- JD lists 1-4 skills: Expect ~85-95% match.

**Scoring adjustments:**
- Meets expected match % for the skill count → +10 to +15 points
- Relevant degree or certification → +5 to +10 points
- Below expected match % → -5 to -10 points (MILD penalty)
- Has RELEVANT EXPERIENCE in the domain even if specific tool names differ → +5 to +10 points (e.g., knows React but JD says Vue - both are frontend frameworks)

**⚠️ DO NOT over-penalize missing skills when:**
- The candidate has relevant domain experience (transferable knowledge)
- The JD lists a large number of skills (20+ skills is a wish list, not a hard requirement)
- The missing skills are "nice to have" rather than core to the role
- The candidate has equivalent/similar technologies (e.g., PostgreSQL vs MySQL, AWS vs Azure)

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

IMPORTANT: The user provided their own summary. Improve it to be:
- 3-4 lines (comprehensive and strong)
- Narrative-driven (builds professional story, NO detailed metrics/numbers)
- ENHANCE with high-level experience context:
  - Company types: "experience in high-tech companies", "Fortune 500 background"
  - Leadership: "track record in leadership", "experience leading teams"
  - Industry: "experience in fintech", "background in healthcare"
  - Role progression: "progressive experience in..."
- CAN mention high-level expertise/skills from other sections
- DO NOT detail specific achievements or metrics
- Include industry keywords naturally
- Make it compelling and role-specific
- Elevate the language to executive level
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
- ❌ Remove or omit company names from Experience entries
- ❌ Generalize company names (e.g., "Tech Company" instead of actual name)

### 🏢 RULE 5B: COMPANY NAMES ARE MANDATORY (CRITICAL!)
────────────────────────────────────────────────────
Every Experience entry MUST include the company name:

- ❌ WRONG: "Software Engineer | 2020-2022" (missing company!)
- ❌ WRONG: "Product Analyst | Tech Company" (generalized!)
- ✅ CORRECT: "Product Analyst | Taboola | 2020-2022"
- ✅ CORRECT: "Software Engineer | Google | 2018-2020"

**If the original CV has a company name, the output MUST have the EXACT same company name!**

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
8. **CHECK COMPANY NAMES:** Every Experience entry MUST have company name!
   - If original had "Product Analyst | Taboola | 2020-2022"
   - Output MUST have "Taboola" (not missing, not generalized!)

**FAILURE CONDITIONS:**
- If output has FEWER entries than input → FAILED (you collapsed roles!)
- If 3 military roles became 1 entry → FAILED (undo the merge!)
- If LinkedIn URL is missing or modified → FAILED
- If GPA/Grades are missing from Education → FAILED
- If ANY Experience entry is missing company name → FAILED
- If company name is generalized (e.g., "Tech Company") → FAILED

## TRANSFORMATION GOALS:
1. **EXECUTIVE-LEVEL QUALITY** - Strategic, high-level language focused on business outcomes
2. **QUANTIFIABLE IMPACT** - Lead with metrics (%, $, numbers) when available in original CV
3. **ATS OPTIMIZED** - Standard headers, industry keywords, no special formatting
4. **PRESERVES TRUTH** - ONLY use metrics/numbers that exist in the original CV

## STRUCTURE RULES (MANDATORY):

### 1. PROFESSIONAL SUMMARY (CONCISE NARRATIVE - ENHANCE WITH HIGH-LEVEL CONTEXT!)
Write a STRONG, narrative-building summary (3-4 lines):
- **Build a narrative** - Tell the story of who they are professionally, not what they did
- **Core strengths and unique value** - What makes them special
- **Career direction** - Where they're heading, aligned to target role
- **USE high-level experience context** to strengthen the narrative:
  - Company types/industries: "experience in high-tech companies", "Fortune 500 background", "startup experience"
  - Leadership track record: "track record in leadership", "experience leading cross-functional teams"
  - Industry expertise: "experience in fintech", "background in healthcare technology"
  - Role progression: "progressive experience in product management"
- **CAN mention:** High-level expertise areas, skills, or background from other sections
- **DO NOT detail:** Specific achievements, metrics, percentages, numbers, or quantifiable results
- **DO NOT mention:** GPA, revenue figures, team sizes, or other detailed metrics
- **CAN mention:** Years of experience (e.g., "8+ years of experience", "5 years in product management")
- **Style:** Strategic, compelling, narrative-driven - like a professional brand statement

Example tone: "Strategic Product Manager with experience in high-tech companies and a track record in cross-functional leadership. Known for transforming product vision into market success through data-driven decision making and innovative go-to-market strategies."

❌ WRONG: "Product Manager with 8+ years of experience driving $50M+ product portfolios and managing teams of 12+ members..." (detailed metrics like $50M, 12+ members)
✅ CORRECT: "Product Manager with 8+ years of experience in high-tech companies and a track record in cross-functional leadership..."
❌ WRONG: "Led team that increased revenue by 35% and reduced costs by $500K..." (detailed achievements)
✅ CORRECT: "Product Analyst with experience in high-tech companies and a track record in data-driven decision making. Expert in transforming product vision into market success."
✅ CORRECT: "Software Engineer with progressive experience in full-stack development at Fortune 500 companies. Known for building scalable systems and leading technical initiatives."
✅ CORRECT: "Data Scientist with experience in fintech and healthcare, specializing in machine learning and predictive analytics. Track record in delivering impactful data solutions."

### 2. EDUCATION SECTION (PRESERVE EVERYTHING!)
⚠️ NEVER delete or shorten education entries. Include ALL details:
- ✅ University/Institution name (full name)
- ✅ Degree and major/field of study
- ✅ GPA if provided (especially if 3.5+ or equivalent)
- ✅ Graduation year or date range
- ✅ Honors, distinctions (Cum Laude, Dean's List, etc.)
- ✅ Relevant coursework if listed
- ✅ Thesis title if mentioned
- ❌ NEVER remove any education entry

### 3. BULLET POINTS PER ROLE (Length-Aware & Concise!)

**⚠️ CRITICAL FIRST STEP: ASSESS ORIGINAL CV LENGTH BEFORE ANY EDITING**
Before writing a single word, evaluate the original CV:

**LENGTH CLASSIFICATION:**
- **SHORT CV (under ~400 words / less than half a page):** The CV lacks substance. You have room to EXPAND.
  → Add more detail to bullets, flesh out descriptions, add context
  → Target output: ~1 full page (500-700 words)
  → Bullets can be 1.5-2 lines each, add 1-2 extra bullets per role

- **MEDIUM CV (400-800 words / about 1 page):** Good baseline length. Optimize without major expansion.
  → Keep similar length, improve quality over quantity
  → Target output: 1-1.5 pages (550-850 words)
  → Bullets: 1-1.5 lines, standard count

- **LONG CV (800-1200 words / 1.5-2 pages):** Approaching the limit. Be concise.
  → Tighten language, remove filler, consolidate where possible
  → Target output: 1.5-2 pages (800-1100 words)
  → Bullets: 1 line max, reduce older role bullets

- **VERY LONG CV (1200+ words / 2+ pages):** Too long. Must compress.
  → Aggressively shorten bullets, cut redundancy, trim older roles to 0-1 bullets
  → Target output: under 2 pages (under 1100 words)
  → Bullets: 1 line max, break long sentences, every word must earn its place

**GOLDEN RULE:** A strong CV is 1-2 pages. Under 1 page feels thin. Over 2 pages loses the reader.

**Bullet count by recency:**
- **Current/most recent role:** 2-3 bullets (3 only if truly critical achievements)
- **Recent relevant roles (1-3 years old):** 2 bullets
- **Older roles (3-5 years old):** 1-2 bullets
- **Very old roles (5+ years):** 0-1 bullets

**Bullet length guidelines:**
- **Be concise** - Every word counts
- **Break long sentences** into shorter, punchier statements
- **Remove filler words** - Get to the point quickly
- **Lead with impact:** Quantifiable metrics (%, $, numbers) when available
- **NO personal pronouns:** Remove "I", "my", "we", "our"

**Examples:**
- ❌ TOO LONG: "Spearheaded cross-functional initiatives managing 12+ team members across engineering, product, and design departments, delivering 3 major projects on-time and under budget, reducing development cycle by 25% while maintaining high quality standards."
- ✅ CONCISE: "Spearheaded cross-functional initiatives managing 12+ team members, delivering 3 major projects on-time and reducing development cycle by 25%."

### 4. SKILLS SECTION (MANDATORY!)
- **Must include a dedicated SKILLS section**
- **8-10 most relevant skills**, grouped logically by category
- **Format:** "Category: Skill1, Skill2, Skill3 | Category: Skill4, Skill5"
- **Extract skills from job description and requirements**
- Prioritize skills mentioned in target job description

Example: "Programming: Python, JavaScript, SQL | Tools: Tableau, Power BI, Excel | Frameworks: React, Node.js"

### 5. CONTENT PHILOSOPHY: ENHANCE, DON'T DELETE!
⚠️ **Transform weak content into strong content rather than removing it:**
- ✅ **ENHANCE and REFINE** - Improve wording, add impact, strengthen language
- ✅ KEEP all job entries (just reduce bullets for old roles based on recency)
- ✅ KEEP all education entries with full details (institution, degree, GPA if strong, honors)
- ✅ KEEP military service, volunteering, certifications
- ✅ KEEP awards, honors, languages
- ❌ Only remove if truly redundant or completely irrelevant
- **When in doubt, KEEP IT and ENHANCE IT!**

## QUALITY RULES:

### 6. PROFESSIONAL QUALITY (EXECUTIVE-LEVEL!)
- **Executive-level language** with strategic focus
- **Lead with quantifiable impact** (%, $, metrics) when available in original
- **Strong action verbs:** Spearheaded, Orchestrated, Drove, Executed, Architected, Championed, Transformed, Accelerated, Delivered, Scaled
- **Focus on business outcomes**, not task lists
- **Remove personal pronouns** (I, my, we, our)
- **Consistent verb tense:** Past for old roles, present for current role

Examples:
- ❌ WRONG: "Responsible for managing team projects and tasks"
- ✅ RIGHT: "Spearheaded strategic initiatives driving 20% efficiency gains"
- ❌ WRONG: "I helped with customer issues and complaints"
- ✅ RIGHT: "Orchestrated customer success programs improving retention by 15%"

### 7. NO FABRICATION!
⚠️ NEVER invent metrics or numbers. Only use what's in the original CV.
- If original has numbers → keep them and highlight
- If no numbers → use strong language without fake metrics

## ATS OPTIMIZATION:

### 8. STANDARD SECTION HEADERS (Use Exactly These!)
- **PROFESSIONAL SUMMARY** (not "About Me" or "Profile")
- **EXPERIENCE** (not "Work History" or "Employment")
- **EDUCATION** (not "Academic Background")
- **SKILLS** (not "Core Competencies" or "Expertise")

### 9. FORMATTING CONSISTENCY & ATS OPTIMIZATION (CRITICAL!)
**Formatting Consistency:**
- **Capitalize all acronyms properly:** MBA, ATS, CEO, VP, SQL, API, etc.
- **Consistent date format throughout:** Use same format (e.g., "2020-2022" or "Jan 2020 - Dec 2022")
- **Job titles and company names formatted consistently:** Title Case for titles, proper capitalization for companies
- **Degree abbreviations capitalized:** B.A., M.Sc., Ph.D., B.S., M.B.A.

**ATS-Friendly Formatting:**
- **Industry keywords naturally integrated** throughout
- **No tables, graphics, special characters, or columns**
- **Common, searchable job titles** (not creative/internal titles)
- **Clean, parseable format** - simple text, standard structure
- **No special characters** (→, •, ★) except standard bullet points

## FINAL REMINDER:
**The output should be:**
- ✅ **Concise yet complete** - 3-4 line narrative summary (NO metrics), strategic bullet points
- ✅ **Impactful yet professional** - Executive language, quantifiable results in bullets (not summary)
- ✅ **Optimized yet authentic** - ATS-friendly, but preserves truth
- ✅ **Enhanced, not deleted** - Transform weak content into strong content

## ⚠️ CRITICAL: OPTIMIZED SCORE CONSTRAINTS (READ BEFORE SCORING!)
════════════════════════════════════════════════════════════════════════════════
Optimization improves PRESENTATION only. It CANNOT change the candidate's actual:
- Education/degrees (a missing social work degree stays missing)
- Certifications/licenses (no license = no license, even with better wording)
- Years of experience (rewording doesn't add years)
- Domain expertise (an analyst reworded to sound like a social worker is still an analyst)
- Core hard skills they don't actually have

**MAXIMUM IMPROVEMENT BY ORIGINAL SCORE TIER:**

| Original Score | Max Improvement | Reasoning |
|----------------|-----------------|-----------|
| 0-34 (fundamental mismatch) | +18-22 pts max | Wrong field/education. Can improve ATS keywords and presentation significantly. |
| 35-54 (weak fit) | +22-28 pts max | Some transferable elements. Better keyword integration and impact framing. |
| 55-74 (moderate fit) | +25-32 pts max | Adjacent field. Strong repositioning of relevant experience and skills. |
| 75+ (strong fit) | +15-20 pts max | Already good fit. Polish, keyword optimization, and impact enhancement. |

**HARD RULES:**
- If original scored < 35 due to domain mismatch → Optimized score CANNOT exceed 55
- If original was capped by seniority → Optimized inherits same cap + max 22 pts
- If role REQUIRES specific education (social worker, lawyer, doctor, nurse, CPA, engineer with PE) and candidate LACKS it → Optimized score CANNOT exceed original + 20
- The optimized score reflects "best possible presentation of THIS candidate" — not "how good does the text read in isolation"

**EXAMPLE:**
- Analyst → Social Worker: Original 22. Missing: social work degree (mandatory), clinical hours, license.
  Optimization adds better keywords, ATS formatting, and transferable skills framing = +20. Optimized = 42. NOT 78.
- Junior Dev → Senior Dev: Original 50. Missing: years of experience.
  Optimization highlights relevant projects and technical depth = +26. Optimized = 76. NOT 95.

════════════════════════════════════════════════════════════════════════════════

## OUTPUT FORMAT (JSON):
{
  "scoreComparison": {
    "original": {
      "total": <Original CV score from Phase 1 (0-100)>,
      "breakdown": {
        "ats": <ATS optimization score (0-100) - keywords, formatting, standard headers>,
        "impact": <Impact score (0-100) - achievements, metrics, action verbs>,
        "clarity": <Clarity score (0-100) - structure, conciseness, readability>
      }
    },
    "optimized": {
      "total": <CONSTRAINED optimized score - MUST follow the max improvement rules above. Calculate: min(original.total + max_improvement_for_tier, hard_cap_if_applicable)>,
      "breakdown": {
        "ats": <Improved ATS score>,
        "impact": <Improved Impact score>,
        "clarity": <Improved Clarity score>
      }
    },
    "improvement": <Total points improved (optimized.total - original.total) - MUST be within allowed range>
  },
  "overallScore": <Same as scoreComparison.original.total for backwards compatibility>,
  "summary": "<2-sentence assessment: First sentence states the SINGLE STRONGEST matching area (be specific - name the skill/experience/role match). Second sentence states the SINGLE MOST CRITICAL gap to address (be specific - name exactly what's missing or weak). Max 40 words total.>",
  "strengths": [
    "<strength #1 - Be SPECIFIC: name the exact skill, role, or experience that matches. e.g., '3 years of direct Product Analyst experience at Taboola matches the role requirements closely'>",
    "<strength #2 - specific match>",
    "<strength #3 - specific match>"
  ],
  // LIMIT: Exactly 3 strengths - each must reference a SPECIFIC skill, experience, or qualification from the CV that matches the JD
  "improvements": [
    {
      "text": "<improvement #1 - SPECIFIC: name what's missing and WHY it matters. e.g., 'No Python listed — required for 3 of 5 core responsibilities'>",
      "scoreImpact": <integer 1-15: how many points the overall score would gain from fixing this>,
      "category": "ats" | "impact" | "clarity"
    }
    // Return 5-8 improvements total, sorted by scoreImpact DESCENDING (highest impact first).
    // Sum of all scoreImpact values should be roughly consistent with scoreComparison.improvement.
    // Each entry MUST name the specific gap and its importance to this role.
  ],
  "missingKeySkills": [
    "<critical skill gap #1>",
    "<critical skill gap #2>",
    "<critical skill gap #3>"
  ],
  // LIMIT: Maximum 5 missing skills - only the most critical gaps
  "suggestedChanges": [
    {
      "id": "chg_1",
      "section": "Summary",
      "original": "<original text>",
      "suggested": "<concise version - max 40 words>",
      "reason": "<5 words max>"
    },
    {
      "id": "chg_2",
      "section": "Experience",
      "original": "<original bullet>",
      "suggested": "<concise bullet - max 15 words>",
      "reason": "<5 words max>"
    }
  ],
  // LIMIT: 3-4 suggested changes, each bullet max 15 words
  "keywords": {
    "present": ["<max 8 keywords found>"],
    "missing": ["<max 8 critical missing keywords>"],
    "added": ["<max 5 keywords you added>"]
  },
  // STRICT LIMITS: present max 8, missing max 8, added max 5
  "optimizedCV": "<THE COMPLETE TRANSFORMED CV - EXECUTIVE FORMAT:

[Full Name - EXACT as original]
[Professional Title - use common/searchable title]
[email - EXACT] | [phone - EXACT] | [location] | [linkedin URL - EXACT]

PROFESSIONAL SUMMARY
[3-4 STRONG narrative lines. ENHANCE with high-level experience context: company types (e.g., "high-tech companies", "Fortune 500"), leadership track record, industry expertise. CAN mention high-level skills/expertise. DO NOT detail specific achievements or metrics. Build professional story, focus on core strengths and career direction.]

EXPERIENCE
[Job Title] | [Company] | [Date Range]
• [CONCISE bullet - assess CV length first: Short CV=1.5-2 lines, Long CV=1 line max, Medium=1-1.5 lines]
• [CONCISE bullet - action verb + impact, remove filler words, break long sentences]
[RECENT ROLES: 2 bullets (3 only if truly exceptional). OLDER ROLES: 0-1 bullets. Be length-aware!]

EDUCATION
[Degree in Field] | [University Name - FULL] | [Year]
GPA: [if provided, especially if 3.5+] | [Honors: Cum Laude, Dean's List, etc.]
[Relevant Coursework: if listed] | [Thesis: if mentioned]
[⚠️ PRESERVE ALL education details - GPA, honors, coursework, thesis!]

SKILLS
[Group 1]: Skill1, Skill2, Skill3 | [Group 2]: Skill4, Skill5 | [Group 3]: Skill6, Skill7
[MAX 8-10 skills total, grouped by category]

MILITARY SERVICE (if in original)
[Role] | [Unit] | [Date Range]
• [1 executive-level bullet max]

VOLUNTEERING (if in original)
[Role] | [Organization] | [Date Range]
• [1 bullet max]

CERTIFICATIONS (if in original)
[Certification 1] | [Certification 2]

LANGUAGES (if in original - MANDATORY to include!)
• [Language - Level]

IMPORTANT: 
1. PROFESSIONAL SUMMARY is MANDATORY
2. ALL sections from the original MUST appear in output
3. Contact info (email, phone, linkedin) must be VERBATIM from original>"
}

## CRITICAL REMINDERS:
1. **ENHANCED NARRATIVE SUMMARY** - 3-4 lines, USE high-level experience context (company types, leadership, industry), NO detailed achievements/metrics!
2. **LENGTH-AWARE BULLETS** - Assess CV length first: Short CV=1.5-2 lines, Long CV=1 line max, Medium=1-1.5 lines
3. **BULLET COUNT** - Recent roles: 2 bullets (3 only if exceptional). Older: 0-1 bullets
4. **BE CONCISE** - Remove filler words, break long sentences, every word counts!
5. **EDUCATION COMPLETE** - Keep ALL details: GPA, honors, coursework, thesis. NEVER delete!
6. **SKILLS** - Max 8-10 relevant skills, grouped by category
7. **ENHANCE, DON'T DELETE** - Transform weak content into strong content instead of removing
8. **NO PRONOUNS** - Remove "I", "my", "we", "our" from all text
9. **EXECUTIVE LANGUAGE** - Spearheaded, Orchestrated, Drove, Executed
10. **LEAD WITH IMPACT** - Quantifiable results first (%, $, metrics) when available
9. **CONSISTENT TENSE** - Past tense for past roles, present for current
10. **NEVER FABRICATE** - Only use metrics that exist in original CV
11. **ATS HEADERS** - PROFESSIONAL SUMMARY, EXPERIENCE, EDUCATION, SKILLS
12. **CONTACT INFO** - Copy email, phone, LinkedIn EXACTLY as original

Return ONLY the JSON object.`;

    const response = await anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 8000,
      system: "You are an executive resume writer who ENHANCES content, not deletes it. Create an AMAZING 3-4 line professional summary. PRESERVE all education details (GPA, honors, coursework). Recent roles: 2 bullets (3 if exceptional), older: 0-1. Transform weak content into strong content. Executive language. NEVER fabricate. Respond with valid JSON only.",
      messages: [
        {
          role: "user",
          content: analysisPrompt,
        },
      ],
    });

    const content = response.content[0].type === 'text' ? response.content[0].text : "";

    // If the model hit max_tokens, the JSON is truncated — never try to parse
    // it, surface a specific actionable error so the user can shorten + retry.
    // No credit has been charged at this point.
    if (response.stop_reason === "max_tokens") {
      console.error("[analyze] model output truncated at max_tokens");
      fireOptimizeFailedServer(userId, "truncated", {
        cv_text_length: cvText.length,
        job_description_length: (finalJobDescription || "").length,
      });
      return NextResponse.json(
        {
          error: "Your CV is too long for a single pass. Try removing older roles or shortening descriptions, then try again.",
          failure_reason: "truncated",
        },
        { status: 422 }
      );
    }

    // Parse the JSON response. Use a balanced-brace scan instead of a greedy
    // regex so we don't accidentally swallow trailing text or fail on minor
    // whitespace differences.
    let analysis;
    try {
      const jsonText = extractBalancedJson(content);
      if (!jsonText) throw new Error("No JSON object found in response");
      analysis = JSON.parse(jsonText);
      // Coerce `improvements` into the new {text, scoreImpact, category} shape.
      // The prompt asks for the rich shape, but we tolerate the legacy
      // string[] response too so cached/in-flight analyses don't break the
      // results page during the rollout.
      analysis.improvements = normalizeImprovements(analysis.improvements);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      console.log("Raw response (first 500 chars):", content.slice(0, 500));
      fireOptimizeFailedServer(userId, "parse_error", {
        message: parseError instanceof Error ? parseError.message : "unknown",
        cv_text_length: cvText.length,
      });
      return NextResponse.json(
        {
          error: "We couldn't read the AI's response. Please try again — you weren't charged.",
          failure_reason: "parse_error",
        },
        { status: 500 }
      );
    }

    const matchScore =
      typeof analysis?.matchScore === "number"
        ? analysis.matchScore
        : typeof analysis?.overall_score === "number"
          ? analysis.overall_score
          : undefined;

    // Charge the credit + persist the analysis in a single transaction so a
    // crash here never leaves a user billed without a result (or vice versa) —
    // same pattern as /api/voice/finalize. The decrement-then-guard handles
    // concurrent requests racing past the up-front balance check.
    let analysisId: string | null = null;
    try {
      const normalizedImps = (analysis.improvements ?? []) as NormalizedImprovement[];
      const created = await prisma.$transaction(async (tx) => {
        const updated = await tx.user.update({
          where: { id: userId },
          data: { credits: { decrement: 1 } },
        });
        if (updated.credits < 0) throw new Error("INSUFFICIENT_CREDITS");
        return tx.analysis.create({
          data: {
            userId,
            cvText: cvText.slice(0, 60_000),
            jobTitle: effectiveJobTitle,
            overallScore: typeof analysis?.overallScore === "number" ? Math.round(analysis.overallScore) : null,
            optimizedScore:
              typeof analysis?.scoreComparison?.optimized?.total === "number"
                ? Math.round(analysis.scoreComparison.optimized.total)
                : null,
            raw: analysis,
            improvements: {
              create: normalizedImps.map((imp, i) => ({
                text: imp.text,
                scoreImpact: imp.scoreImpact,
                category: imp.category,
                unlocked: i < 3, // top 3 by score impact are free
                position: i,
              })),
            },
          },
          select: { id: true },
        });
      });
      analysisId = created.id;
    } catch (persistErr) {
      if (persistErr instanceof Error && persistErr.message === "INSUFFICIENT_CREDITS") {
        return NextResponse.json(
          { error: "Insufficient credits", code: "INSUFFICIENT_CREDITS" },
          { status: 402 }
        );
      }
      console.error("[analyze] charge+persist transaction failed:", persistErr);
      return NextResponse.json(
        { error: "Failed to save your analysis. Please try again — you weren't charged.", failure_reason: "persist_error" },
        { status: 500 }
      );
    }

    // Fire-and-forget admin notification + server-side PostHog event + DB log.
    // No await so user-facing latency is unaffected.
    void (async () => {
      try {
        try {
          await prisma.optimizationLog.create({
            data: {
              userId,
              userEmail,
              jobTitle: effectiveJobTitle,
              companyName: companyName && companyName !== "Target Company" ? companyName : null,
              matchScore: typeof matchScore === "number" ? Math.round(matchScore) : null,
            },
          });
        } catch (logErr) {
          console.error("[analyze] optimizationLog write failed:", logErr);
        }

        await sendOptimizeNotification({
          userEmail,
          userId,
          jobTitle: effectiveJobTitle,
          companyName,
          hasJobUrl: !!jobUrl,
          cvTextLength: cvText.length,
          jobDescriptionLength: (finalJobDescription || "").length,
          matchScore,
        });

        const ph = getPostHogClient();
        if (ph) {
          ph.capture({
            distinctId: userId,
            event: "optimize_succeeded_server",
            properties: {
              email: userEmail,
              jobTitle: effectiveJobTitle,
              companyName,
              hasJobUrl: !!jobUrl,
              cvTextLength: cvText.length,
              jobDescriptionLength: (finalJobDescription || "").length,
              matchScore,
            },
          });
          await ph.shutdown();
        }
      } catch (notifyError) {
        console.error("[analyze] post-success notification failed:", notifyError);
      }
    })();

    return NextResponse.json({
      success: true,
      analysis,
      analysisId,
      meta: {
        mode: isQuickMode
          ? "quick"
          : mode === "title_only"
            ? "title_only"
            : "specific_role",
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
