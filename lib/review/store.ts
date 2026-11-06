import "server-only";
import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { CvTarget } from "@/lib/resume/document";
import { contentHash } from "@/lib/tailor/store";
import type { ResumeData } from "@/types/resume";
import type { CvReadout } from "./view";

// One deep read per (CV content, target): reopening the review page, or a
// second tab, reuses it instead of running the model again.

export function readHash(content: ResumeData, target: CvTarget | undefined, lang: string): string {
  return createHash("sha256")
    .update(`${contentHash(content)}\n${target?.title ?? ""}\n${target?.description ?? ""}\n${lang}`)
    .digest("hex")
    .slice(0, 32);
}

export type StoredReview = { id: string; readHash: string; targetTitle: string; readout: CvReadout; createdAt: Date };

const toStored = (r: { id: string; readHash: string; targetTitle: string; audit: Prisma.JsonValue; createdAt: Date }): StoredReview => ({
  id: r.id,
  readHash: r.readHash,
  targetTitle: r.targetTitle,
  readout: r.audit as unknown as CvReadout,
  createdAt: r.createdAt,
});

/** The newest read of this CV, whatever it was read against. */
export async function latestReview(resumeId: string): Promise<StoredReview | null> {
  const row = await prisma.cvReview.findFirst({ where: { resumeId }, orderBy: { createdAt: "desc" } });
  return row ? toStored(row) : null;
}

export async function findReview(resumeId: string, hash: string): Promise<StoredReview | null> {
  const row = await prisma.cvReview.findUnique({ where: { resumeId_readHash: { resumeId, readHash: hash } } });
  return row ? toStored(row) : null;
}

export async function saveReview(resumeId: string, hash: string, targetTitle: string, readout: CvReadout): Promise<StoredReview> {
  const audit = readout as unknown as Prisma.InputJsonValue;
  // Two tabs finishing the same read: the second write is the same answer.
  const row = await prisma.cvReview.upsert({
    where: { resumeId_readHash: { resumeId, readHash: hash } },
    create: { resumeId, readHash: hash, targetTitle, audit },
    update: {},
  });
  return toStored(row);
}
