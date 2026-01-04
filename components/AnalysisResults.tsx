"use client";

import { useState } from "react";

interface AnalysisResult {
  overallScore: number;
  summary: string;
  strengths: string[];
  improvements: string[];
  suggestedChanges: {
    id?: string;
    section: string;
    original: string;
    suggested: string;
    reason: string;
  }[];
  keywords: {
    missing: string[];
    present: string[];
  };
  missingKeySkills?: string[];
  optimizedCV: string;
}

interface AnalysisResultsProps {
  results: AnalysisResult;
  coverLetterTab?: {
    title?: string;
    subtitle?: string;
    text: string;
    onTextChange: (text: string) => void;
    onGenerate: () => void;
    isGenerating: boolean;
    onCopy: () => void;
    copied: boolean;
    onDownloadPdf: () => void;
    isDownloadingPdf: boolean;
  };
}

export function AnalysisResults({ results, coverLetterTab }: AnalysisResultsProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "changes" | "optimized" | "cover-letter">("overview");
  const [copiedOptimized, setCopiedOptimized] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const scoreTone =
    results.overallScore >= 80 ? "bg-emerald-400/15 border-emerald-300/25 text-emerald-100" : results.overallScore >= 60
      ? "bg-amber-400/15 border-amber-300/25 text-amber-100"
      : "bg-rose-400/15 border-rose-300/25 text-rose-100";

  const handleCopyOptimized = () => {
    navigator.clipboard.writeText(results.optimizedCV);
    setCopiedOptimized(true);
    setTimeout(() => setCopiedOptimized(false), 2000);
  };

  const handleDownloadPdf = async () => {
    try {
      setDownloadingPdf(true);
      const response = await fetch("/api/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: results.optimizedCV,
          fileName: "Optimized-CV.pdf",
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to generate PDF");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Optimized-CV.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Failed to download PDF");
    } finally {
      setDownloadingPdf(false);
    }
  };

  const missingKeySkills =
    (results.missingKeySkills && results.missingKeySkills.length > 0
      ? results.missingKeySkills
      : results.keywords?.missing) || [];

  const getLearningLinks = (skill: string) => {
    const q = encodeURIComponent(`${skill} course`);
    return [
      { label: "Coursera", href: `https://www.coursera.org/search?query=${q}` },
      { label: "Udemy", href: `https://www.udemy.com/courses/search/?q=${q}` },
      { label: "edX", href: `https://www.edx.org/search?q=${q}` },
      { label: "YouTube", href: `https://www.youtube.com/results?search_query=${q}` },
    ];
  };

  return (
    <div className="bg-white/5 rounded-3xl border border-white/10 overflow-hidden backdrop-blur shadow-[0_30px_90px_rgba(0,0,0,0.45)] h-full flex flex-col min-h-0">
      {/* Tabs */}
      <div className="border-b border-white/10 bg-white/5">
        <div className="flex p-1.5 gap-2">
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors rounded-2xl border ${
              activeTab === "overview"
                ? "bg-indigo-500 text-white border-white/10"
                : "bg-white/0 text-white/70 border-white/0 hover:bg-white/5 hover:text-white"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("changes")}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors rounded-2xl border ${
              activeTab === "changes"
                ? "bg-indigo-500 text-white border-white/10"
                : "bg-white/0 text-white/70 border-white/0 hover:bg-white/5 hover:text-white"
            }`}
          >
            Suggested Changes ({results.suggestedChanges.length})
          </button>
          <button
            onClick={() => setActiveTab("optimized")}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors rounded-2xl border ${
              activeTab === "optimized"
                ? "bg-indigo-500 text-white border-white/10"
                : "bg-white/0 text-white/70 border-white/0 hover:bg-white/5 hover:text-white"
            }`}
          >
            Optimized CV
          </button>
          {coverLetterTab && (
            <button
              onClick={() => setActiveTab("cover-letter")}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors rounded-2xl border ${
                activeTab === "cover-letter"
                  ? "bg-indigo-500 text-white border-white/10"
                  : "bg-white/0 text-white/70 border-white/0 hover:bg-white/5 hover:text-white"
              }`}
            >
              Cover Letter
            </button>
          )}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-4 flex-1 min-h-0 overflow-hidden flex flex-col">
        {activeTab === "overview" && (
          <div className="space-y-4 flex-1 min-h-0 overflow-auto pr-1">
            {/* Header with Score (Overview only) */}
            <div className="bg-gradient-to-r from-blue-600/90 to-indigo-600/90 p-4 text-white rounded-2xl border border-white/10">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold tracking-tight mb-1">Match Analysis</h3>
                  <p className="text-white/85">{results.summary}</p>
                </div>
                <div className="text-center">
                  <div className={`w-[68px] h-[68px] rounded-2xl border ${scoreTone} backdrop-blur flex items-center justify-center`}>
                    <span className="text-2xl font-bold text-white">{results.overallScore}</span>
                  </div>
                  <p className="text-sm mt-2 text-white/85">Match Score</p>
                </div>
              </div>
            </div>

            {/* Strengths */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white/4 border border-white/10 rounded-2xl p-4">
              <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                <span className="w-6 h-6 bg-emerald-400/15 border border-emerald-300/20 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-emerald-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                Strengths
              </h4>
              <ul className="space-y-2">
                {results.strengths.map((strength, index) => (
                  <li key={index} className="flex items-start gap-2 text-white/80">
                    <span className="text-emerald-200 mt-1">•</span>
                    {strength}
                  </li>
                ))}
              </ul>
              </div>

            {/* Areas to Improve */}
              <div className="bg-white/4 border border-white/10 rounded-2xl p-4">
              <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                <span className="w-6 h-6 bg-amber-400/15 border border-amber-300/20 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-amber-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </span>
                Areas to Improve
              </h4>
              <ul className="space-y-2">
                {results.improvements.map((improvement, index) => (
                  <li key={index} className="flex items-start gap-2 text-white/80">
                    <span className="text-amber-200 mt-1">•</span>
                    {improvement}
                  </li>
                ))}
              </ul>
              </div>
            </div>

            {/* Keywords */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                <h4 className="font-semibold text-white mb-2">Keywords Found</h4>
                <div className="flex flex-wrap gap-2">
                  {results.keywords.present.map((keyword, index) => (
                    <span key={index} className="px-2.5 py-1 bg-emerald-400/15 text-emerald-100 border border-emerald-300/20 rounded-full text-xs">
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
              <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                <h4 className="font-semibold text-white mb-2">Missing Keywords</h4>
                <div className="flex flex-wrap gap-2">
                  {results.keywords.missing.map((keyword, index) => (
                    <span key={index} className="px-2.5 py-1 bg-rose-400/15 text-rose-100 border border-rose-300/20 rounded-full text-xs">
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Skill gaps + learning resources */}
            {missingKeySkills.length > 0 && (
              <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                <h4 className="font-semibold text-white mb-3">Missing skills to learn</h4>
                <div className="space-y-3">
                  {missingKeySkills.map((skill, index) => (
                    <div key={`${skill}-${index}`} className="bg-white/5 rounded-xl p-3 border border-white/10">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium text-white">{skill}</span>
                        <div className="flex flex-wrap gap-2">
                          {getLearningLinks(skill).map((link) => (
                            <a
                              key={link.label}
                              href={link.href}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-100 border border-indigo-300/20 hover:bg-indigo-500/30 transition-colors"
                            >
                              {link.label}
                            </a>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-sm text-white/60">
                  Tip: only add a skill to your CV if you genuinely have it (or are actively learning it).
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === "changes" && (
          <div className="space-y-4 flex-1 min-h-0 overflow-auto pr-1">
            {results.suggestedChanges.map((change, index) => (
              <div key={index} className="border border-white/10 rounded-2xl overflow-hidden bg-white/5">
                <div className="bg-white/5 px-4 py-3 border-b border-white/10">
                  <span className="font-medium text-white">{change.section}</span>
                </div>
                <div className="p-4 space-y-3">
                  <div>
                    <p className="text-xs text-white/50 uppercase tracking-wide mb-1">Original</p>
                    <p className="text-white/80 bg-rose-500/10 p-3 rounded-xl border border-rose-400/20">
                      {change.original}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-white/50 uppercase tracking-wide mb-1">Suggested</p>
                    <p className="text-white bg-emerald-500/10 p-3 rounded-xl border border-emerald-400/20">
                      {change.suggested}
                    </p>
                  </div>
                  <div className="flex items-start gap-2 text-sm text-white/70">
                    <svg className="w-4 h-4 text-indigo-200 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{change.reason}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "optimized" && (
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="flex justify-between items-center mb-4 flex-shrink-0">
              <p className="text-white/75">Here's your optimized CV with all suggested changes applied:</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadPdf}
                  disabled={downloadingPdf}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 disabled:bg-indigo-500/10 border border-indigo-300/20 text-indigo-100 rounded-xl transition-colors"
                >
                  {downloadingPdf ? "Generating PDF..." : "Download PDF"}
                </button>
                <button
                  onClick={handleCopyOptimized}
                  className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/15 border border-white/10 text-white rounded-xl transition-colors"
                >
                  {copiedOptimized ? "Copied!" : "Copy to Clipboard"}
                </button>
              </div>
            </div>
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10 flex-1 min-h-0 overflow-auto">
              <pre className="whitespace-pre-wrap text-white/85 font-sans text-sm leading-relaxed">
                {results.optimizedCV}
              </pre>
            </div>
          </div>
        )}

        {activeTab === "cover-letter" && coverLetterTab && (
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <h4 className="text-white font-semibold tracking-tight">
                  {coverLetterTab.title || "Cover Letter"}
                </h4>
                {coverLetterTab.subtitle && (
                  <p className="text-sm text-white/70">{coverLetterTab.subtitle}</p>
                )}
              </div>
            </div>

            {/* Primary CTA */}
            <button
              onClick={coverLetterTab.onGenerate}
              disabled={coverLetterTab.isGenerating || !!coverLetterTab.text}
              className="w-full px-6 py-4 bg-indigo-500 hover:bg-indigo-400 disabled:bg-white/10 border border-white/10 text-white text-base font-semibold rounded-2xl transition-colors"
            >
              {coverLetterTab.isGenerating
                ? "Generating cover letter..."
                : coverLetterTab.text
                ? "Cover Letter Generated"
                : "Generate Cover Letter"}
            </button>

            {/* Show textarea only after generation */}
            {coverLetterTab.text && (
              <div className="mt-4 flex-1 min-h-0 flex flex-col">
                <div className="flex items-center justify-end gap-2 mb-2 flex-shrink-0">
                  <button
                    onClick={coverLetterTab.onCopy}
                    className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-medium rounded-xl transition-colors"
                  >
                    {coverLetterTab.copied ? "Copied" : "Copy"}
                  </button>
                  <button
                    onClick={coverLetterTab.onDownloadPdf}
                    disabled={coverLetterTab.isDownloadingPdf}
                    className="px-3 py-2 bg-white/5 hover:bg-white/10 disabled:bg-white/5 border border-white/10 text-white text-sm font-medium rounded-xl transition-colors"
                  >
                    {coverLetterTab.isDownloadingPdf ? "Downloading..." : "Download PDF"}
                  </button>
                </div>
                <textarea
                  value={coverLetterTab.text}
                  onChange={(e) => coverLetterTab.onTextChange(e.target.value)}
                  className="w-full h-[42vh] md:h-[50vh] lg:h-[55vh] min-h-[320px] px-4 py-3 bg-white/5 text-white border border-white/10 rounded-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent outline-none resize-none placeholder:text-white/35 leading-relaxed"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
