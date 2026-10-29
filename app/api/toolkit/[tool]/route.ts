// Career toolkit: ONE route for all seven generators (the v2 /toolkit page
// and the legacy review screen both call it). One free use per tool per day,
// then 1 credit, charged in the same step that hands back the result; signed
// out, the free use is all there is. Limits fail closed (lib/limits).

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { canAfford, charge, InsufficientCredits } from "@/lib/billing/ledger";
import { clientIp, limit, limitResponse, limitSignedOut } from "@/lib/limits";
import { claimFreeUse, releaseFreeUse } from "@/lib/toolkit/quota";
import { isToolId } from "@/lib/toolkit/tools";
import { SERVER_TOOLS, capInputs, toolKnowledge } from "@/lib/toolkit/server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const maxDuration = 60;
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const AGGREGATE_CAP = 30; // all toolkit tools combined, per caller per hour

export async function POST(request: NextRequest, ctx: { params: Promise<{ tool: string }> }) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Service temporarily unavailable." }, { status: 503 });
  }

  const { tool: toolParam } = await ctx.params;
  if (!isToolId(toolParam)) {
    return NextResponse.json({ error: "Unknown tool." }, { status: 404 });
  }
  const tool = SERVER_TOOLS[toolParam];

  const { userId } = await auth();
  const ip = clientIp(request);
  const who = userId ? `u:${userId}` : `ip:${ip}`;
  const perTool = await limit({ name: `toolkit-${tool.id}`, id: who, cap: tool.hourlyCap, windowSec: 3600 });
  if (!perTool.ok) return limitResponse(perTool);
  const aggregate = await limit({ name: "toolkit-all", id: who, cap: AGGREGATE_CAP, windowSec: 3600 });
  if (!aggregate.ok) return limitResponse(aggregate);
  const anon = await limitSignedOut(request, !!userId, { name: "toolkit", perIpHour: 10, globalDay: 600 });
  if (anon) return anon;

  const body = await request.json().catch(() => ({}));
  const inputs = capInputs(body?.inputs);
  const invalid = tool.validate(inputs);
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

  // Today's free use, or a credit (signed in only). Checked before the model runs.
  const free = await claimFreeUse(tool.id, who);
  if (!free) {
    if (!userId) return NextResponse.json({ error: "Sign in to use it again today.", code: "SIGN_IN" }, { status: 402 });
    if (!(await canAfford(userId))) return NextResponse.json({ error: "Out of credits", code: "NO_CREDITS" }, { status: 402 });
  }

  try {
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
    const result = toolUse && toolUse.type === "tool_use" && response.stop_reason !== "max_tokens" ? tool.normalize(toolUse.input as Record<string, unknown>) : null;
    if (!result) {
      if (free) await releaseFreeUse(tool.id, who);
      return NextResponse.json({ error: "Couldn't generate. Try again." }, { status: 502 });
    }

    if (!free && userId) {
      // canAfford found the account above, so the charge has a row to lock.
      try {
        await prisma.$transaction((tx) => charge(tx, { userId, reason: "toolkit", key: `toolkit:${crypto.randomUUID()}`, refType: "toolkit", refId: tool.id }));
      } catch (err) {
        // Spent elsewhere in the meantime: the result isn't handed over unpaid.
        if (err instanceof InsufficientCredits) return NextResponse.json({ error: "Out of credits", code: "NO_CREDITS" }, { status: 402 });
        throw err;
      }
    }
    return NextResponse.json({ result, cost: free ? "free" : "credit" });
  } catch (error) {
    if (free) await releaseFreeUse(tool.id, who).catch(() => {});
    console.error(`[toolkit/${tool.id}] error:`, error);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
