"use client";

// JD requirement coverage matrix — the "does my CV cover this job" view.
// Rows tap-to-expand: evidence quotes, the audit's reasoning note, and gap
// severity live inline (they used to hide in a title= tooltip, invisible on
// mobile). Missing skill requirements offer one-tap "+ I have this".

import { useState } from "react";
import { Check, ChevronDown, Circle, Plus, X } from "lucide-react";
import { useT } from "@/lib/i18n/LanguageProvider";
import { track } from "@/lib/analytics";
import type { GapSeverity, JdRequirement, RequirementCoverage } from "@/lib/optimizer/types";

const SEVERITY_CLS: Record<GapSeverity, string> = {
  critical: "bg-red-50 text-red-600",
  moderate: "bg-amber-50 text-amber-700",
  minor: "bg-stone-100 text-stone-500",
};

export function CoverageMatrix({
  requirements,
  coverage,
  addedSkillReqIds,
  onAddSkill,
  onJumpToSuggestion,
  suggestionIdByReq,
}: {
  requirements: JdRequirement[];
  coverage: RequirementCoverage[];
  /** Requirement ids the user already claimed via "+ I have this". */
  addedSkillReqIds: Set<string>;
  onAddSkill: (req: JdRequirement) => void;
  onJumpToSuggestion: (suggestionId: string) => void;
  /** First suggestion linked to each requirement (deep-link target). */
  suggestionIdByReq: Map<string, string>;
}) {
  const { t } = useT();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  if (requirements.length === 0) return null;

  const covByReq = new Map(coverage.map((c) => [c.requirementId, c]));
  const coveredCount = requirements.filter((r) => {
    const row = covByReq.get(r.id);
    return addedSkillReqIds.has(r.id) || (row && row.status !== "missing");
  }).length;

  return (
    <div className="rounded-xl border border-stone-200 overflow-hidden">
      <div className="px-3.5 py-2.5 bg-stone-50 border-b border-stone-100 flex items-center justify-between">
        <span className="text-sm font-semibold text-brand-navy">{t("Job requirements")}</span>
        <span className="text-sm font-semibold tabular-nums text-stone-500">
          {coveredCount}/{requirements.length}
        </span>
      </div>
      <ul className="divide-y divide-stone-100">
        {requirements.map((req) => {
          const row = covByReq.get(req.id);
          const added = addedSkillReqIds.has(req.id);
          const status = added ? "strong" : row?.status ?? "missing";
          const evidence = row?.evidence ?? [];
          const expanded = expandedId === req.id;
          const expandable = evidence.length > 0 || Boolean(row?.note);
          const linkedSuggestion = suggestionIdByReq.get(req.id);
          return (
            <li key={req.id} className="px-3.5 py-2.5">
              <button
                type="button"
                className="w-full flex items-start gap-2.5 text-left"
                onClick={() => {
                  if (!expandable) return;
                  const next = expanded ? null : req.id;
                  setExpandedId(next);
                  if (next) track("coverage_row_expanded", { status });
                }}
              >
                {status === "strong" ? (
                  <span className="mt-0.5 w-4 h-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3" strokeWidth={3} />
                  </span>
                ) : status === "partial" ? (
                  <span className="mt-0.5 w-4 h-4 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                    <Circle className="w-2 h-2 fill-current" />
                  </span>
                ) : (
                  <span className="mt-0.5 w-4 h-4 rounded-full bg-red-50 text-red-500 flex items-center justify-center flex-shrink-0">
                    <X className="w-3 h-3" strokeWidth={3} />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className={`text-sm leading-snug ${status === "missing" ? "text-stone-700" : "text-stone-600"}`}>
                    {req.text}
                  </span>
                  {req.kind === "must_have" && status !== "strong" ? (
                    <span className="ml-1.5 align-middle inline-block px-1.5 rounded bg-red-50 text-red-500 text-sm leading-5">
                      {t("must")}
                    </span>
                  ) : null}
                  {row?.gapSeverity && status !== "strong" ? (
                    <span
                      className={`ml-1.5 align-middle inline-block px-1.5 rounded text-sm leading-5 ${SEVERITY_CLS[row.gapSeverity]}`}
                    >
                      {t(row.gapSeverity)}
                    </span>
                  ) : null}
                </span>
                {expandable ? (
                  <ChevronDown
                    className={`w-4 h-4 text-stone-300 flex-shrink-0 mt-0.5 transition-transform ${expanded ? "rotate-180" : ""}`}
                  />
                ) : null}
              </button>

              {expanded ? (
                <div className="mt-2 ml-6 space-y-1.5">
                  {evidence.map((e, i) => (
                    <blockquote
                      key={i}
                      className="border-l-2 border-emerald-200 pl-2.5 text-sm text-stone-600 leading-snug"
                    >
                      “{e.quote}”
                    </blockquote>
                  ))}
                  {row?.note ? <p className="text-sm text-stone-500 leading-snug">{row.note}</p> : null}
                </div>
              ) : null}

              {status !== "strong" && (linkedSuggestion || (req.category === "skill" && !added)) ? (
                <div className="mt-1 ml-6">
                  {linkedSuggestion ? (
                    <button
                      type="button"
                      onClick={() => onJumpToSuggestion(linkedSuggestion)}
                      className="text-sm font-medium text-brand-navy hover:underline underline-offset-2"
                    >
                      {t("See fix")}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onAddSkill(req)}
                      className="inline-flex items-center gap-1 text-sm font-medium text-brand-navy hover:underline underline-offset-2"
                    >
                      <Plus className="w-3 h-3" /> {t("I have this")}
                    </button>
                  )}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
