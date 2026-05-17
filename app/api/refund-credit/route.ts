import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

// Refund a single credit. Called by the optimize flow when the analyze
// request fails after `/api/use-credit` has already deducted, so users
// aren't charged for failures that aren't their fault.
export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { credits: { increment: 1 } },
    });

    console.log(`↩️  Refunded 1 credit to user ${userId}. Now: ${updated.credits}`);

    return NextResponse.json({
      success: true,
      remaining: updated.credits,
    });
  } catch (error) {
    console.error("Refund credit error:", error);
    return NextResponse.json(
      { error: "Failed to refund credit" },
      { status: 500 }
    );
  }
}
