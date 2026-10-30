import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { InterviewReport } from "@/lib/interview/types";
import { isStage, type JobDetail, type JobPatch, type JobStage, type JobSummary } from "./types";

// The jobs tracker. Rows are the legacy JobApplication table (the old
// /applications page reads them too), grown with the CV used and a next step.
// A job collects what was done for it: tailorings (linked by
// jobApplicationId), the interviews run on those, and its cover letter.

export class JobError extends Error {
  constructor(
    public code: "NOT_FOUND" | "BAD_REQUEST",
    message: string,
  ) {
    super(message);
  }
}

const str = (v: unknown, max: number): string | null => {
  if (typeof v !== "string") return null;
  const t = v.trim().slice(0, max);
  return t || null;
};

const summarySelect = {
  id: true,
  company: true,
  title: true,
  status: true,
  url: true,
  location: true,
  resumeId: true,
  nextStep: true,
  nextStepAt: true,
  updatedAt: true,
  resume: { select: { title: true } },
  tailorings: { orderBy: { createdAt: "desc" }, take: 1, select: { scoreOriginal: true } },
} satisfies Prisma.JobApplicationSelect;

type SummaryRow = Prisma.JobApplicationGetPayload<{ select: typeof summarySelect }>;

function toSummary(r: SummaryRow): JobSummary {
  return {
    id: r.id,
    company: r.company,
    title: r.title,
    stage: isStage(r.status) ? r.status : "BOOKMARKED",
    url: r.url,
    location: r.location,
    resumeId: r.resumeId,
    resumeTitle: r.resumeId ? r.resume?.title || "Untitled CV" : null,
    score: r.tailorings[0]?.scoreOriginal ?? null,
    nextStep: r.nextStep,
    nextStepAt: r.nextStepAt?.toISOString() ?? null,
    updatedAt: r.updatedAt.toISOString(),
  };
}

export async function listJobs(userId: string): Promise<JobSummary[]> {
  const rows = await prisma.jobApplication.findMany({ where: { userId }, orderBy: { updatedAt: "desc" }, take: 500, select: summarySelect });
  return rows.map(toSummary);
}

export async function getJob(userId: string, id: string): Promise<JobDetail> {
  const r = await prisma.jobApplication.findFirst({
    where: { id, userId },
    select: {
      ...summarySelect,
      jdText: true,
      salary: true,
      notes: true,
      appliedAt: true,
      tailorings: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, resumeId: true, scoreOriginal: true, scoreOptimized: true, createdAt: true, interviews: { select: { id: true, status: true, mode: true, report: true, createdAt: true } } },
      },
      coverLetters: { orderBy: { updatedAt: "desc" }, take: 1, select: { id: true, body: true, flags: true, updatedAt: true } },
    },
  });
  if (!r) throw new JobError("NOT_FOUND", "Not found");
  const letter = r.coverLetters[0];
  return {
    ...toSummary({ ...r, tailorings: r.tailorings.slice(0, 1) }),
    jdText: r.jdText,
    salary: r.salary,
    notes: r.notes,
    appliedAt: r.appliedAt?.toISOString() ?? null,
    tailorings: r.tailorings.map((t) => ({ id: t.id, resumeId: t.resumeId, scoreOriginal: t.scoreOriginal, scoreOptimized: t.scoreOptimized, createdAt: t.createdAt.toISOString() })),
    interviews: r.tailorings
      .flatMap((t) => t.interviews)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((i) => ({ id: i.id, status: i.status, mode: i.mode, overall: (i.report as unknown as InterviewReport | null)?.overall ?? null, createdAt: i.createdAt.toISOString() })),
    letter: letter ? { id: letter.id, body: letter.body, flags: Array.isArray(letter.flags) ? (letter.flags as string[]) : [], updatedAt: letter.updatedAt.toISOString() } : null,
  };
}

async function ownsResume(userId: string, resumeId: string): Promise<boolean> {
  return !!(await prisma.resume.findFirst({ where: { id: resumeId, userId }, select: { id: true } }));
}

