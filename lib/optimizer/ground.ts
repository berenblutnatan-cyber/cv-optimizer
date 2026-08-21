// Server-side post-processing for the optimizer pipeline — pure code, no LLM.
//
// This module turns "prompt begging" into invariants:
//   - grounding verifier: quotes/before-text must literally exist in the CV
//   - patch whitelist:    no remove_*, no update_personal_info — deletion
//                         safety and contact immunity are structural
//   - fold:               optimizedResumeData = grounded patches applied via
//                         the same pure reducer the chat builder uses
//   - score clamp:        the OPTIMIZED SCORE CONSTRAINTS tier table, in code
//   - legacy projection:  derive the v1 payload fields from the rich data

import { applyCvToolCall } from "@/lib/chat/cvTools";
import { resumeToText, type ResumeData } from "@/types/resume";
import { SUGGESTION_PATCH_TOOLS } from "./prompts";
import type {
  DeepAudit,
  GroundedSuggestion,
  LegacySuggestedChange,
  RequirementCoverage,
  RewriteResult,
  ScoreWithBreakdown,
} from "./types";

// ── Normalized substring matching ───────────────────────────────────────────
// Tolerant to the ways verbatim text drifts through extraction: whitespace
// runs, smart quotes, bullet glyphs, dash variants, case.

export function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—−]/g, "-")
    .replace(/[•▪◦·–—]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function containsNormalized(haystack: string, needle: string): boolean {
  const n = normalizeForMatch(needle);
  if (n.length < 3) return false;
  return normalizeForMatch(haystack).includes(n);
}

const PATCH_WHITELIST = new Set<string>(SUGGESTION_PATCH_TOOLS);

// ── Grounding + fold ────────────────────────────────────────────────────────

export type GroundingInput = {
  suggestions: RewriteResult["suggestions"];
  resumeData: ResumeData;
  cvText: string;
  degraded: boolean;
};

export type GroundingOutput = {
  suggestions: GroundedSuggestion[];
  optimizedResumeData: ResumeData;
};

/**
 * Verify every suggestion and fold the surviving patches into the optimized
 * document. A suggestion survives with `grounded: true` + a patch only when:
 *   - its patch tool is whitelisted,
 *   - its `before` text (when present) literally exists in the CV,
 *   - applying the patch actually changes the document (non-noop — the
 *     reducer returns the same reference for bad indices/empty input).
 * Failures aren't dropped silently: they stay as advice (`grounded: false`,
 * `patch: null`) so depth is preserved even when anchoring fails.
 */
export function groundAndFold(input: GroundingInput): GroundingOutput {
  const { resumeData, cvText, degraded } = input;
  // Both sources: `before` may quote the raw upload or the parsed structure.
  const sources = groundingSources(cvText, resumeData);
  const seenBefores: string[] = [];

  let acc = resumeData;
  const out: GroundedSuggestion[] = [];

  for (const sug of input.suggestions) {
    const before = typeof sug.before === "string" && sug.before.trim() ? sug.before : null;
    const beforeOk = before === null || sources.some((src) => containsNormalized(src, before));
    // Two suggestions must never target the same text (independent apply).
    const duplicate =
      before !== null && seenBefores.some((b) => normalizeForMatch(b) === normalizeForMatch(before));

    let grounded = false;
    let patch = sug.patch ?? null;

    if (!degraded && !duplicate && beforeOk && patch && PATCH_WHITELIST.has(patch.name)) {
      const applied = applyCvToolCall(acc, patch.name, patch.input);
      if (applied !== acc) {
        acc = applied;
        grounded = true;
      } else {
        patch = null; // bad index / empty input — keep as advice
      }
    } else {
      patch = null;
    }

    if (before !== null) seenBefores.push(before);
    if (duplicate) continue; // exact-duplicate target: drop entirely

    out.push({
      ...sug,
      before: beforeOk ? before : null, // unverifiable quote never shown as "current text"
      scoreImpact: clampInt(sug.scoreImpact, 1, 15),
      patch,
      grounded,
    });
  }

  return { suggestions: out, optimizedResumeData: acc };
}

// ── Score clamp (OPTIMIZED SCORE CONSTRAINTS, as code) ──────────────────────

export function maxImprovementFor(originalTotal: number): number {
  if (originalTotal < 35) return 22;
  if (originalTotal < 55) return 28;
  if (originalTotal < 75) return 32;
  return 20;
}

export function clampOptimizedScore(
  original: ScoreWithBreakdown,
  proposed: ScoreWithBreakdown
): ScoreWithBreakdown {
  const ceiling = Math.min(98, original.total + maxImprovementFor(original.total));
  const total = clampInt(proposed.total, original.total, ceiling);
  return {
    total,
    breakdown: {
      ats: clampInt(proposed.breakdown.ats, 0, 100),
      impact: clampInt(proposed.breakdown.impact, 0, 100),
      clarity: clampInt(proposed.breakdown.clarity, 0, 100),
    },
  };
}

function clampInt(v: unknown, lo: number, hi: number): number {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

// ── Evidence verification ───────────────────────────────────────────────────

/** The texts a quote may legitimately come from: the raw upload AND the
 *  parsed structure's text rendering (verbatim extraction can join fields
 *  slightly differently, e.g. "LL.B. Law" → "LL.B. in Law"). The structured
 *  doc is what patches apply to, so quoting it is correct. */
export function groundingSources(cvText: string, resumeData: ResumeData): string[] {
  return [cvText, resumeToText(resumeData)];
}

/** Drop coverage evidence quotes that don't literally appear in any grounding
 *  source. A row whose every quote fails downgrades from strong → partial
 *  (claims without proof don't count as strong coverage). */
export function verifyCoverage(coverage: RequirementCoverage[], sources: string[]): RequirementCoverage[] {
  return coverage.map((row) => {
    const evidence = row.evidence.filter((e) => sources.some((src) => containsNormalized(src, e.quote)));
    const status = row.status === "strong" && evidence.length === 0 && row.evidence.length > 0
      ? "partial"
      : row.status;
    return { ...row, evidence, status };
  });
}

// ── Legacy projection ───────────────────────────────────────────────────────

export function projectKeywords(
  audit: DeepAudit,
  coverage: RequirementCoverage[],
  keywordsAdded: string[]
): { present: string[]; missing: string[]; added: string[] } {
  const byId = new Map(coverage.map((c) => [c.requirementId, c]));
  const present: string[] = [];
  const missing: string[] = [];
  for (const req of audit.jdRequirements) {
    if (req.category !== "skill") continue;
    const label = (req.skillLabel || req.text).slice(0, 40);
    const row = byId.get(req.id);
    if (!row || row.status === "missing") missing.push(label);
    else present.push(label);
  }
  return {
    present: dedupe(present).slice(0, 8),
    missing: dedupe(missing).slice(0, 8),
    added: dedupe(keywordsAdded.map((k) => k.slice(0, 40))).slice(0, 8),
  };
}

export function projectSuggestedChanges(suggestions: GroundedSuggestion[]): LegacySuggestedChange[] {
  return suggestions.slice(0, 8).map((s) => ({
    id: s.id,
    section: s.section,
    original: s.before ?? "",
    suggested: s.after,
    reason: s.rationale,
  }));
}

function dedupe(arr: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of arr) {
    const key = normalizeForMatch(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}
