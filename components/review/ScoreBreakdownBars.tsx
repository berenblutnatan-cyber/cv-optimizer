"use client";

// ATS / Impact / Clarity bars from scoreComparison.breakdown — computed on
// every analysis, rendered for the first time here. Live values climb as
// fixes are applied; the optimized ceiling shows as a faint tick.

import { useT } from "@/lib/i18n/LanguageProvider";
import { scoreColor } from "@/lib/score/bands";
import type { ScoreBreakdown } from "@/lib/optimizer/types";

export function ScoreBreakdownBars({
  original,
  optimized,
  appliedByCategory,
}: {
  original: ScoreBreakdown;
  optimized: ScoreBreakdown;
  /** Σ scoreImpact of APPLIED suggestions per category. */
  appliedByCategory: Record<"ats" | "impact" | "clarity", number>;
}) {
  const { t } = useT();
  const rows: Array<{ key: "ats" | "impact" | "clarity"; label: string }> = [
    { key: "ats", label: t("ATS") },
    { key: "impact", label: t("Impact") },
    { key: "clarity", label: t("Clarity") },
  ];

  return (
    <div className="space-y-2.5">
      {rows.map(({ key, label }) => {
        const ceiling = Math.max(original[key], optimized[key]);
        const live = Math.min(ceiling, original[key] + (appliedByCategory[key] ?? 0));
        return (
          <div key={key} className="flex items-center gap-3">
            <span className="w-14 text-sm text-stone-500 flex-shrink-0">{label}</span>
            <div className="relative flex-1 h-1.5 rounded-full bg-stone-100 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${live}%`, background: scoreColor(live) }}
              />
              {ceiling > live ? (
                <div
                  className="absolute top-0 h-full w-0.5 bg-stone-300"
                  style={{ left: `${ceiling}%` }}
                  title={`${ceiling}`}
                />
              ) : null}
            </div>
            <span className="w-8 text-sm font-semibold tabular-nums text-right" style={{ color: scoreColor(live) }}>
              {Math.round(live)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
