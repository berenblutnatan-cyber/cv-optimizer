// Unlimited-subscription entitlement. A subscriber bypasses credit charges
// everywhere (see the credit-spend routes). We treat them as entitled while the
// paid period is still running — so a mid-period cancel keeps access until it
// ends — and otherwise honour an "active" status.

import { prisma } from "@/lib/prisma";

type SubFields = {
  subscriptionStatus: string | null;
  subscriptionCurrentPeriodEnd: Date | null;
};

export function hasActiveSubscription(u: SubFields): boolean {
  const end = u.subscriptionCurrentPeriodEnd;
  // Paid through a future period end — entitled regardless of canceled flag.
  if (end && end.getTime() > Date.now()) return true;
  // Active with no period end on record (e.g. just created) — entitled.
  if (u.subscriptionStatus === "active" && !end) return true;
  return false;
}

/** Fetch-and-check: does this user currently get unlimited (no credit charges)? */
export async function isUnlimited(userId: string): Promise<boolean> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionStatus: true, subscriptionCurrentPeriodEnd: true },
  });
  return u ? hasActiveSubscription(u) : false;
}
