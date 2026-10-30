import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { chargeNow, isInsufficient } from "@/lib/billing/ledger";
import { ensureUser } from "@/lib/users";

// Legacy builder only: the client asks for a charge before an AI action. It
// now goes through the ledger (atomic, can't go negative, logged), but it is
// still client-initiated; v2 charges server-side inside each paid route and
// never calls this. Removed with the legacy builder (M8).
// Optional `Idempotency-Key` header: a retried request is charged once.
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await ensureUser(userId);
    const raw = request.headers.get("idempotency-key");
    const key = raw && /^[A-Za-z0-9:_.-]{8,120}$/.test(raw) ? `use-credit:${userId}:${raw}` : `use-credit:${crypto.randomUUID()}`;
    const c = await chargeNow({ userId, reason: "use_credit", key });
    return NextResponse.json({
      success: true,
      remaining: c.balance,
      ...(c.unlimited ? { unlimited: true, message: "Unlimited plan — no credit used" } : { message: "Credit used successfully" }),
    });
  } catch (err) {
    if (isInsufficient(err)) {
      return NextResponse.json({ success: false, error: "Insufficient credits", remaining: 0 }, { status: 400 });
    }
    console.error("[use-credit] failed:", err);
    return NextResponse.json({ error: "Failed to use credit" }, { status: 500 });
  }
}
