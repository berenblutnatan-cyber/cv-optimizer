export type PolarPlan = {
  productId: string;
  name: string;
  amount: number;
  /** Credits granted on purchase (one-time packs). 0 for plans that grant
   * Unlimited instead (subscriptions and the time-boxed pass). */
  credits: number;
  kind: "one_time" | "subscription";
  /** Billing interval for recurring subscriptions. */
  interval?: "month" | "year";
  /** One-time products that grant time-boxed Unlimited instead of credits
   * (the 3-month Job Search Pass). The webhook sets the subscription period
   * end to now + this many days. */
  grantsUnlimitedDays?: number;
};

export const POLAR_PLANS = {
  // Micro top-up — shown in the out-of-credits moment, not on the pricing page.
  onemore: {
    productId: process.env.POLAR_PRODUCT_ONEMORE ?? "",
    name: "1 More Credit",
    amount: 1,
    credits: 1,
    kind: "one_time",
  },
  // Tiny visible entry — a clean 1:1 micro-pack ($3 = 3 credits) so the cheapest
  // option on the pricing page isn't $9. Needs POLAR_PRODUCT_MINI.
  mini: {
    productId: process.env.POLAR_PRODUCT_MINI ?? "",
    name: "Mini",
    amount: 3,
    credits: 3,
    kind: "one_time",
  },
  // Welcome flash — 24h, one-time, post-signup. 10 credits for $3, anchored at a
  // real $10 list price so "70% off" is honest. Needs POLAR_PRODUCT_WELCOME.
  welcome: {
    productId: process.env.POLAR_PRODUCT_WELCOME ?? "",
    name: "Welcome Offer",
    amount: 3,
    credits: 10,
    kind: "one_time",
  },
  // Kept in config (existing links + out-of-credits modal) but hidden from the
  // pricing page — its $3 price point now belongs to the welcome flash.
  starter: {
    productId: process.env.POLAR_PRODUCT_STARTER ?? "",
    name: "Starter",
    amount: 3,
    credits: 5,
    kind: "one_time",
  },
  pro: {
    productId: process.env.POLAR_PRODUCT_PRO ?? "",
    name: "Pro",
    amount: 9,
    credits: 20,
    kind: "one_time",
  },
  // Engagement flash — the same Pro pack (20 credits) at 80% off, surfaced for
  // 5 minutes AFTER a user has actually used the builder (a few real actions),
  // not at signup. Polar checkouts are fixed-price (no runtime coupon), so the
  // discount IS this product's price: create a dedicated Polar product at ~$1.80
  // and set POLAR_PRODUCT_PRO_FLASH. Until then the offer self-hides — it never
  // dangles a dead checkout. The strike-through anchor is the real $9 Pro price.
  pro_flash: {
    productId: process.env.POLAR_PRODUCT_PRO_FLASH ?? "",
    name: "Pro Flash",
    amount: 1.8,
    credits: 20,
    kind: "one_time",
  },
  ultimate: {
    productId: process.env.POLAR_PRODUCT_ULTIMATE ?? "",
    name: "Ultimate",
    amount: 20,
    credits: 60,
    kind: "one_time",
  },
  // Unlimited — the flagship. Recurring monthly product in Polar.
  unlimited_monthly: {
    productId: process.env.POLAR_PRODUCT_UNLIMITED_MONTHLY ?? "",
    name: "Unlimited (Monthly)",
    amount: 15,
    credits: 0,
    kind: "subscription",
    interval: "month",
  },
  // Job Search Pass — a ONE-TIME $90 product granting 90 days of Unlimited (no
  // auto-renew). Fits the short, intense job search far better than an annual
  // plan. Needs POLAR_PRODUCT_UNLIMITED_QUARTER.
  unlimited_quarter: {
    productId: process.env.POLAR_PRODUCT_UNLIMITED_QUARTER ?? "",
    name: "Job Search Pass (3 months)",
    amount: 90,
    credits: 0,
    kind: "one_time",
    grantsUnlimitedDays: 90,
  },
} satisfies Record<string, PolarPlan>;

export type PolarPlanKey = keyof typeof POLAR_PLANS;

export function findPlanByProductId(productId: string): PolarPlan | null {
  for (const plan of Object.values(POLAR_PLANS)) {
    if (plan.productId && plan.productId === productId) return plan;
  }
  return null;
}

export function findPlanKeyByProductId(productId: string): PolarPlanKey | null {
  for (const [key, plan] of Object.entries(POLAR_PLANS)) {
    if (plan.productId && plan.productId === productId) return key as PolarPlanKey;
  }
  return null;
}

export const POLAR_SERVER: "production" | "sandbox" =
  process.env.POLAR_SERVER === "sandbox" ? "sandbox" : "production";
