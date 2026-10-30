import "server-only";
import { prisma } from "@/lib/prisma";

// Billing health for /admin/billing. Read-only.

export async function billingOverview() {
  const since30 = new Date(Date.now() - 30 * 86_400_000);
  const since7 = new Date(Date.now() - 7 * 86_400_000);
  const [revenue, outstanding, spend, drift, stuck, recent, unlimited] = await Promise.all([
    prisma.purchase.aggregate({ where: { createdAt: { gte: since30 }, status: "completed" }, _sum: { amount: true }, _count: true }),
    prisma.user.aggregate({ _sum: { credits: true } }),
    prisma.creditLedger.groupBy({ by: ["reason"], where: { createdAt: { gte: since7 } }, _sum: { delta: true }, _count: true, orderBy: { _count: { reason: "desc" } } }),
    // Integrity: the ledger must sum to the balance for every user.
    prisma.$queryRaw<{ id: string; email: string; credits: number; ledger: number }[]>`
      SELECT u."id", u."email", u."credits", COALESCE(SUM(l."delta"), 0)::int AS "ledger"
      FROM "User" u LEFT JOIN "CreditLedger" l ON l."userId" = u."id"
      GROUP BY u."id" HAVING u."credits" <> COALESCE(SUM(l."delta"), 0)
      ORDER BY u."id" LIMIT 50`,
    prisma.polarWebhookEvent.findMany({
      where: { processedAt: null, receivedAt: { lt: new Date(Date.now() - 5 * 60_000) } },
      orderBy: { receivedAt: "desc" },
      take: 20,
      select: { id: true, type: true, receivedAt: true },
    }),
    prisma.creditLedger.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, delta: true, balanceAfter: true, reason: true, createdAt: true, user: { select: { email: true } } },
    }),
    prisma.user.count({ where: { subscriptionStatus: "active", OR: [{ subscriptionCurrentPeriodEnd: null }, { subscriptionCurrentPeriodEnd: { gt: new Date() } }] } }),
  ]);
  return {
    revenue30: revenue._sum.amount ?? 0,
    orders30: revenue._count,
    outstanding: outstanding._sum.credits ?? 0,
    unlimited,
    spend,
    drift,
    stuck,
    recent,
  };
}
