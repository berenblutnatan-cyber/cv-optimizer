// The review prompt — "read this CV like a recruiter, then tell me exactly
// what to cut and what to rewrite".
//
// Kept as a PURE builder (no I/O, no client imports) for the same reason
// lib/optimizer/prompt.ts is: scripts/review-eval.ts imports these exact
// functions, so the eval exercises the shipped prompt rather than a copy that
// can drift. See evals/README.md.
//
// Output comes back through a FORCED tool call (emit_review) rather than
// free-text JSON — the model cannot emit prose, a fenced block, or a
// truncated object, so the whole "extract balanced JSON then coerce the
// shape" class of failure (app/api/analyze/route.ts) does not exist here.
//
// The model returns INDICES ONLY. It never produces hashes or ids: the route
// resolves every index against the real ResumeData and drops anything that
// doesn't exist, so a hallucinated target can't reach an Apply button.

import type { ResumeData } from "@/types/resume";
import { snapshotForPrompt } from "@/lib/chat/cvTools";
import { buildScoringRubric } from "./rubric";

export const REVIEW_TOOL_NAME = "emit_review";

const str = { type: "string" as const };

export const EMIT_REVIEW_TOOL = {
  name: REVIEW_TOOL_NAME,
  description: "Return the full structured review of this CV.",
  input_schema: {
    type: "object" as const,
    properties: {
      score: {
        type: "integer" as const,
        minimum: 0,
        maximum: 100,
        description: "Score of the CV AS IT IS TODAY, per the rubric. Not the score after your fixes.",
      },
      readsAs: {
        ...str,
        description:
          "What a recruiter concludes about this person in six seconds, in ONE sentence, written to the candidate as 'You read as…'. Be honest, not flattering.",
      },
      gap: {
        ...str,
        description:
          "ONE sentence on where that lands short of the role they're aiming at. Omit entirely if there is no meaningful gap.",
      },
      // NOTE: two PARALLEL STRING ARRAYS, not an array of {title, evidence}
      // objects. The nested-object form made the model emit literal tool
      // markup inside the string value and hoist `evidence` to the top level,
      // losing every strength. Flat string arrays serialize cleanly.
      strengthTitles: {
        type: "array" as const,
        minItems: 2,
        maxItems: 3,
        items: str,
        description: "2-3 real strengths of this CV, max 6 words each.",
      },
      strengthEvidence: {
        type: "array" as const,
        minItems: 2,
        maxItems: 3,
        items: str,
        description:
          "The specific line, number or fact in the CV proving each strength, in the SAME ORDER as strengthTitles. Never generic praise.",
      },
      summaryVerdict: {
        type: "object" as const,
        description: "Verdict on the professional summary. Omit if the CV has no summary.",
        properties: {
          verdict: { type: "string" as const, enum: ["keep", "rewrite"] },
          reason: { ...str, description: "ONE line." },
          after: { ...str, description: "The replacement summary. Required when verdict is 'rewrite'." },
        },
        required: ["verdict", "reason"],
      },
      verdicts: {
        type: "array" as const,
        description:
          "One entry per bullet you are judging, using the [entry.bullet] indices from the CV snapshot. Include every bullet you would CUT or REWRITE. Include a few 'keep' verdicts only for genuinely strong lines.",
        items: {
          type: "object" as const,
          properties: {
            section: { type: "string" as const, enum: ["experience", "projects", "education", "custom"] },
            index: { type: "integer" as const, minimum: 0, description: "Entry index — the 1 in [1.2]." },
            bulletIndex: { type: "integer" as const, minimum: 0, description: "Bullet index — the 2 in [1.2]." },
            verdict: { type: "string" as const, enum: ["keep", "cut", "rewrite"] },
            title: { ...str, description: "Imperative, max 8 words, e.g. 'Cut duty-listing filler'." },
            reason: { ...str, description: "ONE line: what this costs them with a recruiter." },
            after: { ...str, description: "The full replacement line. REQUIRED when verdict is 'rewrite'." },
            scoreImpact: { type: "integer" as const, minimum: 0, maximum: 15, description: "Points recovered if applied." },
          },
          required: ["section", "index", "bulletIndex", "verdict", "title", "reason", "scoreImpact"],
        },
      },
      keywordsPresent: {
        type: "array" as const,
        items: str,
        description: "Role-relevant keywords the CV already contains. Max 10.",
      },
      keywordsMissing: {
        type: "array" as const,
        items: str,
        description: "Role-relevant keywords a recruiter or ATS would expect but can't find. Max 8.",
      },
    },
    required: ["score", "readsAs", "strengthTitles", "strengthEvidence", "verdicts"],
  },
};

