// Persona + surface types for the knowledge layer (lib/knowledge/).
//
// The knowledge layer distills the expert playbooks of 22 resume/career
// skills into prompt-injectable blocks, selected by WHERE the text is going
// (surface) and WHO it's for (track/seniority/goal). Pure data — no I/O.

export type Track = "tech" | "executive" | "academic" | "creative" | "general";

/** Funnel buckets student/1-3/3-5/5-10/10+ map onto these. */
export type Seniority = "entry" | "early" | "mid" | "senior" | "lead";

/** Mirrors GoalWeighting (lib/optimizer/localChecks.ts). */
export type Goal = "ats" | "recruiter" | "both";

export type Surface =
  | "audit"
  | "rewrite"
  | "coverLetter"
  | "interviewPrep"
  | "coldEmail"
  | "linkedin"
  | "applicationAnswers"
  | "references"
  | "salaryPrep"
  | "offerCompare"
  | "caseStudy";

export type KnowledgeContext = {
  surface: Surface;
  track: Track;
  /** Overlay, not a track: current role's track and target track confidently
   *  differ (career pivot). Adds translation guidance to writing surfaces. */
  careerChange?: boolean;
  seniority?: Seniority | null;
  goal?: Goal | null;
};
