import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@clerk/nextjs/server";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Stays public: the /builder page is a "try before signup" experience and its
// improve-text buttons call this anonymously. Spend is bounded by a KV rate
// limit (per user when signed in, per IP otherwise) and an input-size cap.
const HOURLY_CAP = 20;
const MAX_TEXT_LENGTH = 8_000;

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    const rl = await checkRateLimit({
      name: "optimize-text",
      id: userId ?? `ip:${clientIp(request)}`,
      limit: HOURLY_CAP,
      windowSeconds: 60 * 60,
    });
    if (!rl.ok) {
      return NextResponse.json(
        { error: `Limit reached (${HOURLY_CAP}/hour). Please try again soon.` },
        { status: 429 }
      );
    }

    const { text, context } = await request.json();

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json(
        { error: "No text provided" },
        { status: 400 }
      );
    }
    if (text.length > MAX_TEXT_LENGTH) {
      return NextResponse.json(
        { error: "Text is too long to optimize in one pass" },
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

Context: ${typeof context === "string" && context.trim() ? context.slice(0, 300) : "resume section"}

IMPORTANT: 
- Return ONLY the improved text, no explanations
- Keep the same format (if bullets, keep bullets)
- Don't add information that wasn't there
- If it's already good, make minimal changes`;

    const response = await anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 500,
      system: systemPrompt,
      messages: [
        { role: "user", content: `Improve this text:\n\n${text}` },
      ],
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

