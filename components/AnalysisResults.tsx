"use client";

import { useState } from "react";
import { TemplatePreviewCard } from "./TemplatePreviewCard";
import { TemplateType } from "./cv-templates";
import { 
  CheckCircle2, 
  AlertTriangle, 
  ExternalLink, 
  Sparkles,
  Target,
  BookOpen,
  Copy,
  Check,
  FileText,
  Lightbulb
} from "lucide-react";

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
  skillPlacementChanges?: {
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
  const [activeTab, setActiveTab] = useState<"overview" | "changes" | "skills" | "optimized" | "cover-letter">("overview");
  const [copiedOptimized, setCopiedOptimized] = useState(false);

  // Separate regular changes from skill placements
  const regularChanges = results.suggestedChanges.filter(change => !change.id?.startsWith('skill_'));
  const skillChanges = results.skillPlacementChanges || results.suggestedChanges.filter(change => change.id?.startsWith('skill_'));

  // Score color based on value
  const getScoreColor = (score: number) => {
    if (score >= 80) return { ring: "stroke-emerald-500", bg: "bg-emerald-500/20", text: "text-emerald-400" };
    if (score >= 60) return { ring: "stroke-amber-500", bg: "bg-amber-500/20", text: "text-amber-400" };
    return { ring: "stroke-rose-500", bg: "bg-rose-500/20", text: "text-rose-400" };
  };

  const scoreColors = getScoreColor(results.overallScore);

  const handleCopyOptimized = () => {
    navigator.clipboard.writeText(results.optimizedCV);
    setCopiedOptimized(true);
    setTimeout(() => setCopiedOptimized(false), 2000);
  };

  const missingKeySkills =
    (results.missingKeySkills && results.missingKeySkills.length > 0
      ? results.missingKeySkills
      : results.keywords?.missing) || [];

  const getLearningLinks = (skill: string) => {
    const q = encodeURIComponent(`${skill} course`);
    return [
      { label: "Coursera", href: `https://www.coursera.org/search?query=${q}`, color: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
      { label: "Udemy", href: `https://www.udemy.com/courses/search/?q=${q}`, color: "bg-purple-500/20 text-purple-300 border-purple-500/30" },
      { label: "YouTube", href: `https://www.youtube.com/results?search_query=${q}`, color: "bg-red-500/20 text-red-300 border-red-500/30" },
    ];
  };

  const tabs = [
    { id: "overview" as const, label: "Overview" },
    { id: "changes" as const, label: `Suggested Changes`, count: regularChanges.length },
    ...(skillChanges.length > 0 ? [{ id: "skills" as const, label: "Skills Added", count: skillChanges.length }] : []),
    { id: "optimized" as const, label: "Optimized CV" },
    ...(coverLetterTab ? [{ id: "cover-letter" as const, label: "Cover Letter" }] : []),
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm max-w-6xl mx-auto">
      {/* Top Navigation - Modern Tabs */}
      <div className="px-6 py-4 bg-white border-b border-slate-200">
        <div className="flex gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 flex items-center gap-2 ${
                activeTab === tab.id
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  activeTab === tab.id ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-700"
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-5 flex-1 min-h-0 overflow-hidden flex flex-col">
        {activeTab === "overview" && (
          <div className="space-y-5 flex-1 min-h-0 overflow-auto pr-1">
            {/* Hero Score Card - Gradient Banner */}
            <div className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 rounded-xl p-6 shadow-lg shadow-indigo-500/20">
              <div className="flex items-center justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-5 h-5 text-white/80" />
                    <h3 className="text-lg font-bold text-white">Match Analysis</h3>
                  </div>
                  <p className="text-white/90 leading-relaxed">{results.summary}</p>
                </div>
                
                {/* Large Score Circle */}
                <div className="flex-shrink-0 text-center">
                  <div className="relative w-24 h-24">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="42"
                        fill="none"
                        stroke="rgba(255,255,255,0.2)"
                        strokeWidth="8"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="42"
                        fill="none"
                        stroke="white"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={`${results.overallScore * 2.64} 264`}
                        className="transition-all duration-1000"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-3xl font-bold text-white">{results.overallScore}</span>
                    </div>
                  </div>
                  <p className="text-sm mt-2 text-white/80 font-medium">Match Score</p>
                </div>
              </div>
            </div>

            {/* Strengths & Areas to Improve Grid */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* Strengths Card */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  </div>
                  Strengths
                </h4>
                <ul className="space-y-3">
                  {results.strengths.map((strength, index) => (
                    <li key={index} className="flex items-start gap-3 text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                      <span>{strength}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Areas to Improve Card */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                  </div>
                  Areas to Improve
                </h4>
                <ul className="space-y-3">
                  {results.improvements.map((improvement, index) => (
                    <li key={index} className="flex items-start gap-3 text-slate-700">
                      <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <span>{improvement}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Keywords Analysis Section */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* Keywords Found */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <Check className="w-5 h-5 text-emerald-600" />
                  </div>
                  Keywords Found
                </h4>
                <div className="flex flex-wrap gap-2">
                  {results.keywords.present.map((keyword, index) => (
                    <span 
                      key={index} 
                      className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-sm font-medium"
                    >
                      {keyword}
                    </span>
                  ))}
                  {results.keywords.present.length === 0 && (
                    <span className="text-slate-500 text-sm">No keywords found</span>
                  )}
                </div>
              </div>

              {/* Missing Keywords */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <div className="w-8 h-8 bg-rose-100 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-rose-600" />
                  </div>
                  Missing Keywords
                </h4>
                <div className="flex flex-wrap gap-2">
                  {results.keywords.missing.map((keyword, index) => (
                    <span 
                      key={index} 
                      className="px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-sm font-medium"
                    >
                      {keyword}
                    </span>
                  ))}
                  {results.keywords.missing.length === 0 && (
                    <span className="text-slate-500 text-sm">No missing keywords</span>
                  )}
                </div>
              </div>
            </div>

            {/* Skills Gap / Learning Path */}
            {missingKeySkills.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-blue-600" />
                  </div>
                  Missing Skills to Learn
                </h4>
                <div className="space-y-3">
                  {missingKeySkills.slice(0, 6).map((skill, index) => (
                    <div 
                      key={`${skill}-${index}`} 
                      className="flex items-center justify-between gap-4 bg-slate-50 rounded-lg p-3 border border-slate-200"
                    >
                      <div className="flex items-center gap-3">
                        <Lightbulb className="w-4 h-4 text-amber-600" />
                        <span className="font-medium text-slate-900">{skill}</span>
                      </div>
                      <div className="flex gap-2">
                        {getLearningLinks(skill).map((link) => (
                          <a
                            key={link.label}
                            href={link.href}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs px-3 py-1.5 rounded-lg border font-medium hover:opacity-80 transition-opacity flex items-center gap-1 bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                          >
                            {link.label}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-sm text-slate-600 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  Tip: Only add skills to your CV if you genuinely have them or are actively learning.
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === "changes" && (
          <div className="space-y-4">
            {regularChanges.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
                <p className="text-slate-500">No suggested changes - your CV looks great!</p>
              </div>
            ) : (
              regularChanges.map((change, index) => (
                <div key={index} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-600" />
                    <span className="font-semibold text-slate-900">{change.section}</span>
                  </div>
                  <div className="p-5 space-y-4">
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-medium">Original</p>
                      <p className="text-slate-700 bg-rose-50 p-4 rounded-lg border border-rose-200 leading-relaxed">
                        {change.original}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-medium">Suggested</p>
                      <p className="text-slate-900 bg-emerald-50 p-4 rounded-lg border border-emerald-200 leading-relaxed">
                        {change.suggested}
                      </p>
                    </div>
                    
                    <div className="flex items-start gap-3 text-sm text-slate-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
                      <Lightbulb className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <span>{change.reason}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Skills Added Tab */}
        {activeTab === "skills" && (
          <div className="space-y-4">
            {skillChanges.length === 0 ? (
              <div className="text-center py-12">
                <Sparkles className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
                <p className="text-slate-500">No skills were added through gap analysis</p>
              </div>
            ) : (
              skillChanges.map((change, index) => (
                <div key={index} className="bg-white border border-emerald-200 rounded-xl overflow-hidden shadow-sm">
                  {/* Header with location */}
                  <div className="bg-emerald-50 px-5 py-3 border-b border-emerald-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <span className="font-semibold text-slate-900">{change.section}</span>
                    </div>
                    {/* Skill badge */}
                    <span className="px-3 py-1 bg-emerald-600 text-white text-sm font-semibold rounded-full">
                      {change.original}
                    </span>
                  </div>
                  
                  <div className="p-5 space-y-4">
                    {/* New content added */}
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider mb-3 font-medium">Content Added</p>
                      <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
                        <p className="text-slate-900 leading-relaxed whitespace-pre-line">
                          {change.suggested}
                        </p>
                      </div>
                    </div>
                    
                    {/* Success message */}
                    <div className="flex items-start gap-3 text-sm text-emerald-700 bg-emerald-50/50 p-3 rounded-lg">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                      <span>{change.reason}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "optimized" && (
          <div className="flex-1 min-h-0 flex flex-col overflow-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-5 flex-shrink-0">
              <div>
                <h3 className="text-white font-semibold mb-1">Choose Your Template</h3>
                <p className="text-slate-400 text-sm">Click on any template to preview and download</p>
              </div>
              <button
                onClick={handleCopyOptimized}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white rounded-lg transition-colors font-medium"
              >
                {copiedOptimized ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy Text
                  </>
                )}
              </button>
            </div>

            {/* Template Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-4">
              {(["harvard", "modern", "creative"] as TemplateType[]).map((templateId) => (
                <TemplatePreviewCard
                  key={templateId}
                  templateId={templateId}
                  cvData={results.optimizedCV}
                  fileName="Optimized-CV"
                />
              ))}
            </div>
          </div>
        )}

        {activeTab === "cover-letter" && coverLetterTab && (
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h4 className="text-white font-semibold">
                  {coverLetterTab.title || "AI Cover Letter Generator"}
                </h4>
                <p className="text-slate-400 text-sm">Generate a tailored cover letter for this position</p>
              </div>
            </div>

            {/* Primary CTA */}
            <button
              onClick={coverLetterTab.onGenerate}
              disabled={coverLetterTab.isGenerating || !!coverLetterTab.text}
              className="w-full px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:from-slate-700 disabled:to-slate-700 text-white text-base font-semibold rounded-xl transition-all shadow-lg shadow-indigo-500/20 disabled:shadow-none flex items-center justify-center gap-2"
            >
              {coverLetterTab.isGenerating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating cover letter...
                </>
              ) : coverLetterTab.text ? (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Cover Letter Generated
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generate Cover Letter
                </>
              )}
            </button>

            {/* Show textarea only after generation */}
            {coverLetterTab.text && (
              <div className="mt-4 flex-1 min-h-0 flex flex-col">
                <div className="flex items-center justify-end gap-2 mb-3 flex-shrink-0">
                  <button
                    onClick={coverLetterTab.onCopy}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    {coverLetterTab.copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {coverLetterTab.copied ? "Copied" : "Copy"}
                  </button>
                  <button
                    onClick={coverLetterTab.onDownloadPdf}
                    disabled={coverLetterTab.isDownloadingPdf}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-800 border border-slate-600 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    {coverLetterTab.isDownloadingPdf ? "Downloading..." : "Download PDF"}
                  </button>
                </div>
                <textarea
                  value={coverLetterTab.text}
                  onChange={(e) => coverLetterTab.onTextChange(e.target.value)}
                  className="w-full flex-1 min-h-[320px] px-5 py-4 bg-slate-800 text-white border border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none placeholder:text-slate-500 leading-relaxed"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