export const REVIEW_SYSTEM_PROMPT = `You are a blunt, experienced recruiter reviewing a CV for the candidate's own benefit.

Your job is to say what a real recruiter thinks but never tells them: what this
CV actually communicates, what is genuinely strong, and — line by line — what to
cut and what to rewrite.

NON-NEGOTIABLE RULES:
1. NEVER fabricate. No invented metrics, employers, dates, tools, or titles. If
   a bullet has no number, a stronger verb and clearer outcome is the fix — not
   a made-up percentage.
2. Every rewrite keeps the candidate's real facts. You are re-expressing, not
   re-inventing.
3. Contact details, links, education entries, degrees, GPA and honors are
   SACRED. Never suggest cutting them.
4. Cut only what genuinely costs them: duty-listing filler ("Responsible for…"),
   lines with no outcome, near-duplicates, and stale detail from old roles.
   Never cut a role's only evidence — if an entry has one bullet, rewrite it.
5. Be specific and short. Every reason is ONE line about what it costs them.
   No praise padding, no hedging, no restating the bullet back at them.

Return everything through the emit_review tool. Do not write prose.`;

export interface ReviewPromptInput {
  resumeData: ResumeData;
  jobTitle?: string;
  jobDescription?: string;
  /**
   * Rendered lines the CV must lose to fit one page, measured from the live
   * preview (hooks/usePageFit). 0 or undefined = it already fits.
   */
  overflowLines?: number;
}

/** The cut budget instruction — only present when the CV actually overflows. */
function fitBlock(overflowLines?: number): string {
  if (!overflowLines || overflowLines <= 0) {
    return `LENGTH: this CV currently fits on one page. Do not cut for length —
only cut lines that are genuinely weak.`;
  }
  return `LENGTH — THIS CV RUNS PAST ONE PAGE BY ABOUT ${overflowLines} LINE(S).
Design tightening is being applied separately; your job is the content half.
Nominate AT LEAST ${overflowLines} bullet(s) with verdict "cut", weakest first.
Take them from the oldest and least relevant roles before the recent ones, and
prefer cutting near-duplicates and outcome-free lines. Never leave an entry
with zero bullets — if an entry would be emptied, rewrite its lines shorter
instead of cutting them.`;
}

export function buildReviewPrompt(input: ReviewPromptInput): string {
  const { resumeData, jobTitle, jobDescription, overflowLines } = input;
  const role = jobTitle?.trim();
  const jd = jobDescription?.trim();

  const target = role
    ? `TARGET ROLE: ${role}`
    : `TARGET ROLE: not specified — infer it from the CV itself.`;

  const jdBlock = jd
    ? `\nJOB DESCRIPTION:\n"""\n${jd.slice(0, 6000)}\n"""\n`
    : "";

  return `${target}
${jdBlock}
CURRENT CV
══════════════════════════════════════════════════════════════════════════════
Bullets are labelled [entry.bullet] — e.g. [1.2] is bullet index 2 of entry
index 1. Use those exact numbers in your verdicts.

${snapshotForPrompt(resumeData)}
══════════════════════════════════════════════════════════════════════════════

${buildScoringRubric({ targetRole: role, jobDescription: jd })}

NOW PRODUCE THE REVIEW
══════════════════════════════════════════════════════════════════════════════
1. SCORE the CV as it stands today.
2. READS AS — the six-second recruiter conclusion, addressed to the candidate.
   Say what the document actually signals, including when that's less than the
   person is. Then the GAP, if there is one.
3. STRENGTHS — 2-3 in strengthTitles, each anchored to a specific line,
   number or fact at the SAME position in strengthEvidence.
4. VERDICTS — go through the bullets and decide:
   • "cut"     — filler, duplicate, or dead weight. Say what it costs them.
   • "rewrite" — the fact is worth keeping but the line undersells it. Supply
                 the full replacement in "after": strong opening verb, the
                 real outcome, and a number ONLY if one already exists in or is
                 directly implied by their CV.
   • "keep"    — genuinely strong already. Use sparingly.
   Judge every bullet; report all cuts and rewrites.
5. SUMMARY — keep or rewrite the professional summary.
6. KEYWORDS — what's present, and what's expected but missing.

${fitBlock(overflowLines)}

Call emit_review ONCE with the complete result — every field in a single call.`;
}
