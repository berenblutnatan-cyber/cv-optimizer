import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { isUnlimited } from "@/lib/subscription";
import { awardXp } from "@/lib/gamification";
import { buildCoverLetterPrompt, COVER_LETTER_SYSTEM_PROMPT } from "@/lib/coverLetterPrompt";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const maxDuration = 60;
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// POST /api/applications/:id/cover-letter — the paid payoff. Generates a cover
// letter for this saved application using the user's CV. Costs 1 credit
// (subscribers bypass); refunds on generation failure. Clones the 402 gating
// pattern from generated-resume/[id]/unlock.
export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Service temporarily unavailable." }, { status: 503 });
  }
  const { id } = await ctx.params;
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const app = await prisma.jobApplication.findUnique({
    where: { id },
    select: { userId: true, company: true, title: true, jdText: true },
  });
  if (!app || app.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const cvText = String(body?.cvText ?? "").slice(0, 30_000);
  if (cvText.trim().length < 40) {
    return NextResponse.json({ error: "Build your CV first, then generate a cover letter." }, { status: 400 });
  }

  const unlimited = await isUnlimited(userId);
  try {
    await prisma.$transaction(async (tx) => {
      if (!unlimited) {
        const user = await tx.user.findUnique({ where: { id: userId }, select: { credits: true } });
        if (!user || user.credits <= 0) throw new Error("INSUFFICIENT_CREDITS");
        await tx.user.update({ where: { id: userId }, data: { credits: { decrement: 1 } } });
      }
    });
  } catch (err) {
    if (err instanceof Error && err.message === "INSUFFICIENT_CREDITS") {
      return NextResponse.json({ error: "Insufficient credits", code: "INSUFFICIENT_CREDITS" }, { status: 402 });
    }
    console.error("[applications/cover-letter] credit tx failed:", err);
    return NextResponse.json({ error: "Failed to start" }, { status: 500 });
  }

  try {
    const { prompt } = buildCoverLetterPrompt({
      cvText,
      jobTitle: app.title,
      jobDescription: app.jdText ?? "",
      companyName: app.company,
    });
    const response = await anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 2048,
      system: COVER_LETTER_SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
    });
    const coverLetter = response.content[0]?.type === "text" ? response.content[0].text.trim() : "";
    if (!coverLetter) throw new Error("empty");
    await awardXp(userId, "unlock").catch(() => null);
    return NextResponse.json({ success: true, coverLetter });
  } catch (err) {
    // Generation failed after charging — refund the credit.
    if (!unlimited) {
      await prisma.user.update({ where: { id: userId }, data: { credits: { increment: 1 } } }).catch(() => null);
    }
    console.error("[applications/cover-letter] generation failed:", err);
    return NextResponse.json({ error: "Couldn't generate — your credit was not charged. Try again." }, { status: 502 });
  }
}
