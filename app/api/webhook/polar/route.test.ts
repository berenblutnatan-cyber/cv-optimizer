import { localDbUrl } from "@/test/local-db";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomBytes } from "node:crypto";
import { Webhook } from "standardwebhooks";

process.env.POLAR_PRODUCT_PRO = "prod_route_pro";
const SECRET = "polar_whs_test_" + randomBytes(8).toString("hex");

vi.mock("@/lib/email", () => ({ sendPurchaseNotification: vi.fn(async () => ({ ok: true })) }));

const run = localDbUrl() ? describe : describe.skip;

// Sign exactly the way Polar does: Standard Webhooks with the base64 of the secret string.
function signed(body: unknown, id = `msg_${randomBytes(6).toString("hex")}`) {
  const raw = JSON.stringify(body);
  const ts = new Date();
  const sig = new Webhook(Buffer.from(SECRET, "utf-8").toString("base64")).sign(id, ts, raw);
  return new Request("http://test/api/webhook/polar", {
    method: "POST",
    headers: { "content-type": "application/json", "webhook-id": id, "webhook-timestamp": String(Math.floor(ts.getTime() / 1000)), "webhook-signature": sig },
    body: raw,
  });
}

run("POST /api/webhook/polar (local Postgres)", () => {
  let POST: typeof import("./route").POST;
  let prisma: typeof import("@/lib/prisma").prisma;
  const userId = `user_route_${randomBytes(6).toString("hex")}`;

  beforeAll(async () => {
    process.env.POLAR_WEBHOOK_SECRET = SECRET;
    ({ POST } = await import("./route"));
    ({ prisma } = await import("@/lib/prisma"));
  });
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  });

  // Polar's real wire format is snake_case, with fields the SDK schema may not know.
  const orderPaid = (orderId: string) => ({
    type: "order.paid",
    timestamp: new Date().toISOString(),
    data: {
      id: orderId,
      product_id: "prod_route_pro",
      net_amount: 900,
      total_amount: 900,
      currency: "usd",
      metadata: { gclid: "gclid_abc" },
      customer: { external_id: userId, email: `${userId}@test.invalid` },
      some_field_polar_added_later: { nested_thing: true },
    },
  });

  it("rejects a bad signature with 403 and changes nothing", async () => {
    const req = signed(orderPaid("ord_bad"));
    const tampered = new Request(req.url, { method: "POST", headers: req.headers, body: JSON.stringify({ ...orderPaid("ord_bad"), data: { ...orderPaid("ord_bad").data, net_amount: 1 } }) });
    const res = await POST(tampered);
    expect(res.status).toBe(403);
    expect(await prisma.purchase.findUnique({ where: { polarOrderId: "ord_bad" } })).toBeNull();
  });

  it("credits a signed snake_case order once, even when the same delivery is retried", async () => {
    const orderId = `ord_${randomBytes(6).toString("hex")}`;
    const id = `msg_${randomBytes(6).toString("hex")}`;
    const first = await POST(signed(orderPaid(orderId), id));
    expect(first.status).toBe(200);
    expect(await first.json()).toMatchObject({ status: "processed" });
    const retry = await POST(signed(orderPaid(orderId), id));
    expect(await retry.json()).toMatchObject({ status: "duplicate" });

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(user.credits).toBe(1 + 20);
    const p = await prisma.purchase.findUniqueOrThrow({ where: { polarOrderId: orderId } });
    expect(p.gclid).toBe("gclid_abc");
  });

  it("answers 500 when the secret is missing, so Polar retries later", async () => {
    const saved = process.env.POLAR_WEBHOOK_SECRET;
    delete process.env.POLAR_WEBHOOK_SECRET;
    const res = await POST(signed(orderPaid("ord_nosecret")));
    process.env.POLAR_WEBHOOK_SECRET = saved;
    expect(res.status).toBe(500);
  });
});
