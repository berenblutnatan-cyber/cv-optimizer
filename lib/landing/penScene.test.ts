import { describe, expect, it } from "vitest";
import { fanAt, LOOP_SECONDS, matchRowAt, NOTES, PEN_LINES, rewriteAt, scoreAt, SCORE_FROM, SCORE_TO, stepAt, STRIKES, WON_AT } from "./penScene";

describe("hero rewrite", () => {
  it("starts on the example's weak CV and reaches its strong one", () => {
    expect(scoreAt(rewriteAt(0))).toBe(SCORE_FROM);
    expect(scoreAt(rewriteAt(7))).toBe(SCORE_TO);
  });

  it("loops back to the start without a jump", () => {
    expect(rewriteAt(LOOP_SECONDS - 0.001)).toBeCloseTo(0, 2);
    expect(rewriteAt(LOOP_SECONDS)).toBe(0);
  });

  it("holds the finished CV long enough to read it", () => {
    let held = 0;
    for (let t = 0; t < LOOP_SECONDS; t += 0.1) if (rewriteAt(t) >= WON_AT) held += 0.1;
    expect(held).toBeGreaterThan(2.5);
  });

  it("finishes every line before the stamp", () => {
    const ends = [...PEN_LINES.map((l) => l[2]), ...STRIKES.map((s) => s[2]), ...NOTES.map((n) => n[1])];
    expect(Math.max(...ends)).toBeLessThan(WON_AT);
  });

  it("clamps each step", () => {
    expect(stepAt(0, 0.1, 0.2)).toBe(0);
    expect(stepAt(1, 0.1, 0.2)).toBe(1);
  });
});

describe("match scene", () => {
  it("matches rows in order, and all of them by the end", () => {
    expect(matchRowAt(0, 0, 3).done).toBe(false);
    const mid = 0.5;
    expect(matchRowAt(mid, 0, 3).done).toBe(true);
    expect(matchRowAt(mid, 2, 3).done).toBe(false);
    for (const row of [0, 1, 2]) expect(matchRowAt(1, row, 3)).toEqual({ wire: 1, mark: 1, done: true });
  });
});

describe("template fan", () => {
  it("starts stacked and lands every card home", () => {
    for (let i = 0; i < 6; i++) {
      expect(fanAt(0, i, 6)).toBe(0);
      expect(fanAt(1, i, 6)).toBe(1);
    }
  });
});
