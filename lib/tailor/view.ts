// Client-safe shapes for tailoring runs (the full analysis type lives in lib/optimizer/types).

import type { CoverageStatus, DeepAnalysis, GroundedSuggestion, JdRequirement, RequirementCoverage } from "@/lib/optimizer/types";

export type TailorSummary = {
  id: string;
  jobTitle: string;
  company: string;
  scoreOriginal: number;
  scoreOptimized: number;
  applied: number;
  createdAt: string;
};

export function tailorSummary(r: {
  id: string;
  jobTitle: string;
  company: string;
  scoreOriginal: number;
  scoreOptimized: number;
  appliedSuggestionIds: string[];
  createdAt: Date;
}): TailorSummary {
  return {
    id: r.id,
    jobTitle: r.jobTitle,
    company: r.company,
    scoreOriginal: r.scoreOriginal,
    scoreOptimized: r.scoreOptimized,
    applied: r.appliedSuggestionIds.length,
    createdAt: r.createdAt.toISOString(),
  };
}

export type TailorEvent =
  | { type: "stage"; stage: "reading" | "auditing" | "rewriting" | "finalizing" }
  | { type: "audit"; score: number; coverage: { strong: number; partial: number; missing: number } }
  | { type: "done"; id: string; charged: number; tailoring: TailorDetail }
  | { type: "error"; error: string; code?: string };

export type TailorDetail = {
  id: string;
  jobTitle: string;
  company: string;
  jdText: string;
  analysis: DeepAnalysis;
  appliedSuggestionIds: string[];
  createdAt: string;
  applicable: boolean;
};

export type RequirementRow = JdRequirement & { status: CoverageStatus; note: string; evidence: RequirementCoverage["evidence"] };

/** Requirements joined with their coverage, must-haves first, then by how much they hurt. */
export function requirementRows(a: Pick<DeepAnalysis, "jdRequirements" | "coverage">): RequirementRow[] {
  const cov = new Map(a.coverage.map((c) => [c.requirementId, c]));
  const rank: Record<CoverageStatus, number> = { missing: 0, partial: 1, strong: 2 };
  return a.jdRequirements
    .map((r) => {
      const c = cov.get(r.id);
      return { ...r, status: c?.status ?? "missing", note: c?.note ?? "", evidence: c?.evidence ?? [] };
    })
    .sort((x, y) => (x.kind === y.kind ? rank[x.status] - rank[y.status] : x.kind === "must_have" ? -1 : 1));
}

export function coverageCounts(rows: { status: CoverageStatus }[]) {
  return {
    strong: rows.filter((r) => r.status === "strong").length,
    partial: rows.filter((r) => r.status === "partial").length,
    missing: rows.filter((r) => r.status === "missing").length,
  };
}

/** Appliable = verified against the CV and carrying a patch. Everything else is advice. */
export function isAppliable(s: GroundedSuggestion): boolean {
  return s.grounded && !!s.patch;
}
