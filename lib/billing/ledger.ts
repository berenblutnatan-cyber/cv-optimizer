import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hasActiveSubscription } from "@/lib/subscription";

// The ONLY code that changes User.credits (test/guards/credits-writes.test.ts
// fails the build on any other write). Every change is one ledger row written
// in the same transaction, under a row lock on the user, keyed by an
// idempotency key: a retried charge or grant is a no-op, two concurrent
// charges can never both spend the last credit, and the database refuses a
// negative balance (User_credits_nonnegative_chk).

export type Tx = Prisma.TransactionClient;

/** Why the balance moved. Free-form in the DB (checked ^[a-z_]+$), a closed list here. */
export type LedgerReason =
  | "purchase"
  | "purchase_refund"
  | "coupon"
  | "feedback_reward"
  | "refund"
  | "admin"
  | "analyze"
  | "unlock"
  | "interview_prep"
  | "cover_letter"
  | "voice_finalize"
  | "use_credit"
  | "tailor"
  | "voice"
  | "interview"
  | "toolkit";

export class InsufficientCredits extends Error {
  constructor(public balance: number) {
    super("Insufficient credits");
  }
}

export type ChargeResult = {
  /** Credits actually taken (0 for Unlimited or a repeated key). */
  charged: number;
  balance: number;
  unlimited: boolean;
  /** True when this key was already charged; nothing happened now. */
  duplicate: boolean;
};

type Ref = { refType?: string; refId?: string };

const KEY = /^[A-Za-z0-9:_.-]{3,200}$/;

