// Resolving an Advice back onto the live CV, and turning it into a tool call.
//
// THE GUARD THIS MODULE EXISTS FOR: a review runs against a snapshot. By the
// time the user clicks Apply, they may have edited, reordered, or deleted
// things. Indices baked in at review time are therefore untrustworthy. Every
// apply re-resolves the target against the CURRENT ResumeData and verifies a
// content hash; a mismatch returns null (the card renders as stale) rather
// than editing whatever now happens to sit at that index.
//
// DETERMINISM: pure functions only — same input, same output. No Date.now(),
// no Math.random().

import type { ResumeData } from "@/types/resume";
import type { BulletSection, CvToolName } from "@/lib/chat/cvTools";
import { getEntryBullets } from "@/lib/chat/cvTools";
import type { Advice, TargetRef } from "./types";

/** djb2, base36. Short, stable, and collision-safe enough for one CV. */
export function hashText(text: string): string {
  const norm = text.trim().replace(/\s+/g, " ");
  let h = 5381;
  for (let i = 0; i < norm.length; i++) {
    h = ((h << 5) + h + norm.charCodeAt(i)) >>> 0;
  }
  return h.toString(36);
}

export interface ResolvedTarget {
  kind: TargetRef["kind"];
  text: string;
  section?: BulletSection;
  entryIndex?: number;
  bulletIndex?: number;
  /** True when we re-located the target somewhere other than the stored index. */
  moved: boolean;
}

/** Locate an entry by id first (survives reordering), then by index. */
function resolveEntryIndex(
  data: ResumeData,
  section: BulletSection,
  ref: TargetRef
): number | null {
  const list =
    section === "experience"
      ? data.experience
      : section === "projects"
        ? data.projects
        : section === "education"
          ? data.education
          : data.customSections;

  if (ref.entryId) {
    const byId = list.findIndex((e) => e.id === ref.entryId);
    if (byId !== -1) return byId;
  }
  const i = ref.entryIndex;
  if (typeof i === "number" && Number.isInteger(i) && i >= 0 && i < list.length) return i;
  return null;
}

/**
 * Resolve a ref against the CURRENT CV. Returns null when the target no
 * longer exists or its text changed — callers must treat null as "stale",
 * never as "apply anyway".
 */
export function resolveRef(data: ResumeData, ref: TargetRef): ResolvedTarget | null {
  switch (ref.kind) {
    case "summary": {
      const text = data.summary ?? "";
      if (!text) return null;
      if (ref.hash && hashText(text) !== ref.hash) return null;
      return { kind: "summary", text, moved: false };
    }

    case "skills": {
      const text = data.skills.join(", ");
      return { kind: "skills", text, moved: false };
    }

    case "bullet": {
      const section = ref.section;
      if (!section) return null;
      const entryIndex = resolveEntryIndex(data, section, ref);
      if (entryIndex === null) return null;
      const bullets = getEntryBullets(data, section, entryIndex);
      if (!bullets || bullets.length === 0) return null;

      const at = ref.bulletIndex;
      const inRange = typeof at === "number" && Number.isInteger(at) && at >= 0 && at < bullets.length;

      // Happy path: the stored index still holds the same text.
      if (inRange && (!ref.hash || hashText(bullets[at as number]) === ref.hash)) {
        return {
          kind: "bullet",
          text: bullets[at as number],
          section,
          entryIndex,
          bulletIndex: at as number,
          moved: entryIndex !== ref.entryIndex,
        };
      }

      // The line moved within the entry — re-locate it by content hash.
      if (ref.hash) {
        const found = bullets.findIndex((b) => hashText(b) === ref.hash);
        if (found !== -1) {
          return {
            kind: "bullet",
            text: bullets[found],
            section,
            entryIndex,
            bulletIndex: found,
            moved: true,
          };
        }
      }
      // Edited or deleted since the review ran -> stale.
      return null;
    }

    case "entry": {
      const section = ref.section;
      if (!section) return null;
      const entryIndex = resolveEntryIndex(data, section, ref);
      if (entryIndex === null) return null;
      const bullets = getEntryBullets(data, section, entryIndex) ?? [];
      return {
        kind: "entry",
        text: bullets.join(" • "),
        section,
        entryIndex,
        moved: entryIndex !== ref.entryIndex,
      };
    }

    default:
      return { kind: ref.kind, text: "", moved: false };
  }
}

export interface DerivedToolCall {
  name: CvToolName;
  input: Record<string, unknown>;
}

/**
 * Turn an Advice into the exact tool call that applies it, using freshly
 * resolved indices. Returns null when the advice is stale, isn't actionable
 * (verdict "keep"), or still needs an AI rewrite (fix.kind === "ai").
 */
export function buildToolCall(data: ResumeData, advice: Advice): DerivedToolCall | null {
  // Deterministic local fixes already carry their own exact call.
  if (advice.fix?.kind === "deterministic") {
    return { name: advice.fix.tool, input: advice.fix.input };
  }
  if (advice.fix?.kind === "ai") return null;
  if (advice.verdict === "keep") return null;

  const resolved = resolveRef(data, advice.target);
  if (!resolved) return null;

  if (resolved.kind === "summary" && advice.verdict === "rewrite") {
    const summary = advice.after?.trim();
    if (!summary) return null;
    return { name: "update_summary", input: { summary } };
  }

  if (resolved.kind === "bullet") {
    const base = {
      section: resolved.section,
      index: resolved.entryIndex,
      bulletIndex: resolved.bulletIndex,
    };
    if (advice.verdict === "cut") {
      return { name: "remove_bullet", input: base };
    }
    if (advice.verdict === "rewrite") {
      const text = advice.after?.trim();
      if (!text) return null;
      return { name: "rewrite_bullet", input: { ...base, text } };
    }
  }

  if (resolved.kind === "entry" && advice.verdict === "cut") {
    if (resolved.section === "experience") {
      return { name: "remove_experience", input: { index: resolved.entryIndex } };
    }
    if (resolved.section === "projects") {
      return { name: "remove_project", input: { index: resolved.entryIndex } };
    }
    if (resolved.section === "education") {
      return { name: "remove_education", input: { index: resolved.entryIndex } };
    }
    if (resolved.section === "customSections") {
      return { name: "remove_custom_section", input: { index: resolved.entryIndex } };
    }
  }

  return null;
}

/** True when the advice can no longer be located in the CV. */
export function isStale(data: ResumeData, advice: Advice): boolean {
  if (advice.fix?.kind === "deterministic") return false;
  if (advice.target.kind === "document" || advice.target.kind === "section") return false;
  return resolveRef(data, advice.target) === null;
}

/** Build a bullet ref (with hash) from live data — used by the fit planner. */
export function makeBulletRef(
  data: ResumeData,
  section: BulletSection,
  entryIndex: number,
  bulletIndex: number
): TargetRef | null {
  const bullets = getEntryBullets(data, section, entryIndex);
  if (!bullets || bulletIndex < 0 || bulletIndex >= bullets.length) return null;
  const list =
    section === "experience"
      ? data.experience
      : section === "projects"
        ? data.projects
        : section === "education"
          ? data.education
          : data.customSections;
  return {
    kind: "bullet",
    section,
    entryId: list[entryIndex]?.id,
    entryIndex,
    bulletIndex,
    hash: hashText(bullets[bulletIndex]),
  };
}
