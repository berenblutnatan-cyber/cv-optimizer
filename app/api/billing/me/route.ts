import { auth } from "@clerk/nextjs/server";
import { getBalance, listLedger } from "@/lib/billing/ledger";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/billing/me — balance, Unlimited status, recent activity, purchases.
export async function GET() {
  const { userId } = await auth().catch(() => ({ userId: null }));
  if (!userId) return Response.json({ error: "Sign in", code: "AUTH_REQUIRED" }, { status: 401 });
  const [balance, ledger, purchases] = await Promise.all([
    getBalance(userId),
    listLedger(userId, 50),
    prisma.purchase.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 20, select: { id: true, plan: true, amount: true, status: true, createdAt: true, polarOrderId: true } }),
  ]);
  return Response.json({ balance: balance ?? { credits: 0, unlimited: false, plan: null, periodEnd: null, status: null }, ledger, purchases }, { headers: { "cache-control": "private, no-store" } });
}
