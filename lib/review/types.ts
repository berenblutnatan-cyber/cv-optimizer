// The one shape every CV finding takes, whatever produced it.
//
// WHY THIS EXISTS: before this, analysis output was prose — `improvements:
// string[]` and `{original, suggested, reason}` blobs. Nothing pointed at a
// specific line, so nothing could be applied, and the "Review Changes" tab was
// read-only. An Advice item must NAME A TARGET and be convertible into a real
// CV tool call (see buildToolCall in ./targetRef) — which is what makes
// "the AI said something you can't act on" impossible to express here.
//
// Three producers, one shape:
//   "local" — computeLocalScore's LocalProblem[] (instant, free, deterministic)
//   "ai"    — the Opus review (app/api/review)
//   "fit"   — the one-page fit planner (lib/builder/autoFit)

import type { LocalFixDescriptor, ScoreBand, ScoreCategory } from "@/lib/optimizer/localChecks";
import type { BulletSection } from "@/lib/chat/cvTools";

export type Verdict = "keep" | "cut" | "rewrite" | "add" | "merge";

export type AdviceSource = "local" | "ai" | "fit";

/**
 * Points at a piece of the CV.
 *
 * Bullets are addressed by (entryId | entryIndex, bulletIndex) + a content
 * hash rather than by a bullet id, because ResumeData stores bullets as bare
 * strings and adding ids would migrate 18 templates plus every CV already
 * persisted in localStorage and the DB. The hash is the safety net: if the
 * user edited that line after the review ran, resolution fails loudly (stale)
 * instead of quietly rewriting the wrong bullet.
 */
export interface TargetRef {
  kind: "summary" | "bullet" | "entry" | "skills" | "section" | "document";
  section?: BulletSection;
  /** Stable entry id (Experience.id etc.) — survives reordering. */
  entryId?: string;
  /** Zero-based entry index — what the tool call ultimately needs. */
  entryIndex?: number;
  bulletIndex?: number;
  /** hashText() of the target's text when the advice was produced. */
  hash?: string;
}

export interface Advice {
  /** Stable across recomputes so React keys and dedupe work. */
  id: string;
  source: AdviceSource;
  target: TargetRef;
  verdict: Verdict;
  category?: ScoreCategory;
  severity?: "high" | "medium" | "low";
  /** Imperative, <= 8 words. */
  title: string;
  /** ONE line: what it costs them. */
  reason: string;
  before?: string;
  /** Required when verdict === "rewrite" — the replacement text. */
  after?: string;
  /** 0-15, rough points recovered. */
  scoreImpact: number;
  /** Rendered lines reclaimed if applied — populated for cuts. */
  linesSaved?: number;
  /**
   * Present for deterministic local fixes. AI advice on a bullet leaves this
   * undefined on purpose: the tool call is DERIVED at apply time from the
   * freshly-resolved ref, so an index that shifted since the review can't
   * send the edit to the wrong line.
   */
  fix?: LocalFixDescriptor;
}

/** What the CV says about this person right now, before any fixing. */
export interface MessageRead {
  /** The 6-second recruiter conclusion. */
  readsAs: string;
  /** Where that lands short of the target role. Omitted when there's no gap. */
  gap?: string;
}

export interface ReviewStrength {
  title: string;
  /** Quoted or paraphrased from the CV — never generic praise. */
  evidence: string;
}

export interface ReviewResult {
  score: number;
  band: ScoreBand;
  message: MessageRead;
  strengths: ReviewStrength[];
  advice: Advice[];
  keywords?: { present: string[]; missing: string[] };
  /** Set when the review was given an overflowLines budget. */
  linesToCut?: number;
}

/** Wire shape of POST /api/review. */
export interface ReviewResponse {
  success: boolean;
  review?: ReviewResult;
  error?: string;
  code?: string;
}
