// The chat builder's tool-use loop, shared by the legacy /api/chat/build route
// and the v2 /api/cv/[id]/chat route so both run the exact same agent logic.
//
// One call = one user turn: stream Claude's reply, hand every completed tool
// call to `onTool` (the caller applies it to its own copy of the CV and says
// whether it changed anything), and keep looping while the model wants to use
// tools. Recovers from a max_tokens cutoff mid-import by replaying the tool
// calls that completed and asking the model to continue.

import Anthropic from "@anthropic-ai/sdk";
import { describeToolCall, type ChatLabelTranslate } from "./cvTools";

export type TurnEvent =
  | { type: "text"; text: string }
  | { type: "tool_start"; name: string }
  | { type: "tool_noop"; name: string }
  | { type: "tool"; name: string; input: Record<string, unknown>; label: string };

export type ChatTurnMessage = { role: "user" | "assistant"; content: string };

export const CHAT_MODEL = "claude-sonnet-4-6";
export const MAX_MODEL_ROUNDS = 8; // tool-use loop guard within one request
// A full-CV import emits many tool calls in one turn; 6000 lets a normal
// import finish in one round, the max_tokens continuation covers the rest.
export const MAX_TOKENS = 6000;

const TOOL_RESULT = "Applied. The user can see the change in the live preview.";

/** Anthropic requires alternating roles starting with "user". */
export function normalizeTurnHistory(raw: unknown, opts: { maxMessages: number; maxChars: number }): ChatTurnMessage[] | null {
  const history = (Array.isArray(raw) ? raw : [])
    .filter(
      (m): m is ChatTurnMessage =>
        !!m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim().length > 0,
    )
    .slice(-opts.maxMessages)
    .map((m) => ({ role: m.role, content: m.content.slice(0, opts.maxChars) }));
  if (history.length === 0 || history[history.length - 1].role !== "user") return null;
  while (history.length && history[0].role === "assistant") history.shift();
  const merged: ChatTurnMessage[] = [];
  for (const m of history) {
    const prev = merged[merged.length - 1];
    if (prev && prev.role === m.role) prev.content += `\n${m.content}`;
    else merged.push({ ...m });
  }
  return merged;
}

export async function runChatTurn(opts: {
  client: Anthropic;
  system: string;
  tools: Anthropic.Tool[];
  messages: ChatTurnMessage[];
  /**
   * Apply one completed tool call. Return false for a no-op, true when it
   * changed the CV, or `{ input }` to report the input actually applied (e.g.
   * with its target pinned) — that is what gets streamed to the client.
   */
  onTool: (
    name: string,
    input: Record<string, unknown>,
  ) => boolean | { input: Record<string, unknown> } | Promise<boolean | { input: Record<string, unknown> }>;
  /** Called after every model round (e.g. to persist that round's changes). */
  onRoundEnd?: () => Promise<void> | void;
  emit: (e: TurnEvent) => void;
  t?: ChatLabelTranslate;
  model?: string;
}): Promise<{ anyToolApplied: boolean }> {
  const { client, system, tools, emit, t } = opts;
  let anyToolApplied = false;
  let emittedText = false;
  const messages: Anthropic.MessageParam[] = opts.messages.map((m) => ({ role: m.role, content: m.content }));

  for (let round = 0; round < MAX_MODEL_ROUNDS; round++) {
    let roundEmittedText = false;
    const stream = client.messages.stream({
      model: opts.model ?? CHAT_MODEL,
      max_tokens: MAX_TOKENS,
      // Static system prefix is cacheable across turns of the same CV session.
      system,
      messages,
      tools,
      temperature: 0.6,
    });

    const toolBuf = new Map<number, { id: string; name: string; json: string }>();
    const roundToolUses: { id: string; name: string; input: Record<string, unknown> }[] = [];

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        // The model resumes mid-sentence after tool rounds; keep the bubble
        // readable by separating cross-round text segments.
        if (!roundEmittedText && emittedText) emit({ type: "text", text: "\n\n" });
        roundEmittedText = true;
        emittedText = true;
        emit({ type: "text", text: event.delta.text });
      } else if (event.type === "content_block_start" && event.content_block.type === "tool_use") {
        toolBuf.set(event.index, { id: event.content_block.id, name: event.content_block.name, json: "" });
        emit({ type: "tool_start", name: event.content_block.name });
      } else if (event.type === "content_block_delta" && event.delta.type === "input_json_delta") {
        const buf = toolBuf.get(event.index);
        if (buf) buf.json += event.delta.partial_json;
      } else if (event.type === "content_block_stop") {
        const buf = toolBuf.get(event.index);
        if (!buf) continue;
        toolBuf.delete(event.index);
        let input: Record<string, unknown> = {};
        try {
          const parsed = buf.json ? JSON.parse(buf.json) : {};
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) input = parsed;
        } catch {
          input = {};
        }
        const result = await opts.onTool(buf.name, input);
        if (result) {
          const applied = typeof result === "object" ? result.input : input;
          anyToolApplied = true;
          // The model's own call goes back into its history unchanged.
          roundToolUses.push({ id: buf.id, name: buf.name, input });
          emit({ type: "tool", name: buf.name, input: applied, label: describeToolCall(buf.name, input, t) });
        } else {
          emit({ type: "tool_noop", name: buf.name });
        }
      }
    }

    const final = await stream.finalMessage();
    await opts.onRoundEnd?.();

    if (final.stop_reason === "tool_use") {
      messages.push({ role: "assistant", content: final.content });
      messages.push({
        role: "user",
        content: final.content
          .filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use")
          .map((b) => ({ type: "tool_result" as const, tool_use_id: b.id, content: TOOL_RESULT })),
      });
      continue;
    }

    if (final.stop_reason === "max_tokens" && roundToolUses.length > 0) {
      // Out of output budget mid-import: replay only the tool calls that fully
      // completed (a truncated trailing tool_use would be invalid) and nudge
      // the model to finish what it hasn't captured yet.
      messages.push({
        role: "assistant",
        content: roundToolUses.map((tu) => ({ type: "tool_use" as const, id: tu.id, name: tu.name, input: tu.input })),
      });
      messages.push({
        role: "user",
        content: [
          ...roundToolUses.map((tu) => ({ type: "tool_result" as const, tool_use_id: tu.id, content: TOOL_RESULT })),
          {
            type: "text" as const,
            text: "Keep going — import anything from the CV you haven't captured yet, then give a one-line verdict and ask one question.",
          },
        ],
      });
      continue;
    }
    break;
  }
  return { anyToolApplied };
}
