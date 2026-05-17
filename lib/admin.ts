import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export const ADMIN_EMAILS = ["idankars10@gmail.com"];

export async function getAdminUser() {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true },
  });
  if (!user) return null;
  if (!ADMIN_EMAILS.includes(user.email)) return null;
  return user;
}
