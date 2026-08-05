"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Upload,
  Sparkles,
  X,
  Check,
  AlertCircle,
  ArrowRight,
  Loader2,
  Target,
  FileCheck,
  Zap,
  RotateCcw,
  ArrowLeft
} from "lucide-react";
import { SignUpButton } from "@clerk/nextjs";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { GoalSelector } from "@/components/teaser/GoalSelector";
import { SiteFooter } from "@/components/shared/SiteFooter";
import { AnalyzingScreen } from "@/components/AnalyzingScreen";
import { useTeaserStore } from "@/stores/teaserStore";
import { isValidJobTitle } from "@/constants/jobTitles";
import posthog from "posthog-js";
import { trackConversion } from "@/lib/gtag";
import { track } from "@/lib/analytics";
import { useT } from "@/lib/i18n/LanguageProvider";

type Step = "input" | "processing" | "result";

// The scoring route is quick relative to the full optimizer, but a dead
// connection or gateway 504 must never leave the user stuck at ~95% forever.
const SCORE_TIMEOUT_MS = 120_000;

// Client-side cap matching /api/score-teaser's MAX_FILE_BYTES — the UI
// promises "max 5MB", so we enforce it before starting a doomed upload.
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/**
 * Score Teaser Page - Lead Magnet
 * Light theme matching the main site design
 */
