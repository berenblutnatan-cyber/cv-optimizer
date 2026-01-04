export async function getCvOptimizedCount(): Promise<number> {
  try {
    // Support projects that have Upstash Redis env vars (from Vercel Marketplace)
    // while still using @vercel/kv as required.
    if (!process.env.KV_REST_API_URL && process.env.UPSTASH_REDIS_REST_URL) {
      process.env.KV_REST_API_URL = process.env.UPSTASH_REDIS_REST_URL;
    }
    if (!process.env.KV_REST_API_TOKEN && process.env.UPSTASH_REDIS_REST_TOKEN) {
      process.env.KV_REST_API_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
    }
    if (!process.env.KV_REST_API_READ_ONLY_TOKEN && process.env.UPSTASH_REDIS_REST_TOKEN) {
      process.env.KV_REST_API_READ_ONLY_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
    }

    const { kv } = await import("@vercel/kv");
    const raw = await kv.get("cv_optimized_count");
    if (raw === null || raw === undefined) return 0;
    const n = typeof raw === "number" ? raw : Number(raw);
    return Number.isFinite(n) ? n : 0;
  } catch (err) {
    // Local dev / misconfigured prod shouldn't break the page; log safely for debugging.
    console.error("[getCvOptimizedCount] KV error", {
      nodeEnv: process.env.NODE_ENV,
      hasKvUrl: !!process.env.KV_REST_API_URL,
      hasKvToken: !!process.env.KV_REST_API_TOKEN,
      hasUpstashUrl: !!process.env.UPSTASH_REDIS_REST_URL,
      hasUpstashToken: !!process.env.UPSTASH_REDIS_REST_TOKEN,
      error: err instanceof Error ? err.message : String(err),
    });
    // Local dev often doesn't have KV env wired; be safe.
    return 0;
  }
}


