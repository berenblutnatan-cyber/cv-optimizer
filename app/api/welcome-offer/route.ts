import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { FREE_CREDITS_FOR_NEW_USER } from "@/lib/credits";
import { POLAR_PLANS } from "@/lib/polar";

export const dynamic = "force-dynamic";

// 24h post-signup welcome flash. Eligibility: signed in, within 24h of the
// account's createdAt, AND no purchase yet. The countdown is anchored to
// createdAt (server truth) so it can't be reset by refreshing — honest urgency.
const WINDOW_MS = 24 * 60 * 60 * 1000;

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ eligible: false });

  // No product configured → no offer (don't dangle a dead checkout).
  if (!POLAR_PLANS.welcome.productId) return NextResponse.json({ eligible: false });

  // Ensure the row exists so createdAt — the countdown anchor — is stable.
  const cu = await currentUser();
  const email = cu?.emailAddresses?.[0]?.emailAddress ?? `${userId}@pending.local`;
  const user = await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: { id: userId, email, credits: FREE_CREDITS_FOR_NEW_USER },
    select: { createdAt: true },
  });

  const endsAtMs = user.createdAt.getTime() + WINDOW_MS;
  if (Date.now() >= endsAtMs) return NextResponse.json({ eligible: false });

  const purchases = await prisma.purchase.count({ where: { userId } });
  if (purchases > 0) return NextResponse.json({ eligible: false });

  return NextResponse.json({
    eligible: true,
    endsAt: new Date(endsAtMs).toISOString(),
    credits: POLAR_PLANS.welcome.credits,
    price: POLAR_PLANS.welcome.amount,
    anchor: 10,
  });
}
