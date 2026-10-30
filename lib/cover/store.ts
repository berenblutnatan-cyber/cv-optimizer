import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { canAfford, charge, InsufficientCredits } from "@/lib/billing/ledger";
import { inventedNumbers } from "@/lib/grounding/numbers";
import { loadResume } from "@/lib/resume/store";
import { letterSources, writeCoverLetter } from "./ai";

// Cover letters for tracked jobs. One credit per letter, charged in the same
// transaction that saves it, after the letter exists: a failed run costs
// nothing. Editing is free; the invented-number flags follow every edit.

export class LetterError extends Error {
  constructor(
    public code: "NOT_FOUND" | "BAD_REQUEST" | "NO_CREDITS",
    message: string,
  ) {
    super(message);
  }
}

export const LETTER_CREDITS = 1;
const MIN_JD = 80;

export type PublicLetter = { id: string; body: string; flags: string[]; updatedAt: string };

const toPublic = (r: { id: string; body: string; flags: unknown; updatedAt: Date }): PublicLetter => ({
  id: r.id,
  body: r.body,
  flags: Array.isArray(r.flags) ? (r.flags as string[]) : [],
  updatedAt: r.updatedAt.toISOString(),
});

async function jobContext(userId: string, jobId: string) {
  const job = await prisma.jobApplication.findFirst({ where: { id: jobId, userId } });
  if (!job) throw new LetterError("NOT_FOUND", "Job not found");
  if (!job.resumeId) throw new LetterError("BAD_REQUEST", "Pick the CV for this job first.");
  const jd = (job.jdText ?? "").trim();
  if (jd.length < MIN_JD) throw new LetterError("BAD_REQUEST", "Add the job description first.");
  const resume = await loadResume(job.resumeId, { userId, anonKeyHash: null });
  if (!resume) throw new LetterError("NOT_FOUND", "CV not found");
  if (resume.doc.content.experience.length === 0) throw new LetterError("BAD_REQUEST", "Add your experience to the CV first.");
  return { job, jd, content: resume.doc.content };
}

export async function createCoverLetter(anthropic: Anthropic, userId: string, jobId: string): Promise<PublicLetter> {
  const { job, jd, content } = await jobContext(userId, jobId);
  // Out of credits: say so before paying for a model call.
  if (!(await canAfford(userId, LETTER_CREDITS))) throw new LetterError("NO_CREDITS", "Out of credits");
  const { body, flags } = await writeCoverLetter(anthropic, { content, jd, jobTitle: job.title, company: job.company });
  try {
    return await prisma.$transaction(async (tx) => {
      const row = await tx.coverLetter.create({
        data: { userId, jobApplicationId: job.id, resumeId: job.resumeId, company: job.company, jobTitle: job.title, body, flags },
      });
      const c = await charge(tx, { userId, reason: "cover_letter", key: `cover:${row.id}`, amount: LETTER_CREDITS, refType: "cover_letter", refId: row.id });
      return toPublic(await tx.coverLetter.update({ where: { id: row.id }, data: { creditsCharged: c.charged } }));
    });
  } catch (err) {
    if (err instanceof InsufficientCredits) throw new LetterError("NO_CREDITS", "Out of credits");
    throw err;
  }
}

/** Save an edited letter; flags are re-checked against the CV and the job post. */
export async function saveLetterBody(userId: string, letterId: string, body: unknown): Promise<PublicLetter> {
  if (typeof body !== "string" || !body.trim()) throw new LetterError("BAD_REQUEST", "The letter is empty.");
  const letter = await prisma.coverLetter.findFirst({ where: { id: letterId, userId }, select: { id: true, jobApplicationId: true, resumeId: true } });
  if (!letter) throw new LetterError("NOT_FOUND", "Not found");
  const job = letter.jobApplicationId ? await prisma.jobApplication.findFirst({ where: { id: letter.jobApplicationId, userId }, select: { jdText: true } }) : null;
  const resume = letter.resumeId ? await loadResume(letter.resumeId, { userId, anonKeyHash: null }) : null;
  const text = body.slice(0, 20000);
  const flags = resume ? inventedNumbers(text, letterSources({ content: resume.doc.content, jd: job?.jdText ?? "" })) : [];
  return toPublic(await prisma.coverLetter.update({ where: { id: letter.id }, data: { body: text, flags } }));
}
