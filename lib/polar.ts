export type PolarPlan = {
  productId: string;
  name: string;
  amount: number;
  credits: number;
};

export const POLAR_PLANS = {
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
