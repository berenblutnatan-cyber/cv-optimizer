"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { UserButton, useUser, SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { Logo } from "@/components/Logo";
import Link from "next/link";
import { 
  Upload, 
  FileText, 
  Briefcase, 
  ArrowRight, 
  X, 
  Check, 
  AlertCircle,
  Loader2,
  Link as LinkIcon,
  FileSearch,
  Pen
} from "lucide-react";
import { saveAnalysisToSession } from "@/lib/analysisSession";
import { AuthModal, useAuthModal } from "@/components/shared/AuthModal";

const DRAFT_KEY = "optimizer_draft";

// Helper: Convert File to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

// Helper: Convert base64 to File
const base64ToFile = (base64: string, fileName: string, mimeType: string): File => {
  const arr = base64.split(',');
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], fileName, { type: mimeType });
};

export function OptimizerClient() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useUser();
  
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
  
  // Job input mode toggle
  const [jobInputMode, setJobInputMode] = useState<"description" | "url">("description");
  
  // Auth modal for deferred authentication
  const { isOpen: isAuthModalOpen, trigger: authTrigger, openModal: openAuthModal, closeModal: closeAuthModal } = useAuthModal();
  
  // Track if we've already restored from draft
  const hasRestoredDraft = useRef(false);
  const wasAuthModalOpen = useRef(false);
  
  // Track when auth modal opens
  useEffect(() => {
    if (isAuthModalOpen) {
      wasAuthModalOpen.current = true;
    }
  }, [isAuthModalOpen]);
  
  // Restore draft from localStorage when component loads
  useEffect(() => {
    if (!isLoaded || hasRestoredDraft.current) return;
    
    try {
      const savedDraft = localStorage.getItem(DRAFT_KEY);
      if (savedDraft) {
        const draft = JSON.parse(savedDraft);
        
        // Restore all saved fields
        if (draft.cvText) setCvText(draft.cvText);
        if (draft.jobTitle) setJobTitle(draft.jobTitle);
        if (draft.jobDescription) setJobDescription(draft.jobDescription);
        if (draft.jobUrl) setJobUrl(draft.jobUrl);
        if (draft.summary) setSummary(draft.summary);
        
        // Restore file from base64 if available
        if (draft.cvFileBase64 && draft.cvFileName && draft.cvFileMimeType) {
          try {
            const restoredFile = base64ToFile(
              draft.cvFileBase64,
              draft.cvFileName,
              draft.cvFileMimeType
            );
            setCvFile(restoredFile);
          } catch (fileErr) {
            console.error("Failed to restore file:", fileErr);
          }
        }
        
        // Set the correct input mode based on which field has data
        if (draft.jobUrl) {
          setJobInputMode("url");
        } else if (draft.jobDescription) {
          setJobInputMode("description");
        }
        
        // Clear the draft after restoring
        localStorage.removeItem(DRAFT_KEY);
        hasRestoredDraft.current = true;
      }
    } catch (err) {
      console.error("Failed to restore draft:", err);
      localStorage.removeItem(DRAFT_KEY);
    }
  }, [isLoaded]);
  
  // Close auth modal and optionally auto-analyze when user signs in
  useEffect(() => {
    if (isSignedIn && isAuthModalOpen) {
      closeAuthModal();
    }
  }, [isSignedIn, isAuthModalOpen, closeAuthModal]);

  // Handle file drop
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.type === "application/pdf" || file.name.endsWith(".pdf") || file.name.endsWith(".docx") || file.name.endsWith(".txt"))) {
      setCvFile(file);
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

  // Validation
  const hasResume = cvText.trim() || cvFile;
  const hasJobContext = jobTitle.trim() || jobDescription.trim() || jobUrl.trim();
  const canAnalyze = hasResume && hasJobContext;

  const handleAnalyze = async () => {
    if (!hasResume) {
      setError("Please upload or paste your resume");
      return;
    }
    if (!hasJobContext) {
      setError("Please provide a job title or description");
      return;
    }
    
    if (!isSignedIn) {
      // Save draft including file as base64
      const saveDraft = async () => {
        const draft: Record<string, string | null> = {
          cvText,
          cvFileName: cvFile?.name || null,
          cvFileMimeType: cvFile?.type || null,
          jobTitle,
          jobDescription,
          jobUrl,
          summary,
        };
        
        // Convert file to base64 if present
        if (cvFile) {
          try {
            draft.cvFileBase64 = await fileToBase64(cvFile);
          } catch (err) {
            console.error("Failed to convert file to base64:", err);
          }
        }
        
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
        openAuthModal("analyze");
      };
      
      saveDraft();
      return;
    }

    setError("");
    setIsAnalyzing(true);

    try {
      const formData = new FormData();
      if (cvFile) formData.append("cv", cvFile);
      if (cvText) formData.append("cvText", cvText);
      formData.append("mode", "specific_role");
      
      if (jobTitle.trim()) formData.append("jobTitle", jobTitle.trim());
      if (jobDescription.trim()) formData.append("jobDescription", jobDescription.trim());
      if (jobUrl.trim()) formData.append("jobUrl", jobUrl.trim());
      
      const companyName = extractCompanyFromContext() || "Target Company";
      formData.append("companyName", companyName);
      
      if (summary.trim()) {
        formData.append("summary", summary.trim());
      }

      const response = await fetch("/api/analyze", { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Analysis failed");

      saveAnalysisToSession({ 
        analysis: data.analysis, 
        meta: data.meta,
        originalInputs: {
          cvFile: cvFile ? cvFile.name : null,
          cvText,
          jobTitle: jobTitle.trim(),
          jobDescription: jobDescription.trim(),
          jobUrl: jobUrl.trim(),
          summary: summary.trim(),
        }
      });
      
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

  const extractCompanyFromContext = (): string | null => {
    if (jobUrl.includes("linkedin.com")) {
      const match = jobUrl.match(/company\/([^\/]+)/);
      if (match) return match[1].replace(/-/g, " ");
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col">
      {/* Premium Header */}
      <header className="w-full bg-white/80 backdrop-blur-sm border-b border-stone-200/60 px-8 lg:px-16 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Logo variant="dark" size="md" />
          <nav className="flex items-center gap-8">
            <Link 
              href="/builder" 
              className="text-sm font-medium text-stone-500 hover:text-stone-900 transition-colors tracking-wide"
            >
              Resume Builder
            </Link>
            <span className="w-px h-4 bg-stone-300" />
            <span className="text-sm font-medium text-[#0A2647] tracking-wide">Optimizer</span>
            <SignedIn>
              <UserButton 
                appearance={{
                  elements: {
                    avatarBox: "w-9 h-9 ring-2 ring-stone-200"
                  }
                }}
              />
            </SignedIn>
            <SignedOut>
              <SignInButton mode="modal">
                <button className="px-5 py-2.5 text-sm font-medium text-stone-600 hover:text-stone-900 border border-stone-300 hover:border-stone-400 rounded transition-colors tracking-wide">
                  Sign In
                </button>
              </SignInButton>
            </SignedOut>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full px-8 lg:px-16 py-12">
        {/* Hero Section */}
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h1 className="font-serif text-4xl md:text-5xl font-light text-[#1a1a1a] mb-4 tracking-tight">
              Optimize Your Resume
            </h1>
            <div className="w-16 h-px bg-[#0A2647] mx-auto mb-5" />
            <p className="text-stone-500 text-lg font-light tracking-wide max-w-xl mx-auto">
              Upload your resume and provide the target role — we'll tailor it for maximum impact
            </p>
          </div>

          {/* Two Column Layout */}
          <div className="grid lg:grid-cols-2 gap-10 max-w-6xl mx-auto">
            
            {/* Left Panel - Resume Upload */}
            <div className="bg-white rounded-sm shadow-[0_4px_40px_-12px_rgba(0,0,0,0.08)] p-8 lg:p-10">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-11 h-11 rounded-full bg-[#0A2647]/5 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-[#0A2647]" strokeWidth={1.5} />
                </div>
                <div>
                  <h2 className="font-serif text-xl text-[#1a1a1a] tracking-tight">Your Resume</h2>
                  <p className="text-sm text-stone-400 font-light">PDF, DOCX, or plain text</p>
                </div>
              </div>

              {/* Drop Zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`relative border rounded-sm p-10 text-center transition-all mb-6 ${
                  isDragging
                    ? "border-[#0A2647] bg-[#0A2647]/5"
                    : cvFile
                      ? "border-[#0A2647]/30 bg-[#0A2647]/5"
                      : "border-stone-200 hover:border-stone-300 bg-stone-50/50"
                }`}
              >
                {cvFile ? (
                  <div className="flex items-center justify-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-[#0A2647]/10 flex items-center justify-center">
                      <Check className="w-5 h-5 text-[#0A2647]" strokeWidth={1.5} />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-[#1a1a1a]">{cvFile.name}</p>
                      <p className="text-sm text-stone-400">{(cvFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <button
                      onClick={() => { setCvFile(null); setCvText(""); }}
                      className="p-2 hover:bg-stone-100 rounded-full ml-2 transition-colors"
                    >
                      <X className="w-4 h-4 text-stone-400" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-stone-300 mx-auto mb-4" strokeWidth={1.5} />
                    <p className="text-stone-500 mb-2 font-light">Drag and drop your resume here</p>
                    <p className="text-sm text-stone-300 mb-5">or</p>
                    <label className="inline-flex items-center gap-2 px-6 py-3 bg-transparent border border-[#0A2647] text-[#0A2647] font-medium rounded-sm cursor-pointer hover:bg-[#0A2647] hover:text-white transition-all tracking-wide text-sm">
                      <span>Select File</span>
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

              {/* Divider */}
              <div className="relative my-8">
                <div className="absolute inset-x-0 top-1/2 h-px bg-stone-200" />
                <span className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 bg-white px-4 text-sm text-stone-400 font-light">
                  or paste text
                </span>
              </div>

              {/* Text Area */}
              <textarea
                value={cvText}
                onChange={(e) => { setCvText(e.target.value); if (e.target.value) setCvFile(null); }}
                placeholder="Please paste your resume contents here..."
                className="w-full h-40 p-5 border-b border-stone-200 text-[#1a1a1a] text-sm resize-none focus:outline-none focus:border-[#0A2647] transition-colors placeholder:text-stone-300 bg-transparent font-light leading-relaxed"
              />

              {/* Summary Section */}
              <div className="mt-8 pt-8 border-t border-stone-100">
                <div className="flex items-center gap-3 mb-4">
                  <Pen className="w-4 h-4 text-stone-400" strokeWidth={1.5} />
                  <div>
                    <h3 className="font-medium text-[#1a1a1a] text-sm tracking-wide">Professional Summary</h3>
                    <p className="text-xs text-stone-400 font-light">Optional — AI will enhance it</p>
                  </div>
                </div>
                <textarea
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="A brief 2-4 sentence summary of your experience and goals..."
                  className="w-full h-24 p-4 border-b border-stone-200 text-[#1a1a1a] text-sm resize-none focus:outline-none focus:border-[#0A2647] transition-colors placeholder:text-stone-300 bg-transparent font-light leading-relaxed"
                />
              </div>
            </div>

            {/* Right Panel - Job Context */}
            <div className="bg-white rounded-sm shadow-[0_4px_40px_-12px_rgba(0,0,0,0.08)] p-8 lg:p-10">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-11 h-11 rounded-full bg-[#0A2647]/5 flex items-center justify-center">
                  <Briefcase className="w-5 h-5 text-[#0A2647]" strokeWidth={1.5} />
                </div>
                <div>
                  <h2 className="font-serif text-xl text-[#1a1a1a] tracking-tight">Target Role</h2>
                  <p className="text-sm text-stone-400 font-light">Role details for tailored optimization</p>
                </div>
              </div>

              {/* Status Indicator */}
              <div className={`mb-8 p-4 rounded-sm flex items-center gap-3 text-sm font-light ${
                hasJobContext 
                  ? "bg-[#0A2647]/5 text-[#0A2647]" 
                  : "bg-amber-50/80 text-amber-700"
              }`}>
                {hasJobContext ? (
                  <>
                    <Check className="w-4 h-4" strokeWidth={1.5} />
                    <span>Ready to analyze</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4" strokeWidth={1.5} />
                    <span>Please provide a job title or description</span>
                  </>
                )}
              </div>

              {/* Job Title Input */}
              <div className="mb-8">
                <label className="block text-sm font-medium text-[#1a1a1a] mb-3 tracking-wide">
                  Target Job Title
                </label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="e.g. Senior Software Engineer"
                  className="w-full px-0 py-3 border-b border-stone-200 text-[#1a1a1a] text-sm focus:outline-none focus:border-[#0A2647] transition-colors placeholder:text-stone-300 bg-transparent font-light"
                />
              </div>

              {/* Toggle: URL vs Description */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-[#1a1a1a] mb-4 tracking-wide">
                  Job Details
                </label>
                <div className="flex border-b border-stone-200 mb-6">
                  <button
                    type="button"
                    onClick={() => setJobInputMode("description")}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-all border-b-2 -mb-px ${
                      jobInputMode === "description"
                        ? "border-[#0A2647] text-[#0A2647]"
                        : "border-transparent text-stone-400 hover:text-stone-600"
                    }`}
                  >
                    <FileSearch className="w-4 h-4" strokeWidth={1.5} />
                    Paste Description
                  </button>
                  <button
                    type="button"
                    onClick={() => setJobInputMode("url")}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-all border-b-2 -mb-px ${
                      jobInputMode === "url"
                        ? "border-[#0A2647] text-[#0A2647]"
                        : "border-transparent text-stone-400 hover:text-stone-600"
                    }`}
                  >
                    <LinkIcon className="w-4 h-4" strokeWidth={1.5} />
                    LinkedIn URL
                  </button>
                </div>

                {jobInputMode === "url" ? (
                  <div>
                    <input
                      type="url"
                      value={jobUrl}
                      onChange={(e) => setJobUrl(e.target.value)}
                      placeholder="https://linkedin.com/jobs/view/..."
                      className="w-full px-0 py-3 border-b border-stone-200 text-[#1a1a1a] text-sm focus:outline-none focus:border-[#0A2647] transition-colors placeholder:text-stone-300 bg-transparent font-light"
                    />
                    <p className="text-xs text-stone-400 mt-3 font-light">
                      We'll extract the job details automatically
                    </p>
                  </div>
                ) : (
                  <div>
                    <textarea
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      placeholder="Please paste the complete job description here..."
                      className="w-full h-[180px] p-0 border-b border-stone-200 text-[#1a1a1a] text-sm resize-none focus:outline-none focus:border-[#0A2647] transition-colors placeholder:text-stone-300 bg-transparent font-light leading-relaxed"
                    />
                    <p className="text-xs text-stone-400 mt-3 font-light">
                      Include requirements, responsibilities, and qualifications
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-8 p-5 bg-red-50/80 border border-red-200/60 rounded-sm flex items-center gap-4 text-red-700 max-w-2xl mx-auto">
              <AlertCircle className="w-5 h-5 flex-shrink-0" strokeWidth={1.5} />
              <span className="font-light">{error}</span>
            </div>
          )}

          {/* CTA Button */}
          <div className="mt-14 flex justify-center">
            <button
              onClick={handleAnalyze}
              disabled={!canAnalyze || isAnalyzing}
              className="group inline-flex items-center gap-4 px-12 py-5 bg-[#0A2647] hover:bg-[#0d3259] disabled:bg-stone-200 disabled:text-stone-400 text-white font-medium rounded-sm transition-all text-base tracking-wide"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" strokeWidth={1.5} />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <span>Analyze & Optimize</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" strokeWidth={1.5} />
                </>
              )}
            </button>
          </div>

          {/* Helper Text */}
          <p className="text-center text-sm text-stone-400 mt-6 font-light tracking-wide">
            For best results, provide the complete job description
          </p>
        </div>
      </main>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={closeAuthModal}
        trigger={authTrigger}
      />
    </div>
  );
}
