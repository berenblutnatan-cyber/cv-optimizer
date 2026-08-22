// Model output -> validated Advice[].
//
// THIS IS THE TRUST BOUNDARY. The model returns bare indices. Everything here
// is checked against the REAL ResumeData before it can become a card with an
// Apply button:
//
//   • a target that doesn't resolve is DROPPED (a hallucinated [7.3] never
//     reaches the UI, let alone the reducer)
//   • "cut" on education is DROPPED — degrees, GPA and honors are sacred
//   • a cut that would empty an entry is DROPPED — never leave a role with no
//     evidence under it
//   • "rewrite" with no replacement text, or a replacement identical to the
//     original, is DROPPED
//   • the content hash is computed HERE from real data, never taken from the
//     model, so staleness detection can't be spoofed by a bad index
//
// Pure and synchronous — scripts/review-eval.ts asserts these invariants
// directly against this function.

import type { ResumeData } from "@/types/resume";
import { getEntryBullets, normalizeBulletSection, type BulletSection } from "@/lib/chat/cvTools";
import { hashText } from "./targetRef";
import { bandForScore } from "./rubric";
import type { Advice, ReviewResult, Verdict } from "./types";

/** Raw shape the emit_review tool produces. Every field is untrusted. */
export interface RawReview {
  score?: unknown;
  readsAs?: unknown;
  gap?: unknown;
  strengthTitles?: unknown;
  strengthEvidence?: unknown;
  /** Legacy array-of-objects shape, still accepted defensively. */
  strengths?: unknown;
  summaryVerdict?: unknown;
  verdicts?: unknown;
  keywordsPresent?: unknown;
  keywordsMissing?: unknown;
}

/**
 * Merge every emit_review tool_use block into one RawReview.
 *
 * WHY: the model does not reliably answer in a single tool call. Observed in
 * practice on a real CV — six emit_review blocks, where blocks 0-2 repeated
 * the score/readsAs, blocks 3-4 carried loose strength fragments, and the
 * actual `verdicts` array only appeared in block 5. Reading just the first
 * block (the obvious implementation) returned a review with zero advice.
 *
 * Rule: arrays concatenate, scalars take the first non-empty value.
 */
export function mergeReviewBlocks(blocks: Record<string, unknown>[]): RawReview {
  const out: Record<string, unknown> = {};
  for (const block of blocks) {
    if (!block || typeof block !== "object") continue;
    for (const [k, v] of Object.entries(block)) {
      if (v === undefined || v === null || v === "") continue;
      const prev = out[k];
      if (Array.isArray(v)) {
        out[k] = Array.isArray(prev) ? [...prev, ...v] : [...v];
      } else if (prev === undefined) {
        out[k] = v;
      }
    }
  }
  return out as RawReview;
}

const s = (v: unknown): string | undefined =>
  typeof v === "string" && v.trim() ? v.trim() : undefined;

const strList = (v: unknown, cap: number): string[] =>
  Array.isArray(v) ? v.map((x) => s(x)).filter((x): x is string => Boolean(x)).slice(0, cap) : [];

function clampScore(v: unknown): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, Math.round(n)));
}

function clampImpact(v: unknown): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return 3;
  return Math.min(15, Math.max(0, Math.round(n)));
}

function isVerdict(v: unknown): v is Verdict {
  return v === "keep" || v === "cut" || v === "rewrite";
}

/** Sections whose bullets may never be cut (degrees, GPA, honors). */
const UNCUTTABLE: ReadonlySet<BulletSection> = new Set<BulletSection>(["education"]);

export interface ConversionStats {
  received: number;
  droppedUnresolved: number;
  droppedSacred: number;
  droppedWouldEmpty: number;
  droppedNoReplacement: number;
}

export interface ConvertedReview {
  review: ReviewResult;
  stats: ConversionStats;
}

