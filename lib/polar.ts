export type PolarPlan = {
  productId: string;
  name: string;
  amount: number;
  credits: number;
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
  },
  starter: {
    productId: process.env.POLAR_PRODUCT_STARTER ?? "",
    name: "Starter",
    amount: 3,
    credits: 5,
  },
  pro: {
    productId: process.env.POLAR_PRODUCT_PRO ?? "",
    name: "Pro",
    amount: 9,
    credits: 20,
  },
  ultimate: {
    productId: process.env.POLAR_PRODUCT_ULTIMATE ?? "",
    name: "Ultimate",
    amount: 20,
    credits: 60,
  },
} satisfies Record<string, PolarPlan>;

export type PolarPlanKey = keyof typeof POLAR_PLANS;

export function findPlanByProductId(productId: string): PolarPlan | null {
  for (const plan of Object.values(POLAR_PLANS)) {
    if (plan.productId && plan.productId === productId) return plan;
  }
  return null;
}

export const POLAR_SERVER: "production" | "sandbox" =
  process.env.POLAR_SERVER === "sandbox" ? "sandbox" : "production";
