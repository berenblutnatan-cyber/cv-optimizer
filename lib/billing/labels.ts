// What each ledger reason means to the user (account activity). Client-safe.

import { msg } from "@/lib/i18n/config";

const LABELS: Record<string, string> = {
  signup: msg("Welcome credit"),
  opening: msg("Starting balance"),
  purchase: msg("Credits bought"),
  purchase_refund: msg("Purchase refunded"),
  coupon: msg("Code redeemed"),
  feedback_reward: msg("Thanks for the feedback"),
  refund: msg("Refund: run didn't finish"),
  correction: msg("Balance correction"),
  admin: msg("Adjustment"),
  analyze: msg("CV analysis"),
  unlock: msg("Tailored CV"),
  interview_prep: msg("Interview prep"),
  cover_letter: msg("Cover letter"),
  voice_finalize: msg("CV from voice"),
  use_credit: msg("AI edit"),
  tailor: msg("Tailored to a job"),
  voice: msg("Voice call"),
  interview: msg("Interview practice"),
  toolkit: msg("Career tool"),
};

/** `t` translates the label; plan names stay as they are. */
export function ledgerLabel(reason: string, planName?: string | null, t: (s: string) => string = (s) => s): string {
  if (reason === "purchase" && planName) return planName;
  return t(LABELS[reason] ?? LABELS.admin);
}
