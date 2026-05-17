import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { FREE_CREDITS_FOR_NEW_USER } from "@/lib/credits";
import { sendSignupNotification } from "@/lib/email";

export const dynamic = 'force-dynamic';

/**
 * Syncs the current Clerk user to Prisma database
 * Call this when a user first loads the app
 */
export async function POST() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const clerkUser = await currentUser();
    const userEmail = clerkUser?.emailAddresses[0]?.emailAddress || "no-email";

    const existing = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    const isNewUser = !existing;

    const user = await prisma.user.upsert({
      where: { id: userId },
      update: {
        email: userEmail,
      },
      create: {
        id: userId,
        email: userEmail,
        credits: FREE_CREDITS_FOR_NEW_USER,
      },
    });

    console.log(`✅ User synced: ${userId} (${userEmail})${isNewUser ? " [new]" : ""}`);

    if (isNewUser) {
      void sendSignupNotification({ userEmail, userId }).catch((err) =>
        console.error("[sync-user] signup notification failed:", err)
      );
    }

    return NextResponse.json({
      success: true,
      isNewUser,
      user: {
        id: user.id,
        email: user.email,
        credits: user.credits,
      },
    });
  } catch (error) {
    console.error("User sync error:", error);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
