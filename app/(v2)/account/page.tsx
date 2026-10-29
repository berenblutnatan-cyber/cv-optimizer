import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { UserRound } from "lucide-react";
import { getBalance, listLedger } from "@/lib/billing/ledger";
import { prisma } from "@/lib/prisma";
import { ensureUser } from "@/lib/users";
import { Button, Card, EmptyState } from "@/components/ui";
import { AppHeader } from "@/components/v2/AppHeader";
import { AccountView, type AccountData } from "@/components/v2/billing/AccountView";

export const metadata: Metadata = { title: "Account", robots: { index: false } };
export const dynamic = "force-dynamic";

const nav = (
  <Link href="/cv" className="inline-flex h-9 items-center rounded-control px-3 text-body font-medium text-ink-2 hover:bg-surface-2 hover:text-ink">
    Your CVs
  </Link>
);

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ portal?: string }> }) {
  const { userId } = await auth().catch(() => ({ userId: null }));
  const { portal } = await searchParams;

  if (!userId) {
    return (
      <div className="min-h-dvh bg-canvas">
        <AppHeader>{nav}</AppHeader>
        <main className="mx-auto max-w-3xl px-4 py-10 md:px-8">
          <Card>
            <EmptyState
              icon={<UserRound />}
              title="Sign in to see your account"
              action={
                <Button asChild variant="primary">
                  <Link href="/sign-in?redirect_url=/account">Sign in</Link>
                </Button>
              }
            />
          </Card>
        </main>
      </div>
    );
  }

  await ensureUser(userId);
  const [balance, ledger, purchases] = await Promise.all([
    getBalance(userId),
    listLedger(userId, 50),
    prisma.purchase.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 20, select: { id: true, plan: true, amount: true, status: true, createdAt: true, polarOrderId: true } }),
  ]);
  const initial: AccountData = JSON.parse(
    JSON.stringify({ balance: balance ?? { credits: 0, unlimited: false, plan: null, periodEnd: null, status: null }, ledger, purchases }),
  );

  return (
    <div className="min-h-dvh bg-canvas">
      <AppHeader>{nav}</AppHeader>
      <main className="mx-auto max-w-3xl px-4 py-10 md:px-8">
        <h1 className="mb-6 text-h1 font-semibold text-ink">Account</h1>
        <AccountView initial={initial} portalUnavailable={portal === "unavailable"} />
      </main>
    </div>
  );
}
