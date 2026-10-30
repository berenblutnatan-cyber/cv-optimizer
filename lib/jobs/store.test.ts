import { localDbUrl } from "@/test/local-db";
import { afterAll, describe, expect, it, vi } from "vitest";
import { randomBytes } from "node:crypto";
import type Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { appendOps, createResume } from "@/lib/resume/store";
import { createCoverLetter, saveLetterBody } from "@/lib/cover/store";
import { createJob, deleteJob, getJob, listJobs, updateJob } from "./store";

const run = localDbUrl() ? describe : describe.skip;
const users: string[] = [];
const rid = () => randomBytes(5).toString("hex");
const JD = "Senior Product Manager, Payments at Globex. Own checkout. 5+ years in B2C, A/B testing, SQL, leading teams of 6.";

async function setup(credits = 2) {
  const userId = `user_jobs_${rid()}`;
  users.push(userId);
  await prisma.user.create({ data: { id: userId, email: `${userId}@test.invalid`, credits } });
  const owner = { userId, anonKeyHash: null };
  const cv = await createResume(owner);
  await appendOps(
    cv.id,
    owner,
    [
      { clientOpId: `t:${rid()}aaaa`, name: "update_personal_info", input: { name: "Dana Levi" } },
      { clientOpId: `t:${rid()}bbbb`, name: "add_experience", input: { company: "Acme", role: "Senior PM", description: ["Lifted checkout conversion 18%", "Ran 14 pricing experiments"] } },
    ],
    "user",
  );
  return { userId, cvId: cv.id };
}

function fakeClaude(paragraphs: string[][]) {
  let call = 0;
  const create = vi.fn(async () => ({
    stop_reason: "end_turn",
    content: [{ type: "text", text: JSON.stringify({ greeting: "Dear Globex team,", paragraphs: paragraphs[Math.min(call++, paragraphs.length - 1)], signoff: "Best regards," }) }],
  }));
  return { client: { beta: { messages: { create } } } as unknown as Anthropic, create };
}

const credits = async (id: string) => (await prisma.user.findUniqueOrThrow({ where: { id } })).credits;

