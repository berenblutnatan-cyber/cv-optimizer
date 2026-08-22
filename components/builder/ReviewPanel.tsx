"use client";

// The verdict rail: what this CV says, what's strong, and line by line what to
// cut or rewrite — with an Apply button on every item.
//
// Replaces ResumeScorePanel. Two things it does that the old panel could not:
//
//  1. Every suggestion NAMES A TARGET and applies in one click, because the AI
//     returns bullet indices that are resolved against the real CV (see
//     lib/review/fromModel). Advice the user has since edited past is marked
//     stale instead of being applied to whatever now sits at that index.
//  2. The one-page state is a real measurement ("2 pages · 11 lines over"),
//     and fitting spends whitespace and type size BEFORE it spends the
//     person's words — see lib/builder/autoFit.
//
// The instant local pass (computeLocalScore, 0ms, free) fills the panel so
// there's never an empty spinner; the Opus review merges in on arrival.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Sparkles, X, CheckCircle2, FileWarning, RotateCw } from "lucide-react";
import { toast } from "sonner";
import type { ResumeData } from "@/types/resume";
import { computeLocalScore, BAND_LABEL, type GoalWeighting, type ScoreBand } from "@/lib/optimizer/localChecks";
import { adviceFromLocal, mergeAdvice } from "@/lib/review/fromLocal";
import { isStale } from "@/lib/review/targetRef";
import type { Advice, ReviewResult } from "@/lib/review/types";
import { planFit, contentStatsFrom, type FitDesign, type FitPlan } from "@/lib/builder/autoFit";
import { track } from "@/lib/analytics";
import { useT } from "@/lib/i18n/LanguageProvider";
import { AdviceCard } from "./AdviceCard";

const BAND_COLOR: Record<ScoreBand, string> = {
  great: "#059669",
  strong: "#059669",
  fair: "#B8860B",
  weak: "#ea580c",
  poor: "#e11d48",
};

function ScoreRing({ score, band }: { score: number; band: ScoreBand }) {
  const r = 46;
  const circ = 2 * Math.PI * r;
  const color = BAND_COLOR[band];
  return (
    <div className="relative h-[104px] w-[104px] flex-shrink-0">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#E7E5E4" strokeWidth="9" />
        <circle
          cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="9" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - score / 100)}
          style={{ transition: "stroke-dashoffset 700ms cubic-bezier(0.22,1,0.36,1), stroke 400ms" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <span className="text-3xl font-bold tabular-nums leading-none" style={{ color }}>{score}</span>
      </div>
    </div>
  );
}

export interface PageFitState {
  pages: number;
  linesOver: number;
  fits: boolean;
  overflowPx: number;
  avgLinePx: number;
  contentPx: number;
  measured: boolean;
}

export interface ReviewPanelProps {
  resumeData: ResumeData;
  jobText?: string;
  jobTitle?: string;
  goal?: GoalWeighting;
  design: FitDesign;
  pageFit: PageFitState;
  /** Bullet count + section count, for the fit estimator. */
  bulletCount: number;
  sectionCount: number;
  /** Apply one piece of advice. Parent owns gating and undo grouping. */
  onApplyAdvice: (a: Advice) => void | Promise<void>;
  /** Apply every remaining actionable item as ONE undo step. */
  onApplyAll: (list: Advice[]) => void | Promise<void>;
  /** Apply a fit plan's design steps, then re-measure. */
  onApplyFitPlan: (plan: FitPlan) => void | Promise<void>;
  /** True when applying an AI rewrite would hit the paywall. */
  aiGated: boolean;
  applyingId?: string | null;
  onClose?: () => void;
  /**
   * Bump this to auto-run the review — the upload flow sets it once the chat
   * agent has finished populating the CV, so an upload lands on a verdict
   * instead of an empty chat window.
   */
  autoRunToken?: number;
}

