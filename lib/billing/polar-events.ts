import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { FREE_CREDITS_FOR_NEW_USER } from "@/lib/credits";
import { findPlanByProductId, findPlanKeyByProductId, type PolarPlan } from "@/lib/polar";
import { grant, revoke, type Tx } from "./ledger";

// Polar webhook → database. Framework-free (the route verifies the signature
// and calls processPolarEvent), so it is tested directly against Postgres.
//
// Rules:
// - Every delivery is recorded first (PolarWebhookEvent, id = webhook-id).
//   A delivery already processed is acknowledged without doing anything.
// - An order credits once: the Purchase row (unique polarOrderId) and the
//   ledger grant (key order:<id>) are written in ONE transaction.
// - Subscription events apply only if not older than what we already have
//   (Polar retries arrive out of order); an old "active" can never undo a
//   newer "revoked".

/** Polar sends snake_case JSON; the processor reads camelCase. Keys only, values untouched. */
export function camelizeKeys(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(camelizeKeys);
  if (!v || typeof v !== "object") return v;
  const out: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    // metadata is user-defined (e.g. gclid): keep its keys as sent.
    out[k.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase())] = k === "metadata" ? val : camelizeKeys(val);
  }
  return out;
}

export type PolarEvent = { id: string; type: string; timestamp?: Date | string | null; data: Record<string, unknown> };

export type ProcessResult =
  | { status: "processed"; effect: string; notify?: PurchaseNotice }
  | { status: "duplicate" }
  | { status: "ignored"; reason: string };

export type PurchaseNotice = { userId: string; email: string; planName: string; amount: number; currency: string; credits: number; orderId: string };

const str = (v: unknown): string | null => (typeof v === "string" && v ? v : null);
const date = (v: unknown): Date | null => {
  if (v instanceof Date) return v;
  if (typeof v === "string" && v) {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
};

function customerOf(d: Record<string, unknown>) {
  const c = (d.customer ?? {}) as Record<string, unknown>;
  return { userId: str(c.externalId) ?? str(d.externalCustomerId), email: str(c.email) };
}

/** The user's row, created with the standard free credits if this is their first contact. */
async function ensureUserTx(tx: Tx, userId: string, email: string | null) {
  const found = await tx.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (found) return;
  const taken = email ? await tx.user.findUnique({ where: { email }, select: { id: true } }) : null;
  await tx.user.create({
    data: { id: userId, email: email && !taken ? email : `no-email+${userId}@users.hiredcv.invalid`, credits: FREE_CREDITS_FOR_NEW_USER },
  });
}

function passWindow(plan: PolarPlan, productId: string) {
  const days = plan.grantsUnlimitedDays ?? 0;
  return days > 0
    ? { subscriptionStatus: "active", subscriptionPlan: findPlanKeyByProductId(productId), subscriptionCurrentPeriodEnd: new Date(Date.now() + days * 86_400_000) }
    : null;
}

async function orderPaid(d: Record<string, unknown>): Promise<ProcessResult> {
  const orderId = str(d.id);
  const productId = str(d.productId);
  const { userId, email } = customerOf(d);
  if (!orderId || !productId || !userId) return { status: "ignored", reason: "order missing id, product or customer" };
  const plan = findPlanByProductId(productId);
  if (!plan) return { status: "ignored", reason: `unknown product ${productId}` };

  const amount = (typeof d.netAmount === "number" ? d.netAmount : 0) / 100;
  const meta = (d.metadata ?? {}) as Record<string, unknown>;
  try {
    const out = await prisma.$transaction(async (tx) => {
      await ensureUserTx(tx, userId, email);
      await tx.purchase.create({
        data: { userId, amount, plan: plan.name, polarOrderId: orderId, status: "completed", gclid: str(meta.gclid) },
      });
      const g = await grant(tx, { userId, amount: plan.credits, reason: "purchase", key: `order:${orderId}`, refType: "order", refId: orderId });
      const pass = passWindow(plan, productId);
      if (pass) await tx.user.update({ where: { id: userId }, data: pass });
      const u = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true } });
      return { balance: g.balance, email: u.email };
    });
    return {
      status: "processed",
      effect: `+${plan.credits} credits (${plan.name}) → ${out.balance}`,
      notify:
        plan.kind !== "subscription"
          ? { userId, email: out.email, planName: plan.name, amount, currency: (str(d.currency) ?? "usd").toUpperCase(), credits: plan.credits, orderId }
          : undefined,
    };
  } catch (err) {
    // The Purchase already exists: this order was credited by an earlier delivery.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return { status: "duplicate" };
    throw err;
  }
}