export function reviewFromModel(
  data: ResumeData,
  raw: RawReview,
  opts: { overflowLines?: number } = {}
): ConvertedReview {
  const stats: ConversionStats = {
    received: 0,
    droppedUnresolved: 0,
    droppedSacred: 0,
    droppedWouldEmpty: 0,
    droppedNoReplacement: 0,
  };

  const advice: Advice[] = [];

  // ── summary verdict ───────────────────────────────────────────────────────
  const sv = raw.summaryVerdict as Record<string, unknown> | undefined;
  if (sv && isVerdict(sv.verdict) && sv.verdict === "rewrite") {
    const after = s(sv.after);
    const before = data.summary ?? "";
    if (after && after !== before) {
      advice.push({
        id: "ai:summary",
        source: "ai",
        target: { kind: "summary", hash: before ? hashText(before) : undefined },
        verdict: "rewrite",
        category: "clarity",
        title: before ? "Sharpen your summary" : "Add a summary",
        reason: s(sv.reason) ?? "Your opening lines decide whether the rest gets read.",
        before: before || undefined,
        after,
        scoreImpact: 8,
      });
    } else {
      stats.droppedNoReplacement++;
    }
  }

  // ── bullet verdicts ───────────────────────────────────────────────────────
  // Track how many cuts land on each entry so we never empty one.
  const cutsPerEntry = new Map<string, number>();

  const rawVerdicts = Array.isArray(raw.verdicts) ? raw.verdicts : [];
  stats.received = rawVerdicts.length;

  for (const item of rawVerdicts) {
    if (!item || typeof item !== "object") {
      stats.droppedUnresolved++;
      continue;
    }
    const v = item as Record<string, unknown>;

    const section = normalizeBulletSection(v.section);
    const index = Number(v.index);
    const bulletIndex = Number(v.bulletIndex);
    const verdict = v.verdict;

    if (!section || !isVerdict(verdict) || !Number.isInteger(index) || !Number.isInteger(bulletIndex)) {
      stats.droppedUnresolved++;
      continue;
    }

    // Does this target actually exist?
    const bullets = getEntryBullets(data, section, index);
    if (!bullets || bulletIndex < 0 || bulletIndex >= bullets.length) {
      stats.droppedUnresolved++;
      continue;
    }
    const before = bullets[bulletIndex];

    if (verdict === "cut") {
      if (UNCUTTABLE.has(section)) {
        stats.droppedSacred++;
        continue;
      }
      const key = `${section}:${index}`;
      const already = cutsPerEntry.get(key) ?? 0;
      // Leave at least one line of evidence under every entry.
      if (bullets.length - already <= 1) {
        stats.droppedWouldEmpty++;
        continue;
      }
      cutsPerEntry.set(key, already + 1);
    }

    let after: string | undefined;
    if (verdict === "rewrite") {
      after = s(v.after);
      if (!after || after === before) {
        stats.droppedNoReplacement++;
        continue;
      }
    }

    const entryList =
      section === "experience"
        ? data.experience
        : section === "projects"
          ? data.projects
          : section === "education"
            ? data.education
            : data.customSections;

    advice.push({
      id: `ai:${section}:${index}.${bulletIndex}`,
      source: "ai",
      target: {
        kind: "bullet",
        section,
        entryId: entryList[index]?.id,
        entryIndex: index,
        bulletIndex,
        hash: hashText(before),
      },
      verdict,
      severity: verdict === "cut" ? "medium" : "high",
      title: s(v.title) ?? (verdict === "cut" ? "Cut this line" : "Strengthen this line"),
      reason: s(v.reason) ?? "",
      before,
      after,
      scoreImpact: clampImpact(v.scoreImpact),
      // One rendered line reclaimed per cut — the fit loop re-measures anyway.
      linesSaved: verdict === "cut" ? 1 : undefined,
    });
  }

  // Highest-impact first; cuts before keeps at equal impact so the one-page
  // work surfaces at the top when the CV is over length.
  const rank: Record<string, number> = { cut: 0, rewrite: 1, add: 2, merge: 3, keep: 4 };
  advice.sort(
    (a, b) => b.scoreImpact - a.scoreImpact || (rank[a.verdict] ?? 9) - (rank[b.verdict] ?? 9)
  );

  const score = clampScore(raw.score);

  // Parallel arrays are the shipped shape; the object array is accepted as a
  // fallback so an older cached response still renders.
  const titles = strList(raw.strengthTitles, 3);
  const evidence = strList(raw.strengthEvidence, 3);
  let strengths = titles.map((title, i) => ({ title, evidence: evidence[i] ?? "" }));
  if (strengths.length === 0 && Array.isArray(raw.strengths)) {
    strengths = raw.strengths
      .map((x) => {
        const o = (x ?? {}) as Record<string, unknown>;
        const title = s(o.title);
        const ev = s(o.evidence);
        return title ? { title, evidence: ev ?? "" } : null;
      })
      .filter((x): x is { title: string; evidence: string } => x !== null)
      .slice(0, 3);
  }

  const review: ReviewResult = {
    score,
    band: bandForScore(score),
    message: {
      readsAs: s(raw.readsAs) ?? "",
      gap: s(raw.gap),
    },
    strengths,
    advice,
    keywords: {
      present: strList(raw.keywordsPresent, 10),
      missing: strList(raw.keywordsMissing, 8),
    },
    linesToCut: opts.overflowLines && opts.overflowLines > 0 ? opts.overflowLines : undefined,
  };

  return { review, stats };
}

/** Lines the accepted cuts would reclaim — used to check the fit budget. */
export function totalLinesSaved(advice: Advice[]): number {
  return advice.reduce((n, a) => n + (a.verdict === "cut" ? (a.linesSaved ?? 1) : 0), 0);
}
