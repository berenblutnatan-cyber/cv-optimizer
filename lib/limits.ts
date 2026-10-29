// Rate limits for v2 routes.
//
// Fixed-window counter in Vercel KV / Upstash. The legacy lib/rateLimit.ts
// fails OPEN when KV is missing, and prod has no KV provisioned, so today no
// limit is enforced anywhere. This one fails CLOSED in production: a missing
// or broken KV store blocks the AI routes (and logs loudly) instead of turning
// them into a free Claude proxy. Outside production it falls back to an
// in-process counter so local dev and tests behave like the real thing.

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
      console.error(`[limits] KV not configured in production — blocking ${opts.name} (fail closed)`);
      return { ok: false, reason: "kv_missing" };
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