async function lockUser(tx: Tx, userId: string) {
  const rows = await tx.$queryRaw<{ credits: number; subscriptionStatus: string | null; subscriptionCurrentPeriodEnd: Date | null }[]>`
    SELECT "credits", "subscriptionStatus", "subscriptionCurrentPeriodEnd" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
  return rows[0] ?? null;
}

async function existing(tx: Tx, key: string) {
  return tx.creditLedger.findUnique({ where: { idempotencyKey: key }, select: { delta: true, balanceAfter: true, userId: true } });
}

/**
 * Take `amount` credits (default 1) inside `tx`. Unlimited subscribers are
 * not charged, but the use is still logged (delta 0) for fair-use and admin.
 * Throws InsufficientCredits when the balance is short (the caller's
 * transaction rolls back, so nothing it wrote alongside survives).
 */
export async function charge(
  tx: Tx,
  p: { userId: string; reason: LedgerReason; key: string; amount?: number; ignoreUnlimited?: boolean } & Ref,
): Promise<ChargeResult> {
  const amount = p.amount ?? 1;
  if (!Number.isInteger(amount) || amount < 1) throw new Error("charge amount must be a positive integer");
  if (!KEY.test(p.key)) throw new Error(`bad idempotency key: ${p.key}`);

  const user = await lockUser(tx, p.userId);
  if (!user) throw new InsufficientCredits(0);
  // ignoreUnlimited: use beyond Unlimited's fair-use cap is paid in credits.
  const unlimited = hasActiveSubscription(user) && !p.ignoreUnlimited;

  const prior = await existing(tx, p.key);
  if (prior) {
    if (prior.userId !== p.userId) throw new Error("idempotency key belongs to another user");
    return { charged: Math.abs(prior.delta), balance: user.credits, unlimited, duplicate: true };
  }

  const delta = unlimited ? 0 : -amount;
  if (user.credits + delta < 0) throw new InsufficientCredits(user.credits);
  const balance = user.credits + delta;
  if (delta !== 0) await tx.user.update({ where: { id: p.userId }, data: { credits: balance } });
  await tx.creditLedger.create({
    data: { userId: p.userId, delta, balanceAfter: balance, reason: p.reason, refType: p.refType, refId: p.refId, idempotencyKey: p.key },
  });
  return { charged: Math.abs(delta), balance, unlimited, duplicate: false };
}

/** Add credits inside `tx` (purchase, coupon, reward). Idempotent on `key`. */
export async function grant(
  tx: Tx,
  p: { userId: string; amount: number; reason: LedgerReason; key: string } & Ref,
): Promise<{ balance: number; duplicate: boolean }> {
  if (!Number.isInteger(p.amount) || p.amount < 0) throw new Error("grant amount must be a non-negative integer");
  if (!KEY.test(p.key)) throw new Error(`bad idempotency key: ${p.key}`);
  const user = await lockUser(tx, p.userId);
  if (!user) throw new Error(`grant: no user ${p.userId}`);
  if (await existing(tx, p.key)) return { balance: user.credits, duplicate: true };
  const balance = user.credits + p.amount;
  if (p.amount !== 0) await tx.user.update({ where: { id: p.userId }, data: { credits: balance } });
  await tx.creditLedger.create({
    data: { userId: p.userId, delta: p.amount, balanceAfter: balance, reason: p.reason, refType: p.refType, refId: p.refId, idempotencyKey: p.key },
  });
  return { balance, duplicate: false };
}

/**
 * Take back up to `amount` credits (a refunded purchase). Never below zero:
 * credits already spent stay spent. Idempotent on `key`.
 */
export async function revoke(
  tx: Tx,
  p: { userId: string; amount: number; reason: LedgerReason; key: string } & Ref,
): Promise<{ revoked: number; balance: number; duplicate: boolean }> {
  if (!KEY.test(p.key)) throw new Error(`bad idempotency key: ${p.key}`);
  const user = await lockUser(tx, p.userId);
  if (!user) return { revoked: 0, balance: 0, duplicate: false };
  const prior = await existing(tx, p.key);
  if (prior) return { revoked: -prior.delta, balance: user.credits, duplicate: true };
  const take = Math.max(0, Math.min(p.amount, user.credits));
  const balance = user.credits - take;
  if (take) await tx.user.update({ where: { id: p.userId }, data: { credits: balance } });
  await tx.creditLedger.create({
    data: { userId: p.userId, delta: -take, balanceAfter: balance, reason: p.reason, refType: p.refType, refId: p.refId, idempotencyKey: p.key },
  });
  return { revoked: take, balance, duplicate: false };
}

/** Give back exactly what the charge under `chargeKey` took (work failed after charging). */
export async function refundCharge(tx: Tx, chargeKey: string): Promise<{ refunded: number }> {
  const c = await tx.creditLedger.findUnique({ where: { idempotencyKey: chargeKey }, select: { userId: true, delta: true, refType: true, refId: true } });
  if (!c || c.delta >= 0) return { refunded: 0 };
  const out = await grant(tx, { userId: c.userId, amount: -c.delta, reason: "refund", key: `refund:${chargeKey}`, refType: c.refType ?? undefined, refId: c.refId ?? undefined });
  return { refunded: out.duplicate ? 0 : -c.delta };
}

/** Charge in its own transaction (for a reserve-then-work flow). */
export function chargeNow(p: Parameters<typeof charge>[1]): Promise<ChargeResult> {
  return prisma.$transaction((tx) => charge(tx, p));
}

/** Refund in its own transaction; never throws (logs instead). */
export async function refundNow(chargeKey: string): Promise<number> {
  try {
    return (await prisma.$transaction((tx) => refundCharge(tx, chargeKey))).refunded;
  } catch (err) {
    console.error("[billing] refund failed", chargeKey, err);
    return 0;
  }
}

/**
 * Reserve-then-work: charge first, run `work`, refund if it throws or returns
 * null. The user can never get the result without paying, and never pays for
 * a failure. Throws InsufficientCredits before any work happens.
 */
export async function withCharge<T>(p: Parameters<typeof charge>[1], work: (c: ChargeResult) => Promise<T | null>): Promise<{ result: T | null; charge: ChargeResult }> {
  const c = await chargeNow(p);
  if (c.duplicate) {
    // Already paid under this key: run the work, but never refund (the
    // original charge belongs to the original request).
    return { result: await work(c), charge: c };
  }
  try {
    const result = await work(c);
    if (result === null) await refundNow(p.key);
    return { result, charge: c };
  } catch (err) {
    await refundNow(p.key);
    throw err;
  }
}

export type Balance = { credits: number; unlimited: boolean; plan: string | null; periodEnd: Date | null; status: string | null };

export async function getBalance(userId: string): Promise<Balance | null> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { credits: true, subscriptionStatus: true, subscriptionPlan: true, subscriptionCurrentPeriodEnd: true },
  });
  if (!u) return null;
  return { credits: u.credits, unlimited: hasActiveSubscription(u), plan: u.subscriptionPlan, periodEnd: u.subscriptionCurrentPeriodEnd, status: u.subscriptionStatus };
}

export function listLedger(userId: string, take = 50) {
  return prisma.creditLedger.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
    select: { id: true, delta: true, balanceAfter: true, reason: true, refType: true, refId: true, createdAt: true },
  });
}

export const isInsufficient = (err: unknown): err is InsufficientCredits => err instanceof InsufficientCredits;
