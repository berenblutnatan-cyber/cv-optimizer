// Apply-strategy verdict — the job-description-analyzer skill's 5-band
// rubric, computed in CODE from the audit score (never model-emitted, so it
// can't drift or hallucinate).

export type ApplyVerdict =
  | "strong_apply" // 90+  — strong match, apply now
  | "apply" // 75-89 — apply now
  | "apply_with_cover_letter" // 60-74 — apply, lead with a strong cover letter
  | "stretch" // 50-59 — stretch: tailor hard before applying
  | "skip"; // <50  — not a fit as-is

export function applyVerdict(score: number): ApplyVerdict {
  if (score >= 90) return "strong_apply";
  if (score >= 75) return "apply";
  if (score >= 60) return "apply_with_cover_letter";
  if (score >= 50) return "stretch";
  return "skip";
}
