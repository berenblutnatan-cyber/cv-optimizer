// The deep read shown after upload, before any edit: what's strong, what's
// missing for the target job, with the CV's own words as evidence.
// Built from pass 1 of the optimizer (the same rubric tailoring uses), so the
// review and a later tailor run never disagree. Client-safe.

import { applyVerdict, type ApplyVerdict } from "@/lib/knowledge/verdict";
import type { CoverageStatus, DeepAudit, JdRequirementKind, ScoreWithBreakdown, SectionCritique } from "@/lib/optimizer/types";
import type { ResumeData } from "@/types/resume";

export type ReadoutSection = {
  key: SectionCritique["section"];
  /** The role this critique is about ("Data Analyst · ShopNow"), for per-role reads. */
  entry?: string;
  verdict: string;
  issues: string[];
};

export type ReadoutRequirement = {
  text: string;
  kind: JdRequirementKind;
  status: CoverageStatus;
  /** The CV's own words that cover it, verified against the CV. */
  quote?: string;
  note: string;
};

export type CvReadout = {
  score: ScoreWithBreakdown;
  verdict: ApplyVerdict;
  summary: string;
  strengths: string[];
  sections: ReadoutSection[];
  requirements: ReadoutRequirement[];
  missingSkills: string[];
  fixes: { text: string; category: "ats" | "impact" | "clarity"; impact: number }[];
  targetTitle: string;
  readAgainstJob: boolean;
};

export type ReviewEvent =
  | { type: "stage"; stage: "reading" }
  | { type: "done"; readout: CvReadout; cached: boolean }
  | { type: "error"; error: string; code: string };

const ORDER: SectionCritique["section"][] = ["overall", "summary", "experience", "projects", "education", "skills"];
const STATUS_RANK: Record<CoverageStatus, number> = { missing: 0, partial: 1, strong: 2 };

export function toReadout(audit: DeepAudit, content: ResumeData, target: { title: string; description?: string } | undefined): CvReadout {
  const role = (i: number | undefined) => {
    const e = i === undefined ? undefined : content.experience[i];
    return e ? [e.role, e.company].filter((s) => s?.trim()).join(" · ") : undefined;
  };
  const sections = audit.sectionCritiques
    .filter((s) => s.verdict.trim() || s.issues.length)
    .map((s) => ({ key: s.section, entry: s.section === "experience" ? role(s.experienceIndex) : undefined, verdict: s.verdict.trim(), issues: s.issues.filter((x) => x.trim()) }))
    .sort((a, b) => ORDER.indexOf(a.key) - ORDER.indexOf(b.key));
  const coverage = new Map(audit.coverage.map((c) => [c.requirementId, c]));
  const requirements = audit.jdRequirements
    .map((r) => {
      const c = coverage.get(r.id);
      return { text: r.text, kind: r.kind, status: c?.status ?? ("missing" as const), quote: c?.evidence[0]?.quote, note: c?.note ?? "" };
    })
    // Must-haves first, gaps before strengths: what to act on leads.
    .sort((a, b) => (a.kind === b.kind ? 0 : a.kind === "must_have" ? -1 : 1) || STATUS_RANK[a.status] - STATUS_RANK[b.status]);
  return {
    score: audit.originalScore,
    verdict: applyVerdict(audit.originalScore.total),
    summary: audit.summary,
    strengths: audit.strengths.filter((s) => s.trim()),
    sections,
    requirements,
    missingSkills: audit.missingKeySkills,
    fixes: audit.improvements.map((i) => ({ text: i.text, category: i.category, impact: i.scoreImpact })).sort((a, b) => b.impact - a.impact),
    targetTitle: target?.title ?? "",
    readAgainstJob: !!target?.description,
  };
}
