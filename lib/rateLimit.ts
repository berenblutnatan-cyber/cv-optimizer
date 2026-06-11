// Cheap KV counter with a TTL window, same approach as /api/voice/session.
// Fail-open: if KV is down or unconfigured (local dev), the request proceeds —
// rate limiting protects spend, it isn't a correctness gate.
//
// NOTE: this is only real protection once a KV/Upstash store is provisioned
// (KV_REST_API_URL/KV_REST_API_TOKEN or the UPSTASH_REDIS_REST_* pair must be
// set in the Vercel project). Without it every check fails open.
export async function checkRateLimit(opts: {
  name: string; // route short-name, namespaces the KV key
  id: string; // userId or client IP
  limit: number;
  windowSeconds: number;
}): Promise<{ ok: boolean }> {
  try {
    // Support projects wired with Upstash Redis env vars (from the Vercel
    // Marketplace) while still using @vercel/kv — same aliasing as lib/kv.ts.
    if (!process.env.KV_REST_API_URL && process.env.UPSTASH_REDIS_REST_URL) {
      process.env.KV_REST_API_URL = process.env.UPSTASH_REDIS_REST_URL;
    }
    if (!process.env.KV_REST_API_TOKEN && process.env.UPSTASH_REDIS_REST_TOKEN) {
      process.env.KV_REST_API_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
    }

    const { kv } = await import("@vercel/kv");
    const key = `rl:${opts.name}:${opts.id}`;
    const raw = await kv.get(key);
    const used = typeof raw === "number" ? raw : Number(raw ?? 0);
    if (Number.isFinite(used) && used >= opts.limit) {
      return { ok: false };
    }
    await kv.set(key, (Number.isFinite(used) ? used : 0) + 1, {
      ex: opts.windowSeconds,
    });
  } catch (kvErr) {
    console.warn(`[rateLimit:${opts.name}] KV unavailable — request allowed:`, kvErr);
  }
  return { ok: true };
}

// Best-effort client IP for per-IP limits on public routes. Vercel sets
// x-forwarded-for; the first entry is the client.
export function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}
