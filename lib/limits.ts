// Rate limits for v2 routes.
//
// Fixed-window counter. Vercel KV / Upstash when configured; otherwise
// Postgres (one atomic upsert per request), which production always has. The
// legacy lib/rateLimit.ts fails OPEN when KV is missing; this one never does:
// in production, if neither store answers, the AI routes are blocked (and it
// logs loudly) instead of turning into a free Claude proxy. Outside
// production without KV, an in-process counter keeps dev and tests honest.

type Result = { ok: true } | { ok: false; reason: "limited" | "kv_missing" };

const memory = new Map<string, { count: number; resetAt: number }>();

function kvConfigured(): boolean {
  if (!process.env.KV_REST_API_URL && process.env.UPSTASH_REDIS_REST_URL) {
    process.env.KV_REST_API_URL = process.env.UPSTASH_REDIS_REST_URL;
  }
  if (!process.env.KV_REST_API_TOKEN && process.env.UPSTASH_REDIS_REST_TOKEN) {
    process.env.KV_REST_API_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
  }
  return !!process.env.KV_REST_API_URL && !!process.env.KV_REST_API_TOKEN;
}

export async function limit(opts: { name: string; id: string; cap: number; windowSec: number }): Promise<Result> {
  const key = `rl2:${opts.name}:${opts.id}`;
  const prod = process.env.NODE_ENV === "production";

  if (!kvConfigured()) {
    if (prod) {
      try {
        const used = await postgresIncr(key, opts.windowSec);
        return used > opts.cap ? { ok: false, reason: "limited" } : { ok: true };
      } catch (err) {
        console.error(`[limits] Postgres counter failed on ${opts.name} — blocking (fail closed):`, err);
        return { ok: false, reason: "kv_missing" };
      }
    }
    const now = Date.now();
    const slot = memory.get(key);
    if (!slot || slot.resetAt <= now) {
      memory.set(key, { count: 1, resetAt: now + opts.windowSec * 1000 });
      return { ok: true };
    }
    if (slot.count >= opts.cap) return { ok: false, reason: "limited" };
    slot.count += 1;
    return { ok: true };
  }

  try {
    const { kv } = await import("@vercel/kv");
    // INCR is atomic, so two concurrent requests can't both read "cap - 1".
    const used = await kv.incr(key);
    if (used === 1) await kv.expire(key, opts.windowSec);
    return used > opts.cap ? { ok: false, reason: "limited" } : { ok: true };
  } catch (err) {
    console.error(`[limits] KV error on ${opts.name}:`, err);
    return prod ? { ok: false, reason: "kv_missing" } : { ok: true };
  }
}

/**
 * Count one request in Postgres and return the count in the current window.
 * Atomic: the row is locked by the upsert, so two requests can't both see
 * "cap - 1". An expired window restarts at 1 in the same statement.
 */
export async function postgresIncr(key: string, windowSec: number): Promise<number> {
  const { prisma } = await import("@/lib/prisma");
  const rows = await prisma.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimitBucket" ("key", "windowStart", "count") VALUES (${key}, NOW(), 1)
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimitBucket"."windowStart" <= NOW() - make_interval(secs => ${windowSec}::double precision) THEN 1 ELSE "RateLimitBucket"."count" + 1 END,
      "windowStart" = CASE WHEN "RateLimitBucket"."windowStart" <= NOW() - make_interval(secs => ${windowSec}::double precision) THEN NOW() ELSE "RateLimitBucket"."windowStart" END
    RETURNING "count"`;
  return Number(rows[0]?.count ?? Number.POSITIVE_INFINITY);
}

/** Drop buckets whose window ended over a day ago (daily cron). */
export async function pruneRateLimits(): Promise<number> {
  const { prisma } = await import("@/lib/prisma");
  return prisma.$executeRaw`DELETE FROM "RateLimitBucket" WHERE "windowStart" < NOW() - INTERVAL '1 day'`;
}

/** Test-only: clear the in-process counters. */
export function __resetMemoryLimits() {
  memory.clear();
}

export function limitResponse(r: Exclude<Result, { ok: true }>): Response {
  return Response.json(
    {
      error: r.reason === "limited" ? "Too many requests. Try again in a few minutes." : "Temporarily unavailable.",
      code: r.reason === "limited" ? "RATE_LIMITED" : "UNAVAILABLE",
    },
    { status: r.reason === "limited" ? 429 : 503 },
  );
}

export function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  const first = fwd?.split(",")[0]?.trim();
  return first || request.headers.get("x-real-ip")?.trim() || "unknown";
}
