import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { auth } from "@clerk/nextjs/server";

// Who owns a CV. Signed-in users own by userId. Signed-out visitors get an
// anonymous draft: a random token in an httpOnly cookie, stored only as its
// sha256 hash on the Resume row. Signing in claims the drafts into the account
// (see store.claimDrafts). Nothing here trusts a client-sent id.

import { DRAFT_COOKIE, DRAFT_TTL_DAYS, type Owner } from "./owner-types";
export { DRAFT_COOKIE, DRAFT_TTL_DAYS, type Owner };

export function hashDraftKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

async function signedInUserId(): Promise<string | null> {
  try {
    const { userId } = await auth();
    return userId ?? null;
  } catch {
    // Clerk not configured (e.g. a dev checkout without keys) = signed out.
    return null;
  }
}

/** The current owner, or null when signed out with no draft cookie yet. */
export async function currentOwner(): Promise<Owner | null> {
  const userId = await signedInUserId();
  if (userId) return { userId, anonKeyHash: null };
  const raw = (await cookies()).get(DRAFT_COOKIE)?.value;
  if (raw && /^[A-Za-z0-9_-]{32,}$/.test(raw)) return { userId: null, anonKeyHash: hashDraftKey(raw) };
  return null;
}

/** The current owner, minting a draft cookie for a signed-out visitor. Route handlers only. */
export async function ensureOwner(): Promise<Owner> {
  const existing = await currentOwner();
  if (existing) return existing;
  const raw = randomBytes(32).toString("base64url");
  (await cookies()).set(DRAFT_COOKIE, raw, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DRAFT_TTL_DAYS * 24 * 60 * 60,
  });
  return { userId: null, anonKeyHash: hashDraftKey(raw) };
}

/** Stable id for rate limits: the user, else the draft, else the IP. */
export function ownerKey(owner: Owner | null, ip: string): string {
  if (owner?.userId) return `u:${owner.userId}`;
  if (owner?.anonKeyHash) return `d:${owner.anonKeyHash.slice(0, 24)}`;
  return `ip:${ip}`;
}
