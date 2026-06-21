import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { awardXp } from "@/lib/gamification";
import { buildFinalizePrompt } from "@/lib/voice/finalizePrompt";
import { normalizeFinalizeOutput } from "@/lib/voice/schema";
import { extractBalancedJson } from "@/lib/extractJson";
import { hasActiveSubscription } from "@/lib/subscription";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const dynamic = "force-dynamic";
export const maxDuration = 45;

type Turn = { role: "user" | "assistant"; text: string };

function turnsToTranscript(turns: Turn[]): string {
  return turns
    .filter((t) => t.text?.trim())
    .map((t) => `${t.role === "user" ? "User" : "Assistant"}: ${t.text.trim()}`)
    .join("\n");
}

// POST /api/voice/finalize
//
// Takes the conversation transcript and produces a structured ResumeData
// JSON the client will drop into the existing builder Zustand store.
// Charges 1 credit on success (matches the existing optimize=1-credit model).
// Persists VoiceSession metadata ONLY — transcript content is discarded
// after Claude returns (see /privacy).
export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Missing ANTHROPIC_API_KEY" }, { status: 500 });
  }
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { turns?: Turn[]; durationSec?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const turns = Array.isArray(body.turns) ? body.turns : [];
  const durationSec = Math.max(0, Math.min(60 * 15, Number(body.durationSec ?? 0)));
  const transcript = turnsToTranscript(turns);
  if (transcript.length < 40) {
    return NextResponse.json(
      { error: "Not enough conversation yet — talk for at least a minute." },
      { status: 400 }
    );
  }

  // Credit check up front so we don't burn a Claude call for a user with 0.
  // Unlimited subscribers skip the check (and the charge below).
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { credits: true, subscriptionStatus: true, subscriptionCurrentPeriodEnd: true },
  });
  const unlimited = user ? hasActiveSubscription(user) : false;
  if (!unlimited && (!user || user.credits <= 0)) {
    return NextResponse.json(
      { error: "Insufficient credits", code: "INSUFFICIENT_CREDITS" },
      { status: 402 }
    );
  }

  let resumeData;
  try {
    const response = await anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 4000,
      system: "Convert spoken career conversations into resume JSON. Use ONLY facts from the transcript — never invent. Return strict JSON only.",
      messages: [{ role: "user", content: buildFinalizePrompt(transcript) }],
    });
    const content = response.content[0]?.type === "text" ? response.content[0].text : "";
    const jsonText = extractBalancedJson(content);
    if (!jsonText) throw new Error("No JSON in response");
    resumeData = normalizeFinalizeOutput(JSON.parse(jsonText));
  } catch (err) {
    console.error("[voice/finalize] Claude failed:", err);
    return NextResponse.json(
      { error: "Couldn't build your CV from the transcript. Try again." },
      { status: 500 }
    );
  }

  // Charge the credit + persist metadata in a single txn so a crash here
  // never leaves a user double-billed or unpaid.
  try {
    await prisma.$transaction(async (tx) => {
      if (!unlimited) {
        const updated = await tx.user.update({
          where: { id: userId },
          data: { credits: { decrement: 1 } },
        });
        if (updated.credits < 0) throw new Error("INSUFFICIENT_CREDITS");
      }
      await tx.voiceSession.create({
        data: {
          userId,
          durationSec,
          turns: turns.length,
          finalized: true,
        },
      });
    });
  } catch (err) {
    console.error("[voice/finalize] persistence failed:", err);
    return NextResponse.json({ error: "Failed to save session" }, { status: 500 });
  }

  await awardXp(userId, "complete_profile").catch(() => null);
  return NextResponse.json({ ok: true, resumeData });
}
