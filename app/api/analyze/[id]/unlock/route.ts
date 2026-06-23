import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { awardXp } from "@/lib/gamification";
import { isUnlimited } from "@/lib/subscription";

export const dynamic = "force-dynamic";

// POST /api/analyze/:id/unlock — spends 1 credit to flip every Improvement
// of this Analysis to unlocked=true. Single mental model: one charge unlocks
// the whole blurred list. Refuses if the user owns 0 credits.
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const analysis = await prisma.analysis.findUnique({
    where: { id },
    select: { id: true, userId: true, improvements: { select: { unlocked: true } } },
  });
  if (!analysis || analysis.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const anyLocked = analysis.improvements.some((i) => !i.unlocked);
  if (!anyLocked) {
    return NextResponse.json({ ok: true, alreadyUnlocked: true });
  }

  // Run the credit debit + flip in a single transaction so a crash mid-flip
  // can't double-charge or leave half-unlocked rows.
  const unlimited = await isUnlimited(userId);
  try {
    const result = await prisma.$transaction(async (tx) => {
      let creditsRemaining = 0;
      if (unlimited) {
        // Unlimited subscriber — unlock without charging.
        const user = await tx.user.findUnique({ where: { id: userId }, select: { credits: true } });
        creditsRemaining = user?.credits ?? 0;
      } else {
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { credits: true },
        });
        if (!user || user.credits <= 0) {
          throw new Error("INSUFFICIENT_CREDITS");
        }
        const updatedUser = await tx.user.update({
          where: { id: userId },
          data: { credits: { decrement: 1 } },
        });
        creditsRemaining = updatedUser.credits;
      }
      await tx.improvement.updateMany({
        where: { analysisId: id, unlocked: false },
        data: { unlocked: true },
      });
      return { creditsRemaining };
    });

    // XP outside the txn (best-effort).
    const xp = await awardXp(userId, "unlock").catch(() => null);
    return NextResponse.json({
      ok: true,
      creditsRemaining: result.creditsRemaining,
      xp,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "INSUFFICIENT_CREDITS") {
      return NextResponse.json(
        { error: "Insufficient credits", code: "INSUFFICIENT_CREDITS" },
        { status: 402 }
      );
    }
    console.error("[analyze/unlock] tx failed:", err);
    return NextResponse.json({ error: "Failed to unlock" }, { status: 500 });
  }
}
