"use client";

// Real analysis progress — driven by the /api/analyze SSE stream, not timers.
// Replaces the fake-timer AnalyzingScreen (which could hang on "Finalizing"
// forever). When the audit pass lands mid-stream, the score + coverage reveal
// early while the rewrite is still running.

import { useEffect, useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { useT } from "@/lib/i18n/LanguageProvider";
import type { AnalyzeStage } from "@/lib/optimizer/stream";

export type AuditPreview = {
  overallScore: number;
  summary: string;
  strengths: string[];
  requirementCount: number;
  coveredCount: number;
  missingCount: number;
};

const STAGE_ORDER: AnalyzeStage[] = ["parsing", "auditing", "rewriting", "finalizing"];

function scoreTone(score: number): string {
  if (score >= 75) return "text-emerald-600";
  if (score >= 55) return "text-amber-600";
  return "text-red-500";
}

export function AnalysisProgress({
  stage,
  audit,
  onCancel,
}: {
  stage: AnalyzeStage | null;
  audit: AuditPreview | null;
  onCancel: () => void;
}) {
  const { t } = useT();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const started = Date.now();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(timer);
  }, []);

  const STAGE_LABELS: Record<AnalyzeStage, string> = {
    parsing: t("Reading your CV"),
    auditing: t("Deep audit vs the role"),
    rewriting: t("Writing your improvements"),
    finalizing: t("Verifying every suggestion"),
  };

  const activeIdx = stage ? STAGE_ORDER.indexOf(stage) : 0;

  return (
    <div className="max-w-xl mx-auto w-full bg-white rounded-sm border border-stone-200 shadow-[0_4px_40px_-12px_rgba(0,0,0,0.08)] p-8 sm:p-10">
      <div className="flex items-center justify-between mb-8">
        <span className="text-sm font-medium text-stone-500 tabular-nums">
          {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}
        </span>
        <button
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800 transition-colors"
        >
          <X className="w-4 h-4" /> {t("Cancel")}
        </button>
      </div>

      <ol className="space-y-4 mb-2">
        {STAGE_ORDER.map((s, i) => {
          const isDone = i < activeIdx;
          const isActive = i === activeIdx;
          return (
            <li key={s} className="flex items-center gap-3">
              {isDone ? (
                <span className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Check className="w-4 h-4" strokeWidth={3} />
                </span>
              ) : isActive ? (
                <span className="w-6 h-6 rounded-full bg-[#0F2942]/5 text-[#0F2942] flex items-center justify-center">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </span>
              ) : (
                <span className="w-6 h-6 rounded-full border border-stone-200" />
              )}
              <span
                className={`text-sm ${
                  isActive ? "font-semibold text-stone-900" : isDone ? "text-stone-600" : "text-stone-400"
                }`}
              >
                {STAGE_LABELS[s]}
              </span>
            </li>
          );
        })}
      </ol>

      {audit && (
        <div className="mt-8 pt-6 border-t border-stone-100 animate-in fade-in duration-500">
          <div className="flex items-center gap-4">
            <span className={`text-4xl font-bold tabular-nums ${scoreTone(audit.overallScore)}`}>
              {audit.overallScore}
            </span>
            <div className="flex flex-wrap gap-2">
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-sm font-medium">
                {audit.coveredCount}/{audit.requirementCount} {t("requirements met")}
              </span>
              {audit.missingCount > 0 && (
                <span className="px-2.5 py-1 rounded-full bg-red-50 text-red-600 text-sm font-medium">
                  {audit.missingCount} {t("gaps")}
                </span>
              )}
            </div>
          </div>
          <p className="mt-3 text-sm text-stone-600 leading-relaxed">{audit.summary}</p>
        </div>
      )}
    </div>
  );
}
