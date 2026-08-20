"use client";

// Review Studio — the optimizer's results ARE the product here. Every
// suggestion is one tap from being applied to a live CV preview; the score
// climbs as fixes land; the coverage matrix shows exactly what the job wants
// and what's still missing. Export and "open in builder" close the loop.
//
// Apply model: suggestions carry non-overlapping patches (each targets one
// distinct element, no removes — see lib/optimizer/prompts.ts), so the
// current document is a pure fold: base resumeData + every applied patch,
// in any order. Undo = drop the patch from the applied set and re-fold.
// No index remapping, no store surgery.

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowRight,
  Check,
  Copy,
  Download,
  FileText,
  Loader2,
  X,
} from "lucide-react";
import { ShellNav } from "@/components/ShellNav";
import { ScoreRing } from "@/components/shell/ScoreRing";
import { SmartResumePreview } from "@/components/shared";
import { ExportSurface } from "@/components/shared/ExportSurface";
import { ResumePreview, type BuilderTemplateId, type ThemeColor } from "@/components/builder";
import { OverviewPanel } from "./OverviewPanel";
import { JobFitPanel } from "./JobFitPanel";
import { NextStepsStrip } from "./NextStepsStrip";
import { ToolDrawer } from "@/components/toolkit/ToolDrawer";
import type { ToolId } from "@/lib/toolkit/tools";
import { SuggestionCard, type SuggestionStatus } from "./SuggestionCard";
import { applyCvToolCall } from "@/lib/chat/cvTools";
import { convertToPreviewData } from "@/lib/resumeDataConverter";
import { exportToPdf } from "@/utils/exportToPdf";
import { useResumeStore } from "@/store/useResumeStore";
import { isEmptyResume } from "@/lib/builder/sampleResume";
import { track } from "@/lib/analytics";
import { useT } from "@/lib/i18n/LanguageProvider";
import { resumeToText, type ResumeData } from "@/types/resume";
import type { DeepAnalysis, GroundedSuggestion, JdRequirement } from "@/lib/optimizer/types";
import type { AnalyzeMeta } from "@/lib/optimizer/stream";

type StatusMap = Record<string, "applied" | "dismissed">;

const CATEGORY_LABEL: Record<GroundedSuggestion["category"], string> = {
  ats: "ATS & keywords",
  impact: "Impact",
  clarity: "Clarity",
};

