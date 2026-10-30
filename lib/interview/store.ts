import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { canAfford, charge, InsufficientCredits, refundCharge } from "@/lib/billing/ledger";
import { hasActiveSubscription } from "@/lib/subscription";
import { appendOps, createVersion, loadResume } from "@/lib/resume/store";
import { unlimitedSecondsUsed } from "@/lib/voice/sessions";
import { VOICE } from "@/lib/voice/protocol";
import type { Owner } from "@/lib/resume/owner-types";
import type { DeepAnalysis } from "@/lib/optimizer/types";
import { generateQuestions, scoreInterview } from "./ai";
import { answersFromTranscript, cleanTypedAnswers, INTERVIEW, type InterviewAnswer, type InterviewQuestion, type InterviewReport } from "./types";

// Interview practice sessions.
//
// Lifecycle: ready (questions written, credit charged) → live (voice
// connected) → scoring → done. Text mode goes ready → scoring → done. A
// session with nothing answered is failed and refunded. Scoring runs once:
// whoever claims it first (finish, the webhook, the cron) does it.

export class InterviewError extends Error {
  constructor(
    public code: "NOT_FOUND" | "BAD_REQUEST" | "EXPIRED" | "NO_CREDITS" | "EMPTY_CV",
    message: string,
  ) {
    super(message);
  }
}

const userOwner = (userId: string): Owner => ({ userId, anonKeyHash: null });
const chargeKey = (id: string) => `interview:${id}`;
const CLAIM_TTL_MS = 5 * 60_000;

export type InterviewRow = Prisma.InterviewSessionGetPayload<object>;

export function publicInterview(r: InterviewRow) {
  return {
    id: r.id,
    resumeId: r.resumeId,
    tailoringId: r.tailoringId,
    jobTitle: r.jobTitle,
    company: r.company,
    mode: r.mode as "voice" | "text",
    status: r.status as "ready" | "live" | "scoring" | "done" | "failed",
    questions: r.questions as unknown as InterviewQuestion[],
    answers: r.answers as unknown as InterviewAnswer[],
    report: (r.report as unknown as InterviewReport | null) ?? null,
    appliedAdds: r.appliedAdds,
    refunded: r.refunded,
    error: r.error,
    createdAt: r.createdAt.toISOString(),
  };
}
export type PublicInterview = ReturnType<typeof publicInterview>;

/** Write the questions, then save the session and charge for it in one transaction. */
export async function createInterview(
  anthropic: Anthropic,
  userId: string,
  p: { resumeId: string; tailoringId?: string | null; jd?: string; jobTitle?: string; company?: string; mode: "voice" | "text" },
): Promise<InterviewRow> {
  const resume = await loadResume(p.resumeId, userOwner(userId));
  if (!resume) throw new InterviewError("NOT_FOUND", "CV not found");
  if (resume.doc.content.experience.length === 0) throw new InterviewError("EMPTY_CV", "Add your experience first.");

  let jd = (p.jd ?? "").trim();
  let jobTitle = (p.jobTitle ?? "").trim();
  let company = (p.company ?? "").trim();
  let analysis: DeepAnalysis | null = null;
  let tailoringId: string | null = null;
  if (p.tailoringId) {
    const t = await prisma.tailoring.findFirst({ where: { id: p.tailoringId, userId, resumeId: p.resumeId } });
    if (!t) throw new InterviewError("NOT_FOUND", "Job not found");
    jd = t.jdText;
    jobTitle = jobTitle || t.jobTitle;
    company = company || t.company;
    analysis = t.analysis as unknown as DeepAnalysis;
    tailoringId = t.id;
  }
  if (jd.length < 80) throw new InterviewError("BAD_REQUEST", "Paste the full job description.");

  // Out of credits: say so before paying for a model call.
  const overFairUse = p.mode === "voice" && (await unlimitedSecondsUsed(prisma, userId)) >= VOICE.unlimitedSecondsPer30d;
  if (!(await canAfford(userId, INTERVIEW.credits, { ignoreUnlimited: overFairUse }))) throw new InterviewError("NO_CREDITS", "Out of credits");

  // Before charging: a failed question run costs nothing.
  const questions = await generateQuestions(anthropic, { content: resume.doc.content, jd, jobTitle, company, analysis });

  try {
    return await prisma.$transaction(async (tx) => {
      const row = await tx.interviewSession.create({
        data: {
          userId,
          resumeId: p.resumeId,
          tailoringId,
          jobTitle: jobTitle.slice(0, 200),
          company: company.slice(0, 200),
          jdText: jd.slice(0, 30_000),
          mode: p.mode,
          questions: questions as unknown as Prisma.InputJsonValue,
        },
      });
      // Unlimited covers voice practice up to the shared fair-use pool, then it costs a credit.
      const user = await tx.user.findUnique({ where: { id: userId } });
      const overFairUse = p.mode === "voice" && !!user && hasActiveSubscription(user) && (await unlimitedSecondsUsed(tx, userId)) >= VOICE.unlimitedSecondsPer30d;
      const c = await charge(tx, {
        userId,
        reason: "interview",
        key: chargeKey(row.id),
        amount: INTERVIEW.credits,
        ignoreUnlimited: overFairUse,
        refType: "interview",
        refId: row.id,
      });
      return tx.interviewSession.update({ where: { id: row.id }, data: { creditsCharged: c.charged } });
    });
  } catch (err) {
    if (err instanceof InsufficientCredits) throw new InterviewError("NO_CREDITS", "Out of credits");
    throw err;
  }
}

