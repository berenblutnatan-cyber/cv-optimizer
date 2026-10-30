import { cookies } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { DRAFT_COOKIE, hashDraftKey } from "@/lib/resume/owner";
import { claimDrafts } from "@/lib/resume/store";
import { storeErrorResponse } from "@/lib/resume/http";
import { ensureUser } from "@/lib/users";

export const dynamic = "force-dynamic";

// POST /api/cv/claim — after sign-in, move this browser's signed-out drafts
// into the account and drop the draft cookie.
export async function POST() {
  let userId: string | null = null;
  try {
    userId = (await auth()).userId ?? null;
  } catch {
    userId = null;
  }
  if (!userId) return Response.json({ error: "Sign in first", code: "UNAUTHENTICATED" }, { status: 401 });
  const jar = await cookies();
  const raw = jar.get(DRAFT_COOKIE)?.value;
  if (!raw) return Response.json({ claimed: 0 });
  try {
    await ensureUser(userId);
    const claimed = await claimDrafts(userId, hashDraftKey(raw));
    jar.delete(DRAFT_COOKIE);
    return Response.json({ claimed });
  } catch (err) {
    return storeErrorResponse(err, "cv:claim");
  }
}
