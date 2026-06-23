// Bridge: the chat builder's CV tools, exposed as OpenAI Realtime function
// definitions so the voice agent patches the live preview the same way the
// chat agent does. One tool layer, two transports.

import { CV_TOOLS } from "@/lib/chat/cvTools";

export type RealtimeTool = {
  type: "function";
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

// Anthropic tool schema → Realtime function schema. Same JSON Schema inside,
// different envelope (input_schema → parameters).
export const REALTIME_CV_TOOLS: RealtimeTool[] = CV_TOOLS.map((t) => ({
  type: "function",
  name: t.name,
  description: t.description,
  parameters: t.input_schema as Record<string, unknown>,
}));

/**
 * Extract a completed function call from a Realtime server event.
 * The canonical signal is `response.output_item.done` with an item of type
 * "function_call" — by then `arguments` is the full JSON string.
 * Returns null for anything else (including malformed args — the reducer
 * treats unknown input as a no-op anyway, but we skip the round-trip).
 */
export function parseRealtimeToolCall(evt: {
  type: string;
  item?: { type?: string; name?: string; call_id?: string; arguments?: string };
}): { name: string; callId: string; input: Record<string, unknown> } | null {
  if (evt.type !== "response.output_item.done") return null;
  const item = evt.item;
  if (!item || item.type !== "function_call" || !item.name || !item.call_id) return null;
  try {
    const input = item.arguments ? JSON.parse(item.arguments) : {};
    if (!input || typeof input !== "object" || Array.isArray(input)) return null;
    return { name: item.name, callId: item.call_id, input: input as Record<string, unknown> };
  } catch {
    return null;
  }
}
