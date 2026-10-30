import { POLAR_PLANS, type PolarPlanKey } from "@/lib/polar";
import { trackConversion } from "@/lib/gtag";
import { trackMetaEvent } from "@/lib/fbq";
import { track, setUserProps } from "@/lib/analytics";

// The purchase conversion (Google Ads, Meta, PostHog), fired from whichever
// page Polar returns to. Once per checkout per browser: a refresh or a
// back-navigation must not count a second sale (Meta does not dedupe).

const SEEN = "hired:purchase-tracked";

export function firePurchaseConversion(plan: string | null, checkoutId: string | undefined, email?: string): boolean {
  const cfg = plan && plan in POLAR_PLANS ? POLAR_PLANS[plan as PolarPlanKey] : null;
  if (!cfg || typeof window === "undefined") return false;
  try {
    const key = checkoutId ?? `${plan}:${new Date().toDateString()}`;
    const seen: string[] = JSON.parse(localStorage.getItem(SEEN) ?? "[]");
    if (seen.includes(key)) return false;
    localStorage.setItem(SEEN, JSON.stringify([...seen, key].slice(-20)));
  } catch {
    // storage unavailable: fire anyway (Google still dedupes by transaction_id)
  }
  // Tracking must never break the page the user lands on after paying.
  try {
    trackConversion("purchase", { value: cfg.amount, currency: "USD", transaction_id: checkoutId, user_email: email });
    trackMetaEvent("Purchase", { value: cfg.amount, currency: "USD", content_name: cfg.name, content_ids: [plan ?? "unknown"], num_items: 1 });
    track("purchase_completed", { plan: plan ?? "unknown", amount: cfg.amount, credits: cfg.credits, checkout_id: checkoutId ?? null });
    const now = new Date().toISOString();
    setUserProps(
      { is_paid: true, last_paid_plan: plan ?? "unknown", last_paid_amount: cfg.amount, last_paid_at: now },
      { first_paid_at: now, first_paid_plan: plan ?? "unknown" },
    );
  } catch (error) {
    console.error("purchase tracking failed:", error);
  }
  return true;
}