export function ReviewStudio({
  analysisId,
  jobTitle,
  raw,
  cvText,
  createdAt,
}: {
  analysisId: string;
  jobTitle: string | null;
  raw: Record<string, unknown>;
  cvText: string;
  createdAt: string;
}) {
  const { t } = useT();
  const router = useRouter();
  void createdAt;

  const isV2 = raw?.schemaVersion === 2 && !!raw?.resumeData && Array.isArray(raw?.suggestions);
  const analysis = raw as unknown as DeepAnalysis & { meta?: AnalyzeMeta; suggestionState?: StatusMap };

  // ── Review state ──────────────────────────────────────────────────────────
  const [statusMap, setStatusMap] = useState<StatusMap>(
    () => (analysis.suggestionState && typeof analysis.suggestionState === "object" ? analysis.suggestionState : {})
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [railView, setRailView] = useState<"overview" | "fit" | "fixes">("overview");
  const [mobilePane, setMobilePane] = useState<"review" | "preview">("review");
  const [pulse, setPulse] = useState(0);

  // Design state for the preview + export (same defaults as the old results page).
  const [template, setTemplate] = useState<BuilderTemplateId>("ivy-league");
  const [color, setColor] = useState<ThemeColor>("indigo");
  const [fontLevel, setFontLevel] = useState(5);
  const [spacingLevel, setSpacingLevel] = useState(5);

  // Cover letter drawer.
  const [coverOpen, setCoverOpen] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [coverBusy, setCoverBusy] = useState(false);
  const [coverPdfBusy, setCoverPdfBusy] = useState(false);
  const [coverCopied, setCoverCopied] = useState(false);

  const [exporting, setExporting] = useState(false);
  const [openTool, setOpenTool] = useState<ToolId | null>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    track("results_viewed", {
      match_score: typeof analysis.overallScore === "number" ? analysis.overallScore : null,
      schema_version: isV2 ? 2 : 1,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Persistence (debounced PATCH of the status map) ───────────────────────
  const patchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistStatus = (next: StatusMap) => {
    if (patchTimer.current) clearTimeout(patchTimer.current);
    patchTimer.current = setTimeout(() => {
      void fetch(`/api/analyze/${analysisId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suggestionState: next }),
      }).catch(() => {});
    }, 800);
  };
  const setStatus = (id: string, status: SuggestionStatus | null) => {
    setStatusMap((prev) => {
      const next = { ...prev };
      if (status === null || status === "pending") delete next[id];
      else next[id] = status;
      persistStatus(next);
      return next;
    });
  };

  // ── Derived document + score ──────────────────────────────────────────────
  const suggestions = useMemo<GroundedSuggestion[]>(
    () => (isV2 ? analysis.suggestions : []),
    [isV2, analysis.suggestions]
  );
  const baseResume = (isV2 ? analysis.resumeData : null) as ResumeData | null;

  const addedSkillReqIds = useMemo(() => {
    const set = new Set<string>();
    for (const [key, value] of Object.entries(statusMap)) {
      if (value === "applied" && key.startsWith("addskill:")) set.add(key.slice("addskill:".length));
    }
    return set;
  }, [statusMap]);

  const appliedSuggestions = useMemo(
    () => suggestions.filter((s) => statusMap[s.id] === "applied" && s.grounded && s.patch),
    [suggestions, statusMap]
  );

  const currentResume = useMemo<ResumeData | null>(() => {
    if (!baseResume) return null;
    let acc = baseResume;
    for (const s of appliedSuggestions) {
      if (s.patch) acc = applyCvToolCall(acc, s.patch.name, s.patch.input);
    }
    if (addedSkillReqIds.size > 0 && isV2) {
      const labels = analysis.jdRequirements
        .filter((r) => addedSkillReqIds.has(r.id))
        .map((r) => r.skillLabel || r.text.slice(0, 40));
      if (labels.length > 0) {
        acc = applyCvToolCall(acc, "set_skills", { skills: [...acc.skills, ...labels] });
      }
    }
    return acc;
  }, [baseResume, appliedSuggestions, addedSkillReqIds, isV2, analysis.jdRequirements]);

  const originalScore = analysis.scoreComparison?.original?.total ?? analysis.overallScore ?? 0;
  const optimizedCeiling = analysis.scoreComparison?.optimized?.total ?? originalScore;
  const appliedImpact = appliedSuggestions.reduce((sum, s) => sum + s.scoreImpact, 0);
  const displayScore = Math.min(optimizedCeiling, originalScore + appliedImpact);

  const suggestionIdByReq = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of suggestions) {
      if (statusMap[s.id] === "dismissed") continue;
      for (const reqId of s.linkedRequirementIds) {
        if (!map.has(reqId)) map.set(reqId, s.id);
      }
    }
    return map;
  }, [suggestions, statusMap]);

  const grouped = useMemo(() => {
    const order: GroundedSuggestion["category"][] = ["impact", "ats", "clarity"];
    return order
      .map((cat) => ({
        cat,
        items: suggestions
          .filter((s) => s.category === cat)
          .sort((a, b) => b.scoreImpact - a.scoreImpact),
      }))
      .filter((g) => g.items.length > 0);
  }, [suggestions]);

  const pendingCount = suggestions.filter((s) => !statusMap[s.id]).length;
  const activeSuggestions = useMemo(
    () => suggestions.filter((s) => statusMap[s.id] !== "dismissed"),
    [suggestions, statusMap]
  );
  const appliedByCategory = useMemo(() => {
    const acc: Record<"ats" | "impact" | "clarity", number> = { ats: 0, impact: 0, clarity: 0 };
    for (const s of appliedSuggestions) acc[s.category] += s.scoreImpact;
    return acc;
  }, [appliedSuggestions]);
  const missingReqCount = useMemo(() => {
    const covByReq = new Map((analysis.coverage ?? []).map((c) => [c.requirementId, c.status]));
    return (analysis.jdRequirements ?? []).filter(
      (r) => !addedSkillReqIds.has(r.id) && (covByReq.get(r.id) ?? "missing") === "missing"
    ).length;
  }, [analysis.coverage, analysis.jdRequirements, addedSkillReqIds]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const applySuggestion = (s: GroundedSuggestion) => {
    setStatus(s.id, "applied");
    setExpandedId(null);
    setPulse((p) => p + 1);
    track("suggestion_applied", { category: s.category, score_impact: s.scoreImpact });
  };

  const addSkill = (req: JdRequirement) => {
    setStatus(`addskill:${req.id}`, "applied");
    setPulse((p) => p + 1);
    track("suggestion_applied", { category: "ats", source: "coverage_add_skill" });
  };

  const jumpToSuggestion = (id: string) => {
    setExpandedId(id);
    setRailView("fixes");
    setMobilePane("review");
    requestAnimationFrame(() => {
      document.getElementById(`suggestion-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };

  const applyAll = (cat: GroundedSuggestion["category"]) => {
    const targets = suggestions.filter(
      (s) => s.category === cat && !statusMap[s.id] && s.grounded && s.patch
    );
    setStatusMap((prev) => {
      const next = { ...prev };
      for (const s of targets) next[s.id] = "applied";
      persistStatus(next);
      return next;
    });
    setPulse((p) => p + 1);
    track("suggestion_applied", { category: cat, bulk: true, count: targets.length });
  };

  const openInBuilder = () => {
    if (!currentResume) return;
    const store = useResumeStore.getState();
    const existing = convertToPreviewData(store.resumeData);
    if (!isEmptyResume(existing) && !window.confirm(t("Replace your builder CV with this reviewed version?"))) {
      return;
    }
    store.setResumeData(currentResume);
    router.push("/builder");
  };

  const handleExport = async () => {
    if (!exportRef.current) return;
    setExporting(true);
    try {
      await exportToPdf(exportRef.current, `${(currentResume?.personalInfo.name || "My").replace(/\s+/g, "-")}-CV`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("Export failed"));
    } finally {
      setExporting(false);
    }
  };

  const generateCoverLetter = async () => {
    const meta = analysis.meta;
    if (!meta || coverBusy) return;
    setCoverBusy(true);
    try {
      const res = await fetch("/api/cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cvText:
            analysis.parseDegraded || !currentResume
              ? meta.cvTextUsed || cvText
              : resumeToText(currentResume),
          jobDescription: meta.jobDescriptionUsed || "",
          jobTitle: meta.jobTitle,
          companyName: meta.companyName,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || t("Cover letter generation failed"));
      setCoverLetter(data.coverLetter);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("Cover letter generation failed"));
    } finally {
      setCoverBusy(false);
    }
  };

  const downloadCoverLetterPdf = async () => {
    if (!coverLetter || coverPdfBusy) return;
    setCoverPdfBusy(true);
    try {
      const res = await fetch("/api/export-cover-letter-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: coverLetter, fileName: "Cover-Letter.pdf" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || t("PDF export failed"));
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Cover-Letter.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("PDF export failed"));
    } finally {
      setCoverPdfBusy(false);
    }
  };

  // ── Legacy payloads (pre-pipeline rows): read-only view ───────────────────
  if (!isV2 || !baseResume || !currentResume) {
    return <LegacyResultView jobTitle={jobTitle} analysis={analysis} />;
  }

  const previewData = convertToPreviewData(currentResume);

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col">
      <ShellNav active="optimizer" />

      {/* Header strip */}
      <div className="bg-white border-b border-stone-200">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-3 flex items-center gap-4">
          <ScoreRing value={displayScore} size={56} variant="band" animate={false} />
          {appliedImpact > 0 ? (
            <span className="px-2 py-0.5 rounded-full bg-brand-gold/15 text-[#8a6608] text-sm font-semibold tabular-nums">
              +{Math.min(appliedImpact, optimizedCeiling - originalScore)}
            </span>
          ) : null}
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-brand-ink truncate">{jobTitle || t("General Role")}</div>
            <div className="text-sm text-stone-400">
              {pendingCount > 0 ? `${pendingCount} ${t("suggestions left")}` : t("All reviewed")}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {analysis.meta ? (
              <button
                type="button"
                onClick={() => setCoverOpen(true)}
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-sm border border-stone-300 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors"
              >
                <FileText className="w-4 h-4" /> {t("Cover letter")}
              </button>
            ) : null}
            <button
              type="button"
              onClick={openInBuilder}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-sm border border-stone-300 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors"
            >
              {t("Open in builder")} <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-sm bg-brand-navy text-white text-sm font-semibold hover:bg-brand-navy-hover disabled:opacity-60 transition-colors"
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {t("Export")}
            </button>
          </div>
        </div>
        {/* Mobile pane switch */}
        <div className="sm:hidden border-t border-stone-100 grid grid-cols-2">
          {(["review", "preview"] as const).map((pane) => (
            <button
              key={pane}
              type="button"
              onClick={() => setMobilePane(pane)}
              className={`py-2.5 text-sm font-medium ${
                mobilePane === pane ? "text-brand-navy border-b-2 border-brand-navy" : "text-stone-400"
              }`}
            >
              {pane === "review" ? t("Suggestions") : t("Preview")}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 py-5 grid grid-cols-1 sm:grid-cols-[400px_1fr] gap-5 min-h-0">
        {/* Rail */}
        <div className={`space-y-4 sm:overflow-y-auto sm:max-h-[calc(100vh-160px)] sm:pr-1 ${mobilePane === "preview" ? "hidden sm:block" : ""}`}>
          {/* Rail segments: Overview (feedback) / Job fit / Fixes */}
          <div className="flex items-center gap-1 p-1 rounded-full bg-stone-100 sticky top-0 z-10">
            {(
              [
                { id: "overview" as const, label: t("Overview"), count: 0 },
                { id: "fit" as const, label: t("Job fit"), count: missingReqCount },
                { id: "fixes" as const, label: t("Fixes"), count: pendingCount },
              ]
            ).map((seg) => (
              <button
                key={seg.id}
                type="button"
                onClick={() => {
                  setRailView(seg.id);
                  track("review_tab_changed", { tab: seg.id });
                }}
                className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                  railView === seg.id ? "bg-white text-brand-navy shadow-sm" : "text-stone-500 hover:text-stone-700"
                }`}
              >
                {seg.label}
                {seg.count > 0 ? (
                  <span className="px-1.5 rounded-full bg-stone-200/80 text-stone-600 text-sm tabular-nums leading-5">
                    {seg.count}
                  </span>
                ) : null}
              </button>
            ))}
          </div>

          {railView === "overview" ? (
            <OverviewPanel
              analysis={analysis}
              resumeData={baseResume}
              activeSuggestions={activeSuggestions}
              appliedByCategory={appliedByCategory}
              onJumpToSuggestion={jumpToSuggestion}
            />
          ) : null}

          {railView === "fit" ? (
            <JobFitPanel
              analysis={analysis}
              addedSkillReqIds={addedSkillReqIds}
              onAddSkill={addSkill}
              onJumpToSuggestion={jumpToSuggestion}
              suggestionIdByReq={suggestionIdByReq}
            />
          ) : null}

          {railView === "fixes"
            ? grouped.map(({ cat, items }) => {
                const applicable = items.filter((s) => !statusMap[s.id] && s.grounded && s.patch);
                return (
                  <div key={cat} className="space-y-2">
                    <div className="flex items-center justify-between px-0.5">
                      <span className="text-sm font-semibold text-brand-navy">{t(CATEGORY_LABEL[cat])}</span>
                      {applicable.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => applyAll(cat)}
                          className="text-sm font-medium text-brand-navy hover:underline underline-offset-2"
                        >
                          {t("Apply all")}
                        </button>
                      ) : null}
                    </div>
                    {items.map((s) => (
                      <SuggestionCard
                        key={s.id}
                        suggestion={s}
                        status={statusMap[s.id] ?? "pending"}
                        expanded={expandedId === s.id}
                        onToggle={() => setExpandedId(expandedId === s.id ? null : s.id)}
                        onApply={() => applySuggestion(s)}
                        onUndo={() => setStatus(s.id, null)}
                        onDismiss={() => setStatus(s.id, "dismissed")}
                      />
                    ))}
                  </div>
                );
              })
            : null}

          <NextStepsStrip
            jobTitle={analysis.meta?.jobTitle || jobTitle || ""}
            onCoverLetter={() => setCoverOpen(true)}
            onOpenTool={setOpenTool}
          />
        </div>

        {/* Preview — gold pulse on every apply (keyed remount restarts the animation) */}
        <div
          className={`min-h-[480px] sm:max-h-[calc(100vh-160px)] rounded-sm border border-stone-200 overflow-hidden bg-stone-100 ${
            mobilePane === "review" ? "hidden sm:block" : ""
          }`}
        >
          <div key={pulse} className={pulse > 0 ? "h-full animate-[reviewPulse_0.9s_ease-out]" : "h-full"}>
            <SmartResumePreview
              data={previewData}
              templateId={template}
              themeColor={color}
              showToolbar={true}
              onTemplateChange={setTemplate}
              onColorChange={setColor}
              fontLevel={fontLevel}
              spacingLevel={spacingLevel}
              onFontLevelChange={setFontLevel}
              onSpacingLevelChange={setSpacingLevel}
              minScale={0.4}
              maxScale={0.95}
            />
          </div>
          <style>{`@keyframes reviewPulse { 0% { box-shadow: inset 0 0 0 3px rgba(184,134,11,0.55); } 100% { box-shadow: inset 0 0 0 3px rgba(184,134,11,0); } }`}</style>
        </div>
      </div>

      {/* Toolkit tools, prefilled from this analysis (patched CV + job context) */}
      <ToolDrawer
        toolId={openTool}
        builderCvText=""
        prefill={{
          cvText: currentResume && !analysis.parseDegraded ? resumeToText(currentResume) : cvText,
          ...(analysis.meta?.jobDescriptionUsed ? { jobDescription: analysis.meta.jobDescriptionUsed } : {}),
          ...(analysis.meta?.jobTitle ? { jobTitle: analysis.meta.jobTitle, targetRole: analysis.meta.jobTitle } : {}),
          ...(analysis.meta?.companyName && analysis.meta.companyName !== "Target Company"
            ? { companyName: analysis.meta.companyName }
            : {}),
        }}
        onClose={() => setOpenTool(null)}
      />

      {/* Cover letter drawer */}
      {coverOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={() => setCoverOpen(false)}>
          <div
            className="w-full max-w-lg h-full bg-white shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
              <span className="text-sm font-semibold text-brand-navy">{t("Cover letter")}</span>
              <button
                type="button"
                onClick={() => setCoverOpen(false)}
                aria-label={t("Close")}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 min-h-0 p-5 flex flex-col gap-3">
              {coverLetter ? (
                <textarea
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  className="flex-1 w-full resize-none rounded-sm border border-stone-200 p-4 text-sm leading-relaxed text-stone-800 focus:outline-none focus:border-brand-navy/40"
                />
              ) : (
                <div className="flex-1 grid place-items-center">
                  <button
                    type="button"
                    onClick={generateCoverLetter}
                    disabled={coverBusy}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-sm bg-brand-navy text-white text-sm font-semibold hover:bg-brand-navy-hover disabled:opacity-60 transition-colors"
                  >
                    {coverBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                    {coverBusy ? t("Writing…") : t("Generate")}
                  </button>
                </div>
              )}
              {coverLetter ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(coverLetter);
                      setCoverCopied(true);
                      setTimeout(() => setCoverCopied(false), 1500);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-sm border border-stone-300 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors"
                  >
                    {coverCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    {t("Copy")}
                  </button>
                  <button
                    type="button"
                    onClick={downloadCoverLetterPdf}
                    disabled={coverPdfBusy}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-sm bg-brand-navy text-white text-sm font-semibold hover:bg-brand-navy-hover disabled:opacity-60 transition-colors"
                  >
                    {coverPdfBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    PDF
                  </button>
                  <button
                    type="button"
                    onClick={generateCoverLetter}
                    disabled={coverBusy}
                    className="ml-auto text-sm text-stone-500 hover:text-stone-800 transition-colors"
                  >
                    {coverBusy ? t("Writing…") : t("Regenerate")}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {/* Mobile action bar */}
      <div className="sm:hidden sticky bottom-0 bg-white border-t border-stone-200 px-4 py-2.5 flex items-center gap-2">
        {analysis.meta ? (
          <button
            type="button"
            onClick={() => setCoverOpen(true)}
            className="p-2.5 rounded-sm border border-stone-300 text-stone-600"
            aria-label={t("Cover letter")}
          >
            <FileText className="w-4 h-4" />
          </button>
        ) : null}
        <button
          type="button"
          onClick={openInBuilder}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-sm border border-stone-300 text-sm font-medium text-stone-700"
        >
          {t("Open in builder")}
        </button>
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-sm bg-brand-navy text-white text-sm font-semibold disabled:opacity-60"
        >
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {t("Export")}
        </button>
      </div>

      {/* Off-screen export render — same density as the visible preview. */}
      <ExportSurface ref={exportRef} fontLevel={fontLevel} spacingLevel={spacingLevel}>
        <ResumePreview data={previewData} templateId={template} themeColor={color} />
      </ExportSurface>
    </div>
  );
}

// ── Legacy (schemaVersion < 2) read-only view ────────────────────────────────

function LegacyResultView({
  jobTitle,
  analysis,
}: {
  jobTitle: string | null;
  analysis: Partial<DeepAnalysis>;
}) {
  const { t } = useT();
  const [copied, setCopied] = useState(false);
  const score = analysis.scoreComparison?.original?.total ?? analysis.overallScore;

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col">
      <ShellNav active="optimizer" />
      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-8 py-10 space-y-6">
        <div className="flex items-center gap-4">
          {typeof score === "number" ? <ScoreRing value={score} size={72} variant="band" /> : null}
          <div>
            <h1 className="font-serif text-2xl font-light text-brand-ink">{jobTitle || t("Analysis")}</h1>
            {analysis.summary ? <p className="text-sm text-stone-500 mt-1">{analysis.summary}</p> : null}
          </div>
        </div>

        {(analysis.improvements ?? []).length > 0 ? (
          <div className="bg-white rounded-sm border border-stone-200 p-5 space-y-2.5">
            {(analysis.improvements ?? []).map((imp) => (
              <div key={imp.id} className="flex items-start gap-2.5">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                <p className="text-sm text-stone-700 leading-relaxed">{imp.text}</p>
              </div>
            ))}
          </div>
        ) : null}

        {analysis.optimizedCV ? (
          <div className="bg-white rounded-sm border border-stone-200">
            <div className="flex items-center justify-between px-5 py-3 border-b border-stone-100">
              <span className="text-sm font-semibold text-brand-navy">{t("Optimized CV")}</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(analysis.optimizedCV ?? "");
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-navy hover:underline underline-offset-2"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {t("Copy")}
              </button>
            </div>
            <pre className="p-5 text-sm text-stone-700 whitespace-pre-wrap font-sans leading-relaxed">
              {analysis.optimizedCV}
            </pre>
          </div>
        ) : null}
      </main>
    </div>
  );
}
