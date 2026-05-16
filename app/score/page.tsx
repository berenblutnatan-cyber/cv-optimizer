"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
import { useTeaserStore } from "@/stores/teaserStore";
import { isValidJobTitle } from "@/constants/jobTitles";
import { trackConversion } from "@/lib/gtag";

type Step = "input" | "processing" | "result";

/**
 * Score Teaser Page - Lead Magnet
 * Light theme matching the main site design
 */
export default function ScoreTeaserPage() {
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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile?.type === "application/pdf") {
      setFile(droppedFile);
      setError("");
    } else {
      setError("Please upload a PDF file");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile?.type === "application/pdf") {
      setFile(selectedFile);
      setError("");
    } else {
      setError("Please upload a PDF file");
    }
  };

  const handleAnalyze = async () => {
    if (!file) {
      setError("Please upload your resume");
      return;
    }
    if (!targetRole || !isValidJobTitle(targetRole)) {
      setError("Please select a target role from the list");
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

      const response = await fetch("/api/score-teaser", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Analysis failed");
      }

      const data = await response.json();
      setResult({
        score: data.score,
        summary: data.summary,
        analyzedAt: data.analyzedAt,
      });
      setStep("result");
      trackConversion("score_generated");

    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStep("input");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleStartOver = () => {
    clearAll();
    setFile(null);
    setStep("input");
    setDisplayScore(0);
  };

  const getScoreColor = (score: number) => {
    if (score <= 50) return { text: "text-red-600", bg: "bg-red-500", ring: "ring-red-500" };
    if (score <= 75) return { text: "text-[#B8860B]", bg: "bg-[#B8860B]", ring: "ring-[#B8860B]" };
    return { text: "text-[#0A2647]", bg: "bg-[#0A2647]", ring: "ring-[#0A2647]" };
  };

  const scoreColor = result ? getScoreColor(result.score) : getScoreColor(0);

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#1a1a1a]">
      {/* Header - Premium Full Width Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 w-full bg-white/90 backdrop-blur-md border-b border-stone-200/60">
        <div className="w-full px-8 md:px-16 h-20 flex items-center justify-between">
          {/* Logo - Far Left */}
          <Logo variant="dark" size="md" />
          
          {/* Back Button - Far Right */}
          <Link 
            href="/"
            className="flex items-center gap-2 text-sm text-stone-600 hover:text-stone-900 transition-colors tracking-wide"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
            Back to Home
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full px-8 lg:px-16 pt-28 pb-16">
        <div className="max-w-3xl mx-auto">
          {/* Title */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#0A2647]/5 text-[#0A2647] rounded-sm text-sm font-medium mb-8 tracking-wide">
              <Sparkles className="w-4 h-4" strokeWidth={1.5} />
              Free Resume Analysis
            </div>
            <h1 className="font-serif text-4xl sm:text-5xl font-light text-[#1a1a1a] mb-5">
              Get Your Resume Score
            </h1>
            <div className="w-16 h-px bg-[#0A2647] mx-auto mb-6" />
            <p className="text-lg text-stone-500 max-w-xl mx-auto font-light">
              See how your resume stacks up for your target role. No sign-up required.
            </p>

            {/* Sample-report preview — answers "what will I actually get?" before I upload */}
            <details className="mt-8 max-w-md mx-auto text-left group">
              <summary className="cursor-pointer text-sm font-medium text-[#0A2647] hover:text-[#0d3259] tracking-wide flex items-center gap-2 justify-center">
                <span className="group-open:hidden">Preview a sample report</span>
                <span className="hidden group-open:inline">Hide sample report</span>
                <ArrowRight className="w-3 h-3 transition-transform group-open:rotate-90" strokeWidth={2} />
              </summary>
              <div className="mt-4 p-5 bg-white rounded-sm border border-stone-200 shadow-sm">
                <div className="flex items-baseline justify-between mb-3">
                  <span className="text-xs text-stone-500 uppercase tracking-wider font-medium">Match Score</span>
                  <span className="font-serif text-3xl text-[#0A2647]">72<span className="text-base text-stone-500">/100</span></span>
                </div>
                <div className="space-y-2 text-xs text-stone-600 font-light">
                  <div className="flex items-center justify-between"><span>Keyword coverage</span><span className="font-medium text-[#1a1a1a]">68%</span></div>
                  <div className="flex items-center justify-between"><span>ATS readability</span><span className="font-medium text-[#1a1a1a]">85%</span></div>
                  <div className="flex items-center justify-between"><span>Impact phrasing</span><span className="font-medium text-[#1a1a1a]">63%</span></div>
                </div>
                <div className="mt-4 pt-3 border-t border-stone-100">
                  <p className="text-xs text-stone-500 font-light leading-relaxed">
                    + a free list of the top missing keywords for your target role.
                  </p>
                </div>
              </div>
            </details>
          </div>

          <AnimatePresence mode="wait" initial={false}>
            {/* Step 1: Input */}
            {step === "input" && (
              <motion.div
                key="input"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* File Upload */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  className={`relative border-2 border-dashed rounded-sm p-10 text-center transition-all bg-white shadow-[0_2px_20px_-6px_rgba(0,0,0,0.06)] ${
                    isDragging
                      ? "border-[#0A2647] bg-[#0A2647]/5"
                      : file
                        ? "border-[#0A2647] bg-[#0A2647]/5"
                        : "border-stone-200 hover:border-stone-300"
                  }`}
                >
                  {file ? (
                    <div className="flex items-center justify-center gap-4">
                      <div className="w-14 h-14 rounded-full bg-[#0A2647]/5 flex items-center justify-center">
                        <FileCheck className="w-7 h-7 text-[#0A2647]" strokeWidth={1.5} />
                      </div>
                      <div className="text-left">
                        <p className="font-serif text-base text-[#1a1a1a]">{file.name}</p>
                        <p className="text-sm text-stone-500 font-light">
                          {(file.size / 1024).toFixed(1)} KB • Ready to analyze
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
                      <p className="font-serif text-lg text-[#1a1a1a] mb-2">
                        Drop your resume here
                      </p>
                      <p className="text-stone-500 mb-4 font-light">PDF format only (max 5MB)</p>
                      <label className="inline-flex items-center gap-2 px-6 py-3 bg-[#0A2647] hover:bg-[#0d3259] text-white font-medium rounded-sm cursor-pointer transition-colors tracking-wide">
                        <span>Browse Files</span>
                        <input
                          type="file"
                          accept=".pdf"
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                      </label>
                    </>
                  )}
                </div>

                {/* Goal Selector */}
                <div className="bg-white rounded-sm p-6 border border-stone-200 shadow-[0_2px_20px_-6px_rgba(0,0,0,0.06)]">
                  <label className="flex items-center gap-2 text-sm font-medium text-[#1a1a1a] mb-3 tracking-wide">
                    <Target className="w-4 h-4 text-[#0A2647]" strokeWidth={1.5} />
                    Target Role
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
                  className="w-full py-4 bg-[#0A2647] hover:bg-[#0d3259] disabled:bg-stone-200 disabled:text-stone-500 text-white font-medium rounded-sm transition-all flex items-center justify-center gap-3 text-lg shadow-sm hover:shadow-md disabled:shadow-none tracking-wide"
                >
                  <Sparkles className="w-5 h-5" strokeWidth={1.5} />
                  Calculate My Score
                </button>
              </motion.div>
            )}

            {/* Step 2: Processing */}
            {step === "processing" && (
              <motion.div
                key="processing"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="text-center py-20 bg-white rounded-sm border border-stone-200 shadow-[0_2px_20px_-6px_rgba(0,0,0,0.06)]"
              >
                <div className="relative inline-block mb-8">
                  <div className="w-24 h-24 rounded-full border-4 border-stone-100 flex items-center justify-center">
                    <Loader2 className="w-10 h-10 text-[#0A2647] animate-spin" strokeWidth={1.5} />
                  </div>
                </div>
                <h2 className="font-serif text-2xl font-light text-[#1a1a1a] mb-3">Analyzing Your Resume...</h2>
                <p className="text-stone-500 font-light">
                  Checking structure, keywords, and role alignment
                </p>
              </motion.div>
            )}

            {/* Step 3: Result */}
            {step === "result" && result && (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* Score Card */}
                <div className="bg-white rounded-sm border border-stone-200 shadow-[0_4px_40px_-12px_rgba(0,0,0,0.08)] overflow-hidden">
                  <div className="bg-gradient-to-r from-[#0A2647] to-[#0d3259] p-8">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                      {/* Left: Summary */}
                      <div className="flex-1 text-center md:text-left">
                        <div className="flex items-center justify-center md:justify-start gap-2 mb-3">
                          <Target className="w-5 h-5 text-white/80" strokeWidth={1.5} />
                          <span className="text-white/80 text-sm font-medium uppercase tracking-wider">
                            Analysis Complete
                          </span>
                        </div>
                        <h2 className="font-serif text-2xl md:text-3xl font-light text-white mb-3">
                          {result.score <= 50 ? "Room for Improvement" : 
                           result.score <= 75 ? "Good Foundation!" : 
                           "Excellent Resume!"}
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
                      Analyze Another Resume
                    </button>
                  </div>
                </div>

                {/* Next Step: Optimize */}
                <div className="bg-white rounded-sm border border-stone-200 shadow-[0_2px_20px_-6px_rgba(0,0,0,0.06)] p-8 md:p-10">
                  <div className="text-center max-w-2xl mx-auto">
                    <h3 className="font-serif text-2xl md:text-3xl font-light text-[#1a1a1a] mb-3">
                      Now let's actually fix it.
                    </h3>
                    <p className="text-stone-600 font-light mb-8">
                      Hired-CV rewrites your resume with AI — tailored to the job you want, ATS-optimized, and ready to download in minutes.
                    </p>

                    <ul className="text-left grid sm:grid-cols-2 gap-x-8 gap-y-3 mb-8 max-w-lg mx-auto">
                      <li className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-[#0A2647] flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                        <span className="text-stone-700 text-sm font-light">AI rewrite, tailored per job</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-[#0A2647] flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                        <span className="text-stone-700 text-sm font-light">ATS keyword optimization</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-[#0A2647] flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                        <span className="text-stone-700 text-sm font-light">Modern templates, PDF & DOCX</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-[#0A2647] flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                        <span className="text-stone-700 text-sm font-light">3 free credits to start</span>
                      </li>
                    </ul>

                    <SignUpButton mode="modal" forceRedirectUrl="/builder">
                      <button className="inline-flex items-center gap-2 px-8 py-4 bg-[#0A2647] hover:bg-[#0d3259] text-white font-medium rounded-sm transition-all shadow-sm hover:shadow-md tracking-wide">
                        <Sparkles className="w-5 h-5" strokeWidth={1.5} />
                        Optimize My Resume — Free
                        <ArrowRight className="w-5 h-5" strokeWidth={1.5} />
                      </button>
                    </SignUpButton>

                    <p className="text-sm text-stone-500 mt-4 flex items-center justify-center gap-4 font-light flex-wrap">
                      <span className="flex items-center gap-1">
                        <Check className="w-4 h-4 text-[#0A2647]" strokeWidth={1.5} />
                        No credit card
                      </span>
                      <span className="flex items-center gap-1">
                        <Check className="w-4 h-4 text-[#0A2647]" strokeWidth={1.5} />
                        14-day money-back
                      </span>
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
