import { Webhooks } from "@polar-sh/nextjs";
import { prisma } from "@/lib/prisma";
import { findPlanByProductId } from "@/lib/polar";
import { FREE_CREDITS_FOR_NEW_USER } from "@/lib/credits";

export const POST = Webhooks({
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET!,
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

    await prisma.user.upsert({
      where: { id: userId },
      update: { credits: { increment: plan.credits } },
      create: { id: userId, email, credits: FREE_CREDITS_FOR_NEW_USER + plan.credits },
    });

    await prisma.purchase.create({
      data: {
        userId,
        amount,
        plan: plan.name,
        polarOrderId: orderId,
        status: "completed",
      },
    });

    console.log(`[polar webhook] +${plan.credits} credits to ${userId} (order ${orderId})`);
  },
});
