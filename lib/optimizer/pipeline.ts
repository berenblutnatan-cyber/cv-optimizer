// The 3-pass deep-analysis pipeline. ONE entry point — runOptimizerPipeline —
// called by BOTH the production /api/analyze route and the eval harness
// (scripts/optimizer-eval.ts), so what we test is exactly what we ship.
//
//   Pass 0 PARSE    (Sonnet)  cvText → ResumeData        [skipped when given]
//   Pass 1 AUDIT    (Opus)    rubric score + JD requirements + coverage
//                             matrix + per-section critique
//   Pass 2 REWRITE  (Opus)    10-20 grounded suggestions with patches
//   Finalize        (code)    grounding verifier, patch fold, score clamp,
//                             legacy projection → DeepAnalysis

import type Anthropic from "@anthropic-ai/sdk";
import { snapshotForPrompt } from "@/lib/chat/cvTools";
import { resumeToText, type ResumeData } from "@/types/resume";
import { cleanTitle, inferJobTitleFromDescription, type DeepDiveAnswers } from "./prompt";
import {
  AUDIT_SYSTEM_PROMPT,
  EMIT_AUDIT_TOOL,
  EMIT_REWRITE_TOOL,
  REWRITE_SYSTEM_PROMPT,
  buildAuditPrompt,
  buildRewritePrompt,
} from "./prompts";
import { parseCvText } from "./parseCv";
import {
  applyVerdict,
  detectCareerChange,
  detectTrack,
  knowledgeFor,
  type Goal,
  type Seniority,
  type Track,
} from "@/lib/knowledge";
import {
  clampOptimizedScore,
  groundAndFold,
  groundingSources,
  projectKeywords,
  projectSuggestedChanges,
  verifyCoverage,
} from "./ground";
import type {
  DeepAnalysis,
  DeepAudit,
  EvidenceRef,
  GapSeverity,
  JdRequirement,
  LegacyImprovement,
  RequirementCoverage,
  RewriteResult,
  ScoreWithBreakdown,
  SectionCritique,
} from "./types";

export const AUDIT_MODEL = "claude-opus-4-8";
export const REWRITE_MODEL = "claude-opus-4-8";

export type PipelineStage = "parsing" | "auditing" | "rewriting" | "finalizing";

export type PipelineInput = {
  cvText: string;
  /** Skip the parse pass when the caller already has structured data
   *  (e.g. score-deep, or a builder-originated analysis). */
  resumeData?: ResumeData;
  jobTitle?: string;
  jobDescription?: string;
  companyName?: string;
  userSummary?: string;
  deepDiveAnswers?: DeepDiveAnswers | null;
  mode?: "quick" | "specific_role";
  // Persona hints (all optional — coaching degrades gracefully without them).
  /** Overrides track detection from the job title/JD. */
  track?: Track;
  seniority?: Seniority | null;
  goal?: Goal | null;
};

export type PipelineProgress = {
  onStage?: (stage: PipelineStage) => void;
  /** Fires as soon as the audit lands — lets the client early-reveal the
   *  score and coverage while the rewrite pass is still running. */
  onAudit?: (audit: DeepAudit) => void;
};

export class PipelineError extends Error {
  stage: PipelineStage;
  reason: "truncated" | "model_error" | "invalid_output";
  constructor(stage: PipelineStage, reason: PipelineError["reason"], message: string) {
    super(message);
    this.stage = stage;
    this.reason = reason;
  }
}

// ── Tool-output validators (house style: hand-rolled, tolerant, clamping) ───

const s = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const sa = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean) : [];
const clamp = (v: unknown, lo: number, hi: number, fallback: number): number => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback;
};

function toScore(v: unknown, fallbackTotal = 0): ScoreWithBreakdown {
  const o = (v ?? {}) as Record<string, unknown>;
  const b = (o.breakdown ?? {}) as Record<string, unknown>;
  const total = clamp(o.total, 0, 100, fallbackTotal);
  return {
    total,
    breakdown: {
      ats: clamp(b.ats, 0, 100, total),
      impact: clamp(b.impact, 0, 100, total),
      clarity: clamp(b.clarity, 0, 100, total),
    },
  };
}

