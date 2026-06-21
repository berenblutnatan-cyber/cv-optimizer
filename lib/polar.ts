export type PolarPlan = {
  productId: string;
  name: string;
  amount: number;
  /** Credits granted on purchase (one-time packs). 0 for subscriptions, which
   * grant "unlimited" via User.subscription* instead. */
  credits: number;
  kind: "one_time" | "subscription";
  /** Billing interval for subscriptions. */
  interval?: "month" | "year";
};

export const POLAR_PLANS = {
  // Foot-in-the-door SKU shown in the out-of-credits modal. The product must
  // exist in the Polar dashboard and POLAR_PRODUCT_ONEMORE must be set —
  // without the env var the checkout route returns "Unknown plan" 400.
  onemore: {
    productId: process.env.POLAR_PRODUCT_ONEMORE ?? "",
    name: "1 More Credit",
    amount: 1,
    credits: 1,
    kind: "one_time",
  },
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
  ultimate: {
    productId: process.env.POLAR_PRODUCT_ULTIMATE ?? "",
    name: "Ultimate",
    amount: 20,
    credits: 60,
    kind: "one_time",
  },
  // Unlimited subscription — the flagship. Create these as RECURRING products in
  // Polar (monthly + yearly) and set the two env vars. Until then the checkout
  // route returns "Unknown plan" 400 and the pricing CTA shows "Coming soon".
  unlimited_monthly: {
    productId: process.env.POLAR_PRODUCT_UNLIMITED_MONTHLY ?? "",
    name: "Unlimited (Monthly)",
    amount: 50,
    credits: 0,
    kind: "subscription",
    interval: "month",
  },
  unlimited_annual: {
    productId: process.env.POLAR_PRODUCT_UNLIMITED_ANNUAL ?? "",
    name: "Unlimited (Annual)",
    amount: 450, // $50/mo × 12 − 25% = $450/yr (~$37.50/mo)
    credits: 0,
    kind: "subscription",
    interval: "year",
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
