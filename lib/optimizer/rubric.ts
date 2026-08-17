// SINGLE SOURCE OF TRUTH for the CV scoring rubric.
//
// Extracted byte-identically from lib/optimizer/prompt.ts so every scoring
// surface (full optimizer, /api/score-teaser, /api/score-deep) applies the
// SAME calibration — no more hand-copied forks drifting apart.
//
// If you change ANYTHING here, run `npm run eval:optimizer` to confirm the
// score bands still hold before merging.

/** Quick-optimize override block (no target role provided). Prepended to the
 *  optimizer prompt in quick mode. Includes its own leading/trailing newlines
 *  exactly as the original inline template did. */
export const QUICK_MODE_OVERRIDE = `
════════════════════════════════════════════════════════════════════════════════
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
`;

/** The 4-step scoring decision tree + calibration examples (PHASE 1 body).
 *  Byte-identical to the original inline version in buildOptimizerPrompt. */
export function scoringSteps(effectiveJobTitle: string): string {
  return `### ⭐ STEP 1: DIRECT TITLE MATCH CHECK (The "Golden Ticket")
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
- "Lawyer" → "Developer": **25-35** (career change)`;
}

/** Constraints on how far optimization may raise the score. Byte-identical to
 *  the original inline version in buildOptimizerPrompt. */
export const OPTIMIZED_SCORE_CONSTRAINTS = `## ⚠️ CRITICAL: OPTIMIZED SCORE CONSTRAINTS (READ BEFORE SCORING!)
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

════════════════════════════════════════════════════════════════════════════════`;

/** Teaser prompt for /api/score-teaser: the SAME rubric as the full optimizer,
 *  with a score+summary-only output. Replaces the hand-copied fork that had
 *  drifted (a user could score 40 on /score and 70 on /optimize for the same
 *  CV — now impossible by construction). */
export function buildTeaserPrompt(cvText: string, targetRole: string): string {
  return `You are a SENIOR TECHNICAL RECRUITER and ATS AUDITOR.
You must score the original CV ruthlessly against the target role.

════════════════════════════════════════════════════════════════════════════════
SCORE THE ORIGINAL CV
════════════════════════════════════════════════════════════════════════════════
⚠️ CRITICAL: Calculate overallScore based ONLY on the original CV below.

**TARGET ROLE: ${targetRole}**

${scoringSteps(targetRole)}

## CANDIDATE'S CURRENT CV (Score THIS version):
${cvText.slice(0, 8000)}

## TARGET ROLE: ${targetRole}

════════════════════════════════════════════════════════════════════════════════
OUTPUT FORMAT
════════════════════════════════════════════════════════════════════════════════
Return ONLY a JSON object with exactly these fields:
{
  "overallScore": <number 0-100 - strict score based on the rubric above>,
  "summary": "<one brutally honest sentence explaining the score: mention the specific match or mismatch that drove it>"
}

Return ONLY the JSON object, no markdown, no other text.`;
}
