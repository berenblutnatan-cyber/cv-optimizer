import { localDbUrl } from "@/test/local-db";
import { afterAll, describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { charge, chargeNow, getBalance, grant, InsufficientCredits, refundCharge, revoke, withCharge } from "./ledger";

const run = localDbUrl() ? describe : describe.skip;
const ids: string[] = [];

async function user(credits = 1, extra: Record<string, unknown> = {}) {
  const id = `user_ledger_${randomBytes(6).toString("hex")}`;
  ids.push(id);
  await prisma.user.create({ data: { id, email: `${id}@test.invalid`, credits, ...extra } });
  return id;
}
const key = (p: string) => `${p}:${randomBytes(6).toString("hex")}`;
const sum = async (userId: string) => (await prisma.creditLedger.aggregate({ where: { userId }, _sum: { delta: true } }))._sum.delta ?? 0;
const credits = async (userId: string) => (await prisma.user.findUniqueOrThrow({ where: { id: userId } })).credits;

run("credit ledger (local Postgres)", () => {
  afterAll(async () => {
    // Whatever the tests above did, every user's ledger sums to their balance.
    const drift = await prisma.$queryRaw<{ id: string }[]>`
      SELECT u."id" FROM "User" u LEFT JOIN "CreditLedger" l ON l."userId" = u."id"
      WHERE u."id" = ANY(${ids}) GROUP BY u."id" HAVING u."credits" <> COALESCE(SUM(l."delta"), 0)`;
    expect(drift).toEqual([]);
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  });

  it("records the signup credits of a new user (DB trigger), so the ledger sums to the balance", async () => {
    const u = await user(1);
    const rows = await prisma.creditLedger.findMany({ where: { userId: u } });
    expect(rows.map((r) => [r.reason, r.delta])).toEqual([["signup", 1]]);
    expect(await sum(u)).toBe(await credits(u));
  });

  it("charges once per key: a retried charge takes nothing", async () => {
    const u = await user(3);
    const k = key("analyze");
    const a = await chargeNow({ userId: u, reason: "analyze", key: k });
    const b = await chargeNow({ userId: u, reason: "analyze", key: k });
    expect(a).toMatchObject({ charged: 1, balance: 2, duplicate: false });
    expect(b).toMatchObject({ charged: 1, duplicate: true });
    expect(await credits(u)).toBe(2);
    expect(await sum(u)).toBe(2);
  });

  it("refuses to go below zero and leaves no ledger row behind", async () => {
    const u = await user(0);
    await expect(chargeNow({ userId: u, reason: "analyze", key: key("x") })).rejects.toBeInstanceOf(InsufficientCredits);
    expect(await credits(u)).toBe(0);
    expect(await prisma.creditLedger.count({ where: { userId: u, reason: "analyze" } })).toBe(0);
  });

  it("rolls back everything written alongside a failed charge", async () => {
    const u = await user(0);
    await expect(
      prisma.$transaction(async (tx) => {
        await tx.feedback.create({ data: { userId: u, rating: 5, comment: "written in the same tx" } });
        await charge(tx, { userId: u, reason: "unlock", key: key("u") });
      }),
    ).rejects.toBeInstanceOf(InsufficientCredits);
    expect(await prisma.feedback.count({ where: { userId: u } })).toBe(0);
    expect(await prisma.creditLedger.count({ where: { userId: u, reason: "unlock" } })).toBe(0);
  });

  it("the database itself refuses a negative balance", async () => {
    const u = await user(0);
    await expect(prisma.user.update({ where: { id: u }, data: { credits: -1 } })).rejects.toThrow(/User_credits_nonnegative_chk/);
  });

  it("Unlimited is not charged but the use is logged", async () => {
    const u = await user(2, { subscriptionStatus: "active", subscriptionCurrentPeriodEnd: new Date(Date.now() + 86_400_000) });
    const c = await chargeNow({ userId: u, reason: "tailor", key: key("t") });
    expect(c).toMatchObject({ charged: 0, unlimited: true, balance: 2 });
    expect(await prisma.creditLedger.count({ where: { userId: u, reason: "tailor", delta: 0 } })).toBe(1);
  });

  it("withCharge refunds when the work fails or returns nothing", async () => {
    const u = await user(1);
    await expect(withCharge({ userId: u, reason: "cover_letter", key: key("c") }, async () => { throw new Error("model down"); })).rejects.toThrow("model down");
    expect(await credits(u)).toBe(1);
    const none = await withCharge({ userId: u, reason: "cover_letter", key: key("c") }, async () => null);
    expect(none.result).toBeNull();
    expect(await credits(u)).toBe(1);
    const ok = await withCharge({ userId: u, reason: "cover_letter", key: key("c") }, async () => "letter");
    expect(ok.result).toBe("letter");
    expect(await credits(u)).toBe(0);
    expect(await sum(u)).toBe(0);
  });

  it("a refund is idempotent", async () => {
    const u = await user(1);
    const k = key("v");
    await chargeNow({ userId: u, reason: "voice", key: k });
    await prisma.$transaction((tx) => refundCharge(tx, k));
    await prisma.$transaction((tx) => refundCharge(tx, k));
    expect(await credits(u)).toBe(1);
  });

  it("grants are idempotent and revoke never takes more than is left", async () => {
    const u = await user(0);
    const g = key("order");
    await prisma.$transaction((tx) => grant(tx, { userId: u, amount: 20, reason: "purchase", key: g }));
    await prisma.$transaction((tx) => grant(tx, { userId: u, amount: 20, reason: "purchase", key: g }));
    expect(await credits(u)).toBe(20);
    await chargeNow({ userId: u, reason: "analyze", amount: 15, key: key("a") });
    const r = await prisma.$transaction((tx) => revoke(tx, { userId: u, amount: 20, reason: "purchase_refund", key: key("refund") }));
    expect(r.revoked).toBe(5);
    expect(await credits(u)).toBe(0);
    expect(await sum(u)).toBe(0);
  });

  it("an idempotency key cannot be replayed against another user", async () => {
    const a = await user(2);
    const b = await user(2);
    const k = key("shared");
    await chargeNow({ userId: a, reason: "analyze", key: k });
    await expect(chargeNow({ userId: b, reason: "analyze", key: k })).rejects.toThrow(/another user/);
    expect(await credits(b)).toBe(2);
  });

  it("reports the balance with Unlimited status", async () => {
    const u = await user(4);
    expect(await getBalance(u)).toMatchObject({ credits: 4, unlimited: false });
  });

  // PGlite runs one transaction at a time, so this proves the row lock only on real Postgres (CI).
  it.skipIf(process.env.REAL_POSTGRES !== "1")("two concurrent charges cannot both spend the last credit (real Postgres only)", async () => {
    const u = await user(1);
    const results = await Promise.allSettled([chargeNow({ userId: u, reason: "analyze", key: key("r1") }), chargeNow({ userId: u, reason: "analyze", key: key("r2") })]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await credits(u)).toBe(0);
  });
});