async function orderRefunded(d: Record<string, unknown>): Promise<ProcessResult> {
  const orderId = str(d.id);
  if (!orderId) return { status: "ignored", reason: "refund missing order id" };
  const purchase = await prisma.purchase.findUnique({ where: { polarOrderId: orderId }, select: { userId: true, plan: true, status: true } });
  if (!purchase) return { status: "ignored", reason: `refund for unknown order ${orderId}` };
  const productId = str(d.productId);
  const plan = productId ? findPlanByProductId(productId) : null;
  if (!plan) return { status: "ignored", reason: "refund for unknown product" };

  const full = d.status === "refunded";
  const total = typeof d.totalAmount === "number" && d.totalAmount > 0 ? d.totalAmount : null;
  const refunded = typeof d.refundedAmount === "number" ? d.refundedAmount : 0;
  // Partial refund takes back the same share of the credits, rounded down.
  const share = full ? 1 : total ? Math.min(1, refunded / total) : 0;
  const take = Math.floor(plan.credits * share);

  const r = await prisma.$transaction(async (tx) => {
    const out = await revoke(tx, { userId: purchase.userId, amount: take, reason: "purchase_refund", key: `order-refund:${orderId}:${refunded}`, refType: "order", refId: orderId });
    await tx.purchase.update({ where: { polarOrderId: orderId }, data: { status: full ? "refunded" : "partially_refunded" } });
    // A refunded Job Search Pass ends its Unlimited window now.
    if (full && (plan.grantsUnlimitedDays ?? 0) > 0) {
      await tx.user.update({ where: { id: purchase.userId }, data: { subscriptionStatus: "revoked", subscriptionCurrentPeriodEnd: new Date() } });
    }
    return out;
  });
  return r.duplicate ? { status: "duplicate" } : { status: "processed", effect: `-${r.revoked} credits (refund)` };
}

async function subscription(d: Record<string, unknown>, type: string, eventTime: Date | null): Promise<ProcessResult> {
  const { userId, email } = customerOf(d);
  if (!userId) return { status: "ignored", reason: "subscription missing customer" };
  const at = date(d.modifiedAt) ?? date(d.createdAt) ?? eventTime ?? new Date();
  const terminal = type === "subscription.revoked" ? "revoked" : type === "subscription.canceled" ? "canceled" : null;
  const status = terminal ?? str(d.status) ?? "active";
  const productId = str(d.productId);
  const periodEnd = type === "subscription.revoked" ? null : date(d.currentPeriodEnd);

  return prisma.$transaction(async (tx) => {
    await ensureUserTx(tx, userId, email);
    const rows = await tx.$queryRaw<{ subscriptionSyncedAt: Date | null }[]>`
      SELECT "subscriptionSyncedAt" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
    const last = rows[0]?.subscriptionSyncedAt ?? null;
    if (last && at.getTime() < last.getTime()) {
      return { status: "ignored" as const, reason: `stale ${type} (${at.toISOString()} < ${last.toISOString()})` };
    }
    await tx.user.update({
      where: { id: userId },
      data: {
        subscriptionStatus: status,
        subscriptionPlan: productId ? findPlanKeyByProductId(productId) : null,
        subscriptionCurrentPeriodEnd: periodEnd,
        polarSubscriptionId: str(d.id),
        subscriptionSyncedAt: at,
      },
    });
    return { status: "processed" as const, effect: `subscription ${status}` };
  });
}

async function dispatch(e: PolarEvent): Promise<ProcessResult> {
  if (e.type === "order.paid") return orderPaid(e.data);
  if (e.type === "order.refunded") return orderRefunded(e.data);
  if (e.type.startsWith("subscription.")) return subscription(e.data, e.type, date(e.timestamp));
  return { status: "ignored", reason: `unhandled ${e.type}` };
}

/** Record, de-duplicate and apply one verified Polar delivery. Safe to call again with the same id. */
export async function processPolarEvent(e: PolarEvent): Promise<ProcessResult> {
  try {
    await prisma.polarWebhookEvent.create({ data: { id: e.id, type: e.type, payload: JSON.parse(JSON.stringify(e.data)) } });
  } catch (err) {
    if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")) throw err;
    const prev = await prisma.polarWebhookEvent.findUnique({ where: { id: e.id }, select: { processedAt: true } });
    if (prev?.processedAt) return { status: "duplicate" };
    // Received before but not finished (crash mid-way): process again. Each
    // effect is idempotent on its own key, so a partial first run is safe.
  }
  const result = await dispatch(e);
  await prisma.polarWebhookEvent.update({ where: { id: e.id }, data: { processedAt: new Date() } });
  return result;
}
