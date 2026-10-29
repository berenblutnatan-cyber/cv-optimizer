import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { applyDocumentOp, documentTitle, emptyDocument, toDocument, type ResumeDocument } from "./document";
import { DRAFT_TTL_DAYS, type Owner } from "./owner-types";

// Server-side persistence for v2 CVs. Every content change is an op appended
// to ResumeOp and replayed through applyDocumentOp under a row lock, so typed
// edits, chat and voice serialize into one order no matter how they race.

export type Actor = "user" | "chat" | "intake_agent" | "tailor";
export type OpInput = { clientOpId: string; name: string; input: Record<string, unknown> };

export const MAX_OPS_PER_BATCH = 50;
const MAX_OP_BYTES = 24_000;
const CLIENT_OP_ID = /^[A-Za-z0-9:_-]{8,120}$/;

export class StoreError extends Error {
  constructor(
    public code: "NOT_FOUND" | "BAD_REQUEST" | "CONFLICT",
    message: string,
  ) {
    super(message);
  }
}

function ownerWhere(owner: Owner): Prisma.ResumeWhereInput {
  return owner.userId
    ? { userId: owner.userId }
    : { anonKeyHash: owner.anonKeyHash, userId: null, anonExpiresAt: { gt: new Date() } };
}

const draftExpiry = () => new Date(Date.now() + DRAFT_TTL_DAYS * 24 * 60 * 60 * 1000);

function rowColumns(doc: ResumeDocument) {
  return {
    data: doc as unknown as Prisma.InputJsonValue,
    title: documentTitle(doc).slice(0, 200),
    template: doc.design.template,
    themeColor: doc.design.accentColor,
    dataVersion: 2,
  };
}

export type ResumeSummary = { id: string; title: string; template: string; updatedAt: Date; source: string };

export async function createResume(
  owner: Owner,
  opts: { doc?: ResumeDocument; source?: "manual" | "voice" | "import" | "tailor" } = {},
): Promise<{ id: string; doc: ResumeDocument; lastSeq: number }> {
  const doc = opts.doc ?? emptyDocument();
  const row = await prisma.resume.create({
    data: {
      ...rowColumns(doc),
      source: opts.source ?? "manual",
      userId: owner.userId,
      anonKeyHash: owner.anonKeyHash,
      anonExpiresAt: owner.userId ? null : draftExpiry(),
    },
    select: { id: true, lastSeq: true },
  });
  return { id: row.id, doc, lastSeq: row.lastSeq };
}

export async function listResumes(owner: Owner): Promise<ResumeSummary[]> {
  return prisma.resume.findMany({
    where: ownerWhere(owner),
    orderBy: { updatedAt: "desc" },
    take: 100,
    select: { id: true, title: true, template: true, updatedAt: true, source: true },
  });
}

export async function loadResume(id: string, owner: Owner): Promise<{ id: string; doc: ResumeDocument; lastSeq: number; updatedAt: Date } | null> {
  const row = await prisma.resume.findFirst({
    where: { id, ...ownerWhere(owner) },
    select: { id: true, data: true, template: true, themeColor: true, lastSeq: true, updatedAt: true },
  });
  if (!row) return null;
  return {
    id: row.id,
    doc: toDocument(row.data, { template: row.template, themeColor: row.themeColor }),
    lastSeq: row.lastSeq,
    updatedAt: row.updatedAt,
  };
}

function validateOps(ops: unknown): OpInput[] {
  if (!Array.isArray(ops) || ops.length === 0) throw new StoreError("BAD_REQUEST", "No operations");
  if (ops.length > MAX_OPS_PER_BATCH) throw new StoreError("BAD_REQUEST", `At most ${MAX_OPS_PER_BATCH} operations per request`);
  return ops.map((o) => {
    const op = o as Partial<OpInput>;
    if (typeof op.clientOpId !== "string" || !CLIENT_OP_ID.test(op.clientOpId)) throw new StoreError("BAD_REQUEST", "Bad clientOpId");
    if (typeof op.name !== "string" || op.name.length > 64) throw new StoreError("BAD_REQUEST", "Bad operation name");
    if (!op.input || typeof op.input !== "object" || Array.isArray(op.input)) throw new StoreError("BAD_REQUEST", "Bad operation input");
    if (JSON.stringify(op.input).length > MAX_OP_BYTES) throw new StoreError("BAD_REQUEST", "Operation too large");
    return { clientOpId: op.clientOpId, name: op.name, input: op.input as Record<string, unknown> };
  });
}

/**
 * Append operations and return the authoritative document.
 * - Row-locked (SELECT … FOR UPDATE), so concurrent batches apply in one order.
 * - Idempotent: an op whose clientOpId is already logged is skipped (a retried
 *   request never applies twice).
 * - No-ops (the reducer returned the same reference) are not logged.
 */
