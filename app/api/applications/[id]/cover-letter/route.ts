import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { isInsufficient, withCharge } from "@/lib/billing/ledger";
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

  // Reserve-then-work: charged before the model call, refunded if it fails.
  const key = `cover-letter:${id}:${crypto.randomUUID()}`;
  try {
    const { result: coverLetter } = await withCharge({ userId, reason: "cover_letter", key, refType: "application", refId: id }, async () => {
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
      const text = response.content[0]?.type === "text" ? response.content[0].text.trim() : "";
      return text || null;
    });
    if (!coverLetter) {
      return NextResponse.json({ error: "Couldn't generate — your credit was not charged. Try again." }, { status: 502 });
    }
    await awardXp(userId, "unlock").catch(() => null);
    return NextResponse.json({ success: true, coverLetter });
  } catch (err) {
    if (isInsufficient(err)) {
      return NextResponse.json({ error: "Insufficient credits", code: "INSUFFICIENT_CREDITS" }, { status: 402 });
    }
    console.error("[applications/cover-letter] generation failed:", err);
    return NextResponse.json({ error: "Couldn't generate — your credit was not charged. Try again." }, { status: 502 });
  }
}
