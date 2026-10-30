import { localDbUrl } from "@/test/local-db";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { randomBytes } from "node:crypto";

// The toolkit: one free use per tool per day, then a credit (signed in), or
// sign in (signed out). A failed run gives the free use back; no credits
// means no model call.

let signedIn: string | null = null;
vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ userId: signedIn }) }));
const create = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({ default: class { messages = { create }; } }));

const EMAIL = { type: "tool_use", name: "emit_cold_email", input: { subject: "Checkout at Globex", body: "Hi Maya, I lifted checkout conversion 18% at Acme…" } };
const ok = () => create.mockResolvedValueOnce({ stop_reason: "tool_use", content: [EMAIL] });
const CV = "Dana Levi, Senior PM at Acme. Lifted checkout conversion 18%. Ran 14 pricing experiments.";

const run = localDbUrl() ? describe : describe.skip;

run("POST /api/toolkit/[tool] (local Postgres)", () => {
  let POST: typeof import("./route").POST;
  let prisma: typeof import("@/lib/prisma").prisma;
  const users: string[] = [];
  const ip = `10.${[1, 2, 3].map(() => Math.floor(Math.random() * 250)).join(".")}`;

  beforeAll(async () => {
    process.env.ANTHROPIC_API_KEY ||= "test";
    ({ POST } = await import("./route"));
    ({ prisma } = await import("@/lib/prisma"));
  });
  beforeEach(() => create.mockReset());
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    await prisma.rateLimitBucket.deleteMany({ where: { key: { contains: ip } } });
    await prisma.$disconnect();
  });

  const call = () =>
    POST(new Request("http://test/api/toolkit/cold-email", { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": ip }, body: JSON.stringify({ inputs: { cvText: CV, companyName: "Globex" } }) }) as never, {
      params: Promise.resolve({ tool: "cold-email" }),
    });
  const credits = async (id: string) => (await prisma.user.findUniqueOrThrow({ where: { id } })).credits;
  const account = async (n: number) => {
    const id = `user_tk_${randomBytes(6).toString("hex")}`;
    users.push(id);
    await prisma.user.create({ data: { id, email: `${id}@test.invalid`, credits: n } });
    return id;
  };

  it("first use of the day is free, the next costs a credit", async () => {
    signedIn = await account(1);
    ok();
    const a = await call();
    expect(a.status).toBe(200);
    expect(await a.json()).toMatchObject({ cost: "free", result: { subject: "Checkout at Globex" } });
    expect(await credits(signedIn)).toBe(1);
    ok();
    const b = await call();
    expect(await b.json()).toMatchObject({ cost: "credit" });
    expect(await credits(signedIn)).toBe(0);
    // Out of credits: refused before any model call.
    const c = await call();
    expect(c.status).toBe(402);
    expect(create).toHaveBeenCalledTimes(2);
  });

  it("a failed run gives the free use back", async () => {
    signedIn = await account(0);
    create.mockRejectedValueOnce(new Error("model down"));
    expect((await call()).status).toBe(500);
    ok();
    const again = await call();
    expect(again.status).toBe(200);
    expect(await again.json()).toMatchObject({ cost: "free" });
  });

  it("signed out: one free use, then sign in", async () => {
    signedIn = null;
    ok();
    expect((await call()).status).toBe(200);
    const second = await call();
    expect(second.status).toBe(402);
    expect(await second.json()).toMatchObject({ code: "SIGN_IN" });
    expect(create).toHaveBeenCalledTimes(1);
  });
});
