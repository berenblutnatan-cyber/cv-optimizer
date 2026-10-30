import "server-only";
import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { charge } from "@/lib/billing/ledger";
import { appendOps, createVersion, loadResume, MAX_OPS_PER_BATCH } from "@/lib/resume/store";
import type { Owner } from "@/lib/resume/owner-types";
import type { ResumeData } from "@/types/resume";
import { normalizeContent } from "@/lib/resume/document";
import type { DeepAnalysis } from "@/lib/optimizer/types";
import { tailorSummary, type TailorSummary } from "./view";

// Tailoring a CV to one job: save the analysis (charged in the same
// transaction), list past runs, and apply chosen suggestions as ops.
//
// Suggestion patches are index-addressed against the CV the analysis read
// (baseHash). Applying is refused once the CV has changed in any other way,
// so a patch can never land on the wrong bullet. Applying is idempotent per
// suggestion (op id tl:<tailoring>:<suggestion>), and each apply saves a
// version, so it is always one click to undo.

export class TailorError extends Error {
  constructor(
    public code: "NOT_FOUND" | "STALE" | "BAD_REQUEST",
    message: string,
  ) {
    super(message);
  }
}

const userOwner = (userId: string): Owner => ({ userId, anonKeyHash: null });

/** JSON with keys sorted at every level: equal content, equal string, however it was built. */
function canonical(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`;
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o)
      .filter((k) => o[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonical(o[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(v ?? null);
}

/** Fingerprint of CV content: normalized, then canonical, so a load round-trip never changes it. */
export function contentHash(content: ResumeData): string {
  return createHash("sha256").update(canonical(normalizeContent(content))).digest("hex").slice(0, 32);
}

export function jdHash(jd: string): string {
  return createHash("sha256").update(jd.replace(/\s+/g, " ").trim().toLowerCase()).digest("hex").slice(0, 32);
}

/** Persist a finished run and charge for it, atomically: no result without the charge, no charge without the result. */
export async function saveTailoring(p: {
  userId: string;
  resumeId: string;
  jobTitle: string;
  company: string;
  jdText: string;
  analysis: DeepAnalysis;
  baseHash: string;
}): Promise<{ id: string; charged: number }> {
  return prisma.$transaction(async (tx) => {
    const row = await tx.tailoring.create({
      data: {
        userId: p.userId,
        resumeId: p.resumeId,
        jobTitle: p.jobTitle.slice(0, 200),
        company: p.company.slice(0, 200),
        jdText: p.jdText,
        jdHash: jdHash(p.jdText),
        analysis: p.analysis as unknown as Prisma.InputJsonValue,
        scoreOriginal: p.analysis.scoreComparison.original.total,
        scoreOptimized: p.analysis.scoreComparison.optimized.total,
        baseHash: p.baseHash,
      },
      select: { id: true },
    });
    const c = await charge(tx, { userId: p.userId, reason: "tailor", key: `tailor:${row.id}`, refType: "tailoring", refId: row.id });
    await tx.tailoring.update({ where: { id: row.id }, data: { creditsCharged: c.charged } });
    return { id: row.id, charged: c.charged };
  });
}

export async function listTailorings(userId: string, resumeId: string): Promise<TailorSummary[]> {
  const rows = await prisma.tailoring.findMany({
    where: { userId, resumeId },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: { id: true, jobTitle: true, company: true, scoreOriginal: true, scoreOptimized: true, appliedSuggestionIds: true, createdAt: true },
  });
  return rows.map(tailorSummary);
}

export async function getTailoring(userId: string, resumeId: string, id: string) {
  const row = await prisma.tailoring.findFirst({ where: { id, userId, resumeId } });
  if (!row) throw new TailorError("NOT_FOUND", "Not found");
  const resume = await loadResume(resumeId, userOwner(userId));
  const current = resume ? contentHash(resume.doc.content) : null;
  return {
    id: row.id,
    jobTitle: row.jobTitle,
    company: row.company,
    jdText: row.jdText,
    analysis: row.analysis as unknown as DeepAnalysis,
    appliedSuggestionIds: row.appliedSuggestionIds,
    createdAt: row.createdAt,
    /** The tracked job this run belongs to, if any. */
    jobApplicationId: row.jobApplicationId,
    /** False once the CV changed since this run (apply is then refused). */
    applicable: current !== null && current === (row.appliedHash ?? row.baseHash),
  };
}

/**
 * Apply grounded suggestions from one run. Only suggestions the verifier
 * grounded (and that carry a patch) are appliable; anything else in the list
 * is rejected, never silently applied.
 */
export async function applySuggestions(
  userId: string,
  resumeId: string,
  tailoringId: string,
  suggestionIds: string[],
): Promise<{ doc: Awaited<ReturnType<typeof appendOps>>["doc"]; lastSeq: number; applied: string[]; version: { id: string; number: number } | null }> {
  if (!Array.isArray(suggestionIds) || suggestionIds.length === 0 || suggestionIds.length > 60 || suggestionIds.some((s) => typeof s !== "string")) {
    throw new TailorError("BAD_REQUEST", "Choose at least one change");
  }
  const row = await prisma.tailoring.findFirst({ where: { id: tailoringId, userId, resumeId } });
  if (!row) throw new TailorError("NOT_FOUND", "Not found");
  const owner = userOwner(userId);
  const resume = await loadResume(resumeId, owner);
  if (!resume) throw new TailorError("NOT_FOUND", "CV not found");
  if (contentHash(resume.doc.content) !== (row.appliedHash ?? row.baseHash)) {
    throw new TailorError("STALE", "Your CV changed since this check. Run it again to get fresh suggestions.");
  }

  const analysis = row.analysis as unknown as DeepAnalysis;
  const byId = new Map(analysis.suggestions.map((s) => [s.id, s]));
  const wanted = [...new Set(suggestionIds)].filter((id) => !row.appliedSuggestionIds.includes(id));
  for (const id of wanted) {
    const s = byId.get(id);
    if (!s || !s.grounded || !s.patch) throw new TailorError("BAD_REQUEST", "That change can't be applied automatically");
  }
  if (wanted.length === 0) return { doc: resume.doc, lastSeq: resume.lastSeq, applied: [], version: null };

  // In the analysis' order: the patches were verified in that sequence.
  const order = analysis.suggestions.map((s) => s.id).filter((id) => wanted.includes(id));
  const ops = order.map((id) => {
    const s = byId.get(id)!;
    return { clientOpId: `tl:${tailoringId}:${id}`, name: s.patch!.name, input: s.patch!.input };
  });
  let result = { doc: resume.doc, lastSeq: resume.lastSeq, applied: [] as string[] };
  for (let i = 0; i < ops.length; i += MAX_OPS_PER_BATCH) {
    const r = await appendOps(resumeId, owner, ops.slice(i, i + MAX_OPS_PER_BATCH), "tailor");
    result = { doc: r.doc, lastSeq: r.lastSeq, applied: [...result.applied, ...r.applied] };
  }
  const label = `Tailored for ${row.company || row.jobTitle || "a job"}`;
  const version = await createVersion(resumeId, owner, { label, createdBy: "tailor" });
  await prisma.tailoring.update({
    where: { id: row.id },
    data: {
      appliedSuggestionIds: [...row.appliedSuggestionIds, ...order],
      appliedHash: contentHash(result.doc.content),
      resultVersionId: version.id,
    },
  });
  return { ...result, version: { id: version.id, number: version.number } };
}
