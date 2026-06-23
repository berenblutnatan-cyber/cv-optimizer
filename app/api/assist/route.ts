import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@clerk/nextjs/server";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";
import { buildAssistSystemPrompt } from "@/lib/chat/prompts";
import { isAssistAction, type AssistAction, type AssistTarget } from "@/lib/assist/actions";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Opus can exceed Vercel's default timeout.
export const maxDuration = 60;
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Public (the builder is try-before-signup). Generation is the free hook; spend
// is bounded by a per-user/IP rate limit. The APPLY paywall is enforced client-side.
const HOURLY_CAP = 40;

// One synthetic tool so forced tool_choice gives us guaranteed-parseable output.
const EMIT_TOOL = {
  name: "emit_suggestion",
  description: "Return the rewritten resume content.",
  input_schema: {
    type: "object" as const,
    properties: {
      text: { type: "string" as const, description: "A single rewritten string (summary, headline, or one bullet)." },
      items: {
        type: "array" as const,
        items: { type: "string" as const },
        description: "A list of strings (multiple bullets, or a skills list).",
      },
    },
  },
};

function userPrompt(action: AssistAction, target: AssistTarget): string {
  const cur = (target.text ?? "").slice(0, 2000);
  const bullets = (target.existingBullets ?? []).map((b) => `- ${b}`).join("\n") || "(none yet)";
  switch (action) {
    case "write_summary":
      return "Write a strong 2-3 sentence professional summary for this person, grounded in their CV and target role. Return it in `text`.";
    case "improve_summary":
      return `Improve this professional summary — sharper, more compelling, same facts:\n"""\n${cur}\n"""\nReturn the rewrite in \`text\`.`;
    case "improve_bullets":
      return `Rewrite ALL of these experience bullets to be stronger (strong verb + concrete impact), keeping the SAME count and all facts. Return the rewritten bullets in \`items\` in the same order:\n${bullets}`;
    case "quantify_bullets":
      return `Rewrite these experience bullets to surface measurable impact ONLY where a number exists in or is clearly implied by my CV — never invent a metric. Keep the same count. Return them in \`items\`:\n${bullets}`;
    case "generate_bullets":
      return `Generate 2-3 NEW, distinct achievement bullets for my role "${target.role ?? ""}"${
        target.company ? ` at ${target.company}` : ""
      }, grounded in what someone in that role plausibly did per my CV — do not duplicate these existing bullets and do not invent specific metrics:\n${bullets}\nReturn the new bullets in \`items\`.`;
    case "suggest_headline":
      return `Suggest ONE strong professional headline/title for me${
        target.currentTitle ? ` (current: "${target.currentTitle}")` : ""
      }. Return it in \`text\`.`;
    case "suggest_skills":
      return `Suggest up to 8 relevant hard skills I'm MISSING, drawn from my experience${
        target.jd ? ` and tailored to this job:\n"""\n${(target.jd ?? "").slice(0, 2000)}\n"""` : ""
      }. Current skills: ${(target.currentSkills ?? []).join(", ") || "(none)"}. Return only the new skills in \`items\`.`;
  }
}

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Service temporarily unavailable." }, { status: 503 });
  }
  try {
    const { userId } = await auth();
    const rl = await checkRateLimit({
      name: "assist",
      id: userId ?? `ip:${clientIp(request)}`,
      limit: HOURLY_CAP,
      windowSeconds: 60 * 60,
    });
    if (!rl.ok) {
      return NextResponse.json({ error: `Limit reached (${HOURLY_CAP}/hour). Try again soon.` }, { status: 429 });
    }

    const body = await request.json().catch(() => ({}));
    const action = body?.action;
    if (!isAssistAction(action)) {
      return NextResponse.json({ error: "Unknown assist action." }, { status: 400 });
    }
    const cvContext = String(body?.cvContext ?? "").slice(0, 12000);
    const target = (body?.target ?? {}) as AssistTarget;

    const response = await anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 700,
      system: buildAssistSystemPrompt(cvContext),
      tools: [EMIT_TOOL],
      tool_choice: { type: "tool", name: "emit_suggestion" },
      messages: [{ role: "user", content: userPrompt(action, target) }],
    });

    const toolUse = response.content.find((c) => c.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      return NextResponse.json({ error: "No suggestion produced — try again." }, { status: 502 });
    }
    const input = toolUse.input as { text?: unknown; items?: unknown };
    const text = typeof input.text === "string" ? input.text.trim() : undefined;
    const items = Array.isArray(input.items)
      ? input.items.map((s) => String(s).trim()).filter(Boolean).slice(0, 10)
      : undefined;

    if (!text && (!items || items.length === 0)) {
      return NextResponse.json({ error: "Empty suggestion — try again." }, { status: 502 });
    }

    return NextResponse.json({ suggestion: { text, items } });
  } catch (error) {
    console.error("assist error:", error);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
