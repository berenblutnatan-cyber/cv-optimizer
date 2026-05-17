"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { UserButton, useUser, SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { Logo } from "@/components/Logo";
import Link from "next/link";
import { CreditBalance } from "@/components/CreditBalance";
import { toast } from "sonner";
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
  Pen,
  Coins
} from "lucide-react";
import { saveAnalysisToSession } from "@/lib/analysisSession";
import { AuthModal, useAuthModal } from "@/components/shared/AuthModal";
import { FreeCreditToast } from "@/components/FreeCreditToast";
import { track } from "@/lib/analytics";

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
  const [showFreeCreditToast, setShowFreeCreditToast] = useState(false);
  
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
  const hasFiredCvEvent = useRef(false);
  const hasFiredJobEvent = useRef(false);
  const hasFiredPageView = useRef(false);

  // Fire one-time page view event
  useEffect(() => {
    if (hasFiredPageView.current) return;
    hasFiredPageView.current = true;
    track("optimize_page_viewed", { signed_in: !!isSignedIn });
  }, [isSignedIn]);

  // Fire one-time CV-added event the first time the user supplies a CV
  useEffect(() => {
    if (hasFiredCvEvent.current) return;
    if (cvFile || cvText.trim().length > 0) {
      hasFiredCvEvent.current = true;
      track("cv_added", {
        source: cvFile ? "file" : "paste",
        size: cvFile ? cvFile.size : cvText.length,
        file_type: cvFile?.type || null,
      });
    }
  }, [cvFile, cvText]);

  // Fire one-time job-context-added event the first time any job field is filled
  useEffect(() => {
    if (hasFiredJobEvent.current) return;
    if (jobTitle.trim() || jobDescription.trim() || jobUrl.trim()) {
      hasFiredJobEvent.current = true;
      track("job_context_added", {
        has_title: !!jobTitle.trim(),
        has_description: !!jobDescription.trim(),
        has_url: !!jobUrl.trim(),
        input_mode: jobInputMode,
      });
    }
  }, [jobTitle, jobDescription, jobUrl, jobInputMode]);

  // Track when auth modal opens
  useEffect(() => {
    if (isAuthModalOpen) {
      wasAuthModalOpen.current = true;
      track("auth_modal_shown", { trigger: authTrigger, source: "optimize" });
    }
  }, [isAuthModalOpen, authTrigger]);
  
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

  const focusEmptyField = (id: string) => {
    if (typeof document === "undefined") return;
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    // Delay focus to let the scroll settle on mobile.
    setTimeout(() => {
      (el as HTMLInputElement | HTMLTextAreaElement).focus();
    }, 250);
  };

  const handleAnalyze = async () => {
    track("analyze_clicked", {
      signed_in: !!isSignedIn,
      has_resume: !!hasResume,
      has_job_context: !!hasJobContext,
      job_input_mode: jobInputMode,
    });

    if (!hasResume) {
      toast.error("Add your resume to continue", {
        description: "Upload a PDF/DOCX or paste your CV text",
      });
      focusEmptyField("cv-text");
      return;
    }
    if (!hasJobContext) {
      toast.error("Add the target role to continue", {
        description: "A job title, description, or LinkedIn URL works",
      });
      focusEmptyField(jobInputMode === "url" ? "job-url" : "job-title");
      return;
    }

    if (!isSignedIn) {
      // Show free credit toast before auth modal
      setShowFreeCreditToast(true);
      
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
        setTimeout(() => {
          openAuthModal("analyze");
        }, 500); // Small delay to show toast first
      };
      
      saveDraft();
      return;
    }

    // Check credits before analyzing
    try {
      const creditCheck = await fetch("/api/use-credit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const creditResult = await creditCheck.json();

      if (!creditResult.success) {
        track("credit_check_failed", { reason: "insufficient_credits" });
        toast.error("You need credits to continue", {
          description: "Get our Starter Pack for just $3!",
          action: {
            label: "View Pricing",
            onClick: () => {
              track("pricing_clicked", { source: "credit_toast" });
              router.push("/pricing");
            },
          },
        });
        return;
      }
    } catch (creditError) {
      console.error("Credit check failed:", creditError);
      track("credit_check_failed", { reason: "exception" });
      toast.error("Failed to check credits", {
        description: "Please try again.",
      });
      return;
    }

    track("optimize_started", {
      job_input_mode: jobInputMode,
      cv_size: cvText.length || (cvFile?.size ?? 0),
    });
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

      track("optimize_succeeded", {
        job_title: jobTitle.trim() || null,
        match_score:
          typeof data?.analysis?.matchScore === "number"
            ? data.analysis.matchScore
            : typeof data?.analysis?.overall_score === "number"
              ? data.analysis.overall_score
              : null,
      });

      router.push("/results");

    } catch (err) {
      // Credit was already deducted before the analyze call — refund it so the
      // user isn't charged for a failure that isn't their fault.
      try {
        await fetch("/api/refund-credit", { method: "POST" });
      } catch {
        // best-effort; don't block the error toast
      }
      track("optimize_failed", {
        message: err instanceof Error ? err.message : "unknown",
      });
      toast.error("Analysis failed — credit refunded", {
        description: err instanceof Error ? err.message : "Something went wrong. Please try again.",
      });
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
      <header className="w-full bg-white/85 backdrop-blur-md border-b border-stone-200/60">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-8 lg:px-16 h-16 sm:h-20 flex items-center justify-between gap-3">
          <Logo variant="dark" size="md" />
          <nav className="flex items-center gap-3 sm:gap-5">
            <Link
              href="/builder"
              className="hidden sm:inline-flex text-sm font-medium text-stone-500 hover:text-stone-900 transition-colors tracking-wide focus-visible:outline-none"
            >
              Resume Builder
            </Link>
            <span className="hidden sm:inline-block w-px h-4 bg-stone-300" />
            <span className="hidden sm:inline-flex text-sm font-medium text-[#0A2647] tracking-wide" aria-current="page">
              Optimizer
            </span>
            <SignedIn>
              <CreditBalance />
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
                <button className="px-4 sm:px-5 py-2 sm:py-2.5 text-sm font-medium text-stone-600 hover:text-stone-900 border border-stone-300 hover:border-stone-400 rounded-sm transition-colors tracking-wide focus-visible:outline-none">
                  Sign In
                </button>
              </SignInButton>
            </SignedOut>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full px-4 sm:px-8 lg:px-16 py-10 sm:py-12">
        {/* Hero Section */}
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10 sm:mb-14">
            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-light text-[#1a1a1a] mb-4 tracking-tight">
              Optimize Your Resume
            </h1>
            <div className="w-16 h-px bg-[#0A2647] mx-auto mb-5" />
            <p className="text-stone-500 text-base sm:text-lg font-light tracking-wide max-w-xl mx-auto">
              Upload your resume and provide the target role — we'll tailor it for maximum impact
            </p>
          </div>

          {/* Two Column Layout */}
          <div className="grid lg:grid-cols-2 gap-6 sm:gap-10 max-w-6xl mx-auto">
            
            {/* Left Panel - Resume Upload */}
            <div className="bg-white rounded-sm shadow-card p-6 sm:p-8 lg:p-10">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-11 h-11 rounded-full bg-[#0A2647]/5 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-[#0A2647]" strokeWidth={1.5} />
                </div>
                <div>
                  <h2 className="font-serif text-xl text-[#1a1a1a] tracking-tight">Your Resume</h2>
                  <p className="text-sm text-stone-500 font-light">PDF, DOCX, or plain text</p>
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
                      <p className="text-sm text-stone-500">{(cvFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <button
                      onClick={() => { setCvFile(null); setCvText(""); }}
                      className="p-2 hover:bg-stone-100 rounded-full ml-2 transition-colors"
                    >
                      <X className="w-4 h-4 text-stone-500" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-stone-500 mx-auto mb-4" strokeWidth={1.5} />
                    <p className="text-stone-500 mb-2 font-light">Drag and drop your resume here</p>
                    <p className="text-sm text-stone-500 mb-5">or</p>
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
                <span className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 bg-white px-4 text-sm text-stone-500 font-light">
                  or paste text
                </span>
              </div>

              {/* Text Area */}
              <label htmlFor="cv-text" className="sr-only">Resume content</label>
              <textarea
                id="cv-text"
                value={cvText}
                onChange={(e) => { setCvText(e.target.value); if (e.target.value) setCvFile(null); }}
                placeholder="Please paste your resume contents here..."
                className="w-full h-40 p-4 border border-stone-200 rounded-sm bg-stone-50/40 text-[#1a1a1a] text-sm resize-none focus:outline-none focus:border-[#0A2647] focus:ring-1 focus:ring-[#0A2647]/20 focus:bg-white transition-colors placeholder:text-stone-500 font-light leading-relaxed"
              />

              {/* Summary Section */}
              <div className="mt-8 pt-8 border-t border-stone-100">
                <div className="flex items-center gap-3 mb-4">
                  <Pen className="w-4 h-4 text-stone-500" strokeWidth={1.5} />
                  <div>
                    <label htmlFor="summary" className="font-medium text-[#1a1a1a] text-sm tracking-wide block">Professional Summary</label>
                    <p className="text-xs text-stone-500 font-light">Optional — AI will enhance it</p>
                  </div>
                </div>
                <textarea
                  id="summary"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="A brief 2-4 sentence summary of your experience and goals..."
                  className="w-full h-24 p-4 border border-stone-200 rounded-sm bg-stone-50/40 text-[#1a1a1a] text-sm resize-none focus:outline-none focus:border-[#0A2647] focus:ring-1 focus:ring-[#0A2647]/20 focus:bg-white transition-colors placeholder:text-stone-500 font-light leading-relaxed"
                />
              </div>
            </div>

            {/* Right Panel - Job Context */}
            <div className="bg-white rounded-sm shadow-card p-6 sm:p-8 lg:p-10">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-11 h-11 rounded-full bg-[#0A2647]/5 flex items-center justify-center">
                  <Briefcase className="w-5 h-5 text-[#0A2647]" strokeWidth={1.5} />
                </div>
                <div>
                  <h2 className="font-serif text-xl text-[#1a1a1a] tracking-tight">Target Role</h2>
                  <p className="text-sm text-stone-500 font-light">Role details for tailored optimization</p>
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
                <label htmlFor="job-title" className="block text-sm font-medium text-[#1a1a1a] mb-3 tracking-wide">
                  Target Job Title
                </label>
                <input
                  id="job-title"
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="e.g. Senior Software Engineer"
                  className="w-full px-4 py-3 border border-stone-200 rounded-sm bg-stone-50/40 text-[#1a1a1a] text-sm focus:outline-none focus:border-[#0A2647] focus:ring-1 focus:ring-[#0A2647]/20 focus:bg-white transition-colors placeholder:text-stone-500 font-light"
                />
              </div>

              {/* Toggle: URL vs Description */}
              <div className="mb-6">
                <span className="block text-sm font-medium text-[#1a1a1a] mb-4 tracking-wide">
                  Job Details
                </span>
                <div className="flex border-b border-stone-200 mb-6">
                  <button
                    type="button"
                    onClick={() => setJobInputMode("description")}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-all border-b-2 -mb-px ${
                      jobInputMode === "description"
                        ? "border-[#0A2647] text-[#0A2647]"
                        : "border-transparent text-stone-500 hover:text-stone-600"
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
                        : "border-transparent text-stone-500 hover:text-stone-600"
                    }`}
                  >
                    <LinkIcon className="w-4 h-4" strokeWidth={1.5} />
                    LinkedIn URL
                  </button>
                </div>

                {jobInputMode === "url" ? (
                  <div>
                    <label htmlFor="job-url" className="sr-only">LinkedIn job URL</label>
                    <input
                      id="job-url"
                      type="url"
                      value={jobUrl}
                      onChange={(e) => setJobUrl(e.target.value)}
                      placeholder="https://linkedin.com/jobs/view/..."
                      className="w-full px-4 py-3 border border-stone-200 rounded-sm bg-stone-50/40 text-[#1a1a1a] text-sm focus:outline-none focus:border-[#0A2647] focus:ring-1 focus:ring-[#0A2647]/20 focus:bg-white transition-colors placeholder:text-stone-500 font-light"
                    />
                    <p className="text-xs text-stone-500 mt-3 font-light">
                      We'll extract the job details automatically
                    </p>
                  </div>
                ) : (
                  <div>
                    <label htmlFor="job-description" className="sr-only">Job description</label>
                    <textarea
                      id="job-description"
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      placeholder="Please paste the complete job description here..."
                      className="w-full h-[180px] p-4 border border-stone-200 rounded-sm bg-stone-50/40 text-[#1a1a1a] text-sm resize-none focus:outline-none focus:border-[#0A2647] focus:ring-1 focus:ring-[#0A2647]/20 focus:bg-white transition-colors placeholder:text-stone-500 font-light leading-relaxed"
                    />
                    <p className="text-xs text-stone-500 mt-3 font-light">
                      Include requirements, responsibilities, and qualifications
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>


          {/* CTA Button */}
          <div className="mt-10 sm:mt-14 flex flex-col items-center gap-4">
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              aria-disabled={!canAnalyze}
              className="group inline-flex items-center gap-3 sm:gap-4 px-8 sm:px-12 py-4 sm:py-5 bg-[#0A2647] hover:bg-[#0d3259] disabled:opacity-70 disabled:cursor-wait text-white font-medium rounded-sm shadow-sm hover:shadow-md transition-all text-base tracking-wide focus-visible:outline-none"
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
            
            {/* Credit Cost Info */}
            <div className="flex items-center gap-2 px-4 py-2 bg-[#B8860B]/5 border border-[#B8860B]/20 rounded-sm">
              <Coins className="w-4 h-4 text-[#B8860B]" strokeWidth={2} />
              <span className="text-sm text-stone-600 font-light">
                <span className="font-medium text-[#B8860B]">1 Credit</span> per optimization
              </span>
              <Link 
                href="/pricing"
                className="text-xs text-[#0A2647] hover:text-[#0d3259] underline font-medium ml-1"
              >
                Get more
              </Link>
            </div>
          </div>

          {/* Helper Text */}
          <p className="text-center text-sm text-stone-500 mt-6 font-light tracking-wide">
            For best results, provide the complete job description
          </p>
        </div>
      </main>

      {/* Free Credit incentive shown before the auth modal */}
      <FreeCreditToast
        isOpen={showFreeCreditToast}
        onClose={() => setShowFreeCreditToast(false)}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={closeAuthModal}
        trigger={authTrigger}
      />
    </div>
  );
}
