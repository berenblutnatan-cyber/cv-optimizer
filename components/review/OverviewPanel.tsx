"use client";

// The Overview rail segment — verdict, strengths, score breakdown, and
// per-section expert feedback. This is the "give me feedback, not just a
// rewrite" surface.

import { Check } from "lucide-react";
import { useT } from "@/lib/i18n/LanguageProvider";
import { critiqueSectionLabel, suggestionsForCritique } from "@/lib/optimizer/critiqueLinks";
import { track } from "@/lib/analytics";
import type { ApplyVerdict } from "@/lib/knowledge";
import type { DeepAnalysis, GroundedSuggestion } from "@/lib/optimizer/types";
import type { ResumeData } from "@/types/resume";
import { ScoreBreakdownBars } from "./ScoreBreakdownBars";
import { SectionCritiqueCard } from "./SectionCritiqueCard";

const VERDICT_STYLE: Record<ApplyVerdict, { labelKey: string; cls: string }> = {
  strong_apply: { labelKey: "Strong match — apply now", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  apply: { labelKey: "Apply now", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  apply_with_cover_letter: {
    labelKey: "Apply with a strong cover letter",
    cls: "bg-amber-50 text-amber-700 border-amber-200",
  },
  stretch: { labelKey: "Stretch — tailor hard first", cls: "bg-orange-50 text-orange-700 border-orange-200" },
  skip: { labelKey: "Not a fit as-is", cls: "bg-red-50 text-red-600 border-red-200" },
};

export function OverviewPanel({
  analysis,
  resumeData,
  activeSuggestions,
  appliedByCategory,
  onJumpToSuggestion,
}: {
  analysis: DeepAnalysis;
  resumeData: ResumeData | null;
  /** Non-dismissed suggestions (for critique→fix counts + links). */
  activeSuggestions: GroundedSuggestion[];
  /** Σ scoreImpact of APPLIED suggestions per category (drives the bars). */
  appliedByCategory: Record<"ats" | "impact" | "clarity", number>;
  onJumpToSuggestion: (id: string) => void;
}) {
  const { t } = useT();
  const critiques = analysis.sectionCritiques ?? [];
  const overall = critiques.find((c) => c.section === "overall");
  const sections = critiques.filter((c) => c.section !== "overall");
  const verdict = analysis.applyVerdict ? VERDICT_STYLE[analysis.applyVerdict] : null;

  return (
    <div className="space-y-4">
      {/* Verdict */}
      <div className="space-y-2">
        {verdict ? (
          <span className={`inline-block px-2.5 py-1 rounded-full border text-sm font-semibold ${verdict.cls}`}>
            {t(verdict.labelKey)}
          </span>
        ) : null}
        {analysis.summary ? (
          <p className="text-sm text-stone-700 leading-relaxed font-medium">{analysis.summary}</p>
        ) : null}
        {overall ? <p className="text-sm text-stone-600 leading-relaxed">{overall.verdict}</p> : null}
      </div>

      {/* Strengths */}
      {(analysis.strengths ?? []).length > 0 ? (
        <div className="rounded-xl border border-stone-200 px-3.5 py-3">
          <div className="text-sm font-semibold text-brand-navy mb-2">{t("What's working")}</div>
          <ul className="space-y-1.5">
            {analysis.strengths.map((s, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-0.5 w-4 h-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3" strokeWidth={3} />
                </span>
                <span className="text-sm text-stone-700 leading-snug">{s}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Breakdown bars */}
      {analysis.scoreComparison?.original?.breakdown ? (
        <div className="rounded-xl border border-stone-200 px-3.5 py-3">
          <ScoreBreakdownBars
            original={analysis.scoreComparison.original.breakdown}
            optimized={analysis.scoreComparison.optimized?.breakdown ?? analysis.scoreComparison.original.breakdown}
            appliedByCategory={appliedByCategory}
          />
        </div>
      ) : null}

      {/* Per-section feedback */}
      {sections.map((critique, i) => {
        const fixes = suggestionsForCritique(critique, activeSuggestions, resumeData);
        return (
          <SectionCritiqueCard
            key={`${critique.section}-${critique.experienceIndex ?? i}`}
            label={critiqueSectionLabel(critique, resumeData)}
            critique={critique}
            fixCount={fixes.length}
            onShowFixes={() => {
              track("critique_fix_clicked", { section: critique.section });
              if (fixes[0]) onJumpToSuggestion(fixes[0].id);
            }}
          />
        );
      })}
    </div>
  );
}
