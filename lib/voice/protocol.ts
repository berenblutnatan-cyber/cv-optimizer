// The contract between the voice agent, the browser and the server, pure and
// shared by all three so they can never disagree.
//
// Every client tool call the agent makes is numbered in order within one
// connection: call n of attempt a in session s becomes the op `vc:s:a:n`.
// The browser applies and saves it live under that id; afterwards the server
// replays the authoritative ElevenLabs transcript under the same ids, so a
// call the browser never saved (tab closed, network dropped) is recovered and
// one it did save is skipped (ResumeOp is unique on (resumeId, clientOpId)).

import { CV_TOOLS, describeToolCall, snapshotForPrompt } from "@/lib/chat/cvTools";
import type { ResumeData } from "@/types/resume";

export const VOICE_TOOL_NAMES: ReadonlySet<string> = new Set(CV_TOOLS.map((t) => t.name));

/** Pricing and limits for one intake session. */
export const VOICE = {
  freeSeconds: 300,
  paidSeconds: 480,
  /** Credits per paid session. */
  credits: 1,
  /** A call shorter than this is refunded (or gives the free session back). */
  refundUnderSec: 20,
  /** Unlimited fair use per rolling 30 days, then sessions cost credits. */
  unlimitedSecondsPer30d: 200 * 60,
  /** Connections per session: the first plus three reconnects. */
  maxAttempts: 4,
  /** A minted session that never connected is given up (and refunded) after this. */
  mintTtlSec: 15 * 60,
} as const;

export function voiceOpId(sessionId: string, attempt: number, n: number): string {
  return `vc:${sessionId}:${attempt}:${n}`;
}

export function isVoiceOpFor(clientOpId: string, sessionId: string): boolean {
  return clientOpId.startsWith(`vc:${sessionId}:`);
}

/** Parse `vc:<session>:<attempt>:<n>`; null for any other id. */
export function parseVoiceOpId(clientOpId: string): { sessionId: string; attempt: number; n: number } | null {
  const m = /^vc:([A-Za-z0-9_-]{8,40}):(\d{1,2}):(\d{1,5})$/.exec(clientOpId);
  return m ? { sessionId: m[1], attempt: Number(m[2]), n: Number(m[3]) } : null;
}

const RESULT_SNAPSHOT_CHARS = 2400;

/**
 * What the agent hears back from a tool call. It includes the CV as it is now
 * so the agent's next update/remove targets the right index.
 */
export function toolResultText(name: string, input: Record<string, unknown>, after: ResumeData, changed: boolean): string {
  if (!changed) return "No change: that edit was empty, invalid, or already on the CV. Do not retry the same call.";
  const snap = snapshotForPrompt(after);
  return `Done: ${describeToolCall(name, input)}.\nCV now:\n${snap.length > RESULT_SNAPSHOT_CHARS ? `${snap.slice(0, RESULT_SNAPSHOT_CHARS)}…` : snap}`;
}

// ---- ElevenLabs conversation records (webhook body or GET /conversations/:id) ----

export type TranscriptLine = { role: "user" | "agent"; text: string; atSec: number };

export type ConversationRecord = {
  conversationId: string;
  status: string | null;
  durationSec: number | null;
  /** From conversation_initiation_client_data.dynamic_variables. */
  sessionId: string | null;
  attempt: number | null;
  lines: TranscriptLine[];
  toolCalls: { name: string; input: Record<string, unknown> | null }[];
};

const obj = (v: unknown): Record<string, unknown> | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && /^\d+$/.test(v) ? Number(v) : null);

/** Read the parts we need from ElevenLabs' snake_case conversation JSON. Tolerant: unknown fields are ignored. */
export function parseConversation(raw: unknown): ConversationRecord | null {
  const c = obj(raw);
  const conversationId = c && typeof c.conversation_id === "string" ? c.conversation_id : null;
  if (!c || !conversationId) return null;
  const meta = obj(c.metadata);
  const vars = obj(obj(c.conversation_initiation_client_data)?.dynamic_variables);
  const lines: TranscriptLine[] = [];
  const toolCalls: ConversationRecord["toolCalls"] = [];
  for (const t of Array.isArray(c.transcript) ? c.transcript : []) {
    const turn = obj(t);
    if (!turn) continue;
    const role = turn.role === "user" ? "user" : turn.role === "agent" ? "agent" : null;
    const text = typeof turn.message === "string" ? turn.message.trim() : "";
    if (role && text) lines.push({ role, text: text.slice(0, 4000), atSec: num(turn.time_in_call_secs) ?? 0 });
    for (const tc of Array.isArray(turn.tool_calls) ? turn.tool_calls : []) {
      const call = obj(tc);
      if (!call || typeof call.tool_name !== "string") continue;
      // Only the CV tools the browser handles are numbered (system tools like end_call are not).
      if (call.type !== undefined && call.type !== "client") continue;
      if (!VOICE_TOOL_NAMES.has(call.tool_name)) continue;
      let input: Record<string, unknown> | null = null;
      try {
        input = obj(typeof call.params_as_json === "string" ? JSON.parse(call.params_as_json) : call.params_as_json);
      } catch {
        input = null;
      }
      // An unparseable call still takes its number: the browser counted it too.
      toolCalls.push({ name: call.tool_name, input });
    }
  }
  const sid = vars?.voice_session_id;
  return {
    conversationId,
    status: typeof c.status === "string" ? c.status : null,
    durationSec: num(meta?.call_duration_secs),
    sessionId: typeof sid === "string" && sid ? sid : null,
    attempt: num(vars?.voice_attempt),
    lines,
    toolCalls,
  };
}

/** The ops a conversation implies, under the same ids the browser used. */
export function opsFromConversation(rec: ConversationRecord, sessionId: string, attempt: number) {
  const ops: { clientOpId: string; name: string; input: Record<string, unknown> }[] = [];
  rec.toolCalls.forEach((tc, n) => {
    if (tc.input) ops.push({ clientOpId: voiceOpId(sessionId, attempt, n), name: tc.name, input: tc.input });
  });
  return ops;
}

/** ElevenLabs conversation statuses after which nothing more will change. */
export function isFinalStatus(status: string | null): boolean {
  return status === "done" || status === "failed";
}
