// Shared types for the deep-analysis optimizer pipeline (schemaVersion 2).
//
// DeepAnalysis is a strict SUPERSET of the legacy /api/analyze payload: every
// legacy field (scoreComparison, overallScore, summary, strengths,
// improvements, missingKeySkills, suggestedChanges, keywords, optimizedCV) is
// still present — projected from the rich structures — so existing consumers
// (results page, Prisma Improvement rows, dashboards) keep working while new
// consumers read the structured fields.

import type { ResumeData } from "@/types/resume";

// ── JD understanding ────────────────────────────────────────────────────────

export type JdRequirementKind = "must_have" | "nice_to_have";
export type JdRequirementCategory =
  | "skill"
  | "experience"
  | "education"
  | "domain"
  | "soft"
  | "other";

export type JdRequirement = {
  id: string; // "req_1"…
  text: string; // VERBATIM quote from the JD (or inferred for quick mode)
  kind: JdRequirementKind;
  category: JdRequirementCategory;
  /** 1-3 word keyword form, present for category "skill" (drives keyword chips). */
  skillLabel?: string;
};

export type CoverageStatus = "strong" | "partial" | "missing";
export type GapSeverity = "critical" | "moderate" | "minor";

export type CvSection =
  | "summary"
  | "experience"
  | "education"
  | "skills"
  | "projects"
  | "languages"
  | "certifications"
  | "other";

export type EvidenceRef = {
  quote: string; // VERBATIM CV text — server-verified against the source
  section: CvSection;
  index?: number; // zero-based entry index for experience/education/projects
  bulletIndex?: number;
};

export type RequirementCoverage = {
  requirementId: string;
  status: CoverageStatus;
  evidence: EvidenceRef[];
  gapSeverity: GapSeverity | null; // null when status is "strong"
  note: string; // 1-2 sentences of reasoning
};

// ── Section critique ────────────────────────────────────────────────────────

export type SectionCritique = {
  section: "summary" | "experience" | "education" | "skills" | "projects" | "overall";
  experienceIndex?: number; // per-role critique
  verdict: string; // rich assessment, not a 15-word stub
  issues: string[];
};

// ── Suggestions ─────────────────────────────────────────────────────────────

export type SuggestionPatch = { name: string; input: Record<string, unknown> };

export type GroundedSuggestion = {
  id: string;
  title: string; // short card label
  rationale: string; // WHY — references requirement ids where relevant
  linkedRequirementIds: string[];
  category: "ats" | "impact" | "clarity";
  scoreImpact: number; // 1-15, same scale as Improvement rows
  section: string; // human label, e.g. "Experience — Taboola"
  before: string | null; // exact current text (null = pure addition)
  after: string; // the full rewrite
  patch: SuggestionPatch | null; // appliable via applyCvToolCall; null when unanchorable
  grounded: boolean; // set by the server-side verifier — false = advice only
};

// ── Scores ──────────────────────────────────────────────────────────────────

export type ScoreBreakdown = { ats: number; impact: number; clarity: number };
export type ScoreWithBreakdown = { total: number; breakdown: ScoreBreakdown };

// ── Legacy payload shape (what the results page reads today) ────────────────

export type LegacyImprovement = {
  id: string;
  text: string;
  scoreImpact: number;
  category: "ats" | "impact" | "clarity";
};

export type LegacySuggestedChange = {
  id: string;
  section: string;
  original: string;
  suggested: string;
  reason: string;
};

export type LegacyAnalysis = {
  scoreComparison: {
    original: ScoreWithBreakdown;
    optimized: ScoreWithBreakdown;
    improvement: number;
  };
  overallScore: number;
  summary: string;
  strengths: string[];
  improvements: LegacyImprovement[];
  missingKeySkills: string[];
  suggestedChanges: LegacySuggestedChange[];
  keywords: { present: string[]; missing: string[]; added: string[] };
  optimizedCV: string;
};

// ── The full pipeline output ────────────────────────────────────────────────

export type DeepAnalysis = LegacyAnalysis & {
  schemaVersion: 2;
  /** Apply-strategy verdict (5-band rubric), computed in code from the score. */
  applyVerdict?: import("@/lib/knowledge").ApplyVerdict;
  /** Persona track the coaching was calibrated for. */
  track?: import("@/lib/knowledge").Track;
  jdRequirements: JdRequirement[];
  coverage: RequirementCoverage[];
  sectionCritiques: SectionCritique[];
  suggestions: GroundedSuggestion[];
  resumeData: ResumeData; // structured parse of the ORIGINAL CV (apply anchor)
  optimizedResumeData: ResumeData; // original + all grounded patches applied
  /** True when the CV couldn't be parsed into structured data — suggestions
   *  are quote-anchored advice only (no patches) and optimizedCV is the
   *  unmodified original text. */
  parseDegraded: boolean;
};

// ── Audit pass output (pass 1) — also the score-deep response core ──────────

export type DeepAudit = {
  originalScore: ScoreWithBreakdown;
  summary: string;
  strengths: string[];
  improvements: LegacyImprovement[];
  missingKeySkills: string[];
  jdRequirements: JdRequirement[];
  coverage: RequirementCoverage[];
  sectionCritiques: SectionCritique[];
};

// ── Rewrite pass output (pass 2, pre-grounding) ─────────────────────────────

export type RewriteResult = {
  suggestions: Array<Omit<GroundedSuggestion, "grounded">>;
  optimizedScore: ScoreWithBreakdown;
  keywordsAdded: string[];
};
