// ONE score language for the whole app. Every surface that shows a score —
// /score teaser, /optimize results, the builder's live panel, history rows —
// derives its band, label, and color from here, so a user moving between
// surfaces never sees the same number in different colors.

export type ScoreBand = "great" | "strong" | "fair" | "weak" | "poor";

export function bandFor(overall: number): ScoreBand {
  if (overall >= 85) return "great";
  if (overall >= 75) return "strong";
  if (overall >= 60) return "fair";
  if (overall >= 45) return "weak";
  return "poor";
}

export const BAND_LABEL: Record<ScoreBand, string> = {
  great: "Great",
  strong: "Strong",
  fair: "Fair",
  weak: "Needs work",
  poor: "Just starting",
};

export const BAND_COLOR: Record<ScoreBand, string> = {
  great: "#059669",
  strong: "#059669",
  fair: "#B8860B",
  weak: "#ea580c",
  poor: "#e11d48",
};

export function scoreColor(overall: number): string {
  return BAND_COLOR[bandFor(overall)];
}