export async function appendOps(
  id: string,
  owner: Owner,
  rawOps: unknown,
  actor: Actor,
  opts: { voiceSessionId?: string } = {},
): Promise<{ doc: ResumeDocument; lastSeq: number; applied: string[]; skipped: string[] }> {
  const ops = validateOps(rawOps);
  return prisma.$transaction(async (tx) => {
    const ownerSql = owner.userId
      ? Prisma.sql`"userId" = ${owner.userId}`
      : Prisma.sql`"userId" IS NULL AND "anonKeyHash" = ${owner.anonKeyHash} AND "anonExpiresAt" > NOW()`;
    const locked = await tx.$queryRaw<{ id: string; data: unknown; template: string; themeColor: string | null; lastSeq: number }[]>`
      SELECT "id", "data", "template", "themeColor", "lastSeq" FROM "Resume"
      WHERE "id" = ${id} AND ${ownerSql}
      FOR UPDATE`;
    const row = locked[0];
    if (!row) throw new StoreError("NOT_FOUND", "CV not found");

    const seen = new Set(
      (
        await tx.resumeOp.findMany({
          where: { resumeId: id, clientOpId: { in: ops.map((o) => o.clientOpId) } },
          select: { clientOpId: true },
        })
      ).map((r) => r.clientOpId),
    );

    let doc = toDocument(row.data, { template: row.template, themeColor: row.themeColor });
    let seq = row.lastSeq;
    const applied: string[] = [];
    const skipped: string[] = [];
    const log: Prisma.ResumeOpCreateManyInput[] = [];
    const batch = new Set<string>();
    for (const op of ops) {
      if (seen.has(op.clientOpId) || batch.has(op.clientOpId)) {
        skipped.push(op.clientOpId);
        continue;
      }
      batch.add(op.clientOpId);
      const next = applyDocumentOp(doc, op.name, op.input);
      if (next === doc) {
        skipped.push(op.clientOpId);
        continue;
      }
      doc = next;
      seq += 1;
      applied.push(op.clientOpId);
      log.push({
        resumeId: id,
        seq,
        actor,
        toolName: op.name,
        input: op.input as Prisma.InputJsonValue,
        clientOpId: op.clientOpId,
        voiceSessionId: opts.voiceSessionId ?? null,
      });
    }

    if (log.length > 0) {
      await tx.resumeOp.createMany({ data: log });
      await tx.resume.update({
        where: { id },
        data: { ...rowColumns(doc), lastSeq: seq, ...(owner.userId ? {} : { anonExpiresAt: draftExpiry() }) },
      });
    }
    return { doc, lastSeq: seq, applied, skipped };
  });
}

export async function createVersion(
  id: string,
  owner: Owner,
  opts: { label?: string; createdBy: "user" | "chat" | "intake_agent" | "tailor" | "migration" },
): Promise<{ id: string; number: number; label: string | null; createdAt: Date }> {
  const current = await loadResume(id, owner);
  if (!current) throw new StoreError("NOT_FOUND", "CV not found");
  // Retry on the (resumeId, number) unique race instead of trusting a read-then-write.
  for (let attempt = 0; attempt < 3; attempt++) {
    const last = await prisma.resumeVersion.findFirst({ where: { resumeId: id }, orderBy: { number: "desc" }, select: { number: true } });
    try {
      return await prisma.resumeVersion.create({
        data: {
          resumeId: id,
          number: (last?.number ?? 0) + 1,
          data: current.doc as unknown as Prisma.InputJsonValue,
          label: opts.label?.trim().slice(0, 80) || null,
          createdBy: opts.createdBy,
        },
        select: { id: true, number: true, label: true, createdAt: true },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") continue;
      throw err;
    }
  }
  throw new StoreError("CONFLICT", "Could not save the version, try again");
}

export async function listVersions(id: string, owner: Owner) {
  const owned = await prisma.resume.findFirst({ where: { id, ...ownerWhere(owner) }, select: { id: true } });
  if (!owned) throw new StoreError("NOT_FOUND", "CV not found");
  return prisma.resumeVersion.findMany({
    where: { resumeId: id },
    orderBy: { number: "desc" },
    take: 100,
    select: { id: true, number: true, label: true, createdBy: true, createdAt: true },
  });
}

/** Restore a version: the current state is saved first, so a restore is itself undoable. */
export async function restoreVersion(id: string, owner: Owner, versionId: string): Promise<{ doc: ResumeDocument; lastSeq: number }> {
  const version = await prisma.resumeVersion.findFirst({
    where: { id: versionId, resumeId: id, resume: ownerWhere(owner) },
    select: { data: true, number: true },
  });
  if (!version) throw new StoreError("NOT_FOUND", "Version not found");
  await createVersion(id, owner, { label: `Before restoring v${version.number}`, createdBy: "user" });
  const doc = toDocument(version.data);
  return prisma.$transaction(async (tx) => {
    const row = await tx.resume.findUniqueOrThrow({ where: { id }, select: { lastSeq: true } });
    const seq = row.lastSeq + 1;
    await tx.resumeOp.create({
      data: { resumeId: id, seq, actor: "user", toolName: "restore_version", input: { versionId }, clientOpId: `restore:${versionId}:${Date.now()}` },
    });
    await tx.resume.update({ where: { id }, data: { ...rowColumns(doc), lastSeq: seq } });
    return { doc, lastSeq: seq };
  });
}

/** Move a signed-out visitor's drafts into their account. Returns how many moved. */
export async function claimDrafts(userId: string, anonKeyHash: string): Promise<number> {
  const res = await prisma.resume.updateMany({
    where: { anonKeyHash, userId: null, anonExpiresAt: { gt: new Date() } },
    data: { userId, anonKeyHash: null, anonExpiresAt: null },
  });
  return res.count;
}

export async function deleteResume(id: string, owner: Owner): Promise<void> {
  const res = await prisma.resume.deleteMany({ where: { id, ...ownerWhere(owner) } });
  if (res.count === 0) throw new StoreError("NOT_FOUND", "CV not found");
}
