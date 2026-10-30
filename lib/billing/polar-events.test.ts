import { localDbUrl } from "@/test/local-db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";

// Plans read product ids from env at import time.
process.env.POLAR_PRODUCT_PRO = "prod_test_pro";
process.env.POLAR_PRODUCT_UNLIMITED_MONTHLY = "prod_test_unl";
process.env.POLAR_PRODUCT_UNLIMITED_QUARTER = "prod_test_pass";

const run = localDbUrl() ? describe : describe.skip;
const rid = () => randomBytes(6).toString("hex");

run("Polar webhook processing (local Postgres)", () => {
  let prisma: typeof import("@/lib/prisma").prisma;
  let processPolarEvent: typeof import("./polar-events").processPolarEvent;
  const users: string[] = [];

  beforeAll(async () => {
    ({ prisma } = await import("@/lib/prisma"));
    ({ processPolarEvent } = await import("./polar-events"));
  });
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    await prisma.$disconnect();
  });

  const newUserId = () => {
    const id = `user_polar_${rid()}`;
    users.push(id);
    return id;
  };
  const order = (userId: string, orderId = `ord_${rid()}`, productId = "prod_test_pro", extra: Record<string, unknown> = {}) => ({
    id: orderId,
    productId,
    netAmount: 900,
    totalAmount: 900,
    currency: "usd",
    customer: { externalId: userId, email: `${userId}@test.invalid` },
    metadata: { gclid: "g-123" },
    ...extra,
  });
  const credits = async (id: string) => (await prisma.user.findUniqueOrThrow({ where: { id } })).credits;
  const ledgerSum = async (id: string) => (await prisma.creditLedger.aggregate({ where: { userId: id }, _sum: { delta: true } }))._sum.delta ?? 0;

  it("credits a paid order once, even when Polar delivers it twice", async () => {
    const u = newUserId();
    const evt = { id: `wh_${rid()}`, type: "order.paid", data: order(u) };
    const a = await processPolarEvent(evt);
    const b = await processPolarEvent(evt);
    expect(a.status).toBe("processed");
    expect(b.status).toBe("duplicate");
    expect(await credits(u)).toBe(1 + 20); // signup + Pro
    expect(await ledgerSum(u)).toBe(21);
    const p = await prisma.purchase.findFirstOrThrow({ where: { userId: u } });
    expect(p).toMatchObject({ plan: "Pro", amount: 9, gclid: "g-123" });
  });

  it("the same order under two different deliveries is still credited once", async () => {
    const u = newUserId();
    const data = order(u);
    await processPolarEvent({ id: `wh_${rid()}`, type: "order.paid", data });
    const second = await processPolarEvent({ id: `wh_${rid()}`, type: "order.paid", data });
    expect(second.status).toBe("duplicate");
    expect(await credits(u)).toBe(21);
  });

  it("ignores an order for an unknown product without crediting", async () => {
    const u = newUserId();
    const r = await processPolarEvent({ id: `wh_${rid()}`, type: "order.paid", data: order(u, undefined, "prod_unknown") });
    expect(r.status).toBe("ignored");
    expect(await prisma.user.findUnique({ where: { id: u } })).toBeNull();
  });

  it("a refund takes back the unspent credits, never more than are left", async () => {
    const u = newUserId();
    const o = order(u);
    await processPolarEvent({ id: `wh_${rid()}`, type: "order.paid", data: o });
    await prisma.$transaction(async (tx) => {
      const { charge } = await import("./ledger");
      for (let i = 0; i < 15; i++) await charge(tx, { userId: u, reason: "analyze", key: `spend:${u}:${i}` });
    });
    const r = await processPolarEvent({ id: `wh_${rid()}`, type: "order.refunded", data: { ...o, status: "refunded", refundedAmount: 900 } });
    expect(r).toMatchObject({ status: "processed", effect: "-6 credits (refund)" });
    expect(await credits(u)).toBe(0);
    expect(await ledgerSum(u)).toBe(0);
    expect((await prisma.purchase.findFirstOrThrow({ where: { userId: u } })).status).toBe("refunded");
  });

  it("a partial refund takes back the same share", async () => {
    const u = newUserId();
    const o = order(u);
    await processPolarEvent({ id: `wh_${rid()}`, type: "order.paid", data: o });
    await processPolarEvent({ id: `wh_${rid()}`, type: "order.refunded", data: { ...o, status: "partially_refunded", refundedAmount: 450 } });
    expect(await credits(u)).toBe(21 - 10);
  });

  it("the Job Search Pass grants 90 days of Unlimited, and a refund ends it", async () => {
    const u = newUserId();
    const o = order(u, undefined, "prod_test_pass", { netAmount: 9000, totalAmount: 9000 });
    await processPolarEvent({ id: `wh_${rid()}`, type: "order.paid", data: o });
    const on = await prisma.user.findUniqueOrThrow({ where: { id: u } });
    expect(on.subscriptionStatus).toBe("active");
    expect(on.subscriptionCurrentPeriodEnd!.getTime()).toBeGreaterThan(Date.now() + 89 * 86_400_000);
    await processPolarEvent({ id: `wh_${rid()}`, type: "order.refunded", data: { ...o, status: "refunded", refundedAmount: 9000 } });
    const off = await prisma.user.findUniqueOrThrow({ where: { id: u } });
    expect(off.subscriptionStatus).toBe("revoked");
    expect(off.subscriptionCurrentPeriodEnd!.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it("an older subscription event arriving late cannot undo a newer one", async () => {
    const u = newUserId();
    const sub = (status: string, modifiedAt: string) => ({
      id: "sub_1",
      status,
      productId: "prod_test_unl",
      currentPeriodEnd: "2026-12-01T00:00:00Z",
      modifiedAt,
      customer: { externalId: u, email: `${u}@test.invalid` },
    });
    await processPolarEvent({ id: `wh_${rid()}`, type: "subscription.revoked", data: sub("revoked", "2026-11-02T10:00:00Z") });
    const late = await processPolarEvent({ id: `wh_${rid()}`, type: "subscription.active", data: sub("active", "2026-11-01T10:00:00Z") });
    expect(late.status).toBe("ignored");
    const row = await prisma.user.findUniqueOrThrow({ where: { id: u } });
    expect(row.subscriptionStatus).toBe("revoked");
    expect(row.subscriptionCurrentPeriodEnd).toBeNull();
    expect(row.subscriptionPlan).toBe("unlimited_monthly");
  });

  it("records every delivery and marks it processed", async () => {
    const u = newUserId();
    const id = `wh_${rid()}`;
    await processPolarEvent({ id, type: "checkout.created", data: { id: "chk", customer: { externalId: u } } });
    const row = await prisma.polarWebhookEvent.findUniqueOrThrow({ where: { id } });
    expect(row.type).toBe("checkout.created");
    expect(row.processedAt).not.toBeNull();
  });
});
