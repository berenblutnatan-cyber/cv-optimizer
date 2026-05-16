import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
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

    // Get user from database
    const user = await currentUser();
    const userEmail = user?.emailAddresses[0]?.emailAddress || "no-email";

    // Ensure user exists in database
    const dbUser = await prisma.user.upsert({
      where: { id: userId },
      update: { email: userEmail },
        create: {
          id: userId,
          email: userEmail,
          credits: FREE_CREDITS_FOR_NEW_USER,
        },
    });

    // Check if user has credits
    if (dbUser.credits <= 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Insufficient credits",
          remaining: 0,
        },
        { status: 400 }
      );
    }

    // Decrement credits by 1
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        credits: {
          decrement: 1,
        },
      },
    });

    console.log(`✅ Used 1 credit for user ${userId}. Remaining: ${updatedUser.credits}`);

    return NextResponse.json({
      success: true,
      remaining: updatedUser.credits,
      message: "Credit used successfully",
    });
  } catch (error) {
    console.error("Use credit error:", error);
    return NextResponse.json(
      { error: "Failed to use credit" },
      { status: 500 }
    );
  }
}