const CATEGORIES = new Set(["ats", "impact", "clarity"]);
const REQ_KINDS = new Set(["must_have", "nice_to_have"]);
const REQ_CATEGORIES = new Set(["skill", "experience", "education", "domain", "soft", "other"]);
const COVERAGE_STATUSES = new Set(["strong", "partial", "missing"]);
const GAP_SEVERITIES = new Set(["critical", "moderate", "minor"]);
const CV_SECTIONS = new Set([
  "summary", "experience", "education", "skills", "projects", "languages", "certifications", "other",
]);
const CRITIQUE_SECTIONS = new Set(["summary", "experience", "education", "skills", "projects", "overall"]);

function toImprovements(v: unknown): LegacyImprovement[] {
  return (Array.isArray(v) ? v : [])
    .map((item, i): LegacyImprovement | null => {
      const o = (item ?? {}) as Record<string, unknown>;
      const text = s(o.text);
      if (!text) return null;
      const cat = s(o.category);
      return {
        id: `imp_${i}`,
        text,
        scoreImpact: clamp(o.scoreImpact, 1, 15, 5),
        category: (CATEGORIES.has(cat) ? cat : "impact") as LegacyImprovement["category"],
      };
    })
    .filter((x): x is LegacyImprovement => x !== null)
    .sort((a, b) => b.scoreImpact - a.scoreImpact);
}

function validateAudit(input: Record<string, unknown>): DeepAudit {
  const jdRequirements: JdRequirement[] = (Array.isArray(input.jdRequirements) ? input.jdRequirements : [])
    .map((item, i): JdRequirement | null => {
      const o = (item ?? {}) as Record<string, unknown>;
      const text = s(o.text);
      if (!text) return null;
      const kind = s(o.kind);
      const category = s(o.category);
      const skillLabel = s(o.skillLabel);
      return {
        id: s(o.id) || `req_${i + 1}`,
        text,
        kind: (REQ_KINDS.has(kind) ? kind : "must_have") as JdRequirement["kind"],
        category: (REQ_CATEGORIES.has(category) ? category : "other") as JdRequirement["category"],
        ...(skillLabel ? { skillLabel } : {}),
      };
    })
    .filter((x): x is JdRequirement => x !== null);

  const validIds = new Set(jdRequirements.map((r) => r.id));

  const coverage: RequirementCoverage[] = (Array.isArray(input.coverage) ? input.coverage : [])
    .map((item): RequirementCoverage | null => {
      const o = (item ?? {}) as Record<string, unknown>;
      const requirementId = s(o.requirementId);
      if (!validIds.has(requirementId)) return null;
      const status = s(o.status);
      const gapSeverity = s(o.gapSeverity);
      const evidence: EvidenceRef[] = (Array.isArray(o.evidence) ? o.evidence : [])
        .map((e): EvidenceRef | null => {
          const eo = (e ?? {}) as Record<string, unknown>;
          const quote = s(eo.quote);
          if (!quote) return null;
          const section = s(eo.section);
          const index = Number(eo.index);
          const bulletIndex = Number(eo.bulletIndex);
          return {
            quote,
            section: (CV_SECTIONS.has(section) ? section : "other") as EvidenceRef["section"],
            ...(Number.isInteger(index) && index >= 0 ? { index } : {}),
            ...(Number.isInteger(bulletIndex) && bulletIndex >= 0 ? { bulletIndex } : {}),
          };
        })
        .filter((x): x is EvidenceRef => x !== null);
      const st = (COVERAGE_STATUSES.has(status) ? status : "missing") as RequirementCoverage["status"];
      return {
        requirementId,
        status: st,
        evidence,
        gapSeverity:
          st === "strong" ? null : ((GAP_SEVERITIES.has(gapSeverity) ? gapSeverity : "moderate") as GapSeverity),
        note: s(o.note),
      };
    })
    .filter((x): x is RequirementCoverage => x !== null);

  // Every requirement gets a coverage row — synthesize "missing" for any the
  // model skipped so the matrix is always complete.
  const covered = new Set(coverage.map((c) => c.requirementId));
  for (const req of jdRequirements) {
    if (!covered.has(req.id)) {
      coverage.push({
        requirementId: req.id,
        status: "missing",
        evidence: [],
        gapSeverity: req.kind === "must_have" ? "moderate" : "minor",
        note: "Not addressed in the CV.",
      });
    }
  }

  const sectionCritiques: SectionCritique[] = (Array.isArray(input.sectionCritiques) ? input.sectionCritiques : [])
    .map((item): SectionCritique | null => {
      const o = (item ?? {}) as Record<string, unknown>;
      const section = s(o.section);
      const verdict = s(o.verdict);
      if (!CRITIQUE_SECTIONS.has(section) || !verdict) return null;
      const experienceIndex = Number(o.experienceIndex);
      return {
        section: section as SectionCritique["section"],
        ...(Number.isInteger(experienceIndex) && experienceIndex >= 0 ? { experienceIndex } : {}),
        verdict,
        issues: sa(o.issues),
      };
    })
    .filter((x): x is SectionCritique => x !== null);

  return {
    originalScore: toScore(input.originalScore),
    summary: s(input.summary),
    strengths: sa(input.strengths).slice(0, 4),
    improvements: toImprovements(input.improvements),
    missingKeySkills: sa(input.missingKeySkills).slice(0, 5),
    jdRequirements,
    coverage,
    sectionCritiques,
  };
}

