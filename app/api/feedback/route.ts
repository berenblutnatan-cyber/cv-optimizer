import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";
import { FREE_CREDITS_FOR_NEW_USER } from "@/lib/credits";

// In-memory storage for when database is unavailable (dev only)
const localFeedback: Array<{
  id: string;
  rating: number;
  comment: string;
  source: string;
  createdAt: Date;
  userId: string;
}> = [];

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { rating, comment, source } = body;

    // Validate required fields
    if (!rating || (typeof rating !== 'number' && isNaN(Number(rating)))) {
      return NextResponse.json({ error: "Rating is required" }, { status: 400 });
    }

    const user = await currentUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    try {
      // Grant +1 credit for the user's FIRST review (once each, abuse-safe),
      // then save the feedback — atomically, so a crash can't double-grant.
      const result = await prisma.$transaction(async (tx) => {
        await tx.user.upsert({
          where: { id: user.id },
          update: { email: user.emailAddresses[0]?.emailAddress || "" },
          create: {
            id: user.id,
            email: user.emailAddresses[0]?.emailAddress || "no-email",
            credits: FREE_CREDITS_FOR_NEW_USER,
          },
        });
        const creditAwarded = (await tx.feedback.count({ where: { userId: user.id } })) === 0;
        if (creditAwarded) {
          await tx.user.update({ where: { id: user.id }, data: { credits: { increment: 1 } } });
        }
        const feedback = await tx.feedback.create({
          data: {
            rating: Number(rating),
            comment: comment || "",
            source: source || "unknown",
            user: { connect: { id: user.id } },
          },
        });
        const fresh = await tx.user.findUnique({ where: { id: user.id }, select: { credits: true } });
        return { feedback, creditAwarded, credits: fresh?.credits ?? null };
      });

      console.log(`✅ Feedback saved${result.creditAwarded ? " (+1 credit)" : ""}:`, result.feedback.id);
      return NextResponse.json({
        success: true,
        feedback: result.feedback,
        creditAwarded: result.creditAwarded,
        credits: result.credits,
      });

    } catch (dbError: unknown) {
      // Database failed - fall back to local storage in development
      console.error("⚠️ Database unavailable, using local storage:", 
        dbError instanceof Error ? dbError.message : String(dbError));
      
      // Store locally for development/testing
      const localEntry = {
        id: `local_${Date.now()}`,
        rating: Number(rating),
        comment: comment || "",
        source: source || "unknown",
        createdAt: new Date(),
        userId: user.id,
      };
      localFeedback.push(localEntry);
      
      console.log("📝 Feedback stored locally:", localEntry.id);
      return NextResponse.json({
        success: true,
        feedback: localEntry,
        creditAwarded: false,
        note: "Stored locally (database temporarily unavailable)"
      });
    }

  } catch (error: unknown) {
    console.error("🔥 Feedback API Error:", error);
    return NextResponse.json({ error: "Failed to process feedback" }, { status: 500 });
  }
}

// GET endpoint to retrieve feedback (for admin)
export async function GET() {
  try {
    // Try database first
    const feedback = await prisma.feedback.findMany({
      orderBy: { createdAt: 'desc' },
      include: { user: true },
      take: 50,
    });
    return NextResponse.json({ 
      success: true, 
      feedback,
      source: "database" 
    });
  } catch {
    // Fall back to local storage
    return NextResponse.json({ 
      success: true, 
      feedback: localFeedback,
      source: "local",
      note: "Database unavailable - showing locally stored feedback" 
    });
  }
}
