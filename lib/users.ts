import "server-only";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { FREE_CREDITS_FOR_NEW_USER } from "@/lib/credits";
import { sendSignupNotification } from "@/lib/email";

/**
 * Make sure the signed-in Clerk user has a User row (credits, FKs). Single
 * source for /api/sync-user and the v2 routes.
 *
 * A user without an email address gets a per-user placeholder: User.email is
 * unique, and the old shared "no-email" value made the second such user fail.
 */
/** User.email is unique: a user with no address gets their own placeholder. */
export const placeholderEmail = (userId: string) => `no-email+${userId}@users.hiredcv.invalid`;

export async function ensureUser(userId: string): Promise<{ id: string; email: string; credits: number; isNewUser: boolean }> {
  const clerkUser = await currentUser().catch(() => null);
  const email = clerkUser?.emailAddresses[0]?.emailAddress || placeholderEmail(userId);

  const existing = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  const user = await prisma.user.upsert({
    where: { id: userId },
    update: clerkUser ? { email } : {},
    create: { id: userId, email, credits: FREE_CREDITS_FOR_NEW_USER },
    select: { id: true, email: true, credits: true },
  });

  if (!existing) {
    void sendSignupNotification({ userEmail: email, userId }).catch((err) =>
      console.error("[users] signup notification failed:", err),
    );
  }
  return { ...user, isNewUser: !existing };
}
