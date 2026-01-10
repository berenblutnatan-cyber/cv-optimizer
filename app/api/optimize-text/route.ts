import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
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

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Improve this text:\n\n${text}` },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const improvedText = response.choices[0]?.message?.content?.trim();

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

