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
  MessageSquare,
  Camera,
  User
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
  onEnhanceWithDeepDive?: (answers: DeepDiveAnswers) => Promise<void>;
  isEnhancing?: boolean;
  jobTitle?: string;
  onTabChange?: (tab: string) => void;
}

interface DeepDiveAnswers {
  achievements: string;
  hiddenSkills: string;
  uniqueValue: string;
}

interface SkillPlacement {
  skill: string;
  hasSkill: boolean;
  sectionId: string | null;
  itemId: string | null;
  context: string; // How/where they acquired this skill
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

export function AnalysisResults({ results, coverLetterTab, onEnhanceWithDeepDive, isEnhancing, jobTitle, onTabChange }: AnalysisResultsProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "changes" | "skills" | "optimized" | "cover-letter" | "enhance">("overview");
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
  
  // Photo state
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  
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
  
  // Skill placement state for Enhance tab
  const [skillPlacements, setSkillPlacements] = useState<SkillPlacement[]>(() => {
    const missingSkills = results.missingKeySkills || [];
    return missingSkills.map(skill => ({
      skill,
      hasSkill: false,
      sectionId: null,
      itemId: null,
      context: ""
    }));
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

  // Score color based on value - Premium palette
  const getScoreColor = (score: number) => {
    if (score >= 80) return { ring: "stroke-[#0A2647]", text: "text-[#0A2647]", bg: "bg-[#0A2647]/5" };
    if (score >= 60) return { ring: "stroke-amber-600", text: "text-amber-700", bg: "bg-amber-50" };
    return { ring: "stroke-rose-600", text: "text-rose-700", bg: "bg-rose-50" };
  };

  const scoreColors = getScoreColor(results.overallScore);

  const handleCopyOptimized = () => {
    navigator.clipboard.writeText(results.optimizedCV);
    setCopiedOptimized(true);
    setTimeout(() => setCopiedOptimized(false), 2000);
  };

  // Handle photo upload
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const photoUrl = reader.result as string;
        setPhotoPreview(photoUrl);
        // Update resume data with photo
        setResumeData(prev => ({ ...prev, photo: photoUrl }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setPhotoPreview(null);
    setResumeData(prev => ({ ...prev, photo: undefined }));
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
    { id: "overview" as const, label: "Overview", step: 1 },
    ...(onEnhanceWithDeepDive ? [{ id: "enhance" as const, label: "Enhance", step: 2, highlight: true }] : []),
    { id: "changes" as const, label: `Review Changes`, step: 3, count: pendingChangesCount > 0 ? pendingChangesCount : undefined, badge: acceptedChangesCount > 0 ? `${acceptedChangesCount} accepted` : undefined },
    { id: "optimized" as const, label: "Optimized CV", step: 4 },
    ...(coverLetterTab ? [{ id: "cover-letter" as const, label: "Cover Letter", step: 5 }] : []),
  ];

  return (
    <div className="bg-white rounded-sm shadow-[0_4px_40px_-12px_rgba(0,0,0,0.08)] overflow-hidden h-full flex flex-col min-h-0">
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
      
      {/* Top Navigation - Premium Step Flow */}
      <div className="px-8 py-5 bg-white border-b border-stone-100">
        <div className="flex items-center gap-2 flex-wrap">
          {tabs.map((tab, idx) => (
            <div key={tab.id} className="flex items-center">
              <button
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-5 py-3 text-sm font-medium tracking-wide rounded-sm transition-all duration-200 ${
                  activeTab === tab.id
                    ? "bg-[#0A2647] text-white" 
                    : (tab as any).highlight 
                      ? "text-[#0A2647] hover:bg-[#0A2647]/5 bg-[#0A2647]/5" 
                      : "text-stone-500 hover:text-stone-700 hover:bg-stone-50"
                }`}
              >
                <span className={`w-6 h-6 rounded-full text-xs font-medium flex items-center justify-center ${
                  activeTab === tab.id
                    ? "bg-white/20 text-white"
                    : "bg-stone-200 text-stone-600"
                }`}>
                  {(tab as any).step || idx + 1}
                </span>
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`text-xs px-2 py-0.5 rounded-sm ${
                    activeTab === tab.id ? "bg-white/20" : "bg-amber-100 text-amber-700"
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
              {/* Connector between tabs */}
              {idx < tabs.length - 1 && (
                <div className="w-8 h-px bg-stone-200 mx-2 flex-shrink-0" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-8 flex-1 min-h-0 overflow-hidden flex flex-col">
        {activeTab === "overview" && (
          <div className="space-y-8 flex-1 min-h-0 overflow-auto pr-1">
            {/* Hero Score Card - Premium Style */}
            <div className="bg-[#FAFAF8] rounded-sm p-8 border border-stone-100">
              <div className="flex items-center justify-between gap-8">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <Target className="w-5 h-5 text-[#0A2647]" strokeWidth={1.5} />
                    <h3 className="font-serif text-xl text-[#1a1a1a]">Match Analysis</h3>
                  </div>
                  <p className="text-stone-600 leading-relaxed font-light">{results.summary}</p>
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

            {/* Continue Button */}
            {onEnhanceWithDeepDive && (
              <div className="flex justify-end pt-4 border-t border-slate-100">
                <button
                  onClick={() => setActiveTab("enhance")}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white font-semibold rounded-xl transition-all shadow-lg"
                >
                  Continue to Enhance
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}

          </div>
        )}

        {activeTab === "changes" && (
          <div className="space-y-4 flex-1 min-h-0 overflow-auto">
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
                      <p className="p-4 rounded-lg border leading-relaxed text-slate-600 bg-rose-50 border-rose-100 line-through">
                      {change.original}
                    </p>
                  </div>

                  <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-medium">Suggested</p>
                      <p className="p-4 rounded-lg border leading-relaxed text-slate-800 bg-indigo-50 border-indigo-100">
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

            {/* Continue Button */}
            <div className="flex justify-end pt-4 border-t border-slate-100 mt-4">
              <button
                onClick={() => setActiveTab("optimized")}
                className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all shadow-lg"
              >
                View Optimized CV
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
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
                
                {/* Photo Upload Section */}
                <div className="flex-shrink-0 px-4 py-3 bg-slate-50/80 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
                        <Camera className="w-4 h-4 text-violet-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-slate-900 text-sm">Profile Photo</h3>
                        <p className="text-xs text-slate-500">Optional - for templates with photo support</p>
                      </div>
                    </div>
                    
                    {photoPreview ? (
                      <div className="flex items-center gap-3">
                        <img 
                          src={photoPreview} 
                          alt="Profile preview" 
                          className="w-10 h-10 rounded-lg object-cover border-2 border-violet-200"
                        />
                        <button
                          onClick={removePhoto}
                          className="p-1.5 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors"
                          title="Remove photo"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex items-center gap-2 px-3 py-1.5 bg-violet-100 hover:bg-violet-200 text-violet-700 text-sm font-medium rounded-lg cursor-pointer transition-colors">
                        <User className="w-4 h-4" />
                        <span>Add Photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoSelect}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>
                
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

                {/* Continue to Cover Letter Button */}
                {coverLetterTab && (
                  <div className="flex justify-end pt-4 border-t border-slate-100 mt-4">
                    <button
                      onClick={() => setActiveTab("cover-letter")}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all shadow-lg"
                    >
                      Generate Cover Letter
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Enhance Tab - Missing Skills Placement */}
        {activeTab === "enhance" && onEnhanceWithDeepDive && (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-violet-500 to-indigo-600 rounded-xl p-6 text-white mb-6 flex-shrink-0">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <Target className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Add Missing Skills</h3>
                  <p className="text-violet-100">
                    {jobTitle ? `Enhancing for: ${jobTitle}` : "Tell us which skills you have"}
                  </p>
                </div>
              </div>
              <p className="text-violet-100 text-sm">
                We identified skills the job requires that weren't in your CV. 
                <strong> Select the ones you have</strong> and choose where to add them in your resume.
              </p>
            </div>
            
            {/* Skills List */}
            <div className="flex-1 overflow-auto space-y-3">
              {skillPlacements.length === 0 ? (
                <div className="text-center py-12 bg-emerald-50 rounded-xl border border-emerald-200">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                  <p className="text-emerald-800 font-medium">Great news!</p>
                  <p className="text-emerald-600 text-sm">Your CV already covers all the key skills for this role.</p>
                </div>
              ) : (
                skillPlacements.map((placement, idx) => (
                  <div 
                    key={placement.skill}
                    className={`bg-white rounded-xl border-2 transition-all overflow-hidden ${
                      placement.hasSkill 
                        ? "border-indigo-300 shadow-md" 
                        : "border-slate-200"
                    }`}
                  >
                    {/* Skill Header with Checkbox */}
                    <div className="flex items-center gap-4 p-4">
                      <button
                        onClick={() => {
                          setSkillPlacements(prev => prev.map((p, i) => 
                            i === idx ? { ...p, hasSkill: !p.hasSkill, sectionId: null, itemId: null, context: "" } : p
                          ));
                        }}
                        className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                          placement.hasSkill
                            ? "border-indigo-500 bg-indigo-500"
                            : "border-slate-300 hover:border-indigo-400"
                        }`}
                      >
                        {placement.hasSkill && <Check className="w-4 h-4 text-white" />}
                      </button>
                      <div className="flex-1">
                        <span className={`font-semibold ${placement.hasSkill ? "text-indigo-700" : "text-slate-700"}`}>
                          {placement.skill}
                        </span>
                        {!placement.hasSkill && (
                          <p className="text-xs text-slate-400 mt-0.5">Click if you have experience with this skill</p>
                        )}
                      </div>
                      {placement.hasSkill && placement.sectionId && (
                        <span className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full">
                          ✓ Placement set
                        </span>
                      )}
                    </div>
                    
                    {/* Placement Selection - Only shows when skill is selected */}
                    {placement.hasSkill && (
                      <div className="px-4 pb-4 pt-2 border-t border-slate-100 bg-slate-50/50 space-y-4">
                        {/* Context - How/where they acquired the skill */}
                        <div>
                          <label className="text-xs font-medium text-slate-600 mb-1.5 block flex items-center gap-1.5">
                            <Edit3 className="w-3.5 h-3.5" />
                            Briefly describe your experience with <strong>{placement.skill}</strong>
                          </label>
                          <textarea
                            value={placement.context}
                            onChange={(e) => {
                              setSkillPlacements(prev => prev.map((p, i) => 
                                i === idx ? { ...p, context: e.target.value } : p
                              ));
                            }}
                            placeholder={`e.g., "Used ${placement.skill} to build automated reports, reducing manual work by 40%..." or "3+ years experience with ${placement.skill} in production environments..."`}
                            className="w-full h-16 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none placeholder:text-slate-400"
                          />
                        </div>
                        
                        <div className="grid md:grid-cols-2 gap-3">
                          {/* Section Dropdown - Only main sections */}
                          <div>
                            <label className="text-xs font-medium text-slate-500 mb-1.5 block">Add to section</label>
                            <select
                              value={placement.sectionId || ""}
                              onChange={(e) => {
                                setSkillPlacements(prev => prev.map((p, i) => 
                                  i === idx ? { ...p, sectionId: e.target.value || null, itemId: null } : p
                                ));
                              }}
                              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            >
                              <option value="">Select section...</option>
                              <option value="skills">Skills</option>
                              <option value="summary">Summary</option>
                              {/* Only show Experience and Education sections */}
                              {resumeData.sections
                                .filter(section => 
                                  section.type === "experience" || 
                                  section.type === "education" ||
                                  section.title.toLowerCase().includes("experience") ||
                                  section.title.toLowerCase().includes("education") ||
                                  section.title.toLowerCase().includes("employment") ||
                                  section.title.toLowerCase().includes("work history")
                                )
                                .map(section => (
                                  <option key={section.id} value={section.id}>
                                    {section.title}
                                  </option>
                                ))
                              }
                            </select>
                          </div>
                          
                          {/* Subsection Dropdown - Only for sections with items */}
                          <div>
                            <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                              {placement.sectionId === "skills" ? "How to add" : "Under which role/entry?"}
                            </label>
                            {placement.sectionId === "skills" ? (
                              <div className="px-3 py-2.5 bg-indigo-50 border border-indigo-200 rounded-lg text-sm text-indigo-700">
                                Will be added to your Skills section
                              </div>
                            ) : placement.sectionId === "summary" ? (
                              <div className="px-3 py-2.5 bg-indigo-50 border border-indigo-200 rounded-lg text-sm text-indigo-700">
                                Will be woven into your summary
                              </div>
                            ) : placement.sectionId ? (
                              <select
                                value={placement.itemId || ""}
                                onChange={(e) => {
                                  setSkillPlacements(prev => prev.map((p, i) => 
                                    i === idx ? { ...p, itemId: e.target.value || null } : p
                                  ));
                                }}
                                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                              >
                                <option value="">Select entry...</option>
                                {resumeData.sections
                                  .find(s => s.id === placement.sectionId)
                                  ?.items.map(item => (
                                    <option key={item.id} value={item.id}>
                                      {/* Show Title @ Company format, or just title, or subtitle */}
                                      {item.title && item.subtitle 
                                        ? `${item.title} @ ${item.subtitle}`
                                        : item.title || item.subtitle || "Entry"
                                      }
                                    </option>
                                  ))
                                }
                              </select>
                            ) : (
                              <div className="px-3 py-2.5 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-400">
                                First select a section
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
              
              {/* Additional Info Section */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 mt-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="w-4 h-4 text-amber-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 text-sm">Any other achievements to highlight?</h4>
                    <p className="text-xs text-slate-500">Add accomplishments that strengthen your application</p>
                  </div>
                </div>
                <textarea
                  value={deepDiveAnswers.achievements}
                  onChange={(e) => setDeepDiveAnswers(prev => ({ ...prev, achievements: e.target.value }))}
                  placeholder="e.g. Led a team of 5 engineers, Increased revenue by 30%, AWS certified..."
                  className="w-full h-20 p-3 border border-slate-200 rounded-lg text-slate-700 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-slate-400"
                />
              </div>
            </div>
            
            {/* Navigation */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100 flex-shrink-0">
              <button
                onClick={() => setActiveTab("changes")}
                className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700"
              >
                Skip to Review Changes →
              </button>
              
              <div className="flex items-center gap-3">
                {/* Selection indicator */}
                <span className="text-sm text-slate-500">
                  {skillPlacements.filter(p => p.hasSkill).length} of {skillPlacements.length} skills selected
                </span>
                
                <button
                  onClick={async () => {
                    if (onEnhanceWithDeepDive) {
                      // Combine skill placements with deep dive answers
                      const selectedSkills = skillPlacements.filter(p => p.hasSkill);
                      const skillsInfo = selectedSkills.map(p => {
                        const section = resumeData.sections.find(s => s.id === p.sectionId);
                        const item = section?.items.find(i => i.id === p.itemId);
                        return {
                          skill: p.skill,
                          context: p.context, // User's explanation of their experience
                          placement: p.sectionId === "skills" ? "skills section" 
                            : p.sectionId === "summary" ? "professional summary"
                            : `${section?.title || ""} - ${item?.title || ""}${item?.subtitle ? ` @ ${item.subtitle}` : ""}`,
                          sectionId: p.sectionId,
                          itemId: p.itemId,
                          roleTitle: item?.title || "",
                          company: item?.subtitle || ""
                        };
                      });
                      
                      await onEnhanceWithDeepDive({
                        ...deepDiveAnswers,
                        hiddenSkills: JSON.stringify(skillsInfo),
                        uniqueValue: selectedSkills.map(s => s.skill).join(", ")
                      });
                      setActiveTab("changes");
                      onTabChange?.("changes");
                    }
                  }}
                  disabled={isEnhancing || skillPlacements.filter(p => p.hasSkill).length === 0}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 disabled:from-slate-300 disabled:to-slate-400 text-white font-semibold rounded-xl transition-all shadow-lg shadow-violet-200 disabled:shadow-none"
                >
                  {isEnhancing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Re-optimizing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Enhance with {skillPlacements.filter(p => p.hasSkill).length} Skills
                    </>
                  )}
                </button>
              </div>
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
