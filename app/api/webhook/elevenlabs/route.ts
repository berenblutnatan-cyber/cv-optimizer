import { after } from "next/server";
import { Prisma } from "@prisma/client";
import { scoreWhenReady } from "@/lib/interview/http";
import { interviewStatus, recordInterviewConversation } from "@/lib/interview/store";
import { prisma } from "@/lib/prisma";
import { verifyWebhookSignature } from "@/lib/voice/elevenlabs";
import { parseConversation } from "@/lib/voice/protocol";
import { reconcileConversation } from "@/lib/voice/sessions";

export const dynamic = "force-dynamic";

// ElevenLabs post-call webhook. Verified (HMAC over `${t}.${body}`), recorded
// first, then the transcript's tool calls are replayed into the CV under the
// browser's op ids (anything already saved is skipped). Safe to receive twice.
// A processing failure answers 500 so ElevenLabs retries; the cron re-drives
// anything still unreconciled from the API either way.
export async function POST(request: Request) {
  const secret = process.env.ELEVENLABS_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[elevenlabs webhook] ELEVENLABS_WEBHOOK_SECRET is not set");
    return Response.json({ received: false }, { status: 500 });
  }
  const raw = await request.text();
  if (!verifyWebhookSignature(raw, request.headers.get("elevenlabs-signature"), secret)) {
    return Response.json({ received: false }, { status: 401 });
  }

  let event: { type?: unknown; event_timestamp?: unknown; data?: unknown };
  try {
    event = JSON.parse(raw);
  } catch {
    return Response.json({ received: false }, { status: 400 });
  }
  const type = typeof event.type === "string" ? event.type : "unknown";
  if (type !== "post_call_transcription") return Response.json({ received: true, ignored: type });

  const rec = parseConversation(event.data);
  if (!rec) return Response.json({ received: true, ignored: "no conversation" });

  // A mock interview: its transcript is read back from the API when scoring,
  // so the webhook only makes sure the call is counted and scoring runs.
  const interviewId = interviewSessionId(event.data);
  if (interviewId) {
    try {
      await recordInterviewConversation(interviewId, rec.conversationId, rec.attempt);
      const status = await interviewStatus(interviewId);
      if (status === "scoring") after(() => scoreWhenReady(interviewId, { tries: 6 }));
      return Response.json({ received: true, status: status ?? "unknown" });
    } catch (err) {
      console.error("[elevenlabs webhook] interview failed", interviewId, err);
      return Response.json({ received: false }, { status: 500 });
    }
  }

  // One row per conversation: a repeated delivery finds it.
  const eventId = `${type}:${rec.conversationId}`;
  const prior = await prisma.elevenLabsWebhookEvent.findUnique({ where: { id: eventId }, select: { processedAt: true } });
  if (prior?.processedAt) return Response.json({ received: true, status: "duplicate" });
  if (!prior) {
    await prisma.elevenLabsWebhookEvent
      .create({ data: { id: eventId, type, conversationId: rec.conversationId, payload: event as Prisma.InputJsonValue } })
      .catch((err) => {
        if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")) throw err;
      });
  }

  try {
    const result = await reconcileConversation(rec);
    // Still processing at ElevenLabs: leave it unprocessed, a retry or the cron finishes it.
    if (result.status === "pending") return Response.json({ received: true, status: result.status });
    // Applied: the raw transcript is no longer needed, drop it.
    await prisma.elevenLabsWebhookEvent.update({ where: { id: eventId }, data: { processedAt: new Date(), error: null, payload: {} } });
    console.log(`[elevenlabs webhook] ${rec.conversationId}: ${result.status} (+${result.recovered} recovered)`);
    return Response.json({ received: true, status: result.status });
  } catch (err) {
    console.error("[elevenlabs webhook] reconcile failed", rec.conversationId, err);
    await prisma.elevenLabsWebhookEvent
      .update({ where: { id: eventId }, data: { error: String((err as Error).message ?? err).slice(0, 500) } })
      .catch(() => {});
    return Response.json({ received: false }, { status: 500 });
  }
}

function interviewSessionId(data: unknown): string | null {
  const d = data && typeof data === "object" ? (data as Record<string, unknown>) : null;
  const init = d?.conversation_initiation_client_data as Record<string, unknown> | undefined;
  const vars = init?.dynamic_variables as Record<string, unknown> | undefined;
  const id = vars?.interview_session_id;
  return typeof id === "string" && /^[A-Za-z0-9_-]{6,64}$/.test(id) ? id : null;
}
