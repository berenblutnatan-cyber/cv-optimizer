import { Webhooks } from "@polar-sh/nextjs";
import { prisma } from "@/lib/prisma";
import { findPlanByProductId, findPlanKeyByProductId } from "@/lib/polar";
import { FREE_CREDITS_FOR_NEW_USER } from "@/lib/credits";
import { sendPurchaseNotification } from "@/lib/email";

// Polar subscription payloads vary slightly by event; read defensively.
type AnySub = {
  id?: string;
  status?: string;
  productId?: string | null;
  currentPeriodEnd?: string | Date | null;
  externalCustomerId?: string | null;
  customer?: { externalId?: string | null; email?: string | null } | null;
};

// Upsert the user's Unlimited-subscription state. `statusOverride` lets the
// cancel/revoke handlers force the terminal status.
async function applySubscription(sub: AnySub, statusOverride?: string) {
  const userId = sub.customer?.externalId ?? sub.externalCustomerId ?? null;
  if (!userId) {
    console.error("[polar webhook] subscription missing externalCustomerId", sub.id);
    return;
  }
  const status = statusOverride ?? sub.status ?? "active";
  const planKey = sub.productId ? findPlanKeyByProductId(sub.productId) : null;
  const periodEnd = sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : null;
  const email = sub.customer?.email ?? `${userId}@pending.local`;

  const fields = {
    subscriptionStatus: status,
    subscriptionPlan: planKey ?? null,
    subscriptionCurrentPeriodEnd: periodEnd,
    polarSubscriptionId: sub.id ?? null,
  };
  await prisma.user.upsert({
    where: { id: userId },
    update: fields,
    create: { id: userId, email, credits: FREE_CREDITS_FOR_NEW_USER, ...fields },
  });
  console.log(`[polar webhook] subscription ${status} for ${userId} (${planKey ?? "?"})`);
}

export const POST = Webhooks({
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET!,

  // One-time credit packs (and the first invoice of a subscription, which also
  // arrives as an order — harmless: subscription plans grant 0 credits and the
  // subscription handlers below own entitlement).
  onOrderPaid: async (payload) => {
    const order = payload.data;
    const orderId = order.id;
    const userId =
      (order as unknown as { externalCustomerId?: string | null })
        .externalCustomerId ?? order.customer?.externalId ?? null;
    const productId = order.productId ?? null;
    const amount = (order.netAmount ?? 0) / 100;

    if (!userId) {
      console.error("[polar webhook] missing externalCustomerId for order", orderId);
      return;
    }
    if (!productId) {
      console.error("[polar webhook] missing productId for order", orderId);
      return;
    }

    const plan = findPlanByProductId(productId);
    if (!plan) {
      console.error("[polar webhook] unknown product", productId, "order", orderId);
      return;
    }

    const existing = await prisma.purchase.findFirst({
      where: { polarOrderId: orderId },
      select: { id: true },
    });
    if (existing) {
      console.log("[polar webhook] order already processed", orderId);
      return;
    }

    const email = order.customer?.email ?? `${userId}@pending.local`;

    // Pull the Google Ads click ID we threaded through checkout metadata.
    const gclid =
      (order as unknown as { metadata?: Record<string, string> | null }).metadata?.gclid ?? null;

    // The Job Search Pass is a one-time order that grants time-boxed Unlimited
    // instead of credits — set the subscription window here.
    const unlimitedDays = plan.grantsUnlimitedDays ?? 0;
    const subFields =
      unlimitedDays > 0
        ? {
            subscriptionStatus: "active",
            subscriptionPlan: findPlanKeyByProductId(productId),
            subscriptionCurrentPeriodEnd: new Date(Date.now() + unlimitedDays * 86_400_000),
          }
        : {};

    await prisma.user.upsert({
      where: { id: userId },
      update: { credits: { increment: plan.credits }, ...subFields },
      create: { id: userId, email, credits: FREE_CREDITS_FOR_NEW_USER + plan.credits, ...subFields },
    });

    await prisma.purchase.create({
      data: {
        userId,
        amount,
        plan: plan.name,
        polarOrderId: orderId,
        status: "completed",
        gclid,
      },
    });

    console.log(
      `[polar webhook] order ${orderId}: ${plan.name} (+${plan.credits} credits) for ${userId}`
    );

    // Credit-pack purchases get the "+N credits" email; subscriptions get their
    // own lifecycle via the subscription handlers.
    if (plan.kind !== "subscription") {
      void sendPurchaseNotification({
        userEmail: email,
        userId,
        planName: plan.name,
        amount,
        currency: order.currency?.toUpperCase() ?? "USD",
        credits: plan.credits,
        orderId,
      }).catch((err) => console.error("[polar webhook] purchase notification failed:", err));
    }
  },

  // Subscription lifecycle → User.subscription* (drives unlimited entitlement).
  onSubscriptionCreated: async (p) => applySubscription(p.data as unknown as AnySub),
  onSubscriptionActive: async (p) => applySubscription(p.data as unknown as AnySub),
  onSubscriptionUpdated: async (p) => applySubscription(p.data as unknown as AnySub),
  onSubscriptionCanceled: async (p) => applySubscription(p.data as unknown as AnySub, "canceled"),
  onSubscriptionRevoked: async (p) =>
    applySubscription({ ...(p.data as unknown as AnySub), currentPeriodEnd: null }, "revoked"),
});
