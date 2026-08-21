// Prompt builders + forced-tool schemas for the 3-pass optimizer pipeline.
//
//   Pass 1 AUDIT   — score via the shared rubric + extract JD requirements +
//                    build the coverage matrix with verbatim CV evidence +
//                    critique every section. Diagnosis only, no rewriting.
//   Pass 2 REWRITE — 10-20 grounded, appliable suggestions with full
//                    before/after text and a CvToolCall patch each.
//
// Both passes use tool_choice-forced tools (pattern: app/api/assist/route.ts)
// so output is guaranteed-parseable — no JSON scraping.
//
// The scoring rubric itself lives in lib/optimizer/rubric.ts (single source
// of truth). If you touch scoring, run `npm run eval:optimizer`.

import { QUICK_MODE_OVERRIDE, scoringSteps, OPTIMIZED_SCORE_CONSTRAINTS } from "./rubric";
import type { DeepDiveAnswers } from "./prompt";

// ── Shared bits ─────────────────────────────────────────────────────────────

const str = { type: "string" as const };
const strArr = { type: "array" as const, items: { type: "string" as const } };
const int = { type: "integer" as const };
const num = { type: "number" as const };

const BREAKDOWN_SCHEMA = {
  type: "object" as const,
  properties: { ats: num, impact: num, clarity: num },
  required: ["ats", "impact", "clarity"],
};

export type AuditPromptInput = {
  cvText: string;
  /** Indexed snapshot of the parsed ResumeData (snapshotForPrompt). Empty
   *  string when the parse degraded — audit then anchors to raw text only. */
  snapshot: string;
  effectiveJobTitle: string;
  jobDescription?: string;
  companyName?: string;
  mode?: "quick" | "specific_role";
  /** Persona-calibrated critique standards (lib/knowledge knowledgeFor).
   *  Empty string ⇒ the prompt is byte-identical to the pre-knowledge build. */
  knowledge?: string;
};

export const AUDIT_SYSTEM_PROMPT =
  "You are a senior technical recruiter and ATS auditor performing a deep, evidence-grounded resume review. You are rigorous and specific: every claim you make quotes the exact CV or job-description text it rests on. You never rewrite the CV in this pass — you diagnose. Respond ONLY via the emit_audit tool.";

export const EMIT_AUDIT_TOOL = {
  name: "emit_audit",
  description: "Return the complete structured audit of the CV against the target role.",
  input_schema: {
    type: "object" as const,
    properties: {
      originalScore: {
        type: "object" as const,
        properties: { total: num, breakdown: BREAKDOWN_SCHEMA },
        required: ["total", "breakdown"],
      },
      summary: {
        ...str,
        description:
          "2 sentences: the single strongest match, then the single most critical gap. Specific — name the skill/role/credential.",
      },
      strengths: {
        ...strArr,
        description: "Exactly 3, each naming a SPECIFIC matching skill/experience/qualification from the CV.",
      },
      improvements: {
        type: "array" as const,
        description:
          "5-8 diagnosis items sorted by scoreImpact descending. Each names the specific gap AND why it matters for THIS role.",
        items: {
          type: "object" as const,
          properties: {
            text: str,
            scoreImpact: { ...int, description: "1-15: points the overall score would gain from fixing this" },
            category: { type: "string" as const, enum: ["ats", "impact", "clarity"] },
          },
          required: ["text", "scoreImpact", "category"],
        },
      },
      missingKeySkills: { ...strArr, description: "Up to 5 most critical skill gaps." },
      jdRequirements: {
        type: "array" as const,
        description: "Every distinct requirement extracted from the job description.",
        items: {
          type: "object" as const,
          properties: {
            id: { ...str, description: 'Sequential: "req_1", "req_2"…' },
            text: { ...str, description: "VERBATIM quote from the job description (trim to the requirement phrase)." },
            kind: { type: "string" as const, enum: ["must_have", "nice_to_have"] },
            category: {
              type: "string" as const,
              enum: ["skill", "experience", "education", "domain", "soft", "other"],
            },
            skillLabel: { ...str, description: '1-3 word keyword form, REQUIRED when category is "skill" (e.g. "SQL", "A/B testing").' },
          },
          required: ["id", "text", "kind", "category"],
        },
      },
      coverage: {
        type: "array" as const,
        description: "One row per jdRequirement — how well the CV covers it, with verbatim CV evidence.",
        items: {
          type: "object" as const,
          properties: {
            requirementId: str,
            status: { type: "string" as const, enum: ["strong", "partial", "missing"] },
            evidence: {
              type: "array" as const,
              description: "VERBATIM CV quotes proving coverage. Empty array when status is missing.",
              items: {
                type: "object" as const,
                properties: {
                  quote: { ...str, description: "EXACT text copied from the CV — will be machine-verified." },
                  section: {
                    type: "string" as const,
                    enum: ["summary", "experience", "education", "skills", "projects", "languages", "certifications", "other"],
                  },
                  index: { ...int, description: "Zero-based entry index (experience/education/projects) from the snapshot." },
                  bulletIndex: int,
                },
                required: ["quote", "section"],
              },
            },
            gapSeverity: {
              type: "string" as const,
              enum: ["critical", "moderate", "minor"],
              description: "Only when status is partial or missing.",
            },
            note: { ...str, description: "1-2 sentences: the reasoning behind the status." },
          },
          required: ["requirementId", "status", "evidence", "note"],
        },
      },
      sectionCritiques: {
        type: "array" as const,
        description:
          "A rich critique of every present section, plus one per experience entry (section=experience with experienceIndex). Be a demanding reviewer: comment on evidence of impact, specificity, keyword coverage, and what a recruiter for this role would think.",
        items: {
          type: "object" as const,
          properties: {
            section: {
              type: "string" as const,
              enum: ["summary", "experience", "education", "skills", "projects", "overall"],
            },
            experienceIndex: int,
            verdict: { ...str, description: "2-4 sentence assessment. Specific, cites the actual content." },
            issues: { ...strArr, description: "Concrete problems, each one line." },
          },
          required: ["section", "verdict", "issues"],
        },
      },
    },
    required: [
      "originalScore",
      "summary",
      "strengths",
      "improvements",
      "missingKeySkills",
      "jdRequirements",
      "coverage",
      "sectionCritiques",
    ],
  },
};

