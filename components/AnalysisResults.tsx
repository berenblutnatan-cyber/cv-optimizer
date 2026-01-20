"use client";

import { useState, useMemo, useRef } from "react";
import { TemplatePreviewCard } from "./TemplatePreviewCard";
import { TemplateType } from "./cv-templates";
import { EditableResumePreview, ResumePreviewData, BuilderTemplateId, ThemeColor, ResumePreview } from "./builder";
import { SmartResumePreview, TemplateGallery } from "./shared";
import parseRawCV from "@/lib/cvParser";
import { exportToPdf } from "@/utils/exportToPdf";
import { exportToWord } from "@/utils/exportToWord";
import { 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles,
  Target,
  Copy,
  Check,
  FileText,
  Lightbulb,
  FileEdit,
  Edit3,
  Eye,
  Loader2,
  XCircle,
  X,
  ThumbsUp,
  ThumbsDown,
  Award,
  ChevronRight,
  MessageSquare
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
    error?: string | null;
    onDismissError?: () => void;
  };
  onEnhanceWithDeepDive?: (answers: DeepDiveAnswers) => void;
  isEnhancing?: boolean;
  jobTitle?: string;
}

interface DeepDiveAnswers {
  achievements: string;
  hiddenSkills: string;
  uniqueValue: string;
}

// Template options for the switcher - All 8 templates
const TEMPLATE_OPTIONS: { id: BuilderTemplateId; name: string; icon: string; preview: string }[] = [
  { id: "modern-sidebar", name: "Modern", icon: "◧", preview: "Two-column layout" },
  { id: "ivy-league", name: "Classic", icon: "▭", preview: "Serif elegance" },
  { id: "minimalist", name: "Minimal", icon: "○", preview: "Clean whitespace" },
  { id: "executive", name: "Executive", icon: "■", preview: "Bold header" },
  { id: "techie", name: "Techie", icon: "⌨", preview: "Developer focus" },
  { id: "creative", name: "Creative", icon: "◨", preview: "Split design" },
  { id: "startup", name: "Startup", icon: "◆", preview: "Modern punchy" },
  { id: "international", name: "Intl", icon: "🌐", preview: "Photo support" },
];

