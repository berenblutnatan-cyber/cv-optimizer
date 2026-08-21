// Career toolkit — ONE route for all free generators. Public, rate-limited
// per-tool + an aggregate cap (7 free Opus surfaces on a fail-open limiter
// deserve belt and braces). Forced tool_choice ⇒ guaranteed-parseable output.

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@clerk/nextjs/server";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";
import { isToolId } from "@/lib/toolkit/tools";
import { SERVER_TOOLS, capInputs, toolKnowledge } from "@/lib/toolkit/server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const maxDuration = 60;
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const AGGREGATE_CAP = 30; // all toolkit tools combined, per user/IP per hour

export async function POST(request: NextRequest, ctx: { params: Promise<{ tool: string }> }) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Service temporarily unavailable." }, { status: 503 });
  }

  const { tool: toolParam } = await ctx.params;
  if (!isToolId(toolParam)) {
    return NextResponse.json({ error: "Unknown tool." }, { status: 404 });
  }
  const tool = SERVER_TOOLS[toolParam];

  try {
    const { userId } = await auth();
    const rlId = userId ?? `ip:${clientIp(request)}`;
    const [perTool, aggregate] = await Promise.all([
      checkRateLimit({ name: `toolkit-${tool.id}`, id: rlId, limit: tool.hourlyCap, windowSeconds: 3600 }),
      checkRateLimit({ name: "toolkit-all", id: rlId, limit: AGGREGATE_CAP, windowSeconds: 3600 }),
    ]);
    if (!perTool.ok || !aggregate.ok) {
      return NextResponse.json(
        { error: `Limit reached (${perTool.ok ? AGGREGATE_CAP : tool.hourlyCap}/hour). Try again soon.` },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const inputs = capInputs(body?.inputs);
    const invalid = tool.validate(inputs);
    if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

    const { system, user } = tool.buildPrompt(inputs, toolKnowledge(tool, inputs));
    const response = await anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: tool.maxTokens,
      system,
      tools: [tool.emitTool],
      tool_choice: { type: "tool", name: tool.emitTool.name },
      messages: [{ role: "user", content: user }],
    });

    const toolUse = response.content.find((c) => c.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use" || response.stop_reason === "max_tokens") {
      return NextResponse.json({ error: "Couldn't generate — try again." }, { status: 502 });
    }
    const result = tool.normalize(toolUse.input as Record<string, unknown>);
    if (!result) {
      return NextResponse.json({ error: "Couldn't generate — try again." }, { status: 502 });
    }

    return NextResponse.json({ result });
  } catch (error) {
    console.error(`[toolkit/${tool.id}] error:`, error);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
