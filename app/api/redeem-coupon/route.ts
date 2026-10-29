import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { grant } from "@/lib/billing/ledger";
import { placeholderEmail } from "@/lib/users";
import { FREE_CREDITS_FOR_NEW_USER } from "@/lib/credits";

export async function POST(request: Request) {
  try {
    // Get authenticated user
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { code } = body;

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { error: "Coupon code is required" },
        { status: 400 }
      );
    }

    // Find coupon (case-insensitive search)
    const coupon = await prisma.coupon.findFirst({
      where: {
        code: {
          equals: code.trim(),
          mode: "insensitive",
        },
      },
    });

    if (!coupon) {
      return NextResponse.json(
        { error: "Invalid coupon code" },
        { status: 404 }
      );
    }

    if (!coupon.isActive) {
      return NextResponse.json(
        { error: "This coupon is no longer active" },
        { status: 400 }
      );
    }

    // Check if user has already redeemed this coupon
    const existingRedemption = await prisma.couponRedemption.findUnique({
      where: {
        userId_couponId: {
          userId: userId,
          couponId: coupon.id,
        },
      },
    });

    if (existingRedemption) {
      return NextResponse.json(
        { error: "You have already redeemed this coupon" },
        { status: 400 }
      );
    }

    // Get user info from Clerk for email
    const user = await currentUser();
    const userEmail = user?.emailAddresses[0]?.emailAddress || "";

    // Use transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      await tx.user.upsert({
        where: { id: userId },
        update: userEmail ? { email: userEmail } : {},
        create: { id: userId, email: userEmail || placeholderEmail(userId), credits: FREE_CREDITS_FOR_NEW_USER },
      });

      // One redemption per user per coupon (ledger key + the unique index below).
      const granted = await grant(tx, { userId, amount: coupon.credits, reason: "coupon", key: `coupon:${coupon.id}:${userId}`, refType: "coupon", refId: coupon.id });
      const updatedUser = { credits: granted.balance };

      // Record the redemption
      await tx.couponRedemption.create({
        data: {
          userId: userId,
          couponId: coupon.id,
        },
      });

      return {
        user: updatedUser,
        creditsAdded: coupon.credits,
        couponCode: coupon.code,
      };
    });

    console.log(`✅ Redeemed coupon ${coupon.code} for user ${userId}. Added ${result.creditsAdded} credits.`);

    return NextResponse.json({
      success: true,
      message: `Successfully redeemed coupon! Added ${result.creditsAdded} credits.`,
      creditsAdded: result.creditsAdded,
      totalCredits: result.user.credits,
      couponCode: result.couponCode,
    });
  } catch (error) {
    console.error("Redeem coupon error:", error);
    return NextResponse.json(
      { error: "Failed to redeem coupon" },
      { status: 500 }
    );
  }
}
