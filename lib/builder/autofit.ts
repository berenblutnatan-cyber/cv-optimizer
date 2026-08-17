// One-page auto-fit solver.
//
// Finds the LARGEST font/spacing levels (≤ the user's current design) whose
// rendered content fits one A4 page. Measurement mutates the density CSS vars
// on the already-rendered node, forces a reflow, reads scrollHeight, and
// restores — all synchronously inside one task, so the browser never paints an
// intermediate state and React is never in the measurement loop.

import { fontMultiplier, lineHeightMultiplier, spaceMultiplier } from "./density";

export const PAGE_HEIGHT_PX = 1123; // A4 at 96dpi (matches A4PageWrapper)
const TOLERANCE_PX = 2;

export type FitCandidate = { fontLevel: number; spacingLevel: number };

export type FitSolution = {
  fits: boolean;
  fontLevel: number;
  spacingLevel: number;
  /** contentHeight / one page at the chosen candidate (1.18 = 118%). */
  ratio: number;
  /** True when even the tightest candidate overflows — shrinking is exhausted,
   *  content trimming (or multi-page) is the next lever. */
  atMinimum: boolean;
  /** Layout passes used (perf telemetry). */
  measures: number;
};

const MIN_FONT_LEVEL = 2; // level 1 is legibility floor territory — reserve it for manual use
const MIN_SPACING_LEVEL = 1;

function area(c: FitCandidate): number {
  return fontMultiplier(c.fontLevel) * spaceMultiplier(c.spacingLevel);
}

/** Every candidate at or below the start levels, largest first. Ties prefer
 *  the larger font (shrink whitespace before text — readability wins). */
export function candidateLadder(start: FitCandidate): FitCandidate[] {
  const out: FitCandidate[] = [];
  const maxFont = Math.max(MIN_FONT_LEVEL, Math.min(10, Math.round(start.fontLevel)));
  const maxSpacing = Math.max(MIN_SPACING_LEVEL, Math.min(10, Math.round(start.spacingLevel)));
  for (let f = maxFont; f >= MIN_FONT_LEVEL; f--) {
    for (let s = maxSpacing; s >= MIN_SPACING_LEVEL; s--) {
      out.push({ fontLevel: f, spacingLevel: s });
    }
  }
  return out.sort((a, b) => area(b) - area(a) || b.fontLevel - a.fontLevel);
}

/** Apply candidate vars → force layout → read full content height → restore.
 *  STRICTLY synchronous (no await between mutate and restore) so nothing is
 *  ever painted mid-measure. */
export function measureAt(varsEl: HTMLElement, measureEl: HTMLElement, c: FitCandidate): number {
  const saved = varsEl.style.cssText;
  try {
    varsEl.style.setProperty("--cv-font-mult", String(fontMultiplier(c.fontLevel)));
    varsEl.style.setProperty("--cv-space-mult", String(spaceMultiplier(c.spacingLevel)));
    varsEl.style.setProperty("--cv-lh-mult", String(lineHeightMultiplier(c.spacingLevel)));
    void measureEl.offsetHeight; // force layout
    return measureEl.scrollHeight; // full (clipped) content height
  } finally {
    varsEl.style.cssText = saved;
  }
}

/**
 * Solve for the largest candidate that fits one page.
 *
 * Height is monotone non-increasing along the ladder (candidates are ordered
 * by strictly decreasing density area), so a binary search over the ladder
 * finds the boundary in ~log2(n) layout passes (≤ ~7 for a 10×10 grid).
 */
export function solveFit(
  varsEl: HTMLElement,
  measureEl: HTMLElement,
  start: FitCandidate
): FitSolution {
  let measures = 0;
  const measure = (c: FitCandidate) => {
    measures++;
    return measureAt(varsEl, measureEl, c);
  };

  const h0 = measure(start);
  if (h0 <= PAGE_HEIGHT_PX + TOLERANCE_PX) {
    return {
      fits: true,
      fontLevel: start.fontLevel,
      spacingLevel: start.spacingLevel,
      ratio: h0 / PAGE_HEIGHT_PX,
      atMinimum: false,
      measures,
    };
  }

  const ladder = candidateLadder(start);
  // Binary search: first ladder index that fits (ladder runs large → small).
  let lo = 0;
  let hi = ladder.length - 1;
  let best = -1;
  // Check the tightest candidate first — if even it overflows, report atMinimum.
  const hMin = measure(ladder[hi]);
  if (hMin > PAGE_HEIGHT_PX + TOLERANCE_PX) {
    return {
      fits: false,
      fontLevel: ladder[hi].fontLevel,
      spacingLevel: ladder[hi].spacingLevel,
      ratio: hMin / PAGE_HEIGHT_PX,
      atMinimum: true,
      measures,
    };
  }
  best = hi;
  hi -= 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const h = measure(ladder[mid]);
    if (h <= PAGE_HEIGHT_PX + TOLERANCE_PX) {
      best = mid;
      hi = mid - 1; // try larger candidates
    } else {
      lo = mid + 1;
    }
  }

  const chosen = ladder[best];
  return {
    fits: true,
    fontLevel: chosen.fontLevel,
    spacingLevel: chosen.spacingLevel,
    ratio: 1, // ≤ 1 by construction; exact value not needed once it fits
    atMinimum: false,
    measures,
  };
}
