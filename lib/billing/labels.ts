// What each ledger reason means to the user (account activity). Client-safe.

const LABELS: Record<string, string> = {
  signup: "Welcome credit",
  opening: "Starting balance",
  purchase: "Credits bought",
  purchase_refund: "Purchase refunded",
  coupon: "Code redeemed",
  feedback_reward: "Thanks for the feedback",
  refund: "Refund: run didn't finish",
  correction: "Balance correction",
  admin: "Adjustment",
  analyze: "CV analysis",
  unlock: "Tailored CV",
  interview_prep: "Interview prep",
  cover_letter: "Cover letter",
  voice_finalize: "CV from voice",
  use_credit: "AI edit",
  tailor: "Tailored to a job",
  voice: "Voice session",
  toolkit: "Career tool",
};

export function ledgerLabel(reason: string, planName?: string | null): string {
  if (reason === "purchase" && planName) return planName;
  return LABELS[reason] ?? "Adjustment";
}
