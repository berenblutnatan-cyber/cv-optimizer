import { localDbUrl } from "@/test/local-db";
import { afterAll, describe, expect, it, vi } from "vitest";
import { randomBytes } from "node:crypto";
import type Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { appendOps, createResume, loadResume } from "@/lib/resume/store";
import type { Owner } from "@/lib/resume/owner-types";
import { QUESTION_MODEL } from "./ai";
import {
  applyAddToCv,
  connectInterview,
  createInterview,
  drainInterviews,
  finishVoice,
  getInterview,
  recordInterviewConversation,
  reserveVoiceAttempt,
  scoreSession,
  submitTypedAnswers,
} from "./store";

const run = localDbUrl() ? describe : describe.skip;
const users: string[] = [];
const rid = () => randomBytes(5).toString("hex");
const JD = "Senior Product Manager, Payments. Own checkout. 5+ years B2C, A/B testing, SQL. ".repeat(3);
const QUESTIONS = { questions: [1, 2, 3, 4, 5].map((n) => ({ text: `Question ${n}: tell me about checkout?`, kind: n === 1 ? "opener" : "behavioral", focus: "checkout" })) };
const ANSWER0 = "At Acme I cut checkout drop-off by 18 percent with a one-page flow I designed and tested.";

/** A stand-in for Claude: questions for the question model, a debrief for the scorer. */
function fakeClaude(opts: { failQuestions?: boolean; scoringDelayMs?: number } = {}) {
  const create = vi.fn(async (p: { model: string }) => {
    if (p.model === QUESTION_MODEL) {
      if (opts.failQuestions) throw new Error("model down");
      return { stop_reason: "end_turn", content: [{ type: "text", text: JSON.stringify(QUESTIONS) }] };
    }
    if (opts.scoringDelayMs) await new Promise((r) => setTimeout(r, opts.scoringDelayMs));
    return {
      stop_reason: "end_turn",
      content: [
        {
          type: "text",
          text: JSON.stringify({
            overall: 64,
            summary: "Strong numbers; answer the question asked.",
            answers: [{ index: 0, score: 7, worked: ["Clear result"], missing: ["Your own role"], stronger: "I led…", addToCv: { experienceIndex: 0, bullet: "Cut checkout drop-off 18% with a one-page flow", quote: "cut checkout drop-off by 18 percent" } }],
          }),
        },
      ],
    };
  });
  return { client: { beta: { messages: { create } } } as unknown as Anthropic, create };
}

async function setup(credits = 2) {
  const userId = `user_iv_${rid()}`;
  users.push(userId);
  await prisma.user.create({ data: { id: userId, email: `${userId}@test.invalid`, credits } });
  const owner: Owner = { userId, anonKeyHash: null };
  const cv = await createResume(owner);
  await appendOps(cv.id, owner, [{ clientOpId: `t:${rid()}aaaa`, name: "add_experience", input: { company: "Acme", role: "Senior PM", description: ["Owned onboarding"] } }], "user");
  return { userId, owner, cvId: cv.id };
}
const credits = async (id: string) => (await prisma.user.findUniqueOrThrow({ where: { id } })).credits;
const transcript = (answer: string) => [
  { role: "agent", message: "Q1", tool_calls: [{ tool_name: "begin_question", params_as_json: '{"number":1}' }] },
  { role: "user", message: answer },
];