export function AnalysisResults({ results, coverLetterTab, onEnhanceWithDeepDive, isEnhancing, jobTitle }: AnalysisResultsProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "changes" | "optimized" | "cover-letter" | "enhance">("overview");
  const [copiedOptimized, setCopiedOptimized] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<BuilderTemplateId>("modern-sidebar");
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Fixed accent color for consistency (updated to indigo)
  const [selectedColor, setSelectedColor] = useState<ThemeColor>("indigo");
  
  // Density state for A4 content fitting
  const [density, setDensity] = useState<"compact" | "normal" | "spacious">("normal");
  
  // Download states
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadType, setDownloadType] = useState<"pdf" | "word" | null>(null);
  
  // Ref for PDF capture - points to ONLY the CV content (no toolbar)
  const pdfCaptureRef = useRef<HTMLDivElement>(null);
  
  // Suggested changes acceptance state: "pending" | "accepted" | "rejected"
  const [changeStatuses, setChangeStatuses] = useState<Record<string, "pending" | "accepted" | "rejected">>(() => {
    const initial: Record<string, "pending" | "accepted" | "rejected"> = {};
    results.suggestedChanges.forEach((change, idx) => {
      initial[change.id || `chg_${idx}`] = "pending";
    });
    return initial;
  });
  
  // AI Deep Dive state (for enhance tab)
  const [deepDiveStep, setDeepDiveStep] = useState(0);
  const [deepDiveAnswers, setDeepDiveAnswers] = useState<DeepDiveAnswers>({
    achievements: "",
    hiddenSkills: "",
    uniqueValue: ""
  });

  // Parse optimized CV text into structured data (initial parse)
  const initialParsedCV = useMemo(() => {
    return parseRawCV(results.optimizedCV);
  }, [results.optimizedCV]);

  // Editable resume data state
  const [resumeData, setResumeData] = useState<ResumePreviewData>(initialParsedCV);

  // Separate regular changes from skill placements
  const regularChanges = results.suggestedChanges.filter(change => !change.id?.startsWith('skill_'));
  const skillChanges = results.skillPlacementChanges || results.suggestedChanges.filter(change => change.id?.startsWith('skill_'));

  // Score color based on value
  const getScoreColor = (score: number) => {
    if (score >= 80) return { ring: "stroke-indigo-500", text: "text-indigo-600", bg: "bg-indigo-50" };
    if (score >= 60) return { ring: "stroke-amber-500", text: "text-amber-600", bg: "bg-amber-50" };
    return { ring: "stroke-rose-500", text: "text-rose-600", bg: "bg-rose-50" };
  };

  const scoreColors = getScoreColor(results.overallScore);

  const handleCopyOptimized = () => {
    navigator.clipboard.writeText(results.optimizedCV);
    setCopiedOptimized(true);
    setTimeout(() => setCopiedOptimized(false), 2000);
  };

  // Direct PDF download (no print dialog)
  const handleDownloadPdf = async () => {
    if (!pdfCaptureRef.current) {
      console.error("PDF capture ref not found");
      return;
    }
    
    setIsDownloading(true);
    setDownloadType("pdf");
    
    try {
      await exportToPdf(pdfCaptureRef.current, `Optimized_Resume_${Date.now()}`);
    } catch (error) {
      console.error("PDF export failed:", error);
      alert("PDF export failed. Please try again.");
    } finally {
      setIsDownloading(false);
      setDownloadType(null);
    }
  };

  // Word document download
  const handleDownloadWord = async () => {
    setIsDownloading(true);
    setDownloadType("word");
    
    try {
      await exportToWord(resumeData, `Optimized_Resume_${Date.now()}`);
    } catch (error) {
      console.error("Word export failed:", error);
      alert("Word export failed. Please try again.");
    } finally {
      setIsDownloading(false);
      setDownloadType(null);
    }
  };

  // Count pending changes
  const pendingChangesCount = Object.values(changeStatuses).filter(s => s === "pending").length;
  const acceptedChangesCount = Object.values(changeStatuses).filter(s => s === "accepted").length;
  
  const tabs = [
    { id: "overview" as const, label: "Overview" },
    { id: "changes" as const, label: `Review Changes`, count: pendingChangesCount > 0 ? pendingChangesCount : undefined, badge: acceptedChangesCount > 0 ? `${acceptedChangesCount} accepted` : undefined },
    { id: "changes" as const, label: `Suggested Changes`, count: regularChanges.length },
    ...(skillChanges.length > 0 ? [{ id: "skills" as const, label: "Skills Added", count: skillChanges.length }] : []),
    { id: "optimized" as const, label: "Optimized CV" },
    ...(onEnhanceWithDeepDive ? [{ id: "enhance" as const, label: "✨ Enhance", highlight: true }] : []),
    ...(coverLetterTab ? [{ id: "cover-letter" as const, label: "Cover Letter" }] : []),
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-xl h-full flex flex-col min-h-0">
      {/* Hidden PDF Capture Element - ONLY the CV, no toolbar */}
      <div className="absolute left-[-9999px] top-0 pointer-events-none">
        <div 
          ref={pdfCaptureRef} 
          style={{ 
            width: "210mm", 
            minHeight: "297mm", 
            background: "#ffffff",
            padding: 0,
            margin: 0,
          }}
        >
          <ResumePreview
            data={resumeData}
            templateId={selectedTemplate}
            themeColor={selectedColor}
          />
        </div>
      </div>
      
      {/* Top Navigation - Modern Tabs */}
      <div className="px-6 py-4 bg-white border-b border-slate-200">
        <div className="flex gap-2 flex-wrap">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 flex items-center gap-2 ${
                activeTab === tab.id
                  ? (tab as any).highlight 
                    ? "bg-gradient-to-r from-violet-500 to-indigo-600 text-white shadow-md" 
                    : "bg-indigo-600 text-white shadow-md"
                  : (tab as any).highlight 
                    ? "text-violet-600 hover:text-violet-700 hover:bg-violet-50 bg-violet-50/50" 
                    : "text-slate-600 hover:text-indigo-700 hover:bg-indigo-50"
              }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.id ? "bg-white/20" : "bg-amber-100 text-amber-700"
                }`}>
                  {tab.count}
                </span>
              )}
              {(tab as any).badge && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.id ? "bg-white/20" : "bg-indigo-100 text-indigo-700"
                }`}>
                  {(tab as any).badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6 flex-1 min-h-0 overflow-hidden flex flex-col">
        {activeTab === "overview" && (
          <div className="space-y-6 flex-1 min-h-0 overflow-auto pr-1">
            {/* Hero Score Card - Light Gradient Banner */}
            <div className="bg-gradient-to-r from-indigo-50 to-violet-50 rounded-xl p-6 border border-indigo-100">
              <div className="flex items-center justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-lg font-bold text-slate-900">Match Analysis</h3>
                  </div>
                  <p className="text-slate-600 leading-relaxed">{results.summary}</p>
                </div>
                
                {/* Large Score Circle */}
                <div className="flex-shrink-0 text-center">
                  <div className="relative w-24 h-24">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="42"
                        fill="white"
                        stroke="#e2e8f0"
                        strokeWidth="8"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="42"
                        fill="none"
                        className={scoreColors.ring}
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={`${results.overallScore * 2.64} 264`}
                        style={{ transition: "stroke-dasharray 1s ease-out" }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className={`text-3xl font-bold ${scoreColors.text}`}>{results.overallScore}</span>
                </div>
                  </div>
                  <p className="text-sm mt-2 text-slate-500 font-medium">Match Score</p>
                </div>
              </div>
            </div>

            {/* Strengths & Areas to Improve Grid */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* Strengths Card */}
              <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm">
                <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                  </div>
                Strengths
              </h4>
                <ul className="space-y-3">
                {results.strengths.map((strength, index) => (
                    <li key={index} className="flex items-start gap-3 text-slate-600">
                      <CheckCircle2 className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                      <span>{strength}</span>
                  </li>
                ))}
              </ul>
              </div>

              {/* Areas to Improve Card */}
              <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm">
                <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                  </div>
                Areas to Improve
              </h4>
                <ul className="space-y-3">
                {results.improvements.map((improvement, index) => (
                    <li key={index} className="flex items-start gap-3 text-slate-600">
                      <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                      <span>{improvement}</span>
                  </li>
                ))}
              </ul>
              </div>
            </div>

            {/* Keywords Analysis Section */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* Keywords Found */}
              <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm">
                <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <Check className="w-5 h-5 text-indigo-600" />
                  </div>
                  Keywords Found
                </h4>
                <div className="flex flex-wrap gap-2">
                  {results.keywords.present.map((keyword, index) => (
                    <span 
                      key={index} 
                      className="px-3 py-1.5 bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-lg text-sm font-medium"
                    >
                      {keyword}
                    </span>
                  ))}
                  {results.keywords.present.length === 0 && (
                    <span className="text-slate-400 text-sm">No keywords found</span>
                  )}
                </div>
              </div>

              {/* Missing Keywords */}
              <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm">
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
                    <span className="text-slate-400 text-sm">No missing keywords</span>
                  )}
                </div>
              </div>
            </div>

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
                      <p className={`p-4 rounded-lg border leading-relaxed ${
                        status === "rejected" ? "text-slate-800 bg-slate-50 border-slate-200" : "text-slate-600 bg-rose-50 border-rose-100 line-through"
                      }`}>
                      {change.original}
                    </p>
                  </div>

                  <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-medium">Suggested</p>
                      <p className={`p-4 rounded-lg border leading-relaxed ${
                        status === "accepted" 
                          ? "text-slate-800 bg-emerald-50 border-emerald-200 font-medium" 
                          : status === "rejected" 
                            ? "text-slate-400 bg-slate-50 border-slate-200 line-through" 
                            : "text-slate-800 bg-indigo-50 border-indigo-100"
                      }`}>
                      {change.suggested}
                    </p>
                  </div>
                    
                    <div className="flex items-start gap-3 text-sm text-slate-600 bg-amber-50 p-3 rounded-lg border border-amber-100">
                      <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <span>{change.reason}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "optimized" && (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {/* Header with Actions */}
            <div className="flex-shrink-0 mb-4">
              <div className="flex justify-between items-center">
              <div>
                  <h3 className="text-slate-900 font-semibold mb-1">Your Optimized Resume</h3>
                  <p className="text-slate-500 text-sm">
                    {isEditMode ? "Click any text to edit directly" : "Adjust font & spacing from the toolbar below"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {/* Edit/Preview Toggle */}
                  <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
                    <button
                      onClick={() => setIsEditMode(false)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        !isEditMode ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Preview
                    </button>
                    <button
                      onClick={() => setIsEditMode(true)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        isEditMode ? "bg-indigo-500 shadow-sm text-white" : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Edit
                    </button>
              </div>
              <button
                onClick={handleCopyOptimized}
                    className="flex items-center gap-2 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg transition-colors text-sm font-medium shadow-sm"
                  >
                    {copiedOptimized ? <Check className="w-4 h-4 text-indigo-500" /> : <Copy className="w-4 h-4" />}
                    {copiedOptimized ? "Copied!" : "Copy"}
                  </button>
                  
                  {/* PDF Download */}
                  <button
                    onClick={handleDownloadPdf}
                    disabled={isDownloading}
                    className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg transition-colors text-sm font-medium shadow-sm"
                  >
                    {isDownloading && downloadType === "pdf" ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <FileText className="w-4 h-4" />
                    )}
                    PDF
                  </button>
                  
                  {/* Word Download */}
                  <button
                    onClick={handleDownloadWord}
                    disabled={isDownloading}
                    className="flex items-center gap-2 px-3 py-2 border border-blue-500 text-blue-600 hover:bg-blue-50 disabled:border-blue-300 disabled:text-blue-300 rounded-lg transition-colors text-sm font-medium"
                  >
                    {isDownloading && downloadType === "word" ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <FileEdit className="w-4 h-4" />
                    )}
                    Word
              </button>
            </div>
              </div>

              {/* Edit Mode Banner */}
              {isEditMode && (
                <div className="flex items-center gap-3 px-4 py-2.5 mt-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span className="text-sm text-indigo-800">
                    <strong>Editing Mode:</strong> Click any text in the resume to edit it directly.
                  </span>
                </div>
              )}
            </div>

            {/* Resume Preview - SmartResumePreview with auto-scaling */}
            {isEditMode ? (
              // Editable mode - use old EditableResumePreview
              <div className="flex-1 min-h-0 overflow-auto rounded-xl bg-indigo-50/50 p-4">
                <div className="flex justify-center">
                  <div className="transform scale-[0.65] origin-top">
                    <EditableResumePreview
                      data={resumeData}
                      onChange={setResumeData}
                      templateId={selectedTemplate}
                      themeColor={selectedColor}
                      readOnly={false}
                    />
                  </div>
                </div>
              </div>
            ) : (
              // Preview mode - use SmartResumePreview with auto-scaling
              <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-hidden">
                {/* Template Gallery - Visual carousel for template selection */}
                <TemplateGallery
                  selectedId={selectedTemplate}
                  onSelect={setSelectedTemplate}
                  className="flex-shrink-0"
                />
                
                {/* Resume Preview with auto-scaling */}
                <div className="flex-1 min-h-0 rounded-xl border border-slate-200 overflow-hidden">
                  <SmartResumePreview
                    data={resumeData}
                    templateId={selectedTemplate}
                    themeColor={selectedColor}
                    showToolbar={true}
                    hideTemplateSelector={true}
                    onTemplateChange={setSelectedTemplate}
                    onColorChange={setSelectedColor}
                    minScale={0.4}
                    maxScale={0.9}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Enhance Tab - AI Deep Dive */}
        {activeTab === "enhance" && onEnhanceWithDeepDive && (
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="bg-gradient-to-r from-violet-500 to-indigo-600 rounded-xl p-6 text-white mb-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">AI Career Deep Dive</h3>
                  <p className="text-violet-100">
                    {jobTitle ? `Enhancing for: ${jobTitle}` : "Help us understand you better"}
                  </p>
                </div>
              </div>
              <p className="text-violet-100 text-sm">
                Answer 3 quick questions to unlock <strong>hidden potential</strong> in your CV. 
                Our AI will incorporate your answers to create an even more impactful resume.
              </p>
              {/* Progress Bar */}
              <div className="mt-4 flex items-center gap-2">
                {[0, 1, 2].map((idx) => (
                  <div 
                    key={idx}
                    className={`h-1.5 flex-1 rounded-full transition-all ${
                      idx < deepDiveStep 
                        ? "bg-white" 
                        : idx === deepDiveStep 
                          ? "bg-white/80" 
                          : "bg-white/30"
                    }`}
                  />
                ))}
              </div>
              <p className="text-violet-200 text-xs mt-2">
                Question {deepDiveStep + 1} of 3
              </p>
            </div>
            
            {/* Question Cards */}
            <div className="flex-1 overflow-auto">
              {deepDiveStep === 0 && (
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
                      <Award className="w-5 h-5 text-violet-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 mb-1">Hidden Achievements</h4>
                      <p className="text-slate-600 text-sm leading-relaxed">
                        What accomplishments from your career are you most proud of that might not be fully reflected in your CV? 
                        Think about: projects you led, problems you solved, metrics you improved, or recognition you received.
                      </p>
                    </div>
                  </div>
                  <textarea
                    value={deepDiveAnswers.achievements}
                    onChange={(e) => setDeepDiveAnswers(prev => ({ ...prev, achievements: e.target.value }))}
                    placeholder="Example: I led a team migration to cloud that saved $200K annually, but I only mentioned 'managed cloud infrastructure' on my CV..."
                    className="w-full h-32 p-4 border border-slate-200 rounded-xl text-slate-700 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent placeholder:text-slate-400"
                  />
                  <p className="text-xs text-violet-600 mt-2 flex items-center gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5" />
                    Be specific! Include numbers, team sizes, timelines, and impact.
                  </p>
                </div>
              )}
              
              {deepDiveStep === 1 && (
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
                      <Target className="w-5 h-5 text-violet-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 mb-1">Unlisted Skills & Tools</h4>
                      <p className="text-slate-600 text-sm leading-relaxed">
                        What skills, tools, certifications, or technologies do you use regularly that aren't mentioned in your CV? 
                        Include soft skills like leadership, communication, or cross-functional collaboration.
                      </p>
                    </div>
                  </div>
                  <textarea
                    value={deepDiveAnswers.hiddenSkills}
                    onChange={(e) => setDeepDiveAnswers(prev => ({ ...prev, hiddenSkills: e.target.value }))}
                    placeholder="Example: I'm proficient in Python, Tableau, and SQL but only listed Excel. I also led weekly stakeholder meetings and trained 5 new team members..."
                    className="w-full h-32 p-4 border border-slate-200 rounded-xl text-slate-700 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent placeholder:text-slate-400"
                  />
                  <p className="text-xs text-violet-600 mt-2 flex items-center gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5" />
                    List everything! Technical tools, methodologies (Agile, Scrum), languages, certifications.
                  </p>
                </div>
              )}
              
              {deepDiveStep === 2 && (
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
                      <Lightbulb className="w-5 h-5 text-violet-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 mb-1">Your Unique Value</h4>
                      <p className="text-slate-600 text-sm leading-relaxed">
                        What makes you different from other candidates? What's your 'superpower' or unique combination 
                        of experience that would make you perfect for this role?
                      </p>
                    </div>
                  </div>
                  <textarea
                    value={deepDiveAnswers.uniqueValue}
                    onChange={(e) => setDeepDiveAnswers(prev => ({ ...prev, uniqueValue: e.target.value }))}
                    placeholder="Example: I bridge the gap between technical and business teams - I can code AND present to C-suite executives. I also have experience in both startups and Fortune 500..."
                    className="w-full h-32 p-4 border border-slate-200 rounded-xl text-slate-700 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent placeholder:text-slate-400"
                  />
                  <p className="text-xs text-violet-600 mt-2 flex items-center gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5" />
                    Think about: unique background, rare skill combinations, industry knowledge, or perspectives.
                  </p>
                </div>
              )}
            </div>
            
            {/* Navigation */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
              <button
                onClick={() => setDeepDiveStep(prev => Math.max(0, prev - 1))}
                disabled={deepDiveStep === 0}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← Previous
              </button>
              
              <div className="flex items-center gap-3">
                {/* Quick completion indicator */}
                <div className="flex items-center gap-1 mr-2">
                  {[deepDiveAnswers.achievements, deepDiveAnswers.hiddenSkills, deepDiveAnswers.uniqueValue].map((answer, idx) => (
                    <div 
                      key={idx}
                      className={`w-2 h-2 rounded-full ${
                        answer.trim() ? "bg-emerald-500" : "bg-slate-200"
                      }`}
                />
              ))}
                </div>
                
                {deepDiveStep < 2 ? (
                  <button
                    onClick={() => setDeepDiveStep(prev => prev + 1)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white font-medium rounded-xl transition-all shadow-lg shadow-violet-200"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => onEnhanceWithDeepDive(deepDiveAnswers)}
                    disabled={isEnhancing}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 disabled:from-slate-300 disabled:to-slate-400 text-white font-medium rounded-xl transition-all shadow-lg shadow-violet-200 disabled:shadow-none"
                  >
                    {isEnhancing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Re-optimizing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Enhance My CV
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
            
            {/* What we'll do */}
            <div className="bg-slate-50 rounded-xl p-4 mt-4 border border-slate-100">
              <p className="text-xs text-slate-500 text-center">
                🎯 Your answers will be used to: <strong>add missing skills</strong>, <strong>quantify achievements</strong>, and <strong>highlight your unique value</strong>
              </p>
            </div>
          </div>
        )}

        {activeTab === "cover-letter" && coverLetterTab && (
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h4 className="text-slate-900 font-semibold">
                  {coverLetterTab.title || "AI Cover Letter Generator"}
                </h4>
                <p className="text-slate-500 text-sm">Generate a tailored cover letter for this position</p>
              </div>
            </div>

            {/* Error Message */}
            {coverLetterTab.error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-red-800 mb-1">Unable to Generate Cover Letter</h4>
                    <p className="text-sm text-red-700">{coverLetterTab.error}</p>
                  </div>
                  {coverLetterTab.onDismissError && (
                    <button
                      onClick={coverLetterTab.onDismissError}
                      className="p-1 hover:bg-red-100 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4 text-red-500" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Primary CTA */}
            <button
              onClick={coverLetterTab.onGenerate}
              disabled={coverLetterTab.isGenerating || !!coverLetterTab.text}
              className="w-full px-6 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-base font-semibold rounded-xl transition-all shadow-lg shadow-indigo-600/20 disabled:shadow-none flex items-center justify-center gap-2"
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
              ) : coverLetterTab.error ? (
                <>
                  <Sparkles className="w-5 h-5" />
                  Try Again
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
                    className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors shadow-sm"
                  >
                    {coverLetterTab.copied ? <Check className="w-4 h-4 text-indigo-500" /> : <Copy className="w-4 h-4" />}
                    {coverLetterTab.copied ? "Copied" : "Copy"}
                  </button>
                  <button
                    onClick={coverLetterTab.onDownloadPdf}
                    disabled={coverLetterTab.isDownloadingPdf}
                    className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 disabled:bg-slate-100 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors shadow-sm"
                  >
                    <FileText className="w-4 h-4" />
                    {coverLetterTab.isDownloadingPdf ? "Downloading..." : "Download PDF"}
                  </button>
                </div>
                <textarea
                  value={coverLetterTab.text}
                  onChange={(e) => coverLetterTab.onTextChange(e.target.value)}
                  className="w-full flex-1 min-h-[320px] px-5 py-4 bg-white text-slate-800 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none placeholder:text-slate-400 leading-relaxed shadow-sm"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
