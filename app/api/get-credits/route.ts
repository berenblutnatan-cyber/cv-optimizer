import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { hasActiveSubscription } from "@/lib/subscription";

export const dynamic = 'force-dynamic'; // Prevent caching

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ credits: 0, unlimited: false });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      // subscription fields too: the client gates AI "apply" actions on
      // `unlimited`, so without them a Pro subscriber is wrongly told
      // "out of credits".
      select: {
        credits: true,
        subscriptionStatus: true,
        subscriptionCurrentPeriodEnd: true,
      },
    });

    const unlimited = user ? hasActiveSubscription(user) : false;

    return NextResponse.json({ credits: user?.credits ?? 0, unlimited });
  } catch (error) {
    console.error("CRITICAL API ERROR (get-credits):", error);
    // Return 0 instead of crashing the UI
    return NextResponse.json({ credits: 0, unlimited: false, error: "Server Error" }, { status: 200 });
  }
}
