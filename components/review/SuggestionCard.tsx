"use client";

// One appliable suggestion. Collapsed: dot + title + "+N pts". Expanded:
// before/after diff + rationale + Apply / Dismiss. Applied: collapsed check
// row with inline Undo.

import { Check, ChevronDown, RotateCcw, Sparkles, X } from "lucide-react";
import { useT } from "@/lib/i18n/LanguageProvider";
import type { GroundedSuggestion } from "@/lib/optimizer/types";

const CATEGORY_DOT: Record<GroundedSuggestion["category"], string> = {
  ats: "bg-sky-500",
  impact: "bg-amber-500",
  clarity: "bg-violet-500",
};

export type SuggestionStatus = "pending" | "applied" | "dismissed";

export function SuggestionCard({
  suggestion,
  status,
  expanded,
  onToggle,
  onApply,
  onUndo,
  onDismiss,
}: {
  suggestion: GroundedSuggestion;
  status: SuggestionStatus;
  expanded: boolean;
  onToggle: () => void;
  onApply: () => void;
  onUndo: () => void;
  onDismiss: () => void;
}) {
  const { t } = useT();
  const s = suggestion;

  if (status === "applied") {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 px-3.5 py-2.5 flex items-center gap-2.5">
        <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
          <Check className="w-3.5 h-3.5" strokeWidth={3} />
        </span>
        <span className="text-sm font-medium text-emerald-900 flex-1 min-w-0 truncate">{s.title}</span>
        <button
          type="button"
          onClick={onUndo}
          className="inline-flex items-center gap-1 text-sm text-emerald-700 hover:text-emerald-900 flex-shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" /> {t("Undo")}
        </button>
      </div>
    );
  }

  if (status === "dismissed") {
    return (
      <div className="rounded-xl border border-stone-100 px-3.5 py-2 flex items-center gap-2.5 opacity-60">
        <span className="text-sm text-stone-400 flex-1 min-w-0 truncate line-through">{s.title}</span>
        <button type="button" onClick={onUndo} className="text-sm text-stone-500 hover:text-stone-800 flex-shrink-0">
          {t("Restore")}
        </button>
      </div>
    );
  }

  return (
    <div id={`suggestion-${s.id}`} className="rounded-xl border border-stone-200 overflow-hidden scroll-mt-24">
      <button type="button" onClick={onToggle} className="w-full flex items-center gap-2.5 px-3.5 py-3 text-left">
        <span className={`h-2 w-2 rounded-full flex-shrink-0 ${CATEGORY_DOT[s.category]}`} />
        <span className="text-sm font-medium text-brand-ink flex-1 min-w-0 leading-snug">{s.title}</span>
        <span className="px-1.5 py-0.5 rounded bg-brand-gold/10 text-[#8a6608] text-sm font-semibold tabular-nums flex-shrink-0">
          +{s.scoreImpact}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-stone-400 flex-shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      {expanded ? (
        <div className="px-3.5 pb-3.5 space-y-2.5">
          {s.before ? (
            <div className="rounded-lg bg-red-50/60 border border-red-100 px-3 py-2">
              <p className="text-sm text-red-800/70 line-through leading-relaxed">{s.before}</p>
            </div>
          ) : null}
          <div className="rounded-lg bg-brand-navy/[0.04] border border-brand-navy/10 px-3 py-2">
            <p className="text-sm text-brand-navy leading-relaxed">{s.after}</p>
          </div>
          <p className="text-sm text-stone-500 leading-relaxed">{s.rationale}</p>
          <div className="flex items-center gap-2 pt-0.5">
            {s.grounded && s.patch ? (
              <button
                type="button"
                onClick={onApply}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-brand-navy text-white text-sm font-semibold hover:bg-brand-navy-hover transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" /> {t("Apply")}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(s.after)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-stone-300 text-stone-700 text-sm font-semibold hover:bg-stone-50 transition-colors"
              >
                {t("Copy text")}
              </button>
            )}
            <button
              type="button"
              onClick={onDismiss}
              aria-label={t("Dismiss")}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-stone-400 hover:text-stone-700 text-sm transition-colors"
            >
              <X className="w-3.5 h-3.5" /> {t("Dismiss")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