/** Track a job: typed in, or from a tailoring run (which then belongs to it). */
export async function createJob(userId: string, input: Record<string, unknown>): Promise<JobSummary> {
  const fromTailoringId = str(input.fromTailoringId, 64);
  if (fromTailoringId) {
    const t = await prisma.tailoring.findFirst({ where: { id: fromTailoringId, userId } });
    if (!t) throw new JobError("NOT_FOUND", "Tailoring not found");
    // Already tracked: the same job, not a duplicate.
    if (t.jobApplicationId) {
      const existing = await prisma.jobApplication.findFirst({ where: { id: t.jobApplicationId, userId }, select: summarySelect });
      if (existing) return toSummary(existing);
    }
    return prisma.$transaction(async (tx) => {
      const job = await tx.jobApplication.create({
        data: { userId, company: t.company || "Company", title: t.jobTitle || "Role", jdText: t.jdText.slice(0, 20000), resumeId: t.resumeId, status: "BOOKMARKED" },
      });
      // Link only if no other request linked it meanwhile.
      const linked = await tx.tailoring.updateMany({ where: { id: t.id, jobApplicationId: null }, data: { jobApplicationId: job.id } });
      if (linked.count === 0) throw new JobError("BAD_REQUEST", "Already tracked");
      return toSummary(await tx.jobApplication.findUniqueOrThrow({ where: { id: job.id }, select: summarySelect }));
    });
  }

  const company = str(input.company, 200);
  const title = str(input.title, 200);
  if (!company || !title) throw new JobError("BAD_REQUEST", "Add the role and the company.");
  const stage: JobStage = isStage(input.stage) ? input.stage : "BOOKMARKED";
  const resumeId = str(input.resumeId, 64);
  if (resumeId && !(await ownsResume(userId, resumeId))) throw new JobError("NOT_FOUND", "CV not found");
  const job = await prisma.jobApplication.create({
    data: {
      userId,
      company,
      title,
      status: stage,
      url: safeUrl(input.url),
      jdText: str(input.jdText, 20000),
      location: str(input.location, 200),
      resumeId,
      appliedAt: stage === "APPLIED" ? new Date() : null,
    },
    select: summarySelect,
  });
  return toSummary(job);
}

function safeUrl(v: unknown): string | null {
  const s = str(v, 2000);
  if (!s) return null;
  try {
    const u = new URL(s);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

export async function updateJob(userId: string, id: string, patch: JobPatch & Record<string, unknown>): Promise<JobSummary> {
  const existing = await prisma.jobApplication.findFirst({ where: { id, userId }, select: { id: true, appliedAt: true } });
  if (!existing) throw new JobError("NOT_FOUND", "Not found");
  const data: Prisma.JobApplicationUncheckedUpdateInput = {};
  if ("company" in patch) {
    const v = str(patch.company, 200);
    if (!v) throw new JobError("BAD_REQUEST", "Company can't be empty.");
    data.company = v;
  }
  if ("title" in patch) {
    const v = str(patch.title, 200);
    if (!v) throw new JobError("BAD_REQUEST", "Role can't be empty.");
    data.title = v;
  }
  if ("url" in patch) data.url = safeUrl(patch.url);
  if ("location" in patch) data.location = str(patch.location, 200);
  if ("salary" in patch) data.salary = str(patch.salary, 100);
  if ("notes" in patch) data.notes = str(patch.notes, 4000);
  if ("jdText" in patch) data.jdText = str(patch.jdText, 20000);
  if ("nextStep" in patch) data.nextStep = str(patch.nextStep, 200);
  if ("nextStepAt" in patch) {
    if (patch.nextStepAt === null || patch.nextStepAt === "") data.nextStepAt = null;
    else {
      const d = new Date(String(patch.nextStepAt));
      if (Number.isNaN(d.getTime())) throw new JobError("BAD_REQUEST", "Bad date");
      data.nextStepAt = d;
    }
  }
  if ("resumeId" in patch) {
    const rid = str(patch.resumeId, 64);
    if (rid && !(await ownsResume(userId, rid))) throw new JobError("NOT_FOUND", "CV not found");
    data.resumeId = rid;
  }
  if ("stage" in patch) {
    if (!isStage(patch.stage)) throw new JobError("BAD_REQUEST", "Bad stage");
    data.status = patch.stage;
    if (patch.stage === "APPLIED" && !existing.appliedAt) data.appliedAt = new Date();
  }
  const job = await prisma.jobApplication.update({ where: { id }, data, select: summarySelect });
  return toSummary(job);
}

/** Delete a job and its cover letters (nothing else shows them). Tailorings and interviews stay with the CV. */
export async function deleteJob(userId: string, id: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const res = await tx.jobApplication.deleteMany({ where: { id, userId } });
    if (res.count === 0) throw new JobError("NOT_FOUND", "Not found");
    await tx.coverLetter.deleteMany({ where: { jobApplicationId: id, userId } });
  });
}
