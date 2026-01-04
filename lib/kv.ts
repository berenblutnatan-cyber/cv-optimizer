export async function getCvOptimizedCount(): Promise<number> {
  try {
    const { kv } = await import("@vercel/kv");
    const raw = await kv.get("cv_optimized_count");
    if (raw === null || raw === undefined) return 0;
    const n = typeof raw === "number" ? raw : Number(raw);
    return Number.isFinite(n) ? n : 0;
  } catch {
    // Local dev often doesn't have KV env wired; be safe.
    return 0;
  }
}


