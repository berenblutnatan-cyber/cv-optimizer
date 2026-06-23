import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { awardXp } from "@/lib/gamification";
import { isUnlimited } from "@/lib/subscription";

export const dynamic = "force-dynamic";

// POST /api/generated-resume/:id/unlock — spends 1 credit to flip a single
// GeneratedResume row to unlocked=true. Per-card unlock (each card costs a
// credit) — distinct from the analyze-unlock which is unlock-all-per-analysis.
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const card = await prisma.generatedResume.findUnique({
    where: { id },
    select: { id: true, userId: true, unlocked: true },
  });
  if (!card || card.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (card.unlocked) {
    return NextResponse.json({ ok: true, alreadyUnlocked: true });
  }

  const unlimited = await isUnlimited(userId);
  try {
    const result = await prisma.$transaction(async (tx) => {
      let creditsRemaining = 0;
      if (unlimited) {
        const user = await tx.user.findUnique({ where: { id: userId }, select: { credits: true } });
        creditsRemaining = user?.credits ?? 0;
      } else {
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { credits: true },
        });
        if (!user || user.credits <= 0) throw new Error("INSUFFICIENT_CREDITS");
        const updatedUser = await tx.user.update({
          where: { id: userId },
          data: { credits: { decrement: 1 } },
        });
        creditsRemaining = updatedUser.credits;
      }
      await tx.generatedResume.update({
        where: { id },
        data: { unlocked: true },
      });
      return { creditsRemaining };
    });
    const xp = await awardXp(userId, "unlock").catch(() => null);
    return NextResponse.json({ ok: true, creditsRemaining: result.creditsRemaining, xp });
  } catch (err) {
    if (err instanceof Error && err.message === "INSUFFICIENT_CREDITS") {
      return NextResponse.json(
        { error: "Insufficient credits", code: "INSUFFICIENT_CREDITS" },
        { status: 402 }
      );
    }
    console.error("[generated-resume/unlock] tx failed:", err);
    return NextResponse.json({ error: "Failed to unlock" }, { status: 500 });
  }
}
