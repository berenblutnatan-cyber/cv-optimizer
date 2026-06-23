import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Returns the latest CV text the user uploaded, sourced from their most
// recent Analysis row. Used by the /roles deck as the base for multi-role
// generation. Falls back to empty string so the deck can show a clean empty
// state without an error toast.
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const latest = await prisma.analysis.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { cvText: true },
  });
  return NextResponse.json({ cvText: latest?.cvText ?? "" });
}
