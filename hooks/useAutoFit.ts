"use client";

// Auto-fit wiring: watches content/template changes, runs the solver against
// the live preview DOM, and reports the solved levels + fit state to the
// owner via onSolve. Parent-agnostic — StudioBuilder routes the result into
// useResumeStore (history-bypassing applyAutoFit), the Review Studio into
// local state.
//
// Deliberately NOT dependent on the current font/spacing levels — the engine's
// own writes change those, and re-triggering on them would loop. StrictMode's
// double effect is harmless: the second run measures, finds no change, no-ops.

import { useEffect, useRef, type RefObject } from "react";
import { solveFit, PAGE_HEIGHT_PX, type FitSolution } from "@/lib/builder/autofit";

export type { FitSolution };

export function useAutoFit({
  containerRef,
  contentKey,
  templateKey,
  enabled,
  getCurrent,
  onSolve,
}: {
  /** The element carrying the --cv-*-mult vars (.smart-resume-override). */
  containerRef: RefObject<HTMLElement | null>;
  /** Changes when the rendered content changes (pass the data object itself). */
  contentKey: unknown;
  templateKey: string;
  enabled: boolean;
  /** Read the CURRENT levels at solve time (not via deps — see note above). */
  getCurrent: () => { fontLevel: number; spacingLevel: number };
  onSolve: (solution: FitSolution) => void;
}) {
  const getCurrentRef = useRef(getCurrent);
  const onSolveRef = useRef(onSolve);
  getCurrentRef.current = getCurrent;
  onSolveRef.current = onSolve;

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      void document.fonts?.ready?.then?.(() => {
        requestAnimationFrame(() => {
          if (cancelled) return;
          const varsEl = containerRef.current;
          if (!varsEl) return;
          const measureEl = varsEl.querySelector<HTMLElement>(".a4-wrapper") ?? varsEl;
          const solution = solveFit(varsEl, measureEl, getCurrentRef.current());
          if (!cancelled) onSolveRef.current(solution);
        });
      });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentKey, templateKey, enabled]);
}

/** Measure-only helper: how many pages tall is the current render. */
export function measureFitRatio(varsEl: HTMLElement): number {
  const measureEl = varsEl.querySelector<HTMLElement>(".a4-wrapper") ?? varsEl;
  return measureEl.scrollHeight / PAGE_HEIGHT_PX;
}
