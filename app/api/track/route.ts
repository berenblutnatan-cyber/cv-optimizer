import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
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
    let count: number;

    if (process.env.NODE_ENV === "production") {
      // Atomic increment in production only
      count = await kv.incr("cv_optimized_count");
    } else {
      const raw = await kv.get("cv_optimized_count");
      count = raw == null ? 0 : typeof raw === "number" ? raw : Number(raw);
      if (!Number.isFinite(count)) count = 0;
    }

    return NextResponse.json({ count });
  } catch (err) {
    // If KV isn't configured, don't break UX. Log safely for Vercel logs.
    console.error("[track] KV error", {
      nodeEnv: process.env.NODE_ENV,
      hasKvUrl: !!process.env.KV_REST_API_URL,
      hasKvToken: !!process.env.KV_REST_API_TOKEN,
      hasUpstashUrl: !!process.env.UPSTASH_REDIS_REST_URL,
      hasUpstashToken: !!process.env.UPSTASH_REDIS_REST_TOKEN,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ count: 0 });
  }
}


