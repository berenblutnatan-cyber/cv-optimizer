import { localDbUrl } from "@/test/local-db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import { intakeConversation } from "@/test/fixtures/voiceConversation";
import { signWebhook } from "@/lib/voice/elevenlabs";

const SECRET = "wsec_route_" + randomBytes(8).toString("hex");
const run = localDbUrl() ? describe : describe.skip;

run("POST /api/webhook/elevenlabs (local Postgres)", () => {
  let POST: typeof import("./route").POST;
  let prisma: typeof import("@/lib/prisma").prisma;
  let sessions: typeof import("@/lib/voice/sessions");
  const userId = `user_elwh_${randomBytes(6).toString("hex")}`;
  let cvId = "";

  beforeAll(async () => {
    process.env.ELEVENLABS_WEBHOOK_SECRET = SECRET;
    ({ POST } = await import("./route"));
    ({ prisma } = await import("@/lib/prisma"));
    sessions = await import("@/lib/voice/sessions");
    const { createResume } = await import("@/lib/resume/store");
    await prisma.user.create({ data: { id: userId, email: `${userId}@test.invalid` } });
    cvId = (await createResume({ userId, anonKeyHash: null })).id;
  });
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  });

  const request = (raw: string, sig: string | null) =>
    new Request("http://test/api/webhook/elevenlabs", { method: "POST", headers: sig ? { "content-type": "application/json", "elevenlabs-signature": sig } : {}, body: raw });

  it("rejects an unsigned or tampered delivery and changes nothing", async () => {
    const raw = JSON.stringify({ type: "post_call_transcription", data: intakeConversation({ conversationId: "conv_bad", sessionId: "x".repeat(25) }) });
    expect((await POST(request(raw, null))).status).toBe(401);
    expect((await POST(request(raw.replace("Dana", "Eve"), signWebhook(raw, SECRET)))).status).toBe(401);
    expect(await prisma.elevenLabsWebhookEvent.findUnique({ where: { id: "post_call_transcription:conv_bad" } })).toBeNull();
  });

  it("reconciles a signed transcript into the CV once, then drops the raw payload", async () => {
    const s = await sessions.startVoiceSession(userId, cvId);
    await sessions.reserveAttempt(userId, s.id);
    const conversationId = `conv_${randomBytes(5).toString("hex")}`;
    await sessions.connectConversation(userId, s.id, 0, conversationId);
    await sessions.endVoiceSession(userId, s.id);

    const raw = JSON.stringify({ type: "post_call_transcription", event_timestamp: Math.floor(Date.now() / 1000), data: intakeConversation({ conversationId, sessionId: s.id }) });
    const first = await POST(request(raw, signWebhook(raw, SECRET)));
    expect(first.status).toBe(200);
    expect(await first.json()).toMatchObject({ status: "reconciled" });
    const again = await POST(request(raw, signWebhook(raw, SECRET)));
    expect(await again.json()).toMatchObject({ status: "duplicate" });

    const row = await prisma.resume.findUniqueOrThrow({ where: { id: cvId } });
    expect((row.data as { content: { skills: string[] } }).content.skills).toEqual(["SQL", "Figma", "A/B testing"]);
    const evt = await prisma.elevenLabsWebhookEvent.findUniqueOrThrow({ where: { id: `post_call_transcription:${conversationId}` } });
    expect(evt.processedAt).not.toBeNull();
    expect(evt.payload).toEqual({});
    expect(await prisma.voiceSession.findUniqueOrThrow({ where: { id: s.id } })).toMatchObject({ status: "reconciled" });
  });

  it("a transcript still processing stays retryable", async () => {
    const s = await sessions.startVoiceSession(userId, cvId).catch(async () => {
      // The account's free call is used and it has no credits: give it one for this case.
      const { prisma: db } = await import("@/lib/prisma");
      const { grant } = await import("@/lib/billing/ledger");
      await db.$transaction((tx) => grant(tx, { userId, amount: 1, reason: "admin", key: `test-grant:${userId}` }));
      return sessions.startVoiceSession(userId, cvId);
    });
    await sessions.reserveAttempt(userId, s.id);
    const conversationId = `conv_${randomBytes(5).toString("hex")}`;
    await sessions.connectConversation(userId, s.id, 0, conversationId);
    const raw = JSON.stringify({ type: "post_call_transcription", data: intakeConversation({ conversationId, sessionId: s.id, status: "processing" }) });
    const res = await POST(request(raw, signWebhook(raw, SECRET)));
    expect(await res.json()).toMatchObject({ status: "pending" });
    const evt = await prisma.elevenLabsWebhookEvent.findUniqueOrThrow({ where: { id: `post_call_transcription:${conversationId}` } });
    expect(evt.processedAt).toBeNull();
    await sessions.endVoiceSession(userId, s.id);
  });

  it("acknowledges other event types without processing", async () => {
    const raw = JSON.stringify({ type: "post_call_audio", data: { conversation_id: "c", full_audio: "AAAA" } });
    const res = await POST(request(raw, signWebhook(raw, SECRET)));
    expect(await res.json()).toMatchObject({ received: true, ignored: "post_call_audio" });
  });

  it("answers 500 when the secret is missing, so ElevenLabs retries", async () => {
    const saved = process.env.ELEVENLABS_WEBHOOK_SECRET;
    delete process.env.ELEVENLABS_WEBHOOK_SECRET;
    const res = await POST(request("{}", "t=1,v0=x"));
    process.env.ELEVENLABS_WEBHOOK_SECRET = saved;
    expect(res.status).toBe(500);
  });
});
