import { localDbUrl } from "@/test/local-db";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { randomBytes } from "node:crypto";
import { __resetMemoryLimits, limit, postgresIncr, pruneRateLimits } from "./limits";

const id = () => `t_${randomBytes(5).toString("hex")}`;
const env = process.env as Record<string, string | undefined>;
const saved = { NODE_ENV: env.NODE_ENV, KV_REST_API_URL: env.KV_REST_API_URL, KV_REST_API_TOKEN: env.KV_REST_API_TOKEN, UPSTASH_REDIS_REST_URL: env.UPSTASH_REDIS_REST_URL };

beforeEach(() => {
  delete env.KV_REST_API_URL;
  delete env.KV_REST_API_TOKEN;
  delete env.UPSTASH_REDIS_REST_URL;
  __resetMemoryLimits();
});
afterEach(() => {
  Object.assign(env, saved);
});

describe("limit (no KV, outside production)", () => {
  it("counts in memory up to the cap", async () => {
    const who = id();
    for (let i = 0; i < 3; i++) expect(await limit({ name: "mem", id: who, cap: 3, windowSec: 60 })).toEqual({ ok: true });
    expect(await limit({ name: "mem", id: who, cap: 3, windowSec: 60 })).toEqual({ ok: false, reason: "limited" });
    expect(await limit({ name: "mem", id: id(), cap: 3, windowSec: 60 })).toEqual({ ok: true });
  });
});

const run = localDbUrl() ? describe : describe.skip;

run("limit in production without KV (local Postgres)", () => {
  afterAll(async () => {
    const { prisma } = await import("@/lib/prisma");
    await prisma.rateLimitBucket.deleteMany({ where: { key: { startsWith: "rl2:prodtest" } } });
    await prisma.rateLimitBucket.deleteMany({ where: { key: { startsWith: "test:" } } });
    await prisma.$disconnect();
  });

  it("uses Postgres instead of failing closed, and still enforces the cap", async () => {
    env.NODE_ENV = "production";
    const who = id();
    const results = [];
    for (let i = 0; i < 4; i++) results.push(await limit({ name: "prodtest", id: who, cap: 3, windowSec: 60 }));
    expect(results).toEqual([{ ok: true }, { ok: true }, { ok: true }, { ok: false, reason: "limited" }]);
    // Another caller has its own window.
    expect(await limit({ name: "prodtest", id: id(), cap: 3, windowSec: 60 })).toEqual({ ok: true });
  });

  it("restarts an expired window at 1, in the same statement", async () => {
    const { prisma } = await import("@/lib/prisma");
    const key = `test:${id()}`;
    expect(await postgresIncr(key, 60)).toBe(1);
    expect(await postgresIncr(key, 60)).toBe(2);
    await prisma.rateLimitBucket.update({ where: { key }, data: { windowStart: new Date(Date.now() - 61_000) } });
    expect(await postgresIncr(key, 60)).toBe(1);
    expect(await postgresIncr(key, 60)).toBe(2);
  });

  it("the daily prune drops only long-expired buckets", async () => {
    const { prisma } = await import("@/lib/prisma");
    const old = `test:${id()}`;
    const fresh = `test:${id()}`;
    await postgresIncr(old, 60);
    await postgresIncr(fresh, 60);
    await prisma.rateLimitBucket.update({ where: { key: old }, data: { windowStart: new Date(Date.now() - 2 * 86_400_000) } });
    expect(await pruneRateLimits()).toBeGreaterThanOrEqual(1);
    expect(await prisma.rateLimitBucket.findUnique({ where: { key: old } })).toBeNull();
    expect(await prisma.rateLimitBucket.findUnique({ where: { key: fresh } })).not.toBeNull();
  });
});

describe("limit in production when Postgres fails", () => {
  it("blocks (fail closed), never lets the request through", async () => {
    vi.resetModules();
    vi.doMock("@/lib/prisma", () => ({ prisma: { $queryRaw: () => Promise.reject(new Error("db down")) } }));
    const { limit: limitWithBrokenDb } = await import("./limits");
    env.NODE_ENV = "production";
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await limitWithBrokenDb({ name: "broken", id: id(), cap: 100, windowSec: 60 })).toEqual({ ok: false, reason: "kv_missing" });
    spy.mockRestore();
    vi.doUnmock("@/lib/prisma");
  });
});
