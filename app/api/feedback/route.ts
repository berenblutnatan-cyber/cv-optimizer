import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";

// In-memory storage for when database is unavailable (dev only)
const localFeedback: Array<{
  id: string;
  rating: number;
  comment: string;
  source: string;
  createdAt: Date;
  userId?: string;
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
    
    try {
      // Try to save to database
      let userConnect = {};

      if (user) {
        // Ensure user exists in DB (sync Clerk -> Neon)
        await prisma.user.upsert({
          where: { id: user.id },
          update: { email: user.emailAddresses[0]?.emailAddress || "" },
          create: {
            id: user.id,
            email: user.emailAddresses[0]?.emailAddress || "no-email",
          },
        });

        userConnect = { connect: { id: user.id } };
      }

      // Save feedback to database
      const feedback = await prisma.feedback.create({
        data: {
          rating: Number(rating),
          comment: comment || "",
          source: source || "unknown",
          user: Object.keys(userConnect).length > 0 ? userConnect : undefined,
        },
      });

      console.log("✅ Feedback saved to database:", feedback.id);
      return NextResponse.json({ success: true, feedback });

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
        userId: user?.id,
      };
      localFeedback.push(localEntry);
      
      console.log("📝 Feedback stored locally:", localEntry.id);
      return NextResponse.json({ 
        success: true, 
        feedback: localEntry,
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
