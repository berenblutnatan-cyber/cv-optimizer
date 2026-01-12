"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { Logo } from "@/components/Logo";
import Link from "next/link";
import { 
  Upload, 
  FileText, 
  Briefcase, 
  Sparkles, 
  X, 
  Check, 
  AlertCircle,
  ChevronRight,
  Loader2,
  Link as LinkIcon,
  Type,
  FileSearch
} from "lucide-react";
import { saveAnalysisToSession } from "@/lib/analysisSession";

interface CVEntry {
  title: string;
  organization?: string;
}

interface CVEntries {
  summary?: {
    exists: boolean;
  };
  work_experience?: CVEntry[];
  education?: CVEntry[];
  projects?: CVEntry[];
}

interface SkillPlacement {
  skill: string;
  targetCvEntry: {
    section: "summary" | "work_experience" | "education" | "projects";
    title?: string;
    organization?: string;
  } | null;
  userProvidedContext: string;
}

interface GapAnalysisData {
  missingKeywords: string[];
  cvEntries: CVEntries;
}

export function OptimizerClient() {
  const router = useRouter();
  
  // CV State
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvText, setCvText] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  
  // Job Context State - Flexible inputs
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  
  // Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState("");
  
  // Gap Analysis Modal State
  const [showGapModal, setShowGapModal] = useState(false);
  const [gapData, setGapData] = useState<GapAnalysisData | null>(null);
  const [skillPlacements, setSkillPlacements] = useState<SkillPlacement[]>([]);
  const [isReOptimizing, setIsReOptimizing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [analysisMeta, setAnalysisMeta] = useState<any>(null);

  // Handle file drop
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.type === "application/pdf" || file.name.endsWith(".pdf") || file.name.endsWith(".docx") || file.name.endsWith(".txt"))) {
      setCvFile(file);
      // Extract text from file
      if (file.type === "text/plain" || file.name.endsWith(".txt")) {
        const text = await file.text();
        setCvText(text);
      }
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCvFile(file);
      if (file.type === "text/plain" || file.name.endsWith(".txt")) {
        const text = await file.text();
        setCvText(text);
      }
    }
  };

  // Validation: Resume required + at least one context field
  const hasResume = cvText.trim() || cvFile;
  const hasJobContext = jobTitle.trim() || jobDescription.trim() || jobUrl.trim();
  const canAnalyze = hasResume && hasJobContext;

  const handleAnalyze = async () => {
    if (!hasResume) {
      setError("Please upload or paste your resume");
      return;
    }
    if (!hasJobContext) {
      setError("Please provide at least one: Target Job Title, Job Description, or Job URL");
      return;
    }

    setError("");
    setIsAnalyzing(true);

    try {
      const formData = new FormData();
      if (cvFile) formData.append("cv", cvFile);
      if (cvText) formData.append("cvText", cvText);
      formData.append("mode", "specific_role");
      
      // Send whatever context the user provided
      if (jobTitle.trim()) formData.append("jobTitle", jobTitle.trim());
      if (jobDescription.trim()) formData.append("jobDescription", jobDescription.trim());
      if (jobUrl.trim()) formData.append("jobUrl", jobUrl.trim());
      
      // For company name, try to extract from context or use a generic placeholder
      const companyName = extractCompanyFromContext() || "Target Company";
      formData.append("companyName", companyName);

      const response = await fetch("/api/analyze", { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Analysis failed");

      // Store analysis data
      setAnalysisResult(data.analysis);
      setAnalysisMeta(data.meta);

      // Extract missing keywords and CV entries for gap analysis
      const missingKeywords = data.analysis.missingKeySkills || [];
      const cvEntries = data.analysis.cv_entries || { work_experience: [], education: [], projects: [] };
      
      // Create gap analysis data
      setGapData({
        missingKeywords,
        cvEntries
      });

      // Initialize skill placements - one per missing skill
      const initialPlacements: SkillPlacement[] = missingKeywords.map((skill: string) => ({
        skill,
        targetCvEntry: null,
        userProvidedContext: ""
      }));
      setSkillPlacements(initialPlacements);

      // Show gap analysis modal
      setShowGapModal(true);

    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Helper to extract company name from URL or description
  const extractCompanyFromContext = (): string | null => {
    // Try to extract from LinkedIn URL
    if (jobUrl.includes("linkedin.com")) {
      const match = jobUrl.match(/company\/([^\/]+)/);
      if (match) return match[1].replace(/-/g, " ");
    }
    return null;
  };

  const handleReOptimize = async () => {
    setIsReOptimizing(true);

    try {
      // Filter skill placements that have both a selected CV entry AND user context
      const validPlacements = skillPlacements.filter(
        sp => sp.targetCvEntry && sp.userProvidedContext.trim()
      );

      if (validPlacements.length === 0) {
        // No skills to add, just use original analysis
        handleSkipGapAnalysis();
        return;
      }

      // Use the new optimize-with-skills endpoint
      const formData = new FormData();
      if (cvFile) formData.append("cv", cvFile);
      if (cvText) formData.append("cvText", cvText);
      formData.append("skillPlacements", JSON.stringify(validPlacements));
      
      if (jobTitle.trim()) formData.append("jobTitle", jobTitle.trim());
      if (jobDescription.trim()) formData.append("jobDescription", jobDescription.trim());

      const response = await fetch("/api/optimize-with-skills", { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Optimization failed");

      // Track optimization
      try {
        await fetch("/api/track", { method: "POST" });
      } catch {
        // ignore
      }

      // Keep skill placement changes separate from regular suggested changes
      const updatedAnalysis = {
        ...analysisResult,
        optimizedCV: data.optimizedCV,
        skillPlacementChanges: data.skillPlacementChanges || []
      };

      // Save and navigate to results
      saveAnalysisToSession({ analysis: updatedAnalysis, meta: analysisMeta });
      router.push("/results");

    } catch (err) {
      setError(err instanceof Error ? err.message : "Optimization failed");
      setShowGapModal(false);
    } finally {
      setIsReOptimizing(false);
    }
  };

  const handleSkipGapAnalysis = () => {
    // Save original result and navigate
    if (analysisResult && analysisMeta) {
      saveAnalysisToSession({ analysis: analysisResult, meta: analysisMeta });
      router.push("/results");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header - Full Width */}
      <header className="w-full bg-white border-b border-slate-200 px-6 lg:px-12 py-4">
        <div className="flex items-center justify-between">
          <Logo variant="dark" size="md" linkTo="/" />
          <div className="flex items-center gap-4">
            <Link 
              href="/builder" 
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Resume Builder
            </Link>
            <span className="text-slate-300">|</span>
            <span className="text-sm font-medium text-emerald-600">Optimizer</span>
            <UserButton 
              appearance={{
                elements: {
                  avatarBox: "w-9 h-9"
                }
              }}
            />
          </div>
        </div>
      </header>

      {/* Main Content - Full Width Split Screen */}
      <main className="flex-1 w-full px-6 lg:px-12 py-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Optimize Your Resume
          </h1>
          <p className="text-slate-600">
            Upload your resume and provide job context — we'll tailor it for maximum impact
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Panel - Resume Upload */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <FileText className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Your Resume</h2>
                <p className="text-sm text-slate-500">Upload PDF, DOCX, or paste text</p>
              </div>
            </div>

            {/* File Drop Zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all mb-4 ${
                isDragging
                  ? "border-emerald-500 bg-emerald-50"
                  : cvFile
                    ? "border-emerald-500 bg-emerald-50/50"
                    : "border-slate-200 hover:border-slate-300"
              }`}
            >
              {cvFile ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <Check className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-slate-900">{cvFile.name}</p>
                    <p className="text-sm text-slate-500">{(cvFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <button
                    onClick={() => { setCvFile(null); setCvText(""); }}
                    className="p-1.5 hover:bg-slate-100 rounded-lg ml-2"
                  >
                    <X className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
              ) : (
                <>
                  <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                  <p className="text-slate-600 mb-2 font-medium">Drag and drop your resume here</p>
                  <p className="text-sm text-slate-400 mb-4">or</p>
                  <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl cursor-pointer transition-colors">
                    <span>Browse Files</span>
                    <input
                      type="file"
                      accept=".pdf,.docx,.txt"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                </>
              )}
            </div>

            {/* Or Paste Text */}
            <div className="relative my-6">
              <div className="absolute inset-x-0 top-1/2 h-px bg-slate-200" />
              <span className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 bg-white px-3 text-sm text-slate-400">
                or paste your resume
              </span>
            </div>

            <textarea
              value={cvText}
              onChange={(e) => { setCvText(e.target.value); if (e.target.value) setCvFile(null); }}
              placeholder="Paste your resume text here..."
              className="w-full h-48 p-4 border border-slate-200 rounded-xl text-slate-700 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          {/* Right Panel - Job Context (Flexible) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Target Role</h2>
                <p className="text-sm text-slate-500">Provide at least one of the following</p>
              </div>
            </div>

            {/* Validation Indicator */}
            <div className={`mb-6 p-3 rounded-lg flex items-center gap-2 text-sm ${
              hasJobContext 
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                : "bg-amber-50 text-amber-700 border border-amber-200"
            }`}>
              {hasJobContext ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Context provided — ready to analyze</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4" />
                  <span>Please provide at least one: Job Title, Description, or URL</span>
                </>
              )}
            </div>

            {/* Option 1: Job Title */}
            <div className="mb-5">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                <Type className="w-4 h-4 text-slate-400" />
                Target Job Title
              </label>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g. Senior Software Engineer, Product Manager"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            {/* Option 2: Job URL */}
            <div className="mb-5">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                <LinkIcon className="w-4 h-4 text-slate-400" />
                LinkedIn Job URL
                <span className="text-xs text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                type="url"
                value={jobUrl}
                onChange={(e) => setJobUrl(e.target.value)}
                placeholder="https://linkedin.com/jobs/view/..."
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            {/* Option 3: Job Description */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                <FileSearch className="w-4 h-4 text-slate-400" />
                Job Description
                <span className="text-xs text-slate-400 font-normal">(paste full text)</span>
              </label>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the full job description here for best results..."
                className="w-full h-[180px] p-4 border border-slate-200 rounded-xl text-slate-700 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700 max-w-3xl mx-auto">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Analyze Button */}
        <div className="mt-10 flex justify-center">
          <button
            onClick={handleAnalyze}
            disabled={!canAnalyze || isAnalyzing}
            className="inline-flex items-center gap-3 px-10 py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold rounded-xl transition-all shadow-lg shadow-emerald-600/25 disabled:shadow-none text-lg"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Analyzing your resume...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Analyze & Optimize
              </>
            )}
          </button>
        </div>

        {/* Helper Text */}
        <p className="text-center text-sm text-slate-500 mt-4">
          For best results, provide the full job description
        </p>
      </main>

      {/* Gap Analysis Modal */}
      {showGapModal && gapData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Gap Analysis</h2>
                  <p className="text-slate-600">Help us create a better resume for you</p>
                </div>
              </div>
            </div>

            {/* Modal Content */}
            <div className="px-6 py-6 space-y-6">
              {/* Skills Section */}
              {gapData.missingKeywords.length > 0 && (
                <div>
                  <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 text-sm font-bold flex items-center justify-center">1</span>
                    Skills Check
                  </h3>
                  <p className="text-slate-600 mb-4">
                    We noticed the job requires these skills that weren't obvious in your resume. 
                    <strong> Do you have experience with any of them?</strong>
                  </p>
                  
                  <div className="space-y-6">
                    {skillPlacements.map((placement, index) => {
                      // Build dropdown options from CV entries
                      const dropdownOptions: Array<{label: string; value: string; section: string; title?: string; organization?: string}> = [];
                      
                      // Add Summary option if it exists in CV
                      if (gapData.cvEntries.summary?.exists) {
                        dropdownOptions.push({
                          label: '📝 Professional Summary',
                          value: 'summary|||',
                          section: 'summary'
                        });
                      }
                      
                      // Add work experience entries
                      gapData.cvEntries.work_experience?.forEach(entry => {
                        dropdownOptions.push({
                          label: `${entry.title}${entry.organization ? ` — ${entry.organization}` : ''}`,
                          value: `work_experience|${entry.title}|${entry.organization || ''}`,
                          section: 'work_experience',
                          title: entry.title,
                          organization: entry.organization
                        });
                      });
                      
                      // Add education entries
                      gapData.cvEntries.education?.forEach(entry => {
                        dropdownOptions.push({
                          label: `${entry.title}${entry.organization ? ` — ${entry.organization}` : ''}`,
                          value: `education|${entry.title}|${entry.organization || ''}`,
                          section: 'education',
                          title: entry.title,
                          organization: entry.organization
                        });
                      });
                      
                      // Add project entries
                      gapData.cvEntries.projects?.forEach(entry => {
                        dropdownOptions.push({
                          label: entry.title,
                          value: `projects|${entry.title}|`,
                          section: 'projects',
                          title: entry.title
                        });
                      });

                      const isSelected = placement.targetCvEntry !== null;
                      const hasContext = placement.userProvidedContext.trim().length > 0;

                      return (
                        <div 
                          key={placement.skill}
                          className={`border-2 rounded-xl p-4 transition-all ${
                            isSelected && hasContext
                              ? 'border-emerald-500 bg-emerald-50/50'
                              : isSelected
                              ? 'border-blue-300 bg-blue-50/30'
                              : 'border-slate-200'
                          }`}
                        >
                          {/* Skill Name */}
                          <div className="flex items-center gap-2 mb-3">
                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                              isSelected && hasContext
                                ? 'border-emerald-500 bg-emerald-500'
                                : 'border-slate-300 bg-white'
                            }`}>
                              {isSelected && hasContext && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <h4 className="font-semibold text-slate-900">{placement.skill}</h4>
                          </div>

                          {/* CV Entry Selector */}
                          <div className="mb-3">
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                              Where should this skill be added in your CV?
                            </label>
                            <select
                              value={placement.targetCvEntry ? `${placement.targetCvEntry.section}|${placement.targetCvEntry.title || ''}|${placement.targetCvEntry.organization || ''}` : ''}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (!value) {
                                  // Deselected
                                  const updated = [...skillPlacements];
                                  updated[index].targetCvEntry = null;
                                  setSkillPlacements(updated);
                                  return;
                                }
                                
                                const selected = dropdownOptions.find(opt => opt.value === value);
                                if (selected) {
                                  const updated = [...skillPlacements];
                                  updated[index].targetCvEntry = {
                                    section: selected.section as "summary" | "work_experience" | "education" | "projects",
                                    title: selected.title,
                                    organization: selected.organization
                                  };
                                  setSkillPlacements(updated);
                                }
                              }}
                              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
                            >
                              <option value="">Select a CV entry...</option>
                              {dropdownOptions.length > 0 ? (
                                dropdownOptions.map(opt => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))
                              ) : (
                                <option value="" disabled>No CV entries found</option>
                              )}
                            </select>
                          </div>

                          {/* Context Text Area */}
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                              Describe how this experience relates to the skill:
                            </label>
                            <textarea
                              value={placement.userProvidedContext}
                              onChange={(e) => {
                                const updated = [...skillPlacements];
                                updated[index].userProvidedContext = e.target.value;
                                setSkillPlacements(updated);
                              }}
                              placeholder={`Example: Used ${placement.skill} to analyze data and improve performance by 20%...`}
                              className="w-full h-24 px-4 py-2.5 border border-slate-300 rounded-lg text-slate-700 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={handleSkipGapAnalysis}
                className="px-4 py-2 text-slate-500 hover:text-slate-700 font-medium transition-colors"
              >
                Skip & use original
              </button>
              <button
                onClick={handleReOptimize}
                disabled={isReOptimizing}
                className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-all"
              >
                {isReOptimizing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Re-optimizing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Re-Optimize Resume
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