run("interview store (local Postgres)", () => {
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    await prisma.$disconnect();
  });

  it("writes questions, then saves and charges one credit together", async () => {
    const t = await setup(2);
    const row = await createInterview(fakeClaude().client, t.userId, { resumeId: t.cvId, jd: JD, jobTitle: "Senior PM", company: "Globex", mode: "text" });
    expect(row).toMatchObject({ status: "ready", creditsCharged: 1, company: "Globex" });
    expect(row.questions).toHaveLength(5);
    expect(await credits(t.userId)).toBe(1);
  });

  it("charges nothing when the questions fail, when out of credits, or with a short JD", async () => {
    const t = await setup(1);
    await expect(createInterview(fakeClaude({ failQuestions: true }).client, t.userId, { resumeId: t.cvId, jd: JD, mode: "text" })).rejects.toThrow("model down");
    await expect(createInterview(fakeClaude().client, t.userId, { resumeId: t.cvId, jd: "too short", mode: "text" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(await credits(t.userId)).toBe(1);
    const broke = await setup(0);
    await expect(createInterview(fakeClaude().client, broke.userId, { resumeId: broke.cvId, jd: JD, mode: "text" })).rejects.toMatchObject({ code: "NO_CREDITS" });
    expect(await prisma.interviewSession.count({ where: { userId: { in: [t.userId, broke.userId] } } })).toBe(0);
  });

  it("someone else's CV is not found", async () => {
    const a = await setup(2);
    const b = await setup(2);
    await expect(createInterview(fakeClaude().client, b.userId, { resumeId: a.cvId, jd: JD, mode: "text" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("typed: scores the answers once, unanswered questions are 0", async () => {
    const t = await setup(2);
    const f = fakeClaude();
    const row = await createInterview(f.client, t.userId, { resumeId: t.cvId, jd: JD, mode: "text" });
    const done = await submitTypedAnswers(f.client, t.userId, row.id, [{ index: 0, text: ANSWER0 }]);
    expect(done.status).toBe("done");
    const report = done.report as { overall: number; answers: { score: number }[] };
    expect(report.overall).toBe(64);
    expect(report.answers.map((a) => a.score)).toEqual([7, 0, 0, 0, 0]);
    await expect(submitTypedAnswers(f.client, t.userId, row.id, [{ index: 0, text: ANSWER0 }])).rejects.toMatchObject({ code: "EXPIRED" });
  });

  it("typed with nothing real answered: failed and refunded", async () => {
    const t = await setup(1);
    const f = fakeClaude();
    const row = await createInterview(f.client, t.userId, { resumeId: t.cvId, jd: JD, mode: "text" });
    expect(await credits(t.userId)).toBe(0);
    const r = await submitTypedAnswers(f.client, t.userId, row.id, [{ index: 0, text: "idk" }]);
    expect(r).toMatchObject({ status: "failed", refunded: true });
    expect(await credits(t.userId)).toBe(1);
  });

  it("voice: waits for every transcript to be final, then scores exactly once", async () => {
    const t = await setup(2);
    const f = fakeClaude({ scoringDelayMs: 50 });
    const row = await createInterview(f.client, t.userId, { resumeId: t.cvId, jd: JD, mode: "voice" });
    await reserveVoiceAttempt(t.userId, row.id);
    await connectInterview(t.userId, row.id, "conv_aaaaaa1");
    await connectInterview(t.userId, row.id, "conv_aaaaaa1"); // repeated report: counted once
    await reserveVoiceAttempt(t.userId, row.id);
    await connectInterview(t.userId, row.id, "conv_bbbbbb2");
    expect((await getInterview(t.userId, row.id)).conversationIds).toEqual(["conv_aaaaaa1", "conv_bbbbbb2"]);
    expect((await finishVoice(t.userId, row.id)).status).toBe("scoring");

    let final = false;
    const fetch = vi.fn(async (cid: string) => ({ final: cid === "conv_aaaaaa1" || final, transcript: cid === "conv_aaaaaa1" ? transcript(ANSWER0) : [] }));
    expect(await scoreSession(f.client, row.id, fetch)).toBe("pending");
    expect((await getInterview(t.userId, row.id)).scoringClaimedAt).toBeNull();

    final = true;
    // Another worker holds the claim: this one stands back. (The claim is one
    // conditional UPDATE; true concurrency can't run here, the local database
    // takes one connection at a time.)
    await prisma.interviewSession.update({ where: { id: row.id }, data: { scoringClaimedAt: new Date() } });
    expect(await scoreSession(f.client, row.id, fetch)).toBe("skipped");
    // A claim older than its time-to-live is a crashed worker: taken over.
    await prisma.interviewSession.update({ where: { id: row.id }, data: { scoringClaimedAt: new Date(Date.now() - 6 * 60_000) } });
    expect(await scoreSession(f.client, row.id, fetch)).toBe("done");
    // Done is final: a late webhook or cron run scores nothing again.
    expect(await scoreSession(f.client, row.id, fetch)).toBe("skipped");
    const scorerCalls = f.create.mock.calls.filter((c) => c[0].model !== QUESTION_MODEL);
    expect(scorerCalls).toHaveLength(1);
    expect((await getInterview(t.userId, row.id)).answers).toEqual([{ index: 0, text: ANSWER0 }]);
  });

  it("voice never connected: finishing refunds it", async () => {
    const t = await setup(1);
    const row = await createInterview(fakeClaude().client, t.userId, { resumeId: t.cvId, jd: JD, mode: "voice" });
    expect(await finishVoice(t.userId, row.id)).toMatchObject({ status: "failed", refunded: true });
    expect(await credits(t.userId)).toBe(1);
    await expect(reserveVoiceAttempt(t.userId, row.id)).rejects.toMatchObject({ code: "EXPIRED" });
  });

  it("caps connections and refuses a typed session", async () => {
    const t = await setup(3);
    const voice = await createInterview(fakeClaude().client, t.userId, { resumeId: t.cvId, jd: JD, mode: "voice" });
    for (let i = 0; i < 4; i++) await reserveVoiceAttempt(t.userId, voice.id);
    await expect(reserveVoiceAttempt(t.userId, voice.id)).rejects.toMatchObject({ code: "EXPIRED" });
    const text = await createInterview(fakeClaude().client, t.userId, { resumeId: t.cvId, jd: JD, mode: "text" });
    await expect(reserveVoiceAttempt(t.userId, text.id)).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("the webhook records a call the browser never reported, only for a reserved attempt", async () => {
    const t = await setup(2);
    const row = await createInterview(fakeClaude().client, t.userId, { resumeId: t.cvId, jd: JD, mode: "voice" });
    expect(await recordInterviewConversation(row.id, "conv_ghost01", 0)).toBe(false); // no attempt reserved yet
    await reserveVoiceAttempt(t.userId, row.id);
    expect(await recordInterviewConversation(row.id, "conv_ghost01", 0)).toBe(true);
    expect(await recordInterviewConversation(row.id, "conv_ghost01", 0)).toBe(false); // once
    expect(await getInterview(t.userId, row.id)).toMatchObject({ status: "live", conversationIds: ["conv_ghost01"] });
  });

  it("adds a debrief fact to the CV once, with one version", async () => {
    const t = await setup(2);
    const f = fakeClaude();
    const row = await createInterview(f.client, t.userId, { resumeId: t.cvId, jd: JD, mode: "text" });
    await submitTypedAnswers(f.client, t.userId, row.id, [{ index: 0, text: ANSWER0 }]);
    const a = await applyAddToCv(t.userId, row.id, 0);
    expect(a.doc.content.experience[0].description).toEqual(["Owned onboarding", "Cut checkout drop-off 18% with a one-page flow"]);
    expect(a.version).toMatchObject({ number: 1 });
    const cv = await loadResume(t.cvId, t.owner);
    expect(cv!.doc.content.experience[0].description).toEqual(["Owned onboarding", "Cut checkout drop-off 18% with a one-page flow"]);
    expect(await prisma.resumeVersion.count({ where: { resumeId: t.cvId, label: "From interview practice" } })).toBe(1);
    await expect(applyAddToCv(t.userId, row.id, 0)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(applyAddToCv(t.userId, row.id, 1)).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("the cron closes abandoned calls, refunds untouched sessions, and scores what waits", async () => {
    const t = await setup(3);
    const f = fakeClaude();
    const live = await createInterview(f.client, t.userId, { resumeId: t.cvId, jd: JD, mode: "voice" });
    await reserveVoiceAttempt(t.userId, live.id);
    await connectInterview(t.userId, live.id, "conv_cron001");
    await prisma.interviewSession.update({ where: { id: live.id }, data: { startedAt: new Date(Date.now() - 3600_000) } });
    const stale = await createInterview(f.client, t.userId, { resumeId: t.cvId, jd: JD, mode: "voice" });
    await prisma.interviewSession.update({ where: { id: stale.id }, data: { createdAt: new Date(Date.now() - 8 * 86_400_000) } });
    expect(await credits(t.userId)).toBe(1);

    const out = await drainInterviews(f.client, async () => ({ final: true, transcript: transcript(ANSWER0) }));
    expect(out.closed).toBeGreaterThanOrEqual(1);
    expect(await getInterview(t.userId, live.id)).toMatchObject({ status: "done", durationSec: 900 });
    expect(await getInterview(t.userId, stale.id)).toMatchObject({ status: "failed", refunded: true });
    expect(await credits(t.userId)).toBe(2);
  });
});
