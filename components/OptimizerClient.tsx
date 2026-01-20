"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserButton, useUser, SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
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
  Loader2,
  Link as LinkIcon,
  Type,
  FileSearch,
  FileEdit
} from "lucide-react";
import { saveAnalysisToSession } from "@/lib/analysisSession";
import { AuthModal, useAuthModal } from "@/components/shared/AuthModal";

export function OptimizerClient() {
  const router = useRouter();
  const { isSignedIn } = useUser();
  
  // CV State
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvText, setCvText] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  
  // Summary State
  const [summary, setSummary] = useState("");
  
  // Job Context State - Flexible inputs
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  
  // Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState("");
  
  // Auth modal for deferred authentication
  const { isOpen: isAuthModalOpen, trigger: authTrigger, openModal: openAuthModal, closeModal: closeAuthModal } = useAuthModal();

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
    
    // Check authentication - show modal if not signed in
    if (!isSignedIn) {
      // Save data to localStorage before showing auth modal
      localStorage.setItem("optimizer_draft", JSON.stringify({
        cvText,
        cvFileName: cvFile?.name || null,
        jobTitle,
        jobDescription,
        jobUrl,
        summary,
      }));
      openAuthModal("analyze");
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
      
      // Include summary if provided
      if (summary.trim()) {
        formData.append("summary", summary.trim());
      }

      const response = await fetch("/api/analyze", { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Analysis failed");

      // Store analysis data and navigate directly to results
      // Gap analysis will be shown on the results page after the user reviews feedback
      saveAnalysisToSession({ 
        analysis: data.analysis, 
        meta: data.meta,
        // Include original inputs for potential re-optimization
        originalInputs: {
          cvFile: cvFile ? cvFile.name : null,
          cvText,
          jobTitle: jobTitle.trim(),
          jobDescription: jobDescription.trim(),
          jobUrl: jobUrl.trim(),
          summary: summary.trim(),
        }
      });
      
      // Track optimization
      try {
        await fetch("/api/track", { method: "POST" });
      } catch {
        // ignore
      }
      
      router.push("/results");

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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header - Full Width */}
      <header className="w-full bg-white border-b border-slate-200 px-6 lg:px-12 py-4">
        <div className="flex items-center justify-between">
          <Logo variant="dark" size="md" />
          <div className="flex items-center gap-4">
            <Link 
              href="/builder" 
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Resume Builder
            </Link>
            <span className="text-slate-300">|</span>
            <span className="text-sm font-medium text-indigo-600">Optimizer</span>
            <SignedIn>
              <UserButton 
                appearance={{
                  elements: {
                    avatarBox: "w-9 h-9"
                  }
                }}
              />
            </SignedIn>
            <SignedOut>
              <SignInButton mode="modal">
                <button className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg transition-colors">
                  Sign In
                </button>
              </SignInButton>
            </SignedOut>
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
              <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                <FileText className="w-5 h-5 text-indigo-600" />
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
                  ? "border-indigo-500 bg-indigo-50"
                  : cvFile
                    ? "border-indigo-500 bg-indigo-50/50"
                    : "border-slate-200 hover:border-slate-300"
              }`}
            >
              {cvFile ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                    <Check className="w-5 h-5 text-indigo-600" />
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
                  <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl cursor-pointer transition-colors">
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
              className="w-full h-48 p-4 border border-slate-200 rounded-xl text-slate-700 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />

            {/* Summary Section */}
            <div className="mt-6 pt-6 border-t border-slate-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <FileEdit className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-medium text-slate-900 text-sm">Professional Summary</h3>
                  <p className="text-xs text-slate-500">Optional - AI will enhance it</p>
                </div>
              </div>
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Write a brief professional summary (2-4 sentences). AI will optimize it for the target role..."
                className="w-full h-24 p-3 border border-slate-200 rounded-xl text-slate-700 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder:text-slate-400"
              />
              <p className="text-xs text-slate-400 mt-2">
                💡 Tip: Include your years of experience, key skills, and career goals
              </p>
            </div>
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
                ? "bg-indigo-50 text-indigo-700 border border-indigo-200" 
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
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
                className="w-full h-[180px] p-4 border border-slate-200 rounded-xl text-slate-700 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
            className="inline-flex items-center gap-3 px-10 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-600/25 disabled:shadow-none text-lg"
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

      {/* Auth Modal for Deferred Authentication */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={closeAuthModal}
        trigger={authTrigger}
      />
    </div>
  );
}
