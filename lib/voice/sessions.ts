import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { charge, InsufficientCredits, refundCharge } from "@/lib/billing/ledger";
import { hasActiveSubscription } from "@/lib/subscription";
import { appendOps, createVersion, loadResume, MAX_OPS_PER_BATCH, StoreError, type OpInput } from "@/lib/resume/store";
import type { Owner } from "@/lib/resume/owner-types";
import { isFinalStatus, isVoiceOpFor, opsFromConversation, parseVoiceOpId, VOICE, type ConversationRecord } from "./protocol";

// Voice intake sessions: who may talk, what it costs, and how a call's edits
// end up in the CV even when the browser didn't save them.
//
// Lifecycle: minted (paid or free, no connection yet) → active (connected at
// least once) → ended (the browser said so, or it timed out) → reconciled
// (every connection's transcript has been replayed). A session that never
// connects, or whose calls total under VOICE.refundUnderSec, is refunded; a
// refunded free session gives the free session back.

export class VoiceError extends Error {
  constructor(
    public code: "NOT_FOUND" | "BUSY" | "NO_CREDITS" | "EXPIRED" | "UNAVAILABLE" | "BAD_REQUEST",
    message: string,
    /** Safe to return to the caller (e.g. the open session a BUSY refers to; it is theirs). */
    public detail?: Record<string, string>,
  ) {
    super(message);
  }
}

export type VoiceSessionRow = Prisma.VoiceSessionGetPayload<object>;

const chargeKey = (sessionId: string) => `voice:${sessionId}`;
const userOwner = (userId: string): Owner => ({ userId, anonKeyHash: null });

/** Seconds of talk left, counted on the server's clock from the first connection. */
export function remainingSeconds(s: Pick<VoiceSessionRow, "maxSeconds" | "startedAt">, now = new Date()): number {
  if (!s.startedAt) return s.maxSeconds;
  return Math.max(0, s.maxSeconds - Math.floor((now.getTime() - s.startedAt.getTime()) / 1000));
}

/** What starting a session would cost this user right now (for the Talk button). */
export async function voiceOffer(userId: string): Promise<{ free: boolean; credits: number; seconds: number; unlimited: boolean; balance: number }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { credits: true, subscriptionStatus: true, subscriptionCurrentPeriodEnd: true },
  });
  const free = !(await prisma.voiceSession.findFirst({ where: { userId, kind: "intake", free: true, refunded: false }, select: { id: true } }));
  const unlimited = !!user && hasActiveSubscription(user) && (await unlimitedSecondsUsed(prisma, userId)) < VOICE.unlimitedSecondsPer30d;
  return {
    free,
    credits: free || unlimited ? 0 : VOICE.credits,
    seconds: free ? VOICE.freeSeconds : VOICE.paidSeconds,
    unlimited,
    balance: user?.credits ?? 0,
  };
}

/** Voice seconds Unlimited covered in the last 30 days: intake calls and mock interviews share one fair-use pool. */
export async function unlimitedSecondsUsed(db: Prisma.TransactionClient | typeof prisma, userId: string): Promise<number> {
  const since = new Date(Date.now() - 30 * 86_400_000);
  const [intake, interview] = await Promise.all([
    // startedAt is set only by v2 connections: pre-v2 (OpenAI) sessions don't count.
    db.voiceSession.aggregate({ where: { userId, free: false, creditsCharged: 0, refunded: false, startedAt: { not: null }, createdAt: { gt: since } }, _sum: { durationSec: true } }),
    db.interviewSession.aggregate({ where: { userId, mode: "voice", creditsCharged: 0, refunded: false, createdAt: { gt: since } }, _sum: { durationSec: true } }),
  ]);
  return (intake._sum.durationSec ?? 0) + (interview._sum.durationSec ?? 0);
}

/**
 * Open a session for one CV: one active session per user (the user row lock
 * makes the check-and-create atomic), the free session first, otherwise one
 * credit charged in the same transaction (Unlimited past fair use pays too).
 */
