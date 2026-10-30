import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { grant } from "@/lib/billing/ledger";
import { placeholderEmail } from "@/lib/users";
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
        const email = user.emailAddresses[0]?.emailAddress;
        await tx.user.upsert({
          where: { id: user.id },
          update: email ? { email } : {},
          create: { id: user.id, email: email || placeholderEmail(user.id), credits: FREE_CREDITS_FOR_NEW_USER },
        });
        // One reward per user, ever: only for the first review (users who
        // reviewed before the ledger existed have no key yet), and the ledger
        // key holds even if two reviews land at the same moment.
        const firstReview = (await tx.feedback.count({ where: { userId: user.id } })) === 0;
        const reward = firstReview
          ? await grant(tx, { userId: user.id, amount: 1, reason: "feedback_reward", key: `feedback-reward:${user.id}` })
          : null;
        const creditAwarded = !!reward && !reward.duplicate;
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