run("jobs tracker (local Postgres)", () => {
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    await prisma.$disconnect();
  });

  it("tracks a job, moves it, stamps the first apply, and lists it", async () => {
    const t = await setup();
    const job = await createJob(t.userId, { company: " Globex ", title: "Senior PM", url: "javascript:alert(1)", resumeId: t.cvId });
    expect(job).toMatchObject({ company: "Globex", title: "Senior PM", stage: "BOOKMARKED", url: null, resumeId: t.cvId, resumeTitle: expect.any(String) });
    const moved = await updateJob(t.userId, job.id, { stage: "APPLIED", nextStep: "Follow up", nextStepAt: "2026-11-10T09:00:00.000Z" });
    expect(moved).toMatchObject({ stage: "APPLIED", nextStep: "Follow up", nextStepAt: "2026-11-10T09:00:00.000Z" });
    const first = (await prisma.jobApplication.findUniqueOrThrow({ where: { id: job.id } })).appliedAt;
    await updateJob(t.userId, job.id, { stage: "INTERVIEWING" });
    await updateJob(t.userId, job.id, { stage: "APPLIED" });
    expect((await prisma.jobApplication.findUniqueOrThrow({ where: { id: job.id } })).appliedAt).toEqual(first);
    expect((await listJobs(t.userId)).map((j) => j.id)).toEqual([job.id]);
  });

  it("refuses bad input and other people's rows", async () => {
    const a = await setup();
    const b = await setup();
    await expect(createJob(a.userId, { company: "", title: "PM" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(createJob(a.userId, { company: "X", title: "PM", resumeId: b.cvId })).rejects.toMatchObject({ code: "NOT_FOUND" });
    const job = await createJob(a.userId, { company: "Globex", title: "PM" });
    await expect(updateJob(a.userId, job.id, { stage: "HIRED" as never })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(updateJob(a.userId, job.id, { title: "  " })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(updateJob(b.userId, job.id, { stage: "OFFER" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(getJob(b.userId, job.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(deleteJob(b.userId, job.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await deleteJob(a.userId, job.id);
    expect(await listJobs(a.userId)).toEqual([]);
  });

  it("a tailoring run becomes a tracked job once, with its CV, job post and fit", async () => {
    const t = await setup();
    const tl = await prisma.tailoring.create({
      data: { userId: t.userId, resumeId: t.cvId, jobTitle: "Senior PM", company: "Globex", jdText: JD, jdHash: "h", analysis: {}, scoreOriginal: 72, scoreOptimized: 88, baseHash: "b" },
    });
    const job = await createJob(t.userId, { fromTailoringId: tl.id });
    expect(job).toMatchObject({ company: "Globex", title: "Senior PM", resumeId: t.cvId, score: 72 });
    expect((await createJob(t.userId, { fromTailoringId: tl.id })).id).toBe(job.id);
    expect(await prisma.jobApplication.count({ where: { userId: t.userId } })).toBe(1);
    const detail = await getJob(t.userId, job.id);
    expect(detail.jdText).toBe(JD);
    expect(detail.tailorings.map((x) => x.id)).toEqual([tl.id]);
  });

  it("writes a cover letter for one credit, keeping only CV-backed numbers", async () => {
    const t = await setup(1);
    const job = await createJob(t.userId, { company: "Globex", title: "Senior PM", resumeId: t.cvId, jdText: JD });
    // First draft invents "30%"; the rewrite drops it.
    const f = fakeClaude([
      ["Checkout is where Globex wins or loses.", "At Acme I lifted checkout conversion 30% by rebuilding the flow."],
      ["Checkout is where Globex wins or loses.", "At Acme I lifted checkout conversion 18% and ran 14 pricing experiments."],
    ]);
    const letter = await createCoverLetter(f.client, t.userId, job.id);
    expect(f.create).toHaveBeenCalledTimes(2);
    expect(letter.flags).toEqual([]);
    expect(letter.body).toContain("18%");
    expect(letter.body.endsWith("Best regards,\nDana Levi")).toBe(true);
    expect(await credits(t.userId)).toBe(0);
    expect((await getJob(t.userId, job.id)).letter?.id).toBe(letter.id);

    // Editing is free and re-checks the numbers.
    const edited = await saveLetterBody(t.userId, letter.id, letter.body.replace("18%", "40%"));
    expect(edited.flags).toEqual(["40%"]);
    expect(await credits(t.userId)).toBe(0);
  });

  it("no letter, no charge: missing CV or job post, out of credits, or a failed run", async () => {
    const t = await setup(1);
    const noCv = await createJob(t.userId, { company: "Globex", title: "PM", jdText: JD });
    await expect(createCoverLetter(fakeClaude([["a", "b"]]).client, t.userId, noCv.id)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    const noJd = await createJob(t.userId, { company: "Globex", title: "PM", resumeId: t.cvId });
    await expect(createCoverLetter(fakeClaude([["a", "b"]]).client, t.userId, noJd.id)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    const ok = await createJob(t.userId, { company: "Globex", title: "PM", resumeId: t.cvId, jdText: JD });
    const broken = { beta: { messages: { create: async () => { throw new Error("model down"); } } } } as unknown as Anthropic;
    await expect(createCoverLetter(broken, t.userId, ok.id)).rejects.toThrow("model down");
    expect(await credits(t.userId)).toBe(1);

    const broke = await setup(0);
    const job = await createJob(broke.userId, { company: "Globex", title: "PM", resumeId: broke.cvId, jdText: JD });
    const f = fakeClaude([["a", "b"]]);
    await expect(createCoverLetter(f.client, broke.userId, job.id)).rejects.toMatchObject({ code: "NO_CREDITS" });
    expect(f.create).not.toHaveBeenCalled();
    expect(await prisma.coverLetter.count({ where: { userId: { in: [t.userId, broke.userId] } } })).toBe(0);
  });
});