export async function startVoiceSession(userId: string, resumeId: string): Promise<VoiceSessionRow> {
  const resume = await loadResume(resumeId, userOwner(userId));
  if (!resume) throw new VoiceError("NOT_FOUND", "CV not found");

  try {
    return await prisma.$transaction(async (tx) => {
      const users = await tx.$queryRaw<{ credits: number; subscriptionStatus: string | null; subscriptionCurrentPeriodEnd: Date | null }[]>`
        SELECT "credits", "subscriptionStatus", "subscriptionCurrentPeriodEnd" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
      const user = users[0];
      if (!user) throw new VoiceError("NOT_FOUND", "Account not found");

      const busy = await tx.voiceSession.findFirst({
        where: {
          userId,
          status: { in: ["minted", "active"] },
          createdAt: { gt: new Date(Date.now() - (VOICE.paidSeconds + VOICE.mintTtlSec) * 1000) },
        },
        select: { id: true },
      });
      if (busy) throw new VoiceError("BUSY", "You're already in a call. End it first.", { activeSessionId: busy.id });

      const free = !(await tx.voiceSession.findFirst({ where: { userId, kind: "intake", free: true, refunded: false }, select: { id: true } }));
      const session = await tx.voiceSession.create({
        data: { userId, resumeId, kind: "intake", status: "minted", free, maxSeconds: free ? VOICE.freeSeconds : VOICE.paidSeconds },
      });
      if (free) return session;

      const overFairUse = hasActiveSubscription(user) && (await unlimitedSecondsUsed(tx, userId)) >= VOICE.unlimitedSecondsPer30d;
      const c = await charge(tx, {
        userId,
        reason: "voice",
        key: chargeKey(session.id),
        amount: VOICE.credits,
        refType: "voice_session",
        refId: session.id,
        ignoreUnlimited: overFairUse,
      });
      return tx.voiceSession.update({ where: { id: session.id }, data: { creditsCharged: c.charged } });
    });
  } catch (err) {
    if (err instanceof InsufficientCredits) throw new VoiceError("NO_CREDITS", "Out of credits");
    throw err;
  }
}

/**
 * Reserve the next connection attempt (the first, or a reconnect after a
 * drop). Reconnects are free: they continue the same paid session and its
 * clock. Returns the attempt number the browser numbers its edits under.
 */
export async function reserveAttempt(userId: string, sessionId: string): Promise<{ session: VoiceSessionRow; attempt: number }> {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "VoiceSession" WHERE "id" = ${sessionId} AND "userId" = ${userId} FOR UPDATE`;
    if (!rows[0]) throw new VoiceError("NOT_FOUND", "Session not found");
    const s = await tx.voiceSession.findUniqueOrThrow({ where: { id: sessionId } });
    if (s.status !== "minted" && s.status !== "active") throw new VoiceError("EXPIRED", "This call has ended");
    if (s.attempts >= VOICE.maxAttempts) throw new VoiceError("EXPIRED", "Couldn't reconnect");
    if (remainingSeconds(s) < 15) throw new VoiceError("EXPIRED", "Time's up");
    const updated = await tx.voiceSession.update({ where: { id: sessionId }, data: { attempts: { increment: 1 } } });
    return { session: updated, attempt: s.attempts };
  });
}

/** Mark a session failed and give back what it cost (credits, or the free session). */
export async function failSession(sessionId: string, error: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const s = await tx.voiceSession.findUnique({ where: { id: sessionId }, select: { refunded: true } });
    if (!s) return;
    await refundCharge(tx, chargeKey(sessionId));
    await tx.voiceSession.update({ where: { id: sessionId }, data: { status: "failed", refunded: true, error: error.slice(0, 500), endedAt: new Date() } });
  });
}

