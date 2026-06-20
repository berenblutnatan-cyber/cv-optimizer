// Rate limiting for the public chat endpoints (build + parse-cv).
//
// The chat-first home page lets logged-OUT visitors chat and upload before they
// sign up ("try before signup"). That means /api/chat/build and
// /api/chat/parse-cv can no longer hard-gate on auth — but we still must stop
// anyone using them as a free Claude proxy. So:
//   - signed-in users  -> generous per-user hourly cap (a full build is ~20 turns)
//   - anonymous users  -> tighter per-IP hourly cap
//
// Best-effort: the counter lives in Vercel KV and FAILS OPEN if KV is
// unavailable (prod currently has no KV store provisioned — see memory
// "credits-and-rate-limits"). Same posture as the rest of the app: the feature
// keeps working if KV is down, the cap simply isn't enforced until KV exists.

import type { NextRequest } from "next/server";
import { kv } from "@vercel/kv";

type ChatKind = "build" | "parse";

// Hourly caps. User caps are generous; anon caps are tight enough to deter
// abuse while still letting a real visitor complete a CV before signing up.
const CAPS: Record<ChatKind, { user: number; anon: number }> = {
  build: { user: 80, anon: 30 },
  parse: { user: 60, anon: 15 },
};

const LIMIT_MESSAGE: Record<ChatKind, { user: string; anon: string }> = {
  build: {
    user: "You've hit the hourly chat limit — take a short break and come back.",
    anon: "You've reached the free chat limit — sign up to keep building.",
  },
  parse: {
    user: "Too many uploads in a row — give it a minute and try again.",
    anon: "You've reached the free upload limit — sign up to keep going.",
  },
};

function clientIp(request: NextRequest): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

/**
 * Increment-and-check an hourly counter for this caller. Returns `{ ok: false,
 * error }` when the cap is exceeded; `{ ok: true }` otherwise (including when
 * KV is unavailable — fail open).
 */
export async function chatRateLimit(
  request: NextRequest,
  userId: string | null | undefined,
  kind: ChatKind
): Promise<{ ok: boolean; error?: string }> {
  const anon = !userId;
  const cap = anon ? CAPS[kind].anon : CAPS[kind].user;
  const key = anon
    ? `chat:${kind}:ip:${clientIp(request)}`
    : `chat:${kind}:u:${userId}`;

  try {
    const raw = await kv.get(key);
    const used = typeof raw === "number" ? raw : Number(raw ?? 0);
    if (Number.isFinite(used) && used >= cap) {
      return { ok: false, error: anon ? LIMIT_MESSAGE[kind].anon : LIMIT_MESSAGE[kind].user };
    }
    await kv.set(key, (Number.isFinite(used) ? used : 0) + 1, { ex: 60 * 60 });
  } catch (err) {
    console.warn(`[chat/${kind}] KV rate-limit unavailable:`, err);
  }
  return { ok: true };
}