function validateRewrite(input: Record<string, unknown>, audit: DeepAudit): RewriteResult {
  const validReqIds = new Set(audit.jdRequirements.map((r) => r.id));
  const suggestions = (Array.isArray(input.suggestions) ? input.suggestions : [])
    .map((item, i): RewriteResult["suggestions"][number] | null => {
      const o = (item ?? {}) as Record<string, unknown>;
      const after = s(o.after);
      if (!after) return null;
      const cat = s(o.category);
      const patchRaw = (o.patch ?? null) as Record<string, unknown> | null;
      const patchName = patchRaw ? s(patchRaw.name) : "";
      const patchInput = patchRaw && patchRaw.input && typeof patchRaw.input === "object"
        ? (patchRaw.input as Record<string, unknown>)
        : null;
      const before = s(o.before);
      return {
        id: s(o.id) || `sug_${i + 1}`,
        title: s(o.title) || after.slice(0, 60),
        rationale: s(o.rationale),
        linkedRequirementIds: sa(o.linkedRequirementIds).filter((id) => validReqIds.has(id)),
        category: (CATEGORIES.has(cat) ? cat : "impact") as "ats" | "impact" | "clarity",
        scoreImpact: clamp(o.scoreImpact, 1, 15, 5),
        section: s(o.section) || "CV",
        before: before || null,
        after,
        patch: patchName && patchInput ? { name: patchName, input: patchInput } : null,
      };
    })
    .filter((x): x is RewriteResult["suggestions"][number] => x !== null);

  return {
    suggestions,
    optimizedScore: toScore(input.optimizedScore, audit.originalScore.total),
    keywordsAdded: sa(input.keywordsAdded).slice(0, 8),
  };
}

// ── Model-call helper ───────────────────────────────────────────────────────

async function forcedToolCall(
  anthropic: Anthropic,
  stage: PipelineStage,
  params: {
    model: string;
    maxTokens: number;
    system: string;
    tool: typeof EMIT_AUDIT_TOOL | typeof EMIT_REWRITE_TOOL;
    user: string;
  }
): Promise<Record<string, unknown>> {
  let response: Awaited<ReturnType<Anthropic["messages"]["create"]>>;
  try {
    response = await anthropic.messages.create({
      model: params.model,
      max_tokens: params.maxTokens,
      system: params.system,
      tools: [params.tool],
      tool_choice: { type: "tool", name: params.tool.name },
      messages: [{ role: "user", content: params.user }],
    });
  } catch (err) {
    throw new PipelineError(stage, "model_error", err instanceof Error ? err.message : String(err));
  }
  if (response.stop_reason === "max_tokens") {
    throw new PipelineError(stage, "truncated", `model hit max_tokens during ${stage}`);
  }
  const toolUse = response.content.find((c) => c.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new PipelineError(stage, "invalid_output", `no tool_use block in ${stage} response`);
  }
  return toolUse.input as Record<string, unknown>;
}

// ── Pass 1 as a standalone (reused by /api/score-deep) ──────────────────────

export function resolveEffectiveJobTitle(input: PipelineInput): string {
  return (
    cleanTitle(input.jobTitle ?? "") ||
    (input.jobDescription
      ? inferJobTitleFromDescription(input.jobDescription, input.companyName ?? "")
      : "") ||
    (input.mode === "quick" ? "General Role" : "Role")
  );
}

