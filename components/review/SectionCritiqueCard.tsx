"use client";

// One section's expert feedback — the verdict prose IS the product here
// (sectionCritiques were computed on every analysis and never rendered).

import { ArrowRight } from "lucide-react";
import { useT } from "@/lib/i18n/LanguageProvider";
import type { SectionCritique } from "@/lib/optimizer/types";

export function SectionCritiqueCard({
  label,
  critique,
  fixCount,
  onShowFixes,
}: {
  label: string;
  critique: SectionCritique;
  fixCount: number;
  onShowFixes: () => void;
}) {
  const { t } = useT();
  return (
    <div className="rounded-xl border border-stone-200 px-3.5 py-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-brand-navy">{label}</span>
        {fixCount > 0 ? (
          <button
            type="button"
            onClick={onShowFixes}
            className="inline-flex items-center gap-1 text-sm font-medium text-brand-navy hover:underline underline-offset-2 flex-shrink-0"
          >
            {t("{count} fixes", { count: fixCount })} <ArrowRight className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </div>
      <p className="mt-1.5 text-sm text-stone-600 leading-relaxed">{critique.verdict}</p>
      {critique.issues.length > 0 ? (
        <ul className="mt-2 space-y-1">
          {critique.issues.map((issue, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-500 flex-shrink-0" />
              <span className="text-sm text-stone-600 leading-snug">{issue}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
