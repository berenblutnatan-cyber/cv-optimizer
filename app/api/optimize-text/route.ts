import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@clerk/nextjs/server";
import { kv } from "@vercel/kv";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Per-user cap: a heavy builder session uses ~15 improvements; this stops
// the endpoint from being scripted as a free rewriting API.
const HOURLY_CAP = 40;

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Sign in to use AI writing help" },
        { status: 401 }
      );
    }
    try {
      const key = `opttext:rl:${userId}`;
      const raw = await kv.get(key);
      const used = typeof raw === "number" ? raw : Number(raw ?? 0);
      if (Number.isFinite(used) && used >= HOURLY_CAP) {
        return NextResponse.json(
          { error: "Hourly AI-improvement limit reached — try again soon." },
          { status: 429 }
        );
      }
      await kv.set(key, (Number.isFinite(used) ? used : 0) + 1, { ex: 60 * 60 });
    } catch (kvErr) {
      console.warn("[optimize-text] KV rate-limit unavailable:", kvErr);
    }

    const { text, context } = await request.json();

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: "No text provided" },
        { status: 400 }
      );
    }

    const systemPrompt = `You are an expert resume writer and career coach. Your task is to improve and optimize resume text while:

1. Keeping the same approximate length (±20% of original)
2. Using strong action verbs
3. Quantifying achievements where possible
4. Making it ATS-friendly
5. Removing filler words and redundancy
6. Maintaining professional tone

Context: ${context || "resume section"}

IMPORTANT: 
- Return ONLY the improved text, no explanations
- Keep the same format (if bullets, keep bullets)
- Don't add information that wasn't there
- If it's already good, make minimal changes`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 500,
      system: systemPrompt,
      messages: [
        { role: "user", content: `Improve this text:\n\n${text}` },
      ],
      temperature: 0.7,
    });

    const improvedText = response.content[0].type === 'text' ? response.content[0].text.trim() : '';

    if (!improvedText) {
      return NextResponse.json(
        { error: "No response from AI" },
        { status: 500 }
      );
    }

    return NextResponse.json({ improvedText });
  } catch (error) {
    console.error("Optimize text error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to optimize text" },
      { status: 500 }
    );
  }
}