export function buildAuditPrompt(input: AuditPromptInput): string {
  const { cvText, snapshot, effectiveJobTitle, jobDescription = "", companyName = "", mode, knowledge = "" } = input;
  const isQuick = mode === "quick";

  return `${isQuick ? QUICK_MODE_OVERRIDE : ""}You must score the original CV ruthlessly AND produce a deep, evidence-grounded audit.

════════════════════════════════════════════════════════════════════════════════
SCORING RUBRIC (apply exactly)
════════════════════════════════════════════════════════════════════════════════
⚠️ Score ONLY the original CV below.

**TARGET ROLE: ${effectiveJobTitle}**

${scoringSteps(effectiveJobTitle)}

════════════════════════════════════════════════════════════════════════════════
INPUTS
════════════════════════════════════════════════════════════════════════════════

## CANDIDATE'S CV (raw text — the source of truth for quotes):
${cvText}
${snapshot ? `\n## STRUCTURED SNAPSHOT (zero-based indices for evidence anchors):\n${snapshot}\n` : ""}
## TARGET ROLE: ${effectiveJobTitle}
## TARGET COMPANY: ${companyName || "Not specified"}

## JOB DESCRIPTION:
${jobDescription || `[No job description provided. Derive requirements from what a strong "${effectiveJobTitle}" role typically demands — mark these kind per typical market expectations. Since these are inferred, quote them as short requirement phrases you compose.]`}

════════════════════════════════════════════════════════════════════════════════
AUDIT INSTRUCTIONS
════════════════════════════════════════════════════════════════════════════════

1. **Extract EVERY distinct requirement** from the job description as jdRequirements.
   - Quote the JD verbatim (trimmed to the requirement phrase).
   - Classify kind: must_have (stated as required/essential, or core to the role) vs nice_to_have.
   - Classify category; for skills include skillLabel (the 1-3 word keyword form).
   - Split compound lines ("SQL and Python") into separate requirements.

2. **Build the coverage matrix** — one row per requirement:
   - status: strong (clear, direct evidence) / partial (adjacent or weak evidence) / missing (no evidence).
   - evidence quotes MUST be EXACT verbatim substrings of the CV text — they are machine-verified and the audit is rejected if they don't match. Copy-paste, don't paraphrase.
   - Anchor each quote with section (+ index/bulletIndex from the snapshot when applicable).
   - gapSeverity for partial/missing rows: critical (disqualifying or heavily weighted), moderate, minor.
   - note: WHY — reference the strength or the exact nature of the gap.

3. **Critique every section** (summary, skills, education, plus EACH experience entry individually via experienceIndex, and one "overall"): what works, what a recruiter hiring for "${effectiveJobTitle}" would question, weak bullets, missing metrics, vague claims, tense/consistency problems. Verdicts are 2-4 sentences and cite the actual content. This is the deep review the candidate is paying for — do not produce generic advice that could apply to any CV.

4. **Score** via the rubric above: originalScore.total plus the ats/impact/clarity breakdown, then summary, exactly 3 strengths, 5-8 improvements (sorted by scoreImpact descending, each naming the specific gap and its importance to this role), and up to 5 missingKeySkills.
${
  knowledge
    ? `
5. **CRITIQUE CALIBRATION (persona-specific)** — apply the standards below to the WORDING and DEPTH of sectionCritiques, improvements, and missingKeySkills ONLY. They do NOT modify the scoring rubric above; the rubric remains the sole authority for originalScore.

${knowledge}
`
    : ""
}
Call emit_audit with the complete result.`;
}

// ── Pass 2: rewrite ─────────────────────────────────────────────────────────

export type RewritePromptInput = {
  snapshot: string;
  auditJson: string; // JSON.stringify of the validated DeepAudit
  effectiveJobTitle: string;
  jobDescription?: string;
  companyName?: string;
  userSummary?: string;
  deepDiveAnswers?: DeepDiveAnswers | null;
  /** When true, the CV couldn't be parsed — suggestions must set patch to
   *  null and anchor by quote only. */
  degraded: boolean;
  /** Persona-calibrated writing standards (lib/knowledge knowledgeFor).
   *  Empty string ⇒ byte-identical to the pre-knowledge prompt. */
  knowledge?: string;
};

export const REWRITE_SYSTEM_PROMPT =
  "You are an executive resume writer who transforms weak content into strong content. You NEVER fabricate: no invented metrics, employers, dates, credentials, or skills the candidate did not state. You produce many rich, specific, immediately-appliable suggestions. Respond ONLY via the emit_rewrite tool.";

// The subset of CV patch tools a suggestion may carry. Deliberately excludes
// every remove_* tool and update_personal_info — deletion-safety and contact
// immunity are enforced by this whitelist in code (see ground.ts), not by
// prompt begging.
export const SUGGESTION_PATCH_TOOLS = [
  "update_summary",
  "update_experience_bullet",
  "update_experience",
  "update_education",
  "set_skills",
  "set_languages",
  "update_project",
] as const;

const PATCH_DOCS = `Each suggestion carries a "patch" — one tool call that applies it. Allowed tools (zero-based indices from the snapshot):

- update_summary { summary }                                  — replace the professional summary
- update_experience_bullet { index, bulletIndex, text }       — replace ONE bullet of ONE experience entry (preferred for bullet rewrites)
- update_experience { index, role?, description?[] }          — update an entry's fields; "description" replaces ALL its bullets (use ONLY to add a new bullet: pass every existing bullet unchanged plus the new one, or to change the role title)
- update_education { index, degree?, field?, gpa?, achievements?[] }
- set_skills { skills[] }                                     — the COMPLETE skills list (existing + additions, most relevant first)
- set_languages { languages[] }                               — the COMPLETE languages list
- update_project { index, name?, description?, bullets?[] }`;

export const EMIT_REWRITE_TOOL = {
  name: "emit_rewrite",
  description: "Return the full set of grounded improvement suggestions and the optimized score.",
  input_schema: {
    type: "object" as const,
    properties: {
      suggestions: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            id: { ...str, description: '"sug_1", "sug_2"…' },
            title: { ...str, description: "Short card label, e.g. 'Quantify the dashboard bullet'." },
            rationale: {
              ...str,
              description:
                "1-3 sentences: WHY this change matters for THIS role. Reference requirement ids (req_N) where relevant.",
            },
            linkedRequirementIds: strArr,
            category: { type: "string" as const, enum: ["ats", "impact", "clarity"] },
            scoreImpact: { ...int, description: "1-15" },
            section: { ...str, description: "Human label, e.g. 'Experience — Taboola' or 'Summary'." },
            before: {
              ...str,
              description:
                "The EXACT current text being replaced, copied verbatim from the CV/snapshot (machine-verified). Omit for pure additions.",
            },
            after: { ...str, description: "The complete replacement text." },
            patch: {
              type: "object" as const,
              description: "The tool call that applies this suggestion. Omit ONLY if the change cannot be expressed with the allowed tools.",
              properties: {
                name: { type: "string" as const, enum: [...SUGGESTION_PATCH_TOOLS] },
                input: { type: "object" as const },
              },
              required: ["name", "input"],
            },
          },
          required: ["id", "title", "rationale", "linkedRequirementIds", "category", "scoreImpact", "section", "after"],
        },
      },
      optimizedScore: {
        type: "object" as const,
        properties: { total: num, breakdown: BREAKDOWN_SCHEMA },
        required: ["total", "breakdown"],
      },
      keywordsAdded: { ...strArr, description: "JD keywords your suggestions introduce into the CV (max 8)." },
    },
    required: ["suggestions", "optimizedScore", "keywordsAdded"],
  },
};

export function buildRewritePrompt(input: RewritePromptInput): string {
  const {
    snapshot,
    auditJson,
    effectiveJobTitle,
    jobDescription = "",
    companyName = "",
    userSummary = "",
    deepDiveAnswers = null,
    degraded,
    knowledge = "",
  } = input;

  return `Produce the improvement plan for this CV: 10-20 rich, specific, appliable suggestions.

## TARGET ROLE: ${effectiveJobTitle}
## TARGET COMPANY: ${companyName || "Not specified"}

## CURRENT CV (structured snapshot with zero-based indices):
${snapshot || "(CV could not be parsed into structured form — see audit for raw-text findings)"}

## JOB DESCRIPTION:
${jobDescription || "[None — optimize for a strong " + effectiveJobTitle + " CV in general.]"}

## DEEP AUDIT (pass 1 findings — your suggestions must resolve these):
${auditJson}
${userSummary ? `\n## CANDIDATE'S OWN SUMMARY (enhance this as the base for any summary rewrite):\n${userSummary}\n` : ""}${
    deepDiveAnswers
      ? `\n## CANDIDATE'S ADDITIONAL CONTEXT (provided directly by the candidate — you MAY use these facts):
### Hidden achievements: ${deepDiveAnswers.achievements || "Not provided"}
### Skills/tools not on the CV: ${deepDiveAnswers.hiddenSkills || "Not provided"}
### Unique value proposition: ${deepDiveAnswers.uniqueValue || "Not provided"}\n`
      : ""
  }
${PATCH_DOCS}

## RULES:
1. **10-20 suggestions.** Cover: the summary, every weak experience bullet the audit flagged, missing JD keywords (via set_skills and bullet rewrites), clarity fixes, and the highest-impact gaps from the coverage matrix. More depth beats fewer items — but every suggestion must genuinely improve the CV for "${effectiveJobTitle}".
2. **One distinct target per suggestion.** Never two suggestions touching the same bullet/field — each must be independently appliable in any order. Prefer update_experience_bullet for single bullets; use update_experience's description ONLY to append a new bullet (include all existing bullets unchanged).
3. **before = verbatim.** Copy the exact current text from the snapshot. It is machine-verified; a paraphrase gets your suggestion discarded.
4. **after = the complete finished rewrite** — strong action verb, concrete impact, JD keywords where honest. Full sentences, no placeholder brackets, no word-count cap.
5. **rationale explains the WHY for this role** and cites requirement ids (req_N) from the audit.
6. **NEVER fabricate**: no invented metrics, employers, dates, credentials, or skills — only reuse facts present in the CV or the candidate's additional context above.${
    degraded
      ? "\n7. **The CV could not be parsed** — OMIT patch on every suggestion; set before to the exact raw-CV text you're improving."
      : ""
  }
${
    knowledge
      ? `
## WRITING STANDARDS (persona-specific — apply to every "after" you write)
${knowledge}
`
      : ""
  }
${OPTIMIZED_SCORE_CONSTRAINTS}

Set optimizedScore to the constrained post-improvement score (per the table above, applied to the audit's originalScore), with its ats/impact/clarity breakdown, and list keywordsAdded.

Call emit_rewrite with the complete result.`;
}
