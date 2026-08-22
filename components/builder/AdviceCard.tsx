"use client";

import { Loader2, Check, X, Lock, AlertTriangle } from "lucide-react";
import type { Advice } from "@/lib/review/types";
import { useT } from "@/lib/i18n/LanguageProvider";

const VERDICT_STYLE: Record<string, { label: string; pill: string }> = {
  cut: { label: "Cut", pill: "bg-rose-50 text-rose-700 border-rose-200" },
  rewrite: { label: "Rewrite", pill: "bg-amber-50 text-amber-800 border-amber-200" },
  add: { label: "Add", pill: "bg-sky-50 text-sky-800 border-sky-200" },
  merge: { label: "Merge", pill: "bg-sky-50 text-sky-800 border-sky-200" },
  keep: { label: "Keep", pill: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

export interface AdviceCardProps {
  advice: Advice;
  /** The suggestion can no longer be located in the CV (the user edited it). */
  stale?: boolean;
  /** Applying costs a credit / needs sign-in. */
  gated?: boolean;
  applying?: boolean;
  busy?: boolean;
  onApply: (a: Advice) => void;
  onSkip: (a: Advice) => void;
}

export function AdviceCard({ advice, stale, gated, applying, busy, onApply, onSkip }: AdviceCardProps) {
  const { t } = useT();
  const style = VERDICT_STYLE[advice.verdict] ?? VERDICT_STYLE.rewrite;
  const actionable = advice.verdict !== "keep";

  return (
    <div className="rounded-xl border border-stone-200 bg-white px-3.5 py-3">
      <div className="flex items-center gap-2">
        <span className={`px-2 py-0.5 rounded-full border text-sm font-semibold ${style.pill}`}>
          {t(style.label)}
        </span>
        <span className="text-sm font-medium text-brand-ink truncate">{advice.title}</span>
      </div>

      {advice.before ? (
        <p
          className={`mt-2 text-sm leading-relaxed ${
            advice.verdict === "cut" ? "text-stone-400 line-through" : "text-stone-500"
          }`}
        >
          {advice.before}
        </p>
      ) : null}

      {advice.after ? (
        <p className="mt-1.5 text-sm leading-relaxed text-brand-navy font-medium">{advice.after}</p>
      ) : null}

      {advice.reason ? (
        <p className="mt-2 text-sm leading-relaxed text-stone-500">{advice.reason}</p>
      ) : null}

      {stale ? (
        <div className="mt-2.5 flex items-center gap-1.5 text-sm text-stone-500">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 text-amber-500" />
          {/* The ref no longer resolves — applying could hit the wrong line, so
              we refuse rather than guess. */}
          {t("You've edited this since — re-run the review.")}
        </div>
      ) : actionable ? (
        <div className="mt-2.5 flex items-center gap-2">
          <button
            type="button"
            onClick={() => onApply(advice)}
            disabled={busy}
            title={gated ? t("Unlock AI rewrites to apply this") : undefined}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-navy text-white text-sm font-semibold hover:bg-brand-navy-hover disabled:opacity-50 transition-colors"
          >
            {applying ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : gated ? (
              <Lock className="h-4 w-4" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            {t("Apply")}
          </button>
          <button
            type="button"
            onClick={() => onSkip(advice)}
            disabled={busy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-stone-500 text-sm font-medium hover:bg-stone-100 disabled:opacity-50 transition-colors"
          >
            <X className="h-4 w-4" />
            {t("Skip")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
