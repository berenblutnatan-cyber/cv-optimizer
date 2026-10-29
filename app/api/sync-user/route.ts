import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ensureUser } from "@/lib/users";

export const dynamic = "force-dynamic";

/**
 * Syncs the current Clerk user to the database. Called when a user first
 * loads the app. The upsert itself lives in lib/users.ts (shared with v2).
 */
export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { isNewUser, ...user } = await ensureUser(userId);
    console.log(`✅ User synced: ${userId}${isNewUser ? " [new]" : ""}`);

    return NextResponse.json({
      success: true,
      isNewUser,
      user: { id: user.id, email: user.email, credits: user.credits },
    });
  } catch (error) {
    console.error("User sync error:", error);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