/** The browser connected: remember which ElevenLabs conversation this attempt is. */
export async function connectConversation(userId: string, sessionId: string, attempt: number, conversationId: string): Promise<void> {
  if (!/^[A-Za-z0-9_-]{6,80}$/.test(conversationId)) throw new VoiceError("BAD_REQUEST", "Bad conversation id");
  const s = await prisma.voiceSession.findFirst({ where: { id: sessionId, userId }, select: { attempts: true, status: true } });
  if (!s) throw new VoiceError("NOT_FOUND", "Session not found");
  if (!Number.isInteger(attempt) || attempt < 0 || attempt >= s.attempts) throw new VoiceError("BAD_REQUEST", "Bad attempt");
  if (s.status !== "minted" && s.status !== "active") throw new VoiceError("EXPIRED", "This call has ended");
  await prisma.$transaction([
    prisma.voiceConversation.upsert({ where: { id: conversationId }, create: { id: conversationId, sessionId, attempt }, update: {} }),
    prisma.$executeRaw`UPDATE "VoiceSession" SET "status" = 'active', "startedAt" = COALESCE("startedAt", NOW()) WHERE "id" = ${sessionId} AND "status" IN ('minted', 'active')`,
  ]);
}

/**
 * Authorize the voice ops in an editor save batch: each must belong to a live
 * session of this user, on this CV, under an attempt that was handed out.
 * Throws BAD_REQUEST otherwise, so a client can't forge agent edits.
 */
export async function authorizeVoiceOps(owner: Owner, resumeId: string, ops: OpInput[]): Promise<void> {
  const ids = [...new Set(ops.filter((o) => o.voiceSessionId).map((o) => o.voiceSessionId!))];
  if (ids.length === 0) return;
  if (!owner.userId) throw new VoiceError("BAD_REQUEST", "Voice edits need an account");
  const sessions = await prisma.voiceSession.findMany({
    where: { id: { in: ids }, userId: owner.userId, resumeId, status: { in: ["minted", "active", "ended", "reconciled"] } },
    select: { id: true, attempts: true, createdAt: true },
  });
  const byId = new Map(sessions.map((s) => [s.id, s]));
  for (const op of ops) {
    if (!op.voiceSessionId) continue;
    const s = byId.get(op.voiceSessionId);
    const id = parseVoiceOpId(op.clientOpId);
    // Late saves after a dropped connection are fine for a few hours, never forever.
    const fresh = s && Date.now() - s.createdAt.getTime() < 6 * 3600_000;
    if (!s || !fresh || !id || !isVoiceOpFor(op.clientOpId, s.id) || id.attempt >= s.attempts) {
      throw new VoiceError("BAD_REQUEST", "Voice edit not allowed");
    }
  }
}

async function voiceOpCount(sessionId: string): Promise<number> {
  return prisma.resumeOp.count({ where: { voiceSessionId: sessionId } });
}

/**
 * The browser ended the call. Duration is measured on the server's clock.
 * A session that never connected is refunded. Saves a version when the call
 * changed the CV, so it is one click to undo.
 */
export async function endVoiceSession(userId: string, sessionId: string): Promise<{ versionNumber: number | null; edits: number }> {
  const s = await prisma.voiceSession.findFirst({ where: { id: sessionId, userId } });
  if (!s) throw new VoiceError("NOT_FOUND", "Session not found");
  if (s.status === "minted" && !(await prisma.voiceConversation.count({ where: { sessionId } }))) {
    await failSession(sessionId, "ended before connecting");
    return { versionNumber: null, edits: 0 };
  }
  if (s.status === "minted" || s.status === "active") {
    const now = new Date();
    const elapsed = s.startedAt ? Math.floor((now.getTime() - s.startedAt.getTime()) / 1000) : 0;
    await prisma.voiceSession.updateMany({
      where: { id: sessionId, status: { in: ["minted", "active"] } },
      data: { status: "ended", endedAt: now, durationSec: Math.min(s.maxSeconds + 60, Math.max(0, elapsed)) },
    });
  }
  const edits = await voiceOpCount(sessionId);
  let versionNumber: number | null = null;
  if (edits > 0 && s.resumeId && s.status !== "ended" && s.status !== "reconciled") {
    try {
      versionNumber = (await createVersion(s.resumeId, userOwner(userId), { label: "After talking", createdBy: "intake_agent" })).number;
    } catch (err) {
      if (!(err instanceof StoreError && err.code === "NOT_FOUND")) throw err;
    }
  }
  await settleSession(sessionId);
  return { versionNumber, edits };
}