export default function ScoreTeaserPage() {
  const { t } = useT();
  const [step, setStep] = useState<Step>("input");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const { 
    targetRole, 
    setTargetRole, 
    result, 
    setResult,
    clearAll 
  } = useTeaserStore();

  const [displayScore, setDisplayScore] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // In-flight scoring request — lets Cancel and the timeout abort it.
  const abortRef = useRef<AbortController | null>(null);
  const timedOutRef = useRef(false);
  const cancelledRef = useRef(false);

  // Check for previous result
  useEffect(() => {
    if (result && result.analyzedAt > Date.now() - 24 * 60 * 60 * 1000) {
      setStep("result");
    }
  }, [result]);

  // Animate score
  useEffect(() => {
    if (step === "result" && result) {
      setDisplayScore(0);
      const timer = setTimeout(() => {
        const duration = 1500;
        const startTime = Date.now();
        const animate = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setDisplayScore(Math.round(result.score * eased));
          if (progress < 1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [step, result]);

  // Shared validation for drop + picker: PDF only, under the promised 5MB cap.
  const acceptFile = (candidate: File | undefined) => {
    if (candidate?.type !== "application/pdf") {
      setError(t("Please upload a PDF file"));
      return;
    }
    if (candidate.size > MAX_UPLOAD_BYTES) {
      setError(t("That file is over 5 MB — export a smaller PDF and try again."));
      return;
    }
    setFile(candidate);
    setError("");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    acceptFile(e.dataTransfer.files[0]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    acceptFile(e.target.files?.[0]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAnalyze = async () => {
    if (!file) {
      setError(t("Please upload your resume"));
      return;
    }
    if (!targetRole || !isValidJobTitle(targetRole)) {
      setError(t("Please select a target role from the list"));
      return;
    }

    setError("");
    setIsAnalyzing(true);
    setStep("processing");

    try {
      // Send file directly to API for proper PDF parsing
      const formData = new FormData();
      formData.append("cvFile", file);
      formData.append("targetRole", targetRole);

      // Abortable fetch with a timeout — never leave the user hanging.
      const controller = new AbortController();
      abortRef.current = controller;
      timedOutRef.current = false;
      cancelledRef.current = false;
      const timeoutId = setTimeout(() => {
        timedOutRef.current = true;
        controller.abort();
      }, SCORE_TIMEOUT_MS);

      let response: Response;
      try {
        response = await fetch("/api/score-teaser", {
          method: "POST",
          body: formData,
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      // Gateway timeouts (504) return HTML, not JSON — never parse blindly, or
      // the user sees a raw SyntaxError instead of a retryable message.
      const contentType = response.headers.get("content-type") ?? "";
      const data = contentType.includes("application/json")
        ? await response.json().catch(() => null)
        : null;

      if (!response.ok || !data) {
        throw new Error(
          data?.error || t("Our scoring service hit a snag. Your resume is still here — please try again.")
        );
      }

      setResult({
        score: data.score,
        summary: data.summary,
        analyzedAt: data.analyzedAt,
      });
      setStep("result");
      trackConversion("score_generated");
      const scoreBand = data.score < 65 ? "low" : data.score < 80 ? "mid" : "high";
      posthog.capture?.("score_generated", { score: data.score, band: scoreBand, target_role: targetRole });

    } catch (err) {
      // User pressed Cancel — back to the form silently, inputs intact.
      if (cancelledRef.current) {
        setStep("input");
        return;
      }
      if (timedOutRef.current) {
        setError(t("This is taking longer than usual — please try again."));
      } else {
        setError(err instanceof Error ? err.message : t("Something went wrong"));
      }
      setStep("input");
    } finally {
      abortRef.current = null;
      setIsAnalyzing(false);
    }
  };

  // Visible escape hatch on the analyzing overlay: abort the request and
  // return to the form with the file + target role intact.
  const handleCancelAnalyze = () => {
    cancelledRef.current = true;
    abortRef.current?.abort();
    setIsAnalyzing(false);
    setStep("input");
  };

  const handleStartOver = () => {
    clearAll();
    setFile(null);
    setStep("input");
    setDisplayScore(0);
  };

  const getScoreColor = (score: number) => {
    if (score <= 50) return { text: "text-red-600", bg: "bg-red-500", ring: "ring-red-500" };
    if (score <= 75) return { text: "text-brand-gold", bg: "bg-brand-gold", ring: "ring-brand-gold" };
    return { text: "text-brand-navy", bg: "bg-brand-navy", ring: "ring-brand-navy" };
  };

  const scoreColor = result ? getScoreColor(result.score) : getScoreColor(0);

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-brand-ink">
      {/* Header - Premium Full Width Navbar */}
      <header className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-md border-b border-stone-200/60">
        <div className="w-full px-4 sm:px-8 md:px-16 h-16 sm:h-20 flex items-center justify-between">
          {/* Logo - Far Left */}
          <Logo variant="dark" size="md" />

          {/* Back Button - Far Right */}
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-stone-600 hover:text-stone-900 transition-colors tracking-wide focus-visible:outline-none"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
            <span className="hidden sm:inline">{t("Back to Home")}</span>
            <span className="sm:hidden">{t("Home")}</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full px-4 sm:px-8 lg:px-16 pt-8 sm:pt-12 pb-16">
        <div className="max-w-3xl mx-auto">
          {/* Title */}
          <div className="text-center mb-10 sm:mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-navy/5 text-brand-navy rounded-sm text-sm font-medium mb-6 sm:mb-8 tracking-wide">
              <Sparkles className="w-4 h-4" strokeWidth={1.5} />
              {t("Free Resume Analysis")}
            </div>
            <h1 className="font-serif text-4xl sm:text-5xl font-light text-brand-ink mb-5">
              {t("Get Your Resume Score")}
            </h1>
            <div className="w-16 h-px bg-brand-navy mx-auto mb-6" />
            <p className="text-base sm:text-lg text-stone-500 max-w-xl mx-auto font-light">
              {t("See how your resume stacks up for your target role. No sign-up required.")}
            </p>

            {/* Sample-report preview — answers "what will I actually get?" before I upload */}
            <details className="mt-8 max-w-md mx-auto text-left group">
              <summary className="cursor-pointer text-sm font-medium text-brand-navy hover:text-brand-navy-hover tracking-wide flex items-center gap-2 justify-center">
                <span className="group-open:hidden">{t("Preview a sample report")}</span>
                <span className="hidden group-open:inline">{t("Hide sample report")}</span>
                <ArrowRight className="w-3 h-3 transition-transform group-open:rotate-90" strokeWidth={2} />
              </summary>
              <div className="mt-4 p-5 bg-white rounded-sm border border-stone-200 shadow-sm">
                <div className="flex items-baseline justify-between mb-3">
                  <span className="text-xs text-stone-500 uppercase tracking-wider font-medium">{t("Match Score")}</span>
                  <span className="font-serif text-3xl text-brand-navy">72<span className="text-base text-stone-500">/100</span></span>
                </div>
                <div className="space-y-2 text-xs text-stone-600 font-light">
                  <div className="flex items-center justify-between"><span>{t("Keyword coverage")}</span><span className="font-medium text-brand-ink">68%</span></div>
                  <div className="flex items-center justify-between"><span>{t("ATS readability")}</span><span className="font-medium text-brand-ink">85%</span></div>
                  <div className="flex items-center justify-between"><span>{t("Impact phrasing")}</span><span className="font-medium text-brand-ink">63%</span></div>
                </div>
                <div className="mt-4 pt-3 border-t border-stone-100">
                  <p className="text-xs text-stone-500 font-light leading-relaxed">
                    {t("+ a free list of the top missing keywords for your target role.")}
                  </p>
                </div>
              </div>
            </details>
          </div>

          {/* Enter-only step transitions. NEVER reintroduce
              `AnimatePresence mode="wait"` here — exit-blocking transitions
              froze this funnel before (exit-complete never fires in dev). */}
            {/* Step 1: Input */}
            {step === "input" && (
              <motion.div
                key="input"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* File Upload */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  className={`relative border-2 border-dashed rounded-sm p-10 text-center transition-all bg-white shadow-[0_2px_20px_-6px_rgba(0,0,0,0.06)] ${
                    isDragging
                      ? "border-brand-navy bg-brand-navy/5"
                      : file
                        ? "border-brand-navy bg-brand-navy/5"
                        : "border-stone-200 hover:border-stone-300"
                  }`}
                >
                  {file ? (
                    <div className="flex items-center justify-center gap-4">
                      <div className="w-14 h-14 rounded-full bg-brand-navy/5 flex items-center justify-center">
                        <FileCheck className="w-7 h-7 text-brand-navy" strokeWidth={1.5} />
                      </div>
                      <div className="text-left">
                        <p className="font-serif text-base text-brand-ink">{file.name}</p>
                        <p className="text-sm text-stone-500 font-light">
                          {(file.size / 1024).toFixed(1)} {t("KB • Ready to analyze")}
                        </p>
                      </div>
                      <button
                        onClick={() => setFile(null)}
                        className="p-2 hover:bg-stone-100 rounded-sm transition-colors ml-4"
                      >
                        <X className="w-5 h-5 text-stone-500" strokeWidth={1.5} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-12 h-12 text-stone-500 mx-auto mb-4" strokeWidth={1.5} />
                      <p className="font-serif text-lg text-brand-ink mb-2">
                        {t("Drop your resume here")}
                      </p>
                      <p className="text-stone-500 mb-4 font-light">{t("PDF format only (max 5MB)")}</p>
                      {/* Programmatic file picker — `<label>` + `display:none`
                          file inputs are dead on iOS Safari / in-app browsers. */}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        aria-label={t("Browse for resume PDF")}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-brand-navy hover:bg-brand-navy-hover text-white font-medium rounded-sm transition-colors tracking-wide focus-visible:outline-none"
                      >
                        <span>{t("Browse Files")}</span>
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf"
                        onChange={handleFileSelect}
                        tabIndex={-1}
                        aria-hidden="true"
                        className="absolute -left-[9999px] w-px h-px opacity-0"
                      />
                    </>
                  )}
                </div>

                {/* Goal Selector */}
                <div className="bg-white rounded-sm p-6 border border-stone-200 shadow-[0_2px_20px_-6px_rgba(0,0,0,0.06)]">
                  <label className="flex items-center gap-2 text-sm font-medium text-brand-ink mb-3 tracking-wide">
                    <Target className="w-4 h-4 text-brand-navy" strokeWidth={1.5} />
                    {t("Target Role")}
                  </label>
                  <GoalSelector
                    value={targetRole}
                    onChange={setTargetRole}
                  />
                </div>

                {/* Error */}
                {error && (
                  <div className="p-4 bg-red-50/80 border border-red-200/60 rounded-sm flex items-center gap-3 text-red-700">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" strokeWidth={1.5} />
                    <span className="font-light">{error}</span>
                  </div>
                )}

                {/* Analyze Button */}
                <button
                  onClick={handleAnalyze}
                  disabled={!file || !targetRole || isAnalyzing}
                  className="w-full py-4 bg-brand-navy hover:bg-brand-navy-hover disabled:bg-stone-200 disabled:text-stone-500 disabled:cursor-not-allowed text-white font-medium rounded-sm transition-all flex items-center justify-center gap-3 text-base sm:text-lg shadow-sm hover:shadow-md disabled:shadow-none tracking-wide focus-visible:outline-none"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" strokeWidth={1.5} />
                      {t("Calculating...")}
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" strokeWidth={1.5} />
                      {t("Calculate My Score")}
                    </>
                  )}
                </button>
              </motion.div>
            )}

            {/* Step 2: Processing — full-screen analyzing overlay */}
            {step === "processing" && (
              <AnalyzingScreen
                open
                mode={targetRole ? "targeted" : "quick"}
                jobTitle={targetRole}
                onCancel={handleCancelAnalyze}
              />
            )}

            {/* Step 3: Result */}
            {step === "result" && result && (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Score Card */}
                <div className="bg-white rounded-sm border border-stone-200 shadow-[0_4px_40px_-12px_rgba(0,0,0,0.08)] overflow-hidden">
                  <div className="bg-gradient-to-r from-brand-navy to-brand-navy-hover p-8">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                      {/* Left: Summary */}
                      <div className="flex-1 text-center md:text-left">
                        <div className="flex items-center justify-center md:justify-start gap-2 mb-3">
                          <Target className="w-5 h-5 text-white/80" strokeWidth={1.5} />
                          <span className="text-white/80 text-sm font-medium uppercase tracking-wider">
                            {t("Analysis Complete")}
                          </span>
                        </div>
                        <h2 className="font-serif text-2xl md:text-3xl font-light text-white mb-3">
                          {result.score <= 50 ? t("Room for Improvement") :
                           result.score <= 75 ? t("Good Foundation!") :
                           t("Excellent Resume!")}
                        </h2>
                        <p className="text-white/90 text-lg leading-relaxed font-light">
                          {result.summary}
                        </p>
                      </div>
                      
                      {/* Right: Score Gauge */}
                      <div className="flex-shrink-0">
                        <div className="relative">
                          <svg width="140" height="140" className="transform -rotate-90">
                            <circle
                              cx="70"
                              cy="70"
                              r="60"
                              fill="none"
                              stroke="rgba(255,255,255,0.2)"
                              strokeWidth="10"
                            />
                            <motion.circle
                              cx="70"
                              cy="70"
                              r="60"
                              fill="none"
                              stroke="white"
                              strokeWidth="10"
                              strokeLinecap="round"
                              initial={{ strokeDasharray: "0 377" }}
                              animate={{ 
                                strokeDasharray: `${(result.score / 100) * 377} 377` 
                              }}
                              transition={{ duration: 1.5, delay: 0.3, ease: "easeOut" }}
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center">
                              <span className="font-serif text-4xl font-light text-white">
                                {displayScore}
                              </span>
                              <p className="text-white/70 text-sm font-light">
                                / 100
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Run Again Button */}
                  <div className="p-4 bg-stone-50 border-t border-stone-100">
                    <button
                      onClick={handleStartOver}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 font-medium rounded-sm transition-colors tracking-wide"
                    >
                      <RotateCcw className="w-4 h-4" strokeWidth={1.5} />
                      {t("Analyze Another Resume")}
                    </button>
                  </div>
                </div>

                {/* Next Step: Optimize */}
                <div className="bg-white rounded-sm border border-stone-200 shadow-[0_2px_20px_-6px_rgba(0,0,0,0.06)] p-8 md:p-10">
                  <div className="text-center max-w-2xl mx-auto">
                    <h3 className="font-serif text-2xl md:text-3xl font-light text-brand-ink mb-3">
                      {t("Now let's actually fix it.")}
                    </h3>
                    <p className="text-stone-600 font-light mb-8">
                      {t("Hired-CV rewrites your resume with AI — tailored to the job you want, ATS-optimized, and ready to download in minutes.")}
                    </p>

                    <ul className="text-left grid sm:grid-cols-2 gap-x-8 gap-y-3 mb-8 max-w-lg mx-auto">
                      <li className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-brand-navy flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                        <span className="text-stone-700 text-sm font-light">{t("AI rewrite, tailored per job")}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-brand-navy flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                        <span className="text-stone-700 text-sm font-light">{t("ATS keyword optimization")}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-brand-navy flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                        <span className="text-stone-700 text-sm font-light">{t("Modern templates, PDF & DOCX")}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-brand-navy flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                        <span className="text-stone-700 text-sm font-light">{t("1 free credit to start")}</span>
                      </li>
                    </ul>

                    {result.score < 65 ? (
                      <>
                        {/* Low score = high paid intent. Lead with pricing. */}
                        <Link
                          href="/pricing?utm_source=score&utm_medium=cta&utm_score=low"
                          onClick={() => track("score_upsell_clicked", { cta: "pricing", score_band: "low", target_role: targetRole || null, match_score: result.score })}
                          className="inline-flex items-center gap-2 px-8 py-4 bg-brand-gold hover:bg-brand-gold-deep text-white font-medium rounded-sm transition-all shadow-sm hover:shadow-md tracking-wide"
                        >
                          <Sparkles className="w-5 h-5" strokeWidth={1.5} />
                          {t("Fix My Resume — Plans from $3")}
                          <ArrowRight className="w-5 h-5" strokeWidth={1.5} />
                        </Link>
                        <div className="mt-3">
                          <SignUpButton mode="modal" forceRedirectUrl="/builder">
                            <button
                              onClick={() => track("score_upsell_clicked", { cta: "signup_free", score_band: "low", target_role: targetRole || null, match_score: result.score })}
                              className="text-sm text-brand-navy hover:text-brand-navy-hover underline underline-offset-4 font-light"
                            >
                              {t("Or try 1 credit free →")}
                            </button>
                          </SignUpButton>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* High score = lower intent. Lead with free signup. */}
                        <SignUpButton mode="modal" forceRedirectUrl="/builder">
                          <button
                            onClick={() => track("score_upsell_clicked", { cta: "signup_free", score_band: "high", target_role: targetRole || null, match_score: result.score })}
                            className="inline-flex items-center gap-2 px-8 py-4 bg-brand-navy hover:bg-brand-navy-hover text-white font-medium rounded-sm transition-all shadow-sm hover:shadow-md tracking-wide"
                          >
                            <Sparkles className="w-5 h-5" strokeWidth={1.5} />
                            {t("Optimize My Resume — Free")}
                            <ArrowRight className="w-5 h-5" strokeWidth={1.5} />
                          </button>
                        </SignUpButton>
                        <div className="mt-3">
                          <Link
                            href="/pricing"
                            onClick={() => track("score_upsell_clicked", { cta: "pricing", score_band: "high", target_role: targetRole || null, match_score: result.score })}
                            className="text-sm text-brand-navy hover:text-brand-navy-hover underline underline-offset-4 font-light"
                          >
                            {t("Or see all plans →")}
                          </Link>
                        </div>
                      </>
                    )}

                    <p className="text-sm text-stone-500 mt-4 flex items-center justify-center gap-4 font-light flex-wrap">
                      <span className="flex items-center gap-1">
                        <Check className="w-4 h-4 text-brand-navy" strokeWidth={1.5} />
                        {t("No credit card")}
                      </span>
                      <Link
                        href="/refund-policy"
                        className="flex items-center gap-1 hover:text-stone-700 transition-colors"
                      >
                        <Check className="w-4 h-4 text-brand-navy" strokeWidth={1.5} />
                        {t("14-day money-back")}
                      </Link>
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