export async function runAuditPass(
  anthropic: Anthropic,
  input: PipelineInput,
  opts?: { snapshot?: string }
): Promise<DeepAudit> {
  const effectiveJobTitle = resolveEffectiveJobTitle(input);
  const track = input.track ?? detectTrack(effectiveJobTitle, input.jobDescription);
  const user = buildAuditPrompt({
    cvText: input.cvText,
    snapshot: opts?.snapshot ?? (input.resumeData ? snapshotForPrompt(input.resumeData) : ""),
    effectiveJobTitle,
    jobDescription: input.jobDescription,
    companyName: input.companyName,
    mode: input.mode,
    knowledge: knowledgeFor({
      surface: "audit",
      track,
      seniority: input.seniority ?? null,
      goal: input.goal ?? null,
    }),
  });
  const raw = await forcedToolCall(anthropic, "auditing", {
    model: AUDIT_MODEL,
    maxTokens: 16000,
    system: AUDIT_SYSTEM_PROMPT,
    tool: EMIT_AUDIT_TOOL,
    user,
  });
  const audit = validateAudit(raw);
  audit.coverage = verifyCoverage(
    audit.coverage,
    input.resumeData ? groundingSources(input.cvText, input.resumeData) : [input.cvText]
  );
  return audit;
}

// ── The full pipeline ───────────────────────────────────────────────────────

export async function runOptimizerPipeline(
  anthropic: Anthropic,
  input: PipelineInput,
  progress: PipelineProgress = {}
): Promise<DeepAnalysis> {
  const effectiveJobTitle = resolveEffectiveJobTitle(input);
  const resolvedTrack: Track = input.track ?? detectTrack(effectiveJobTitle, input.jobDescription);

  // Pass 0 — parse (skipped when structured data was provided)
  let resumeData = input.resumeData ?? null;
  let degraded = false;
  if (!resumeData) {
    progress.onStage?.("parsing");
    try {
      const parsed = await parseCvText(anthropic, input.cvText);
      resumeData = parsed.resumeData;
      degraded = parsed.degraded;
    } catch (err) {
      throw new PipelineError("parsing", "model_error", err instanceof Error ? err.message : String(err));
    }
  }
  const snapshot = degraded ? "" : snapshotForPrompt(resumeData);

  // Pass 1 — deep audit
  progress.onStage?.("auditing");
  const audit = await runAuditPass(anthropic, { ...input, resumeData }, { snapshot });
  progress.onAudit?.(audit);

  // Pass 2 — rewrite
  progress.onStage?.("rewriting");
  const rewriteRaw = await forcedToolCall(anthropic, "rewriting", {
    model: REWRITE_MODEL,
    maxTokens: 16000,
    system: REWRITE_SYSTEM_PROMPT,
    tool: EMIT_REWRITE_TOOL,
    user: buildRewritePrompt({
      snapshot,
      auditJson: JSON.stringify(audit),
      effectiveJobTitle,
      jobDescription: input.jobDescription,
      companyName: input.companyName,
      userSummary: input.userSummary,
      deepDiveAnswers: input.deepDiveAnswers,
      degraded,
      knowledge: knowledgeFor({
        surface: "rewrite",
        track: resolvedTrack,
        seniority: input.seniority ?? null,
        goal: input.goal ?? null,
        careerChange: detectCareerChange(resumeData.experience[0]?.role ?? "", resolvedTrack),
      }),
    }),
  });
  const rewrite = validateRewrite(rewriteRaw, audit);

  // Finalize — pure code
  progress.onStage?.("finalizing");
  const { suggestions, optimizedResumeData } = groundAndFold({
    suggestions: rewrite.suggestions,
    resumeData,
    cvText: input.cvText,
    degraded,
  });
  const optimizedScore = clampOptimizedScore(audit.originalScore, rewrite.optimizedScore);
  const keywords = projectKeywords(audit, audit.coverage, rewrite.keywordsAdded);

  return {
    schemaVersion: 2,
    // Apply-strategy verdict (job-description-analyzer 5-band rubric) —
    // computed in code from the audit score, never model-emitted.
    applyVerdict: applyVerdict(audit.originalScore.total),
    track: resolvedTrack,
    // Legacy projection — byte-compatible with the v1 payload consumers.
    scoreComparison: {
      original: audit.originalScore,
      optimized: optimizedScore,
      improvement: optimizedScore.total - audit.originalScore.total,
    },
    overallScore: audit.originalScore.total,
    summary: audit.summary,
    strengths: audit.strengths,
    improvements: audit.improvements,
    missingKeySkills: audit.missingKeySkills,
    suggestedChanges: projectSuggestedChanges(suggestions),
    keywords,
    optimizedCV: degraded ? input.cvText : resumeToText(optimizedResumeData),
    // Rich structures.
    jdRequirements: audit.jdRequirements,
    coverage: audit.coverage,
    sectionCritiques: audit.sectionCritiques,
    suggestions,
    resumeData,
    optimizedResumeData,
    parseDegraded: degraded,
  };
}