export async function getInterview(userId: string, id: string): Promise<InterviewRow> {
  const r = await prisma.interviewSession.findFirst({ where: { id, userId } });
  if (!r) throw new InterviewError("NOT_FOUND", "Not found");
  return r;
}

export async function listInterviews(userId: string) {
  const rows = await prisma.interviewSession.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 50 });
  return rows.map((r) => ({
    id: r.id,
    resumeId: r.resumeId,
    jobTitle: r.jobTitle,
    company: r.company,
    mode: r.mode,
    status: r.status,
    overall: (r.report as unknown as InterviewReport | null)?.overall ?? null,
    createdAt: r.createdAt.toISOString(),
  }));
}

export function remainingSeconds(r: Pick<InterviewRow, "startedAt">, now = new Date()): number {
  if (!r.startedAt) return INTERVIEW.maxSeconds;
  return Math.max(0, INTERVIEW.maxSeconds - Math.floor((now.getTime() - r.startedAt.getTime()) / 1000));
}

/** The next voice connection (first or a reconnect), on the session's one clock. */
export async function reserveVoiceAttempt(userId: string, id: string): Promise<{ row: InterviewRow; attempt: number }> {
  return prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "InterviewSession" WHERE "id" = ${id} AND "userId" = ${userId} FOR UPDATE`;
    if (!locked[0]) throw new InterviewError("NOT_FOUND", "Not found");
    const r = await tx.interviewSession.findUniqueOrThrow({ where: { id } });
    if (r.mode !== "voice") throw new InterviewError("BAD_REQUEST", "This practice is typed");
    if (r.status !== "ready" && r.status !== "live") throw new InterviewError("EXPIRED", "This practice has ended");
    if (r.attempts >= INTERVIEW.maxAttempts) throw new InterviewError("EXPIRED", "Couldn't reconnect");
    if (remainingSeconds(r) < 20) throw new InterviewError("EXPIRED", "Time's up");
    const row = await tx.interviewSession.update({ where: { id }, data: { attempts: { increment: 1 } } });
    return { row, attempt: r.attempts };
  });
}

export async function connectInterview(userId: string, id: string, conversationId: string): Promise<void> {
  if (!/^[A-Za-z0-9_-]{6,80}$/.test(conversationId)) throw new InterviewError("BAD_REQUEST", "Bad conversation id");
  const res = await prisma.$executeRaw`
    UPDATE "InterviewSession"
    SET "status" = 'live',
        "startedAt" = COALESCE("startedAt", NOW()),
        "conversationIds" = CASE WHEN ${conversationId} = ANY("conversationIds") THEN "conversationIds" ELSE array_append("conversationIds", ${conversationId}) END,
        "updatedAt" = NOW()
    WHERE "id" = ${id} AND "userId" = ${userId} AND "status" IN ('ready', 'live') AND cardinality("conversationIds") < ${INTERVIEW.maxAttempts}`;
  if (res === 0) throw new InterviewError("EXPIRED", "This practice has ended");
}

/**
 * The webhook saw a call the browser never reported (it crashed right after
 * connecting): record it so its transcript is scored too.
 */
export async function recordInterviewConversation(id: string, conversationId: string, attempt: number | null): Promise<boolean> {
  if (!/^[A-Za-z0-9_-]{6,80}$/.test(conversationId)) return false;
  const res = await prisma.$executeRaw`
    UPDATE "InterviewSession"
    SET "conversationIds" = array_append("conversationIds", ${conversationId}),
        "status" = CASE WHEN "status" = 'ready' THEN 'live' ELSE "status" END,
        "startedAt" = COALESCE("startedAt", NOW()),
        "updatedAt" = NOW()
    WHERE "id" = ${id}
      AND "status" IN ('ready', 'live', 'scoring')
      AND NOT (${conversationId} = ANY("conversationIds"))
      AND cardinality("conversationIds") < ${INTERVIEW.maxAttempts}
      AND ${attempt ?? -1} >= 0 AND ${attempt ?? -1} < "attempts"`;
  return res > 0;
}

/** Where a session stands for the scoring retry loop. */
export async function interviewStatus(id: string): Promise<string | null> {
  const r = await prisma.interviewSession.findUnique({ where: { id }, select: { status: true } });
  return r?.status ?? null;
}

/** Typed answers: saved, then scored now. */
export async function submitTypedAnswers(anthropic: Anthropic, userId: string, id: string, raw: unknown): Promise<InterviewRow> {
  const r = await getInterview(userId, id);
  if (r.mode !== "text") throw new InterviewError("BAD_REQUEST", "This practice is by voice");
  if (r.status !== "ready") throw new InterviewError("EXPIRED", "Already submitted");
  const answers = cleanTypedAnswers(raw, (r.questions as unknown as InterviewQuestion[]).length);
  await prisma.interviewSession.updateMany({
    where: { id, status: "ready" },
    data: { answers: answers as unknown as Prisma.InputJsonValue, status: "scoring" },
  });
  await scoreSession(anthropic, id, null);
  return getInterview(userId, id);
}

/** The browser hung up: from here the transcript decides. */
export async function finishVoice(userId: string, id: string): Promise<InterviewRow> {
  const r = await getInterview(userId, id);
  if (r.status === "ready" && r.conversationIds.length === 0) {
    // Never connected: nothing to score, nothing owed.
    await failAndRefund(id, "never connected");
    return getInterview(userId, id);
  }
  if (r.status === "ready" || r.status === "live") {
    const elapsed = r.startedAt ? Math.floor((Date.now() - r.startedAt.getTime()) / 1000) : 0;
    await prisma.interviewSession.updateMany({
      where: { id, status: { in: ["ready", "live"] } },
      data: { status: "scoring", durationSec: Math.min(3600, Math.max(0, elapsed)) },
    });
  }
  return getInterview(userId, id);
}

async function failAndRefund(id: string, error: string) {
  await prisma.$transaction(async (tx) => {
    await refundCharge(tx, chargeKey(id));
    await tx.interviewSession.update({ where: { id }, data: { status: "failed", refunded: true, error, scoringClaimedAt: null } });
  });
}

export type TranscriptFetch = (conversationId: string) => Promise<{ final: boolean; transcript: unknown } | null>;

/**
 * Score a session in "scoring", exactly once. Voice: every connection's
 * transcript must be final first (otherwise it stays in scoring for the next
 * caller). Nothing answered → failed + refunded.
 */
export async function scoreSession(anthropic: Anthropic, id: string, fetchTranscript: TranscriptFetch | null): Promise<"done" | "failed" | "pending" | "skipped"> {
  const now = new Date();
  const claimed = await prisma.interviewSession.updateMany({
    where: { id, status: "scoring", OR: [{ scoringClaimedAt: null }, { scoringClaimedAt: { lt: new Date(now.getTime() - CLAIM_TTL_MS) } }] },
    data: { scoringClaimedAt: now },
  });
  if (claimed.count === 0) return "skipped";
  const r = await prisma.interviewSession.findUniqueOrThrow({ where: { id } });
  const questions = r.questions as unknown as InterviewQuestion[];

  try {
    let answers = r.answers as unknown as InterviewAnswer[];
    if (r.mode === "voice") {
      if (!fetchTranscript) {
        await prisma.interviewSession.update({ where: { id }, data: { scoringClaimedAt: null } });
        return "pending";
      }
      const merged = new Map<number, string[]>();
      for (const cid of r.conversationIds) {
        const t = await fetchTranscript(cid);
        if (!t || !t.final) {
          await prisma.interviewSession.update({ where: { id }, data: { scoringClaimedAt: null } });
          return "pending";
        }
        for (const a of answersFromTranscript(t.transcript, questions.length)) merged.set(a.index, [...(merged.get(a.index) ?? []), a.text]);
      }
      answers = [...merged.entries()].sort((a, b) => a[0] - b[0]).map(([index, parts]) => ({ index, text: parts.join(" ") }));
    }
    const real = answers.filter((a) => a.text.length >= INTERVIEW.minAnswerChars);
    if (real.length === 0) {
      await failAndRefund(id, "nothing answered");
      return "failed";
    }
    const resume = r.resumeId ? await loadResume(r.resumeId, userOwner(r.userId)) : null;
    const content = resume?.doc.content;
    if (!content) {
      await failAndRefund(id, "CV deleted");
      return "failed";
    }
    const report = await scoreInterview(anthropic, { content, jd: r.jdText, jobTitle: r.jobTitle, questions, answers: real });
    await prisma.interviewSession.update({
      where: { id },
      data: { answers: real as unknown as Prisma.InputJsonValue, report: report as unknown as Prisma.InputJsonValue, status: "done", scoringClaimedAt: null, error: null },
    });
    return "done";
  } catch (err) {
    // Leave it in scoring for a retry; record why.
    await prisma.interviewSession.update({ where: { id }, data: { scoringClaimedAt: null, error: String((err as Error).message ?? err).slice(0, 300) } });
    throw err;
  }
}

/**
 * Put a fact from the interview on the CV: the debrief's bullet, appended to
 * the role it belongs to (found by company + role, so a reordered CV is fine).
 */
export async function applyAddToCv(userId: string, id: string, index: number) {
  const r = await getInterview(userId, id);
  const report = r.report as unknown as InterviewReport | null;
  const add = report?.answers.find((a) => a.index === index)?.addToCv;
  if (!add || !r.resumeId) throw new InterviewError("BAD_REQUEST", "Nothing to add");
  if (r.appliedAdds.includes(index)) throw new InterviewError("BAD_REQUEST", "Already on your CV");
  const owner = userOwner(userId);
  const resume = await loadResume(r.resumeId, owner);
  if (!resume) throw new InterviewError("NOT_FOUND", "CV not found");
  const exp = resume.doc.content.experience;
  const at = exp[add.experienceIndex]?.company === add.company && exp[add.experienceIndex]?.role === add.role ? add.experienceIndex : exp.findIndex((e) => e.company === add.company && e.role === add.role);
  if (at < 0) throw new InterviewError("BAD_REQUEST", `${add.role} at ${add.company} isn't on your CV anymore`);
  const result = await appendOps(
    r.resumeId,
    owner,
    [{ clientOpId: `iv:${id}:${index}`, name: "update_experience", input: { index: at, description: [...(exp[at].description ?? []), add.bullet] } }],
    "user",
  );
  // The op is idempotent on its id; the claim decides which request saves the version.
  const claimed = await prisma.$executeRaw`
    UPDATE "InterviewSession" SET "appliedAdds" = array_append("appliedAdds", ${index}), "updatedAt" = NOW()
    WHERE "id" = ${id} AND NOT (${index} = ANY("appliedAdds"))`;
  if (claimed === 0) return { doc: result.doc, lastSeq: result.lastSeq, version: null };
  const version = await createVersion(r.resumeId, owner, { label: "From interview practice", createdBy: "user" });
  return { doc: result.doc, lastSeq: result.lastSeq, version: { id: version.id, number: version.number } };
}