/**
 * Replay one finished ElevenLabs conversation into the CV under the browser's
 * op ids (anything already saved is skipped), store its transcript and
 * duration, then settle the session. Idempotent: a repeated webhook or a cron
 * re-drive of a reconciled conversation does nothing.
 */
export async function reconcileConversation(rec: ConversationRecord): Promise<{ status: "unknown" | "duplicate" | "pending" | "reconciled"; recovered: number }> {
  let conv = await prisma.voiceConversation.findUnique({ where: { id: rec.conversationId } });
  if (!conv && rec.sessionId && rec.attempt !== null) {
    // The browser never told us about this connection (it crashed right after connecting).
    const s = await prisma.voiceSession.findUnique({ where: { id: rec.sessionId }, select: { id: true, attempts: true } });
    if (s && rec.attempt < s.attempts) {
      conv = await prisma.voiceConversation.upsert({
        where: { id: rec.conversationId },
        create: { id: rec.conversationId, sessionId: s.id, attempt: rec.attempt },
        update: {},
      });
      await prisma.$executeRaw`UPDATE "VoiceSession" SET "status" = 'active', "startedAt" = COALESCE("startedAt", NOW()) WHERE "id" = ${s.id} AND "status" = 'minted'`;
    }
  }
  if (!conv) return { status: "unknown", recovered: 0 };
  if (conv.reconciledAt) return { status: "duplicate", recovered: 0 };
  if (!isFinalStatus(rec.status)) return { status: "pending", recovered: 0 };

  const session = await prisma.voiceSession.findUniqueOrThrow({ where: { id: conv.sessionId } });
  let recovered = 0;
  if (session.resumeId) {
    const ops = opsFromConversation(rec, session.id, conv.attempt).map((o) => ({ ...o, voiceSessionId: session.id }));
    try {
      for (let i = 0; i < ops.length; i += MAX_OPS_PER_BATCH) {
        const r = await appendOps(session.resumeId, userOwner(session.userId), ops.slice(i, i + MAX_OPS_PER_BATCH), "intake_agent");
        recovered += r.applied.length;
      }
      if (recovered > 0) {
        await createVersion(session.resumeId, userOwner(session.userId), { label: "Recovered from your call", createdBy: "intake_agent" });
      }
    } catch (err) {
      // The CV was deleted meanwhile: nothing to apply, the session still settles.
      if (!(err instanceof StoreError && err.code === "NOT_FOUND")) throw err;
    }
  }

  // The transcript itself is not kept: its CV edits are in the op log, and
  // that is all intake needs. Only its length and size are recorded.
  await prisma.$transaction([
    prisma.voiceConversation.update({
      where: { id: conv.id },
      data: {
        reconciledAt: new Date(),
        durationSec: rec.durationSec === null ? null : Math.min(3600, Math.max(0, Math.round(rec.durationSec))),
        error: rec.status === "failed" ? "conversation failed" : null,
      },
    }),
    prisma.voiceSession.update({ where: { id: session.id }, data: { turns: { increment: rec.lines.length } } }),
  ]);
  await settleSession(session.id);
  return { status: "reconciled", recovered };
}

/**
 * Once a session has ended and every connection is reconciled: record the
 * real talk time (ElevenLabs' numbers) and refund a call too short to count.
 */
