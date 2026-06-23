"use client";

import { useMemo, useState } from "react";
import { Loader2, Sparkles, Wand2, X, ChevronRight, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import type { ResumeData } from "@/types/resume";
import {
  computeLocalScore,
  flattenProblems,
  BAND_LABEL,
  type GoalWeighting,
  type LocalProblem,
  type ScoreBand,
} from "@/lib/optimizer/localChecks";
import { track } from "@/lib/analytics";

type DeepResult = {
  overallScore: number;
  summary: string;
  strengths: string[];
  improvements: { id: string; text: string; scoreImpact: number; category: "ats" | "impact" | "clarity" }[];
  missingKeySkills: string[];
};

export interface ResumeScorePanelProps {
  resumeData: ResumeData;
  jobText?: string;
  jobTitle?: string;
  goal?: GoalWeighting;
  /** Apply a problem's fix. Parent owns gating (free deterministic vs paywalled AI). */
  onApplyFix: (problem: LocalProblem) => void;
  /** Id of the fix currently being applied (shows a spinner on that row). */
  applyingFixId?: string | null;
  /** Collapse the rail (desktop). */
  onClose?: () => void;
}

const BAND_COLOR: Record<ScoreBand, string> = {
  great: "#059669",
  strong: "#059669",
  fair: "#B8860B",
  weak: "#ea580c",
  poor: "#e11d48",
};

const SEVERITY_DOT: Record<LocalProblem["severity"], string> = {
  high: "bg-rose-500",
  medium: "bg-amber-500",
  low: "bg-stone-300",
};

function ScoreRing({ score, band }: { score: number; band: ScoreBand }) {
  const r = 46;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);
  const color = BAND_COLOR[band];
  return (
    <div className="relative h-[120px] w-[120px] flex-shrink-0">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#E7E5E4" strokeWidth="9" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 700ms cubic-bezier(0.22,1,0.36,1), stroke 400ms" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[30px] font-bold tabular-nums leading-none" style={{ color }}>
          {score}
        </span>
        <span className="text-[10px] uppercase tracking-[0.14em] text-stone-400 mt-1">/ 100</span>
      </div>
    </div>
  );
}

