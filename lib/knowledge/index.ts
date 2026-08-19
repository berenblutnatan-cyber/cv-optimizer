// knowledgeFor — the single composer. Every prompt surface asks this one
// function for its expert block; it returns a delimited string ("" when
// nothing applies, which keeps prompts byte-identical to the pre-knowledge
// build — the rollback lever).
//
// Char budgets are enforced by scripts/knowledge-eval.ts, not at runtime.

import type { KnowledgeContext } from "./types";
import { BULLET_AUDIT_LENS, BULLET_STANDARDS } from "./blocks/bullets";
import { ATS_AUDIT_LENS } from "./blocks/ats";
import { TRUTH_BOUNDARY } from "./blocks/truth";
import { sectionStandards } from "./blocks/sections";
import { CAREER_CHANGE_OVERLAY, trackAuditLens, trackWriteFormula } from "./blocks/tracks";
import { COVER_LETTER_HOOKS, coverLetterToneLine } from "./blocks/coverLetter";
import { INTERVIEW_STANDARDS } from "./blocks/interview";
import { COLD_EMAIL_STANDARDS, LINKEDIN_STANDARDS } from "./blocks/outreach";
import {
  APPLICATION_ANSWER_STANDARDS,
  CASE_STUDY_STANDARDS,
  OFFER_COMPARE_STANDARDS,
  REFERENCES_STANDARDS,
  SALARY_PREP_STANDARDS,
} from "./blocks/career";

export type { KnowledgeContext, Track, Seniority, Goal, Surface } from "./types";
export { detectTrack, seniorityFromExperience, detectCareerChange } from "./track";
export { applyVerdict, type ApplyVerdict } from "./verdict";

function join(parts: Array<string | null | undefined>): string {
  return parts.filter((p): p is string => Boolean(p && p.trim())).join("\n\n");
}

export function knowledgeFor(ctx: KnowledgeContext): string {
  const { surface, track, seniority = null, goal = null, careerChange = false } = ctx;

  switch (surface) {
    case "audit":
      return join([
        BULLET_AUDIT_LENS,
        sectionStandards(seniority),
        // ATS checks always matter; they matter MOST when that's the stated goal.
        goal === "recruiter" ? null : ATS_AUDIT_LENS,
        trackAuditLens(track),
      ]);

    case "rewrite":
      return join([
        BULLET_STANDARDS,
        TRUTH_BOUNDARY,
        trackWriteFormula(track),
        careerChange ? CAREER_CHANGE_OVERLAY : null,
      ]);

    case "coverLetter":
      return join([
        COVER_LETTER_HOOKS,
        coverLetterToneLine(track, seniority),
        careerChange ? CAREER_CHANGE_OVERLAY : null,
      ]);

    case "interviewPrep":
      return INTERVIEW_STANDARDS;

    case "coldEmail":
      return COLD_EMAIL_STANDARDS;

    case "linkedin":
      return join([LINKEDIN_STANDARDS, trackWriteFormula(track)]);

    case "applicationAnswers":
      return APPLICATION_ANSWER_STANDARDS;

    case "references":
      return REFERENCES_STANDARDS;

    case "salaryPrep":
      return SALARY_PREP_STANDARDS;

    case "offerCompare":
      return OFFER_COMPARE_STANDARDS;

    case "caseStudy":
      return join([CASE_STUDY_STANDARDS, trackWriteFormula(track)]);
  }
}
