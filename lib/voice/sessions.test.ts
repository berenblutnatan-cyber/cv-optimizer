import { localDbUrl } from "@/test/local-db";
import { afterAll, describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { appendOps, createResume, loadResume } from "@/lib/resume/store";
import type { Owner } from "@/lib/resume/owner-types";
import { intakeConversation } from "@/test/fixtures/voiceConversation";
import { parseConversation, voiceOpId, VOICE } from "./protocol";
import {
  authorizeVoiceOps,
  connectConversation,
  drainVoice,
  endVoiceSession,
  reconcileConversation,
  reserveAttempt,
  startVoiceSession,
  voiceOffer,
  VoiceError,
} from "./sessions";

const run = localDbUrl() ? describe : describe.skip;
const users: string[] = [];
const rid = () => randomBytes(6).toString("hex");

async function account(credits = 1, extra: Record<string, unknown> = {}) {
  const id = `user_voice_${rid()}`;
  users.push(id);
  await prisma.user.create({ data: { id, email: `${id}@test.invalid`, credits, ...extra } });
  const owner: Owner = { userId: id, anonKeyHash: null };
  const cv = await createResume(owner);
  return { id, owner, cvId: cv.id };
}
const credits = async (id: string) => (await prisma.user.findUniqueOrThrow({ where: { id } })).credits;
const code = async (p: Promise<unknown>) => {
  try {
    await p;
    return null;
  } catch (err) {
    return err instanceof VoiceError ? err.code : String(err);
  }
};

/** A whole call: start → connect → the browser saves the first `saved` tool calls → end. */
async function talk(a: Awaited<ReturnType<typeof account>>, saved: number) {
  const s = await startVoiceSession(a.id, a.cvId);
  const { attempt } = await reserveAttempt(a.id, s.id);
  const conversationId = `conv_${rid()}`;
  await connectConversation(a.id, s.id, attempt, conversationId);
  const rec = parseConversation(intakeConversation({ conversationId, sessionId: s.id, attempt }))!;
  const browserOps = rec.toolCalls.slice(0, saved).flatMap((tc, n) => (tc.input ? [{ clientOpId: voiceOpId(s.id, attempt, n), name: tc.name, input: tc.input, voiceSessionId: s.id }] : []));
  if (browserOps.length) await appendOps(a.cvId, a.owner, browserOps, "user");
  return { s, attempt, conversationId };
}

run("voice sessions (local Postgres)", () => {
  afterAll(async () => {
    // Every refund and charge above left each ledger summing to its balance.
    const drift = await prisma.$queryRaw<{ id: string }[]>`
      SELECT u."id" FROM "User" u LEFT JOIN "CreditLedger" l ON l."userId" = u."id"
      WHERE u."id" = ANY(${users}) GROUP BY u."id" HAVING u."credits" <> COALESCE(SUM(l."delta"), 0)`;
    expect(drift).toEqual([]);
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    await prisma.$disconnect();
  });

  it("the first call is free and capped at 5 minutes; a second one at the same time is refused", async () => {
    const a = await account(3);
    expect(await voiceOffer(a.id)).toMatchObject({ free: true, credits: 0, seconds: VOICE.freeSeconds });
    const s = await startVoiceSession(a.id, a.cvId);
    expect(s).toMatchObject({ free: true, maxSeconds: VOICE.freeSeconds, status: "minted", creditsCharged: 0 });
    expect(await credits(a.id)).toBe(3);
    expect(await code(startVoiceSession(a.id, a.cvId))).toBe("BUSY");
    // The refusal names the open call (the user's own), so the UI can end it.
    const busy = await startVoiceSession(a.id, a.cvId).catch((e: VoiceError) => e);
    expect((busy as VoiceError).detail).toEqual({ activeSessionId: s.id });
    await endVoiceSession(a.id, s.id);
    expect((await startVoiceSession(a.id, a.cvId)).status).toBe("minted");
  });

  it("a call that never connects is refunded, and the free call comes back", async () => {
    const a = await account(1);
    const s = await startVoiceSession(a.id, a.cvId);
    await reserveAttempt(a.id, s.id);
    await endVoiceSession(a.id, s.id);
    expect(await prisma.voiceSession.findUniqueOrThrow({ where: { id: s.id } })).toMatchObject({ status: "failed", refunded: true });
    expect((await voiceOffer(a.id)).free).toBe(true);
  });

  it("after the free call, a call costs one credit, charged at start; with none it isn't started", async () => {
    const a = await account(1);
    const first = await talk(a, 7);
    await endVoiceSession(a.id, first.s.id);
    await reconcileConversation(parseConversation(intakeConversation({ conversationId: first.conversationId, sessionId: first.s.id, durationSec: 120 }))!);

    const paid = await startVoiceSession(a.id, a.cvId);
    expect(paid).toMatchObject({ free: false, creditsCharged: 1, maxSeconds: VOICE.paidSeconds });
    expect(await credits(a.id)).toBe(0);
    await endVoiceSession(a.id, paid.id); // never connected: refunded
    expect(await credits(a.id)).toBe(1);

    await prisma.$executeRaw`UPDATE "User" SET "credits" = 0 WHERE "id" = ${a.id}`;
    await prisma.creditLedger.create({ data: { userId: a.id, delta: -1, balanceAfter: 0, reason: "admin", idempotencyKey: `test-zero:${a.id}` } });
    const before = await prisma.voiceSession.count({ where: { userId: a.id } });
    expect(await code(startVoiceSession(a.id, a.cvId))).toBe("NO_CREDITS");
    expect(await prisma.voiceSession.count({ where: { userId: a.id } })).toBe(before);
  });

  it("only a live session of this user, on this CV, under a handed-out attempt, can save agent edits", async () => {
    const a = await account(1);
    const b = await account(1);
    const s = await startVoiceSession(a.id, a.cvId);
    await reserveAttempt(a.id, s.id);
    const op = (over: Partial<{ clientOpId: string; voiceSessionId: string }> = {}) => ({
      clientOpId: voiceOpId(s.id, 0, 0),
      name: "update_summary",
      input: { summary: "x" },
      voiceSessionId: s.id,
      ...over,
    });
    await expect(authorizeVoiceOps(a.owner, a.cvId, [op()])).resolves.toBeUndefined();
    expect(await code(authorizeVoiceOps(b.owner, a.cvId, [op()]))).toBe("BAD_REQUEST"); // someone else's session
    expect(await code(authorizeVoiceOps(a.owner, b.cvId, [op()]))).toBe("BAD_REQUEST"); // another CV
    expect(await code(authorizeVoiceOps(a.owner, a.cvId, [op({ clientOpId: voiceOpId(s.id, 3, 0) })]))).toBe("BAD_REQUEST"); // attempt never minted
    expect(await code(authorizeVoiceOps(a.owner, a.cvId, [op({ clientOpId: `ed:${rid()}-forged` })]))).toBe("BAD_REQUEST"); // not an agent id
    expect(await code(authorizeVoiceOps({ userId: null, anonKeyHash: "h".repeat(64) }, a.cvId, [op()]))).toBe("BAD_REQUEST");
    // Plain typed edits need no voice check.
    await expect(authorizeVoiceOps(b.owner, b.cvId, [{ clientOpId: `ed:${rid()}-typed`, name: "update_summary", input: { summary: "y" } }])).resolves.toBeUndefined();
  });

  it("edits the browser never saved are recovered from the transcript, without re-applying the saved ones", async () => {
    const a = await account(1);
    // The tab dies after saving the first three tool calls.
    const { s, conversationId } = await talk(a, 3);
    const end = await endVoiceSession(a.id, s.id);
    expect(end.edits).toBe(3);
    expect(end.versionNumber).toBe(1);

    const rec = parseConversation(intakeConversation({ conversationId, sessionId: s.id, durationSec: 65 }))!;
    const r = await reconcileConversation(rec);
    expect(r).toEqual({ status: "reconciled", recovered: 3 });

    const cv = (await loadResume(a.cvId, a.owner))!.doc.content;
    expect(cv.experience).toHaveLength(1); // not added twice
    expect(cv.experience[0].description).toEqual(["Led the checkout redesign, lifting conversion 18%"]);
    expect(cv.education[0].institution).toBe("Technion");
    expect(cv.skills).toEqual(["SQL", "Figma", "A/B testing"]);
    expect(cv.summary).toContain("18%");

    const log = await prisma.resumeOp.findMany({ where: { resumeId: a.cvId }, orderBy: { seq: "asc" } });
    expect(log.map((l) => l.clientOpId)).toEqual([0, 1, 2, 4, 5, 6].map((n) => voiceOpId(s.id, 0, n)));
    expect(new Set(log.map((l) => l.actor))).toEqual(new Set(["intake_agent"]));
    expect(log.every((l) => l.voiceSessionId === s.id)).toBe(true);

    const versions = await prisma.resumeVersion.findMany({ where: { resumeId: a.cvId }, orderBy: { number: "asc" } });
    expect(versions.map((v) => [v.label, v.createdBy])).toEqual([
      ["After talking", "intake_agent"],
      ["Recovered from your call", "intake_agent"],
    ]);

    const settled = await prisma.voiceSession.findUniqueOrThrow({ where: { id: s.id } });
    expect(settled).toMatchObject({ status: "reconciled", durationSec: 65, refunded: false });
    // Only the call's size is kept, never its words.
    const conv = await prisma.voiceConversation.findUniqueOrThrow({ where: { id: conversationId } });
    expect(conv.transcript).toBeNull();
    expect(settled.turns).toBe(rec.lines.length);

    // The same webhook again: nothing happens.
    expect(await reconcileConversation(rec)).toEqual({ status: "duplicate", recovered: 0 });
    expect(await prisma.resumeOp.count({ where: { resumeId: a.cvId } })).toBe(6);
  });

  it("a paid call under 20 seconds is refunded once ElevenLabs reports its length", async () => {
    const a = await account(2);
    const free = await talk(a, 0);
    await endVoiceSession(a.id, free.s.id);
    await reconcileConversation(parseConversation(intakeConversation({ conversationId: free.conversationId, sessionId: free.s.id, durationSec: 90 }))!);

    const paid = await talk(a, 0);
    expect(await credits(a.id)).toBe(1);
    await endVoiceSession(a.id, paid.s.id);
    await reconcileConversation(parseConversation(intakeConversation({ conversationId: paid.conversationId, sessionId: paid.s.id, durationSec: 8 }))!);
    expect(await credits(a.id)).toBe(2);
    expect(await prisma.voiceSession.findUniqueOrThrow({ where: { id: paid.s.id } })).toMatchObject({ status: "reconciled", refunded: true, durationSec: 8 });
  });

  it("a webhook for a connection the browser never reported is matched by its session variables", async () => {
    const a = await account(1);
    const s = await startVoiceSession(a.id, a.cvId);
    await reserveAttempt(a.id, s.id);
    const conversationId = `conv_${rid()}`;
    const r = await reconcileConversation(parseConversation(intakeConversation({ conversationId, sessionId: s.id, attempt: 0 }))!);
    expect(r.status).toBe("reconciled");
    expect(r.recovered).toBe(6);
    expect((await prisma.voiceConversation.findUniqueOrThrow({ where: { id: conversationId } })).sessionId).toBe(s.id);
    // An attempt the server never handed out is not trusted.
    const forged = await reconcileConversation(parseConversation(intakeConversation({ conversationId: `conv_${rid()}`, sessionId: s.id, attempt: 5 }))!);
    expect(forged.status).toBe("unknown");
  });

  it("a conversation still processing is left for later", async () => {
    const a = await account(1);
    const { s, conversationId } = await talk(a, 0);
    const r = await reconcileConversation(parseConversation(intakeConversation({ conversationId, sessionId: s.id, status: "processing" }))!);
    expect(r.status).toBe("pending");
    expect((await prisma.voiceConversation.findUniqueOrThrow({ where: { id: conversationId } })).reconciledAt).toBeNull();
  });

  it("reconnects reuse the session and its clock, up to the limit, without another charge", async () => {
    const a = await account(1);
    const s = await startVoiceSession(a.id, a.cvId);
    const attempts = [];
    for (let i = 0; i < VOICE.maxAttempts; i++) attempts.push((await reserveAttempt(a.id, s.id)).attempt);
    expect(attempts).toEqual([0, 1, 2, 3]);
    expect(await code(reserveAttempt(a.id, s.id))).toBe("EXPIRED");
    expect(await prisma.creditLedger.count({ where: { userId: a.id, reason: "voice" } })).toBe(0); // free call
  });

  it("the cron refunds a call that never connected and closes one the browser abandoned", async () => {
    const a = await account(1);
    const stale = await startVoiceSession(a.id, a.cvId);
    await prisma.$executeRaw`UPDATE "VoiceSession" SET "createdAt" = NOW() - INTERVAL '20 minutes' WHERE "id" = ${stale.id}`;
    const b = await account(1);
    const gone = await talk(b, 0);
    await prisma.$executeRaw`UPDATE "VoiceSession" SET "createdAt" = NOW() - INTERVAL '2 hours', "startedAt" = NOW() - INTERVAL '2 hours' WHERE "id" = ${gone.s.id}`;
    await prisma.$executeRaw`UPDATE "VoiceConversation" SET "startedAt" = NOW() - INTERVAL '2 hours' WHERE "id" = ${gone.conversationId}`;

    const fetched: string[] = [];
    const out = await drainVoice(async (id) => {
      fetched.push(id);
      return id === gone.conversationId ? parseConversation(intakeConversation({ conversationId: id, sessionId: gone.s.id, durationSec: 200 })) : null;
    });
    expect(out.failed).toBeGreaterThanOrEqual(1);
    expect(await prisma.voiceSession.findUniqueOrThrow({ where: { id: stale.id } })).toMatchObject({ status: "failed", refunded: true });
    expect(fetched).toContain(gone.conversationId);
    expect(await prisma.voiceSession.findUniqueOrThrow({ where: { id: gone.s.id } })).toMatchObject({ status: "reconciled", durationSec: 200 });
  });

  it("Unlimited covers calls up to its monthly voice minutes, then they cost credits", async () => {
    const a = await account(1, { subscriptionStatus: "active", subscriptionCurrentPeriodEnd: new Date(Date.now() + 10 * 86_400_000) });
    const free = await talk(a, 0);
    await endVoiceSession(a.id, free.s.id);
    const covered = await startVoiceSession(a.id, a.cvId);
    expect(covered.creditsCharged).toBe(0);
    await prisma.voiceSession.update({ where: { id: covered.id }, data: { status: "reconciled", durationSec: 3600 } });
    // Three more hours of covered calls this month: past the fair-use minutes.
    await prisma.voiceSession.createMany({
      data: [1, 2, 3].map(() => ({ userId: a.id, resumeId: a.cvId, status: "reconciled", free: false, durationSec: 3600, creditsCharged: 0 })),
    });
    expect((await voiceOffer(a.id)).unlimited).toBe(false);
    const over = await startVoiceSession(a.id, a.cvId);
    expect(over.creditsCharged).toBe(1);
    expect(await credits(a.id)).toBe(0);
  });
});