export function ResumeScorePanel({
  resumeData,
  jobText,
  jobTitle,
  goal,
  onApplyFix,
  applyingFixId,
  onClose,
}: ResumeScorePanelProps) {
  const [deep, setDeep] = useState<DeepResult | null>(null);
  const [deepLoading, setDeepLoading] = useState(false);

  const result = useMemo(
    () => computeLocalScore(resumeData, { jobText, jobTitle, goal }),
    [resumeData, jobText, jobTitle, goal]
  );

  // Merge live local problems with any AI deep-check improvements into one list.
  const problems = useMemo(() => {
    const local = flattenProblems(result);
    const deepProblems: LocalProblem[] = (deep?.improvements ?? []).map((imp) => ({
      id: imp.id,
      category: imp.category,
      severity: imp.scoreImpact >= 10 ? "high" : imp.scoreImpact >= 6 ? "medium" : "low",
      title: imp.text,
      detail: "From the full AI check.",
      scoreImpact: imp.scoreImpact,
      fix: { kind: "ai", instruction: `Apply this improvement to my CV (use only my real facts): ${imp.text}` },
    }));
    return [...local, ...deepProblems].sort((a, b) => b.scoreImpact - a.scoreImpact);
  }, [result, deep]);

  async function runDeepCheck() {
    if (deepLoading) return;
    setDeepLoading(true);
    track("score_deep_check_run", { score_band: result.band });
    try {
      const res = await fetch("/api/score-deep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeData, jobText, jobTitle, goal }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        track("score_deep_check_failed", { reason: res.status === 429 ? "rate_limit" : "error" });
        toast.message(data?.error ?? "Couldn't run the full check — try again.");
        return;
      }
      setDeep(data as DeepResult);
      track("score_deep_check_succeeded");
    } catch {
      track("score_deep_check_failed", { reason: "network" });
      toast.error("Network error running the full check.");
    } finally {
      setDeepLoading(false);
    }
  }

  function handleFix(p: LocalProblem) {
    track("score_problem_fix_clicked", { category: p.category, score_band: result.band });
    onApplyFix(p);
  }

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-stone-100">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#B8860B]" />
          <span className="text-sm font-semibold text-[#0A2647]">Resume score</span>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close score panel"
            className="grid place-items-center h-7 w-7 rounded-lg text-stone-400 hover:bg-stone-100 hover:text-[#0A2647] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4">
        {/* Ring + band */}
        <div className="flex items-center gap-4">
          <ScoreRing score={result.overall} band={result.band} />
          <div className="min-w-0">
            <div className="text-lg font-semibold text-[#0A2647]">{BAND_LABEL[result.band]}</div>
            <p className="text-xs text-stone-500 mt-1 leading-relaxed">
              Updates live as you edit. Fixes apply with AI.
            </p>
            {deep?.summary ? (
              <p className="text-xs text-[#0A2647] mt-2 leading-relaxed">{deep.summary}</p>
            ) : null}
          </div>
        </div>

        {/* Category bars */}
        <div className="grid grid-cols-2 gap-2">
          {result.categories.map((c) => (
            <div key={c.category} className="rounded-xl border border-stone-200 px-3 py-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-stone-500 truncate">{c.label}</span>
                <span className="text-[11px] font-semibold tabular-nums text-[#0A2647]">{c.score}</span>
              </div>
              <div className="mt-1.5 h-1 rounded-full bg-stone-100 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${c.score}%`, background: c.score >= 75 ? "#059669" : c.score >= 50 ? "#B8860B" : "#e11d48" }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Run full check */}
        <button
          type="button"
          onClick={runDeepCheck}
          disabled={deepLoading}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0A2647] text-white text-sm font-semibold hover:bg-[#0d3259] disabled:opacity-60 transition-colors"
        >
          {deepLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
          {deepLoading ? "Analyzing…" : deep ? "Re-run full AI check" : "Run full AI check"}
        </button>

        {/* Problem list */}
        <div className="space-y-2">
          <div className="text-[11px] uppercase tracking-[0.14em] text-stone-400">
            {problems.length > 0 ? `${problems.length} thing${problems.length === 1 ? "" : "s"} to improve` : "Looking sharp"}
          </div>
          {problems.length === 0 ? (
            <div className="flex items-start gap-2 rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-emerald-800">
                No mechanical issues found. Run the full AI check for deeper, role-specific feedback.
              </p>
            </div>
          ) : (
            problems.map((p) => {
              const applying = applyingFixId === p.id;
              return (
                <div key={p.id} className="rounded-xl border border-stone-200 px-3 py-2.5">
                  <div className="flex items-start gap-2">
                    <span className={`mt-1.5 h-1.5 w-1.5 rounded-full flex-shrink-0 ${SEVERITY_DOT[p.severity]}`} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-medium text-[#1a1a1a] leading-snug">{p.title}</div>
                      <div className="text-[11px] text-stone-500 mt-0.5 leading-relaxed">{p.detail}</div>
                      {p.fix ? (
                        <button
                          type="button"
                          onClick={() => handleFix(p)}
                          disabled={applying || Boolean(applyingFixId)}
                          className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#B8860B]/10 text-[#8a6608] text-[11px] font-semibold hover:bg-[#B8860B]/20 disabled:opacity-50 transition-colors"
                        >
                          {applying ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                          {p.fix.kind === "deterministic" ? "Fix" : applying ? "Fixing…" : "Fix with AI"}
                          {!applying ? <ChevronRight className="h-3 w-3" /> : null}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Deep-check extras */}
        {deep && deep.missingKeySkills.length > 0 ? (
          <div className="rounded-xl border border-stone-200 px-3 py-2.5">
            <div className="text-[11px] uppercase tracking-[0.14em] text-stone-400 mb-1.5">Missing key skills</div>
            <div className="flex flex-wrap gap-1.5">
              {deep.missingKeySkills.map((s) => (
                <span key={s} className="px-2 py-0.5 rounded-full bg-stone-100 text-[11px] text-stone-600">
                  {s}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
