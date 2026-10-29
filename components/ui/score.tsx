"use client";

import * as React from "react";
import { bandFor, BAND_LABEL, type ScoreBand } from "@/lib/score/bands";
import { cn } from "./cn";
import { Tooltip } from "./tooltip";

// One sequential ramp, never traffic lights for the overall number: low scores
// read as "unfinished", not as "failed". Band labels come from lib/score/bands.
const BAND_FILL: Record<ScoreBand, string> = {
  poor: "stroke-control",
  weak: "stroke-ink-3",
  fair: "stroke-ink-2",
  strong: "stroke-accent",
  great: "stroke-accent",
};

export const SCORE_DISCLAIMER =
  "A rubric estimate of how a recruiter and an ATS read this CV against this job. It does not predict callbacks or know this company's system.";

/** The overall score: a quiet ring with the number; the band sits underneath so it never clips. */
export function ScoreGauge({ value, size = 112, loading, className }: { value: number | null; size?: number; loading?: boolean; className?: string }) {
  const stroke = size >= 100 ? 8 : 6;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const v = value == null ? 0 : Math.max(0, Math.min(100, Math.round(value)));
  const band = bandFor(v);
  return (
    <Tooltip content={SCORE_DISCLAIMER}>
      <div
        role="meter"
        aria-label="CV score"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value ?? undefined}
        aria-valuetext={value == null ? "Not scored yet" : `${v} of 100, ${BAND_LABEL[band]}`}
        tabIndex={0}
        className={cn("inline-flex shrink-0 flex-col items-center gap-2 rounded-card", className)}
      >
        <div className="relative grid place-items-center" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90" aria-hidden>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-surface-2" />
            {!loading && value != null && (
              <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={circ * (1 - v / 100)}
                className={cn("transition-[stroke-dashoffset] duration-700 ease-out", BAND_FILL[band])}
              />
            )}
          </svg>
          <div className="absolute inset-0 grid place-items-center">
            {loading ? (
              <div className="skeleton h-7 w-10" />
            ) : (
              <span className={cn("tabular font-semibold text-ink", size >= 100 ? "text-h1" : "text-h2")}>{value == null ? "–" : v}</span>
            )}
          </div>
        </div>
        {loading ? (
          <div className="skeleton h-5 w-16" />
        ) : (
          <span className="whitespace-nowrap text-dense font-medium text-ink-2">{value == null ? "Not scored" : BAND_LABEL[band]}</span>
        )}
      </div>
    </Tooltip>
  );
}

/** One score component (ATS · Impact · Clarity). The tooltip says what moved it. */
export function ScoreBar({ label, value, why }: { label: string; value: number | null; why?: string }) {
  const v = value == null ? 0 : Math.max(0, Math.min(100, Math.round(value)));
  const row = (
    <div className="grid min-w-[220px] grid-cols-[88px_minmax(72px,1fr)_36px] items-center gap-3" tabIndex={why ? 0 : undefined}>
      <span className="text-body text-ink-2">{label}</span>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-2" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value ?? undefined}>
        <div className="h-full rounded-full bg-ink transition-[width] duration-700 ease-out" style={{ width: `${v}%` }} />
      </div>
      <span className="tabular text-end text-body font-medium text-ink">{value == null ? "–" : v}</span>
    </div>
  );
  return why ? <Tooltip content={why}>{row}</Tooltip> : row;
}
