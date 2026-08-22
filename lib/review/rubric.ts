// THE one CV scoring rubric.
//
// Before this module there were four: lib/optimizer/prompt.ts (Phase 1),
// app/api/score-teaser (its own harsher copy), app/api/score-deep, and
// computeLocalScore — so the same CV got different numbers on /score,
// /results and the builder rail. Everything that puts a number on a CV now
// imports from here.
//
// The thresholds below are NOT new: they are the optimizer prompt's existing
// score bands, which already coincide exactly with localChecks' bandFor()
// cutoffs (85 / 75 / 60 / 45). Extracting them changes no calibration.
//
// Type-only import of ScoreBand keeps this module free of a runtime cycle
// (localChecks imports bandForScore from here).

import type { ScoreBand } from "@/lib/optimizer/localChecks";

export interface ScoreBandSpec {
  /** Inclusive lower bound. */
  min: number;
  band: ScoreBand;
  label: string;
  meaning: string;
}

export const SCORE_BANDS: readonly ScoreBandSpec[] = [
  { min: 85, band: "great", label: "Great fit", meaning: "Same role + right seniority + strong skills" },
  { min: 75, band: "strong", label: "Good fit", meaning: "Same role family, minor gaps" },
  { min: 60, band: "fair", label: "Partial fit", meaning: "Related field OR seniority gap, but real potential" },
  { min: 45, band: "weak", label: "Weak fit", meaning: "Career pivot, limited overlap" },
  { min: 0, band: "poor", label: "No fit", meaning: "Different domain, no relevant experience" },
] as const;

export function bandForScore(score: number): ScoreBand {
  for (const spec of SCORE_BANDS) {
    if (score >= spec.min) return spec.band;
  }
  return "poor";
}

export function bandSpec(score: number): ScoreBandSpec {
  return SCORE_BANDS.find((s) => score >= s.min) ?? SCORE_BANDS[SCORE_BANDS.length - 1];
}

/** The band table as prompt text — identical wording for every surface. */
export const SCORE_BAND_TABLE = `| Score | Fit Level | Who Gets This |
|-------|-----------|---------------|
| 85-95 | GREAT FIT | Same role + right seniority + strong skills |
| 75-84 | GOOD FIT | Same role family, minor gaps |
| 60-74 | PARTIAL FIT | Related field OR seniority gap, but potential |
| 45-59 | WEAK FIT | Career pivot, limited overlap |
| 20-44 | NO FIT | Different domain, no relevant experience |`;

/**
 * Seniority and domain calibration — lifted verbatim from the optimizer
 * prompt's Phase 1, which is tuned against evals/optimizer-fixtures.ts.
 * Only applied when there IS a target role to judge against.
 */
export const TARGETED_CALIBRATION = `### STEP 1: DIRECT TITLE MATCH CHECK
Look at the candidate's CURRENT or MOST RECENT job title (the FIRST job listed).
IGNORE older history like military service or long-past internships.
If that title semantically matches the target role ("Product Analyst" →
"Strategic Product Analyst" MATCHES; "Data Analyst" → "Product Analyst" is a
CLOSE match in the same family):
→ BYPASS all domain-mismatch penalties. BASE SCORE = 70 (minimum). Go to Step 3.
Otherwise continue to Step 2.

### STEP 2: DOMAIN CHECK (only if Step 1 failed)
Transferable-skill credits: data analysis / SQL / Python / Excel +15;
leadership or project management +10; relevant degree +10; bootcamp or
certification in the target field +10.
If NONE apply and the field is unrelated (Chef → Coder, Lawyer → Engineer with
no tech): MAX 35.

### STEP 3: SENIORITY & SKILLS
EXPERIENCE GAP = (years the role requires) − (candidate's relevant years).

| Experience Gap | Impact |
|----------------|--------|
| 0 or negative | +5 to +10 |
| 1-2 years short | −10, cap 75 |
| 3-4 years short | −20, cap 60 |
| 5+ years short | −30, cap 45 |
| Intern/Student → Senior role | −35, cap 40 |

These caps are HARD — the final score cannot exceed them, and they stack with
domain penalties.

Skills are scored PROPORTIONALLY to how many the JD lists: 15-20+ listed →
~55-65% match is GOOD; 10-14 → ~65-75%; 5-9 → ~75-85%; 1-4 → ~85-95%.
Do NOT over-penalize missing skills when the candidate has relevant domain
experience, when the JD is a 20-item wish list, or when they have equivalent
technologies (PostgreSQL vs MySQL, AWS vs Azure, React vs Vue).`;

/**
 * Rubric for the no-job-description case — the studio flow, where someone
 * just uploaded a CV and hasn't named a role. Judge the CV on its own craft
 * against the role it is already presenting for; do NOT invent a target role
 * mismatch and punish them for it.
 */
export const UNTARGETED_CALIBRATION = `No job description was supplied. Infer the
role this CV is plainly aiming at from its most recent title and content, and
judge the CV ON ITS OWN CRAFT for that role. Do NOT apply domain-mismatch or
career-pivot penalties — there is no target to mismatch against.

Score what the document does: evidence of impact (numbers, outcomes, scope),
strength of openers, specificity, ATS-readable structure, completeness of
contact and education, and length discipline. A well-built CV for its own
field belongs in the 75-90 range even with no JD; a vague, duty-listing CV with
no measurable outcomes belongs in the 40-60 range regardless of the person's
seniority.`;

/** Compose the full scoring block for a review prompt. */
export function buildScoringRubric(opts: { targetRole?: string; jobDescription?: string }): string {
  const targeted = Boolean(opts.targetRole || opts.jobDescription);
  return `SCORE THE CV AS IT IS TODAY. Score the document you were given — never
score your own suggested improvements.

${targeted ? TARGETED_CALIBRATION : UNTARGETED_CALIBRATION}

### FINAL SCORE BANDS (be decisive — use the full range)
${SCORE_BAND_TABLE}`;
}
