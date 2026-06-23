import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { POLAR_PLANS } from "@/lib/polar";

export const dynamic = "force-dynamic";

// Eligibility for the engagement flash sale (5-min, 80%-off Pro). The 5-minute
// countdown lives client-side — it's anchored to the moment the user crossed the
// engagement threshold, which has no server equivalent. This route only answers
// "should this user ever see the offer?" so the banner never dangles a dead
// checkout or undercuts a still-live welcome offer.
const WELCOME_WINDOW_MS = 24 * 60 * 60 * 1000;

export async function GET() {
  const plan = POLAR_PLANS.pro_flash;
  const anchor = POLAR_PLANS.pro.amount; // honest strike-through = real Pro price

  // No discounted product wired up → no offer (don't dangle a dead checkout).
  if (!plan.productId) return NextResponse.json({ available: false });

  const base = {
    available: true as const,
    plan: "pro_flash" as const,
    price: plan.amount,
    anchor,
    credits: plan.credits,
    off: Math.round((1 - plan.amount / anchor) * 100), // 80
  };

  // Anon users: claim routes through sign-in (the checkout route preserves the
  // plan), so the offer is available on product config alone.
  const { userId } = await auth();
  if (!userId) return NextResponse.json(base);

  // Don't sell a flash to someone who already paid.
  const purchases = await prisma.purchase.count({ where: { userId } });
  if (purchases > 0) return NextResponse.json({ available: false });

  // Let the richer 24h welcome flash own a brand-new account's first day.
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { createdAt: true },
  });
  if (user && Date.now() < user.createdAt.getTime() + WELCOME_WINDOW_MS) {
    return NextResponse.json({ available: false });
  }

  return NextResponse.json(base);
}
