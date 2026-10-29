import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// The two ElevenLabs REST calls the app makes at runtime, plus webhook
// verification. Plain fetch on purpose: the server needs three endpoints, not
// the whole SDK in every serverless bundle. The key never leaves the server;
// the browser only ever gets a short-lived conversation token.

const API = "https://api.elevenlabs.io";

export class ElevenLabsError extends Error {
  constructor(
    message: string,
    public status: number | null,
  ) {
    super(message);
  }
}

export function voiceConfig(): { apiKey: string; agentId: string } | null {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const agentId = process.env.EL_AGENT_INTAKE;
  return apiKey && agentId ? { apiKey, agentId } : null;
}

/** The mock-interviewer agent (a separate agent: other prompt, no CV tools). */
export function interviewVoiceConfig(): { apiKey: string; agentId: string } | null {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const agentId = process.env.EL_AGENT_INTERVIEW;
  return apiKey && agentId ? { apiKey, agentId } : null;
}

/** A finished conversation's transcript, or not final yet. */
export async function fetchTranscript(apiKey: string, conversationId: string): Promise<{ final: boolean; transcript: unknown }> {
  const c = (await fetchConversation(apiKey, conversationId)) as { status?: unknown; transcript?: unknown };
  return { final: c.status === "done" || c.status === "failed", transcript: c.transcript ?? [] };
}

async function call(path: string, apiKey: string, signal?: AbortSignal): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, { headers: { "xi-api-key": apiKey }, cache: "no-store", signal: signal ?? AbortSignal.timeout(10_000) });
  } catch (err) {
    throw new ElevenLabsError(`ElevenLabs unreachable: ${(err as Error).message}`, null);
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ElevenLabsError(`ElevenLabs ${res.status} on ${path.split("?")[0]}: ${body.slice(0, 200)}`, res.status);
  }
  return res.json();
}

/** A single-use WebRTC conversation token for the agent (agent must have auth enabled). */
export async function mintConversationToken(apiKey: string, agentId: string): Promise<string> {
  const body = (await call(`/v1/convai/conversation/token?agent_id=${encodeURIComponent(agentId)}`, apiKey)) as { token?: unknown };
  if (typeof body.token !== "string" || !body.token) throw new ElevenLabsError("ElevenLabs returned no token", 200);
  return body.token;
}

/** The authoritative record of a finished conversation (transcript, duration, status). */
export async function fetchConversation(apiKey: string, conversationId: string): Promise<unknown> {
  return call(`/v1/convai/conversations/${encodeURIComponent(conversationId)}`, apiKey);
}

/** How far a webhook timestamp may drift before it is treated as a replay. */
export const WEBHOOK_TOLERANCE_SEC = 30 * 60;

/**
 * Verify an `ElevenLabs-Signature: t=<unix>,v0=<hex>` header: HMAC-SHA256 of
 * `${t}.${rawBody}` with the webhook secret. Constant-time compare.
 */
export function verifyWebhookSignature(rawBody: string, header: string | null, secret: string, nowSec = Math.floor(Date.now() / 1000)): boolean {
  if (!header) return false;
  let t: string | null = null;
  const sigs: string[] = [];
  for (const part of header.split(",")) {
    const [k, v] = part.trim().split("=", 2);
    if (k === "t") t = v ?? null;
    else if (k === "v0" && v) sigs.push(v);
  }
  if (!t || !/^\d+$/.test(t) || sigs.length === 0) return false;
  if (Math.abs(nowSec - Number(t)) > WEBHOOK_TOLERANCE_SEC) return false;
  const expected = Buffer.from(createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex"), "utf8");
  return sigs.some((s) => {
    const got = Buffer.from(s, "utf8");
    return got.length === expected.length && timingSafeEqual(got, expected);
  });
}

/** Test helper and the inverse of verifyWebhookSignature. */
export function signWebhook(rawBody: string, secret: string, t = Math.floor(Date.now() / 1000)): string {
  return `t=${t},v0=${createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex")}`;
}