/**
 * Cron re-drive: voice sessions stuck in scoring (the browser vanished, or the
 * transcript wasn't final yet), live sessions past their time, and ready voice
 * sessions that never connected.
 */
export async function drainInterviews(anthropic: Anthropic, fetchTranscript: TranscriptFetch | null, now = new Date(), budgetMs = 200_000) {
  const deadline = Date.now() + budgetMs;
  const out = { scored: 0, failed: 0, pending: 0, closed: 0 };
  const overdue = await prisma.interviewSession.findMany({
    where: { status: "live", startedAt: { lt: new Date(now.getTime() - (INTERVIEW.maxSeconds + 300) * 1000) } },
    select: { id: true },
    take: 100,
  });
  for (const o of overdue) {
    const res = await prisma.interviewSession.updateMany({ where: { id: o.id, status: "live" }, data: { status: "scoring", durationSec: INTERVIEW.maxSeconds } });
    out.closed += res.count;
  }
  // Paid for, then never started (a week to come back): refunded.
  const never = await prisma.interviewSession.findMany({
    where: { status: "ready", conversationIds: { isEmpty: true }, createdAt: { lt: new Date(now.getTime() - 7 * 86_400_000) } },
    select: { id: true },
    take: 100,
  });
  for (const n of never) {
    await failAndRefund(n.id, "never started");
    out.failed++;
  }
  const scoring = await prisma.interviewSession.findMany({ where: { status: "scoring" }, select: { id: true }, take: 30 });
  for (const s of scoring) {
    // Scoring takes about a minute: stop starting new ones near the time limit.
    if (Date.now() > deadline) break;
    try {
      const res = await scoreSession(anthropic, s.id, fetchTranscript);
      if (res === "done") out.scored++;
      else if (res === "failed") out.failed++;
      else if (res === "pending") out.pending++;
    } catch (err) {
      console.error("[interview drain]", s.id, err);
    }
  }
  return out;
}
