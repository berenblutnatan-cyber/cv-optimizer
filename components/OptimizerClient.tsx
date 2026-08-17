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
  Coins,
  Zap,
  Target,
  Sparkles
} from "lucide-react";
import { AnalysisProgress, type AuditPreview } from "@/components/optimizer/AnalysisProgress";
import { readAnalyzeStream, type AnalyzeStage, type AnalyzeStreamEvent } from "@/lib/optimizer/stream";
import { OutOfCreditsModal, useOutOfCreditsModal } from "@/components/OutOfCreditsModal";
import { AuthModal, useAuthModal } from "@/components/shared/AuthModal";
import { FreeCreditToast } from "@/components/FreeCreditToast";
import { track } from "@/lib/analytics";
import { useT } from "@/lib/i18n/LanguageProvider";

const DRAFT_KEY = "optimizer_draft";

// Inactivity watchdog for the analyze stream: the route streams a progress
// event at every pipeline stage, so this only fires on a genuinely dead
// connection — not on a long (60-90s by design) healthy run.
const ANALYZE_TIMEOUT_MS = 150_000;

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
  const { t } = useT();
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
  const [analyzeStage, setAnalyzeStage] = useState<AnalyzeStage | null>(null);
  const [auditPreview, setAuditPreview] = useState<AuditPreview | null>(null);
  const [error, setError] = useState("");
  
  // Job input mode toggle
  const [jobInputMode, setJobInputMode] = useState<"description" | "url">("description");

  // Analysis mode: "quick" (CV only, no role) vs "targeted" (CV + role for tailoring).
  // Initialize from ?mode=quick query param so the landing-page Quick CTA can deep-link in.
  const [analysisMode, setAnalysisMode] = useState<"targeted" | "quick">("targeted");
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("mode") === "quick") setAnalysisMode("quick");
  }, []);
  
  // Auth modal for deferred authentication
  const { isOpen: isAuthModalOpen, trigger: authTrigger, openModal: openAuthModal, closeModal: closeAuthModal } = useAuthModal();

  // Out-of-credits paywall
  const oocModal = useOutOfCreditsModal();
  
  // Track if we've already restored from draft
  const hasRestoredDraft = useRef(false);
  const wasAuthModalOpen = useRef(false);
  const hasFiredCvEvent = useRef(false);
  const hasFiredJobEvent = useRef(false);
  const hasFiredPageView = useRef(false);
  const cvFileInputRef = useRef<HTMLInputElement>(null);

  // In-flight analyze request — lets Cancel and the timeout abort it.
  const abortRef = useRef<AbortController | null>(null);
  const timedOutRef = useRef(false);
  const cancelledRef = useRef(false);

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
    if (!file) return;
    // Rejections must be audible — a silently ignored drop reads as "the app
    // is broken" (same validation copy as /score and the onboarding funnel).
    const accepted =
      file.type === "application/pdf" ||
      file.name.endsWith(".pdf") ||
      file.name.endsWith(".docx") ||
      file.name.endsWith(".txt");
    if (!accepted) {
      toast.error(t("That file type isn't supported — upload a PDF, DOCX, or TXT."));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("That file is over 5 MB — export a smaller PDF and try again."));
      return;
    }
    setCvFile(file);
    if (file.type === "text/plain" || file.name.endsWith(".txt")) {
      const text = await file.text();
      setCvText(text);
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
    // Reset so the same file can be re-selected if user removes & re-picks.
    if (cvFileInputRef.current) cvFileInputRef.current.value = "";
  };

  // Validation
  const hasResume = cvText.trim() || cvFile;
  const hasJobContext = jobTitle.trim() || jobDescription.trim() || jobUrl.trim();
  const isQuickMode = analysisMode === "quick";
  const canAnalyze = isQuickMode ? !!hasResume : !!(hasResume && hasJobContext);

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

  // Persist the current inputs (including the file as base64) so nothing is
  // lost across a sign-in or checkout navigation. Restored on next mount by
  // the draft-restore effect above — for signed-in and anonymous users alike.
  const persistDraft = async () => {
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

    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch (err) {
      // localStorage full or unavailable — nothing more we can do client-side.
      console.error("Failed to save draft:", err);
    }
  };

  const handleAnalyze = async () => {
    track("analyze_clicked", {
      signed_in: !!isSignedIn,
      has_resume: !!hasResume,
      has_job_context: !!hasJobContext,
      job_input_mode: jobInputMode,
      analysis_mode: analysisMode,
    });

    if (!hasResume) {
      toast.error(t("Add your resume to continue"), {
        description: t("Upload a PDF/DOCX or paste your CV text"),
      });
      focusEmptyField("cv-text");
      return;
    }
    if (!isQuickMode && !hasJobContext) {
      toast.error(t("Add the target role to continue"), {
        description: t("A job title, description, or LinkedIn URL works — or switch to Quick mode"),
      });
      focusEmptyField(jobInputMode === "url" ? "job-url" : "job-title");
      return;
    }

    if (!isSignedIn) {
      // Show free credit toast before auth modal
      setShowFreeCreditToast(true);

      // Save draft (including the file as base64), then open the auth modal.
      persistDraft().then(() => {
        setTimeout(() => {
          openAuthModal("analyze");
        }, 500); // Small delay to show toast first
      });
      return;
    }

    // Credits are checked and charged server-side by /api/analyze (only on
    // success), so there's no separate use-credit/refund-credit round trip.
    track("optimize_started", {
      job_input_mode: jobInputMode,
      cv_size: cvText.length || (cvFile?.size ?? 0),
    });
    setIsAnalyzing(true);
    setAnalyzeStage(null);
    setAuditPreview(null);

    try {
      const formData = new FormData();
      if (cvFile) formData.append("cv", cvFile);
      if (cvText) formData.append("cvText", cvText);
      formData.append("mode", isQuickMode ? "quick" : "specific_role");

      if (jobTitle.trim()) formData.append("jobTitle", jobTitle.trim());
      if (jobDescription.trim()) formData.append("jobDescription", jobDescription.trim());
      if (jobUrl.trim()) formData.append("jobUrl", jobUrl.trim());
      
      const companyName = extractCompanyFromContext() || "Target Company";
      formData.append("companyName", companyName);
      
      if (summary.trim()) {
        formData.append("summary", summary.trim());
      }

      // Abortable fetch. The response streams progress events, so the timeout
      // is an INACTIVITY watchdog — reset on every event — rather than a hard
      // cap on the whole (60-90s by design) pipeline.
      const controller = new AbortController();
      abortRef.current = controller;
      timedOutRef.current = false;
      cancelledRef.current = false;
      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      const armTimeout = () => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          timedOutRef.current = true;
          controller.abort();
        }, ANALYZE_TIMEOUT_MS);
      };
      armTimeout();

      let response: Response;
      try {
        response = await fetch("/api/analyze", {
          method: "POST",
          body: formData,
          signal: controller.signal,
        });
      } catch (fetchErr) {
        if (timeoutId) clearTimeout(timeoutId);
        throw fetchErr;
      }

      const contentType = response.headers.get("content-type") ?? "";

      // Pre-flight failures (401/402/400, bad file, dead job URL) come back as
      // plain JSON before the stream starts. Gateway timeouts (504) return
      // HTML — never parse blindly.
      if (!contentType.includes("text/event-stream")) {
        if (timeoutId) clearTimeout(timeoutId);
        const data = contentType.includes("application/json")
          ? await response.json().catch(() => null)
          : null;
        if (response.status === 402) {
          track("credit_check_failed", { reason: "insufficient_credits" });
          // Save the user's work BEFORE the paywall: checkout is a hard
          // navigation, and their inputs must survive the round trip.
          await persistDraft();
          oocModal.open({ trigger: "optimize" });
          return;
        }
        throw new Error(
          data?.error ||
            t("Our analysis service hit a snag. Your inputs are safe — please try again.")
        );
      }

      if (!response.body) throw new Error(t("Our analysis service hit a snag. Your inputs are safe — please try again."));

      let resultEvent: Extract<AnalyzeStreamEvent, { type: "result" }> | null = null;
      let errorEvent: Extract<AnalyzeStreamEvent, { type: "error" }> | null = null;
      try {
        await readAnalyzeStream(response.body, (evt) => {
          armTimeout();
          if (evt.type === "stage") {
            setAnalyzeStage(evt.stage);
            track("optimize_stage_completed", { stage: evt.stage });
          } else if (evt.type === "audit") {
            setAuditPreview(evt);
          } else if (evt.type === "result") {
            resultEvent = evt;
          } else if (evt.type === "error") {
            errorEvent = evt;
          }
        });
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
      }

      if (errorEvent !== null) {
        const errEvt = errorEvent as Extract<AnalyzeStreamEvent, { type: "error" }>;
        if (errEvt.code === "INSUFFICIENT_CREDITS") {
          track("credit_check_failed", { reason: "insufficient_credits" });
          await persistDraft();
          oocModal.open({ trigger: "optimize" });
          return;
        }
        throw new Error(errEvt.error);
      }
      if (resultEvent === null) {
        // Stream ended without a terminal event — connection dropped mid-run.
        throw new Error(t("The connection dropped mid-analysis. Please try again."));
      }
      const result = resultEvent as Extract<AnalyzeStreamEvent, { type: "result" }>;

      try {
        await fetch("/api/track", { method: "POST" });
      } catch {
        // ignore
      }

      track("optimize_succeeded", {
        job_title: jobTitle.trim() || null,
        match_score: result.analysis.overallScore ?? null,
      });

      // Results are persisted server-side — the Review Studio reads them back
      // by id, so a refresh or a closed tab never loses (or re-charges) a run.
      router.push(`/results/${result.analysisId}`);

    } catch (err) {
      // User pressed Cancel — back to the form silently, inputs intact.
      if (cancelledRef.current) return;

      // The server only charges a credit when analysis succeeds, so a failure
      // here costs the user nothing.
      const timedOut = timedOutRef.current;
      track("optimize_failed", {
        message: timedOut ? "timeout" : err instanceof Error ? err.message : "unknown",
      });
      if (timedOut) {
        toast.error(t("This is taking longer than usual"), {
          description: t("The analysis timed out — your inputs are untouched. Please try again."),
        });
      } else {
        toast.error(t("Analysis failed — you weren't charged"), {
          description: err instanceof Error ? err.message : t("Something went wrong. Please try again."),
        });
      }
    } finally {
      abortRef.current = null;
      setIsAnalyzing(false);
    }
  };

  // Visible escape hatch on the analyzing overlay: abort the request and
  // return to the form with every input intact.
  const handleCancelAnalyze = () => {
    cancelledRef.current = true;
    abortRef.current?.abort();
    setIsAnalyzing(false);
    setAnalyzeStage(null);
    setAuditPreview(null);
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
              {t("Resume Builder")}
            </Link>
            <span className="hidden sm:inline-block w-px h-4 bg-stone-300" />
            <span className="hidden sm:inline-flex text-sm font-medium text-brand-navy tracking-wide" aria-current="page">
              {t("Optimizer")}
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
                  {t("Sign In")}
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
          <div className="text-center mb-8 sm:mb-10">
            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-light text-brand-ink mb-4 tracking-tight">
              {t("Optimize Your Resume")}
            </h1>
            <div className="w-16 h-px bg-brand-navy mx-auto mb-5" />
            <p className="text-stone-500 text-base sm:text-lg font-light tracking-wide max-w-xl mx-auto">
              {isQuickMode
                ? t("Upload your CV and we'll polish it — no job description needed.")
                : t("Upload your resume and provide the target role — we'll tailor it for maximum impact.")}
            </p>
          </div>

          {/* Inline real-progress panel (replaces the form while analyzing) */}
          {isAnalyzing && (
            <AnalysisProgress stage={analyzeStage} audit={auditPreview} onCancel={handleCancelAnalyze} />
          )}

          <div className={isAnalyzing ? "hidden" : ""}>

          {/* Mode Toggle: Quick (CV only) vs Targeted (with role) */}
          <div className="max-w-2xl mx-auto mb-8 sm:mb-12">
            <div
              role="tablist"
              aria-label={t("Optimization mode")}
              className="grid grid-cols-2 gap-2 p-1.5 bg-white border border-stone-200 rounded-sm shadow-soft"
            >
              <button
                type="button"
                role="tab"
                aria-selected={isQuickMode}
                onClick={() => {
                  setAnalysisMode("quick");
                  track("analysis_mode_changed", { mode: "quick" });
                }}
                className={`group relative flex items-center justify-center gap-2 sm:gap-3 px-3 sm:px-5 py-3 sm:py-3.5 rounded-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy/30 ${
                  isQuickMode
                    ? "bg-brand-navy text-white shadow-sm"
                    : "bg-transparent text-stone-600 hover:bg-stone-50"
                }`}
              >
                <Zap className={`w-4 h-4 sm:w-5 sm:h-5 ${isQuickMode ? "text-brand-gold" : ""}`} strokeWidth={2} />
                <div className="text-left">
                  <div className="text-sm sm:text-base font-medium tracking-wide">{t("Quick Optimize")}</div>
                  <div className={`hidden sm:block text-[11px] font-light ${isQuickMode ? "text-white/70" : "text-stone-500"}`}>
                    {t("Just my CV · no role")}
                  </div>
                </div>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={!isQuickMode}
                onClick={() => {
                  setAnalysisMode("targeted");
                  track("analysis_mode_changed", { mode: "targeted" });
                }}
                className={`group relative flex items-center justify-center gap-2 sm:gap-3 px-3 sm:px-5 py-3 sm:py-3.5 rounded-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy/30 ${
                  !isQuickMode
                    ? "bg-brand-navy text-white shadow-sm"
                    : "bg-transparent text-stone-600 hover:bg-stone-50"
                }`}
              >
                <Target className={`w-4 h-4 sm:w-5 sm:h-5 ${!isQuickMode ? "text-brand-gold" : ""}`} strokeWidth={2} />
                <div className="text-left">
                  <div className="text-sm sm:text-base font-medium tracking-wide">{t("Tailor to Role")}</div>
                  <div className={`hidden sm:block text-[11px] font-light ${!isQuickMode ? "text-white/70" : "text-stone-500"}`}>
                    {t("Match a specific job")}
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Form Layout — single-col in quick mode, two-col in targeted mode */}
          <div className={`grid gap-6 sm:gap-10 max-w-6xl mx-auto ${isQuickMode ? "lg:grid-cols-1 max-w-2xl" : "lg:grid-cols-2"}`}>
            
            {/* Left Panel - Resume Upload */}
            <div className="bg-white rounded-sm shadow-card p-6 sm:p-8 lg:p-10">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-11 h-11 rounded-full bg-brand-navy/5 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-brand-navy" strokeWidth={1.5} />
                </div>
                <div>
                  <h2 className="font-serif text-xl text-brand-ink tracking-tight">{t("Your Resume")}</h2>
                  <p className="text-sm text-stone-500 font-light">{t("PDF, DOCX, or plain text")}</p>
                </div>
              </div>

              {/* Drop Zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`relative border rounded-sm p-10 text-center transition-all mb-6 ${
                  isDragging
                    ? "border-brand-navy bg-brand-navy/5"
                    : cvFile
                      ? "border-brand-navy/30 bg-brand-navy/5"
                      : "border-stone-200 hover:border-stone-300 bg-stone-50/50"
                }`}
              >
                {cvFile ? (
                  <div className="flex items-center justify-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-brand-navy/10 flex items-center justify-center">
                      <Check className="w-5 h-5 text-brand-navy" strokeWidth={1.5} />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-brand-ink">{cvFile.name}</p>
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
                    <p className="text-stone-500 mb-2 font-light">{t("Drag and drop your resume here")}</p>
                    <p className="text-sm text-stone-500 mb-5">{t("or")}</p>
                    {/* Programmatic file-picker open. `<label>` wrapping a
                        `display:none` input doesn't dispatch on iOS Safari
                        + in-app webviews (LinkedIn/Instagram/Meta). */}
                    <button
                      type="button"
                      onClick={() => cvFileInputRef.current?.click()}
                      aria-label={t("Select resume file")}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-transparent border border-brand-navy text-brand-navy font-medium rounded-sm hover:bg-brand-navy hover:text-white transition-all tracking-wide text-sm focus-visible:outline-none"
                    >
                      <span>{t("Select File")}</span>
                    </button>
                    <input
                      ref={cvFileInputRef}
                      type="file"
                      accept=".pdf,.docx,.txt"
                      onChange={handleFileSelect}
                      tabIndex={-1}
                      aria-hidden="true"
                      className="absolute -left-[9999px] w-px h-px opacity-0"
                    />
                  </>
                )}
              </div>

              {/* Divider */}
              <div className="relative my-8">
                <div className="absolute inset-x-0 top-1/2 h-px bg-stone-200" />
                <span className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 bg-white px-4 text-sm text-stone-500 font-light">
                  {t("or paste text")}
                </span>
              </div>

              {/* Text Area */}
              <label htmlFor="cv-text" className="sr-only">{t("Resume content")}</label>
              <textarea
                id="cv-text"
                value={cvText}
                onChange={(e) => { setCvText(e.target.value); if (e.target.value) setCvFile(null); }}
                placeholder={t("Please paste your resume contents here...")}
                className="w-full h-40 p-4 border border-stone-200 rounded-sm bg-stone-50/40 text-brand-ink text-sm resize-none focus:outline-none focus:border-brand-navy focus:ring-1 focus:ring-brand-navy/20 focus:bg-white transition-colors placeholder:text-stone-500 font-light leading-relaxed"
              />

              {/* Summary Section */}
              <div className="mt-8 pt-8 border-t border-stone-100">
                <div className="flex items-center gap-3 mb-4">
                  <Pen className="w-4 h-4 text-stone-500" strokeWidth={1.5} />
                  <div>
                    <label htmlFor="summary" className="font-medium text-brand-ink text-sm tracking-wide block">{t("Professional Summary")}</label>
                    <p className="text-xs text-stone-500 font-light">{t("Optional — AI will enhance it")}</p>
                  </div>
                </div>
                <textarea
                  id="summary"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder={t("A brief 2-4 sentence summary of your experience and goals...")}
                  className="w-full h-24 p-4 border border-stone-200 rounded-sm bg-stone-50/40 text-brand-ink text-sm resize-none focus:outline-none focus:border-brand-navy focus:ring-1 focus:ring-brand-navy/20 focus:bg-white transition-colors placeholder:text-stone-500 font-light leading-relaxed"
                />
              </div>
            </div>

            {/* Right Panel - Job Context. Hidden in quick mode. */}
            {!isQuickMode && (
            <div className="bg-white rounded-sm shadow-card p-6 sm:p-8 lg:p-10">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-11 h-11 rounded-full bg-brand-navy/5 flex items-center justify-center">
                  <Briefcase className="w-5 h-5 text-brand-navy" strokeWidth={1.5} />
                </div>
                <div>
                  <h2 className="font-serif text-xl text-brand-ink tracking-tight">{t("Target Role")}</h2>
                  <p className="text-sm text-stone-500 font-light">{t("Role details for tailored optimization")}</p>
                </div>
              </div>

              {/* Status Indicator */}
              <div className={`mb-8 p-4 rounded-sm flex items-center gap-3 text-sm font-light ${
                hasJobContext 
                  ? "bg-brand-navy/5 text-brand-navy" 
                  : "bg-amber-50/80 text-amber-700"
              }`}>
                {hasJobContext ? (
                  <>
                    <Check className="w-4 h-4" strokeWidth={1.5} />
                    <span>{t("Ready to analyze")}</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4" strokeWidth={1.5} />
                    <span>{t("Please provide a job title or description")}</span>
                  </>
                )}
              </div>

              {/* Job Title Input */}
              <div className="mb-8">
                <label htmlFor="job-title" className="block text-sm font-medium text-brand-ink mb-3 tracking-wide">
                  {t("Target Job Title")}
                </label>
                <input
                  id="job-title"
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder={t("e.g. Senior Software Engineer")}
                  className="w-full px-4 py-3 border border-stone-200 rounded-sm bg-stone-50/40 text-brand-ink text-sm focus:outline-none focus:border-brand-navy focus:ring-1 focus:ring-brand-navy/20 focus:bg-white transition-colors placeholder:text-stone-500 font-light"
                />
              </div>

              {/* Toggle: URL vs Description */}
              <div className="mb-6">
                <span className="block text-sm font-medium text-brand-ink mb-4 tracking-wide">
                  {t("Job Details")}
                </span>
                <div className="flex border-b border-stone-200 mb-6">
                  <button
                    type="button"
                    onClick={() => setJobInputMode("description")}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-all border-b-2 -mb-px ${
                      jobInputMode === "description"
                        ? "border-brand-navy text-brand-navy"
                        : "border-transparent text-stone-500 hover:text-stone-600"
                    }`}
                  >
                    <FileSearch className="w-4 h-4" strokeWidth={1.5} />
                    {t("Paste Description")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setJobInputMode("url")}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-all border-b-2 -mb-px ${
                      jobInputMode === "url"
                        ? "border-brand-navy text-brand-navy"
                        : "border-transparent text-stone-500 hover:text-stone-600"
                    }`}
                  >
                    <LinkIcon className="w-4 h-4" strokeWidth={1.5} />
                    {t("LinkedIn URL")}
                  </button>
                </div>

                {jobInputMode === "url" ? (
                  <div>
                    <label htmlFor="job-url" className="sr-only">{t("LinkedIn job URL")}</label>
                    <input
                      id="job-url"
                      type="url"
                      value={jobUrl}
                      onChange={(e) => setJobUrl(e.target.value)}
                      placeholder="https://linkedin.com/jobs/view/..."
                      className="w-full px-4 py-3 border border-stone-200 rounded-sm bg-stone-50/40 text-brand-ink text-sm focus:outline-none focus:border-brand-navy focus:ring-1 focus:ring-brand-navy/20 focus:bg-white transition-colors placeholder:text-stone-500 font-light"
                    />
                    <p className="text-xs text-stone-500 mt-3 font-light">
                      {t("We'll extract the job details automatically")}
                    </p>
                  </div>
                ) : (
                  <div>
                    <label htmlFor="job-description" className="sr-only">{t("Job description")}</label>
                    <textarea
                      id="job-description"
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      placeholder={t("Please paste the complete job description here...")}
                      className="w-full h-[180px] p-4 border border-stone-200 rounded-sm bg-stone-50/40 text-brand-ink text-sm resize-none focus:outline-none focus:border-brand-navy focus:ring-1 focus:ring-brand-navy/20 focus:bg-white transition-colors placeholder:text-stone-500 font-light leading-relaxed"
                    />
                    <p className="text-xs text-stone-500 mt-3 font-light">
                      {t("Include requirements, responsibilities, and qualifications")}
                    </p>
                  </div>
                )}
              </div>
            </div>
            )}
          </div>


          {/* CTA Button */}
          <div className="mt-10 sm:mt-14 flex flex-col items-center gap-4">
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              aria-disabled={!canAnalyze}
              className="group inline-flex items-center gap-3 sm:gap-4 px-8 sm:px-12 py-4 sm:py-5 bg-brand-navy hover:bg-brand-navy-hover disabled:opacity-70 disabled:cursor-wait text-white font-medium rounded-sm shadow-sm hover:shadow-md transition-all text-base tracking-wide focus-visible:outline-none"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" strokeWidth={1.5} />
                  <span>{t("Analyzing...")}</span>
                </>
              ) : isQuickMode ? (
                <>
                  <Sparkles className="w-5 h-5" strokeWidth={1.5} />
                  <span>{t("Quick Optimize My CV")}</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" strokeWidth={1.5} />
                </>
              ) : (
                <>
                  <span>{t("Analyze & Optimize")}</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" strokeWidth={1.5} />
                </>
              )}
            </button>
            
            {/* Credit Cost Info */}
            <div className="flex items-center gap-2 px-4 py-2 bg-brand-gold/5 border border-brand-gold/20 rounded-sm">
              <Coins className="w-4 h-4 text-brand-gold" strokeWidth={2} />
              <span className="text-sm text-stone-600 font-light">
                <span className="font-medium text-brand-gold">{t("1 Credit")}</span> {t("per optimization")}
              </span>
              <Link
                href="/pricing"
                className="text-xs text-brand-navy hover:text-brand-navy-hover underline font-medium ml-1"
              >
                {t("Get more")}
              </Link>
            </div>
          </div>

          {/* Helper Text */}
          <p className="text-center text-sm text-stone-500 mt-6 font-light tracking-wide">
            {isQuickMode
              ? t("Want a job-specific tailor? Switch to Tailor to Role above.")
              : t("For best results, provide the complete job description")}
          </p>

          </div>
        </div>
      </main>

      {/* Out-of-credits paywall — shown when /api/analyze returns 402 */}
      <OutOfCreditsModal
        open={oocModal.isOpen}
        onClose={oocModal.close}
        trigger={oocModal.trigger}
        title={oocModal.title}
        subtitle={oocModal.subtitle}
      />

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
