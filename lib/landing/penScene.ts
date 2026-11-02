// The landing's motion as plain numbers, so the timing can be tested without a
// browser.

export const clamp = (v: number) => Math.min(1, Math.max(0, v));
export const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/** How far one step has gone, given where it starts and ends on a 0-1 timeline. */
export const stepAt = (p: number, from: number, to: number) => clamp((p - from) / (to - from));

export const SCORE_FROM = 64;
export const SCORE_TO = 96;
/** The stamp lands here on the rewrite's 0-1. */
export const WON_AT = 0.97;
export const LOOP_SECONDS = 10;

/** The hero's self-writing CV: a beat, the pen works, it holds, it resets. */
export function rewriteAt(seconds: number) {
  const t = seconds % LOOP_SECONDS;
  if (t < 0.8) return 0;
  if (t < 6.3) return (t - 0.8) / 5.5;
  if (t < 9.3) return 1;
  return 1 - (t - 9.3) / 0.7;
}

export const scoreAt = (rewrite: number) => Math.round(SCORE_FROM + (SCORE_TO - SCORE_FROM) * rewrite);

export const PEN_LINES = [["f1", 0.1, 0.26], ["f2", 0.26, 0.42], ["f3", 0.54, 0.72], ["f4", 0.72, 0.9]] as const;
export const STRIKES = [["s1", 0.02, 0.1], ["s2", 0.46, 0.54]] as const;
export const NOTES = [["n1", 0.18], ["n2", 0.42], ["n3", 0.88], ["k1", 0.1], ["k2", 0.54]] as const;

/** One matched requirement on the pinned scene's 0-1: the wire draws, then the highlight sweeps. */
export function matchRowAt(p: number, row: number, rows: number) {
  const v = stepAt(p, (row + 0.1) / rows, (row + 1) / rows);
  return { wire: stepAt(v, 0, 0.45), mark: stepAt(v, 0.45, 1), done: v >= 0.45 };
}

/** A template's place in the fan on the way to its grid slot: 0 stacked, 1 home. */
export const fanAt = (p: number, i: number, count: number) => ease(stepAt(p, (i / count) * 0.35, 0.65 + (i / count) * 0.35));
