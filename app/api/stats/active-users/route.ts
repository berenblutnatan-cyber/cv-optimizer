import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Cache the result for 1 hour — this is social-proof copy on the paywall, not realtime.
export const revalidate = 3600;

const SUPPRESS_BELOW = 100; // Don't display social proof until we have a respectable number.

function floorToNiceUnit(n: number): number {
  if (n < 100) return n;
  if (n < 1000) return Math.floor(n / 50) * 50;
  if (n < 10000) return Math.floor(n / 100) * 100;
  return Math.floor(n / 1000) * 1000;
}

export async function GET() {
  try {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const raw = await prisma.optimizationLog.findMany({
      where: { createdAt: { gte: since } },
      select: { userId: true },
      distinct: ["userId"],
    });
    const count = raw.length;

    if (count < SUPPRESS_BELOW) {
      return NextResponse.json({ display: null, count });
    }

    return NextResponse.json({ display: floorToNiceUnit(count), count });
  } catch (error) {
    console.error("active-users stat failed:", error);
    return NextResponse.json({ display: null }, { status: 200 });
  }
}
