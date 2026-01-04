import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  try {
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
  } catch {
    // If KV isn't configured (common in local dev), don't break UX.
    return NextResponse.json({ count: 0 });
  }
}