export async function settleSession(sessionId: string): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<{ status: string }[]>`SELECT "status" FROM "VoiceSession" WHERE "id" = ${sessionId} FOR UPDATE`;
    if (rows[0]?.status !== "ended") return false;
    const convs = await tx.voiceConversation.findMany({ where: { sessionId }, select: { reconciledAt: true, durationSec: true } });
    if (convs.length === 0 || convs.some((c) => !c.reconciledAt)) return false;
    const total = convs.reduce((sum, c) => sum + (c.durationSec ?? 0), 0);
    const s = await tx.voiceSession.findUniqueOrThrow({ where: { id: sessionId }, select: { refunded: true, durationSec: true } });
    // No duration from ElevenLabs at all: keep the server-clock estimate.
    const durationSec = convs.some((c) => c.durationSec !== null) ? Math.min(3600, total) : s.durationSec;
    const short = durationSec < VOICE.refundUnderSec;
    if (short && !s.refunded) await refundCharge(tx, chargeKey(sessionId));
    await tx.voiceSession.update({
      where: { id: sessionId },
      data: { status: "reconciled", reconciledAt: new Date(), durationSec, refunded: s.refunded || short },
    });
    return true;
  });
}

/**
 * Cron re-drive, so nothing depends on the webhook arriving:
 * 1. minted and never connected → failed + refunded;
 * 2. active past its time → ended (the browser vanished);
 * 3. unreconciled connections → fetched from ElevenLabs and reconciled;
 * 4. connections ElevenLabs never delivered within a day → closed without a
 *    transcript (the server-clock duration stands);
 * 5. ended sessions whose connections are all done → settled;
 * 6. raw webhook payloads (transcripts) kept for a failed delivery → dropped
 *    after a week, so a transcript never outlives its retry window.
 */
export async function drainVoice(fetchRecord: ((conversationId: string) => Promise<ConversationRecord | null>) | null, now = new Date()) {
  const out = { failed: 0, ended: 0, reconciled: 0, settled: 0, errors: 0 };

  const stale = await prisma.voiceSession.findMany({
    where: { status: "minted", createdAt: { lt: new Date(now.getTime() - VOICE.mintTtlSec * 1000) }, conversations: { none: {} } },
    select: { id: true },
    take: 200,
  });
  for (const s of stale) {
    await failSession(s.id, "never connected");
    out.failed++;
  }

  const overdue = await prisma.voiceSession.findMany({
    where: { status: { in: ["minted", "active"] }, createdAt: { lt: new Date(now.getTime() - (VOICE.paidSeconds + VOICE.mintTtlSec + 300) * 1000) } },
    select: { id: true, startedAt: true, maxSeconds: true },
    take: 200,
  });
  for (const s of overdue) {
    const res = await prisma.voiceSession.updateMany({
      where: { id: s.id, status: { in: ["minted", "active"] } },
      data: { status: "ended", endedAt: now, durationSec: s.startedAt ? Math.min(s.maxSeconds, Math.floor((now.getTime() - s.startedAt.getTime()) / 1000)) : 0 },
    });
    out.ended += res.count;
  }

  if (fetchRecord) {
    const pending = await prisma.voiceConversation.findMany({
      where: { reconciledAt: null, startedAt: { lt: new Date(now.getTime() - 120_000) }, session: { status: { in: ["active", "ended"] } } },
      select: { id: true },
      take: 50,
    });
    for (const c of pending) {
      try {
        const rec = await fetchRecord(c.id);
        if (rec && (await reconcileConversation(rec)).status === "reconciled") out.reconciled++;
      } catch (err) {
        out.errors++;
        console.error("[voice drain] reconcile failed", c.id, err);
      }
    }
  }

  const lost = await prisma.voiceConversation.updateMany({
    where: { reconciledAt: null, startedAt: { lt: new Date(now.getTime() - 24 * 3600_000) }, session: { status: "ended" } },
    data: { reconciledAt: now, error: "transcript unavailable" },
  });
  out.errors += lost.count;

  // Only v2 calls (attempts > 0): pre-v2 rows are history, never settled here.
  const ended = await prisma.voiceSession.findMany({ where: { status: "ended", attempts: { gt: 0 } }, select: { id: true }, orderBy: { createdAt: "asc" }, take: 200 });
  for (const s of ended) if (await settleSession(s.id)) out.settled++;

  await prisma.elevenLabsWebhookEvent.updateMany({
    where: { receivedAt: { lt: new Date(now.getTime() - 7 * 86_400_000) }, NOT: { payload: { equals: {} } } },
    data: { payload: {} },
  });
  return out;
}