export function ReviewPanel({
  resumeData, jobText, jobTitle, goal, design, pageFit, bulletCount, sectionCount,
  onApplyAdvice, onApplyAll, onApplyFitPlan, aiGated, applyingId, onClose, autoRunToken,
}: ReviewPanelProps) {
  const { t } = useT();
  const [review, setReview] = useState<ReviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const lastAutoRun = useRef<number | undefined>(undefined);

  const local = useMemo(
    () => computeLocalScore(resumeData, { jobText, jobTitle, goal }),
    [resumeData, jobText, jobTitle, goal]
  );

  // The AI score wins once it exists — it judged the whole document, where the
  // local meter only does mechanical checks.
  const score = review?.score ?? local.overall;
  const band = review?.band ?? local.band;

  const advice = useMemo(() => {
    const merged = mergeAdvice(adviceFromLocal(local), review?.advice ?? []);
    return merged.filter((a) => !skipped.has(a.id));
  }, [local, review, skipped]);

  const actionable = useMemo(
    () => advice.filter((a) => a.verdict !== "keep" && !isStale(resumeData, a)),
    [advice, resumeData]
  );

  const fitPlan = useMemo<FitPlan | null>(() => {
    if (!pageFit.measured || pageFit.fits) return null;
    return planFit({
      overflowPx: pageFit.overflowPx,
      avgLinePx: pageFit.avgLinePx,
      design,
      content: contentStatsFrom(pageFit.contentPx, pageFit.avgLinePx, bulletCount, sectionCount),
    });
  }, [pageFit, design, bulletCount, sectionCount]);

  const runReview = useCallback(async (overflowLinesOverride?: number) => {
    if (loading) return;
    setLoading(true);
    track("review_started", { score_band: local.band });
    try {
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeData,
          jobTitle,
          jobDescription: jobText,
          // Give the model the real cut budget so it nominates enough lines.
          overflowLines: overflowLinesOverride ?? (pageFit.fits ? 0 : pageFit.linesOver),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.review) {
        track("review_failed", { reason: res.status === 429 ? "rate_limit" : "error" });
        toast.message(data?.error ?? t("Couldn't review your CV — try again."));
        return;
      }
      setReview(data.review as ReviewResult);
      setSkipped(new Set());
      track("review_succeeded", { score_band: (data.review as ReviewResult).band });
    } catch {
      track("review_failed", { reason: "network" });
      toast.error(t("Network error running the review."));
    } finally {
      setLoading(false);
    }
  }, [loading, resumeData, jobTitle, jobText, pageFit.fits, pageFit.linesOver, local.band, t]);

  // Auto-run once per token bump (fires after an upload finishes importing).
  useEffect(() => {
    if (autoRunToken === undefined || autoRunToken === lastAutoRun.current) return;
    lastAutoRun.current = autoRunToken;
    if (autoRunToken > 0) void runReview();
  }, [autoRunToken, runReview]);

  function handleSkip(a: Advice) {
    setSkipped((prev) => new Set(prev).add(a.id));
    track("advice_skipped", { verdict: a.verdict });
  }

  const busy = Boolean(applyingId);

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-stone-100">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-brand-gold" />
          <span className="text-sm font-semibold text-brand-navy">{t("Review")}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => void runReview()}
            disabled={loading}
            title={t("Re-run the full review")}
            aria-label={t("Re-run the full review")}
            className="grid place-items-center h-7 w-7 rounded-lg text-stone-400 hover:bg-stone-100 hover:text-brand-navy disabled:opacity-50 transition-colors"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCw className="h-4 w-4" />}
          </button>
          {onClose ? (
            <button
              type="button" onClick={onClose} aria-label={t("Close review")}
              className="grid place-items-center h-7 w-7 rounded-lg text-stone-400 hover:bg-stone-100 hover:text-brand-navy transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4">
        {/* Verdict */}
        <div className="flex items-center gap-4">
          <ScoreRing score={score} band={band} />
          <div className="min-w-0">
            <div className="text-lg font-semibold text-brand-navy">{BAND_LABEL[band]}</div>
            {review?.message.readsAs ? (
              <p className="text-sm text-brand-ink mt-1 leading-relaxed">{review.message.readsAs}</p>
            ) : (
              <p className="text-sm text-stone-500 mt-1 leading-relaxed">
                {loading ? t("Reading your CV…") : t("Live score. Run the review for the full read.")}
              </p>
            )}
          </div>
        </div>
        {review?.message.gap ? (
          <p className="text-sm text-stone-600 leading-relaxed border-l-2 border-amber-300 pl-3">
            {review.message.gap}
          </p>
        ) : null}

        {/* Strengths */}
        {review && review.strengths.length > 0 ? (
          <div className="space-y-1.5">
            {review.strengths.map((s) => (
              <div key={s.title} className="flex items-start gap-2" title={s.evidence}>
                <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-brand-ink leading-relaxed">{s.title}</span>
              </div>
            ))}
          </div>
        ) : null}

        {/* One-page state — a measurement, not a warning */}
        {pageFit.measured && !pageFit.fits && fitPlan ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 px-3.5 py-3">
            <div className="flex items-center gap-2">
              <FileWarning className="h-4 w-4 text-amber-600 flex-shrink-0" />
              <span className="text-sm font-semibold text-brand-navy">
                {t("{pages} pages · {lines} lines over", { pages: pageFit.pages, lines: pageFit.linesOver })}
              </span>
            </div>
            <p className="text-sm text-stone-600 mt-1.5 leading-relaxed">
              {fitPlan.steps.map((s) => s.label).join(" · ")}
            </p>
            <button
              type="button"
              onClick={async () => {
                track("fit_applied", { needs_content: String(!fitPlan.fitsWithDesignAlone) });
                await onApplyFitPlan(fitPlan);
                // Design alone couldn't close the gap. Re-run the review with
                // the EXACT remaining budget (from the plan, not a re-measure
                // we'd have to wait for) so it nominates that many cuts.
                if (!fitPlan.fitsWithDesignAlone) void runReview(fitPlan.linesToCut);
              }}
              disabled={busy}
              className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-navy text-white text-sm font-semibold hover:bg-brand-navy-hover disabled:opacity-50 transition-colors"
            >
              {t("Fit to one page")}
            </button>
          </div>
        ) : null}

        {/* Advice */}
        {advice.length === 0 ? (
          <div className="flex items-start gap-2 rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-3">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-emerald-800">{t("Nothing left to fix here.")}</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {advice.map((a) => (
              <AdviceCard
                key={a.id}
                advice={a}
                stale={isStale(resumeData, a)}
                gated={aiGated && a.fix?.kind !== "deterministic"}
                applying={applyingId === a.id}
                busy={busy}
                onApply={onApplyAdvice}
                onSkip={handleSkip}
              />
            ))}
          </div>
        )}

        {/* Missing keywords */}
        {review?.keywords && review.keywords.missing.length > 0 ? (
          <div className="rounded-xl border border-stone-200 px-3 py-2.5">
            <div className="text-sm text-stone-500 mb-1.5">{t("Missing keywords")}</div>
            <div className="flex flex-wrap gap-1.5">
              {review.keywords.missing.map((k) => (
                <span key={k} className="px-2 py-0.5 rounded-full bg-stone-100 text-sm text-stone-600">{k}</span>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* Apply all */}
      {actionable.length > 0 ? (
        <div className="flex-shrink-0 border-t border-stone-100 px-4 py-3">
          <button
            type="button"
            onClick={() => {
              track("advice_apply_all", { score_band: band });
              void onApplyAll(actionable);
            }}
            disabled={busy}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-navy text-white text-sm font-semibold hover:bg-brand-navy-hover disabled:opacity-60 transition-colors"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {t("Apply all ({count})", { count: actionable.length })}
          </button>
        </div>
      ) : null}
    </div>
  );
}
