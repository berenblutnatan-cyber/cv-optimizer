"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Upload, 
  FileText, 
  Sparkles, 
  X, 
  Check, 
  AlertCircle, 
  Lock,
  ArrowRight,
  Loader2,
  Target,
  FileCheck,
  TrendingUp,
  Zap,
  RotateCcw,
  ArrowLeft
} from "lucide-react";
import { SignUpButton } from "@clerk/nextjs";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { GoalSelector } from "@/components/teaser/GoalSelector";
import { useTeaserStore } from "@/stores/teaserStore";
import { isValidJobTitle } from "@/constants/jobTitles";

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
    if (score <= 75) return { text: "text-amber-600", bg: "bg-amber-500", ring: "ring-amber-500" };
    return { text: "text-indigo-600", bg: "bg-indigo-500", ring: "ring-indigo-500" };
  };

  const scoreColor = result ? getScoreColor(result.score) : getScoreColor(0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      {/* Header */}
      <header className="w-full px-6 lg:px-12 py-6 border-b border-slate-100 bg-white/80 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Logo variant="dark" size="md" linkTo="/" />
          <Link 
            href="/"
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full px-6 lg:px-12 py-12">
        <div className="max-w-3xl mx-auto">
          {/* Title */}
          <div className="text-center mb-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium mb-4"
            >
              <Sparkles className="w-4 h-4" />
              Free Resume Analysis
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-4"
            >
              Get Your Resume Score
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg text-slate-600 max-w-xl mx-auto"
            >
              See how your resume stacks up for your target role. No sign-up required.
            </motion.p>
          </div>

          <AnimatePresence mode="wait">
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
                  className={`relative border-2 border-dashed rounded-2xl p-10 text-center transition-all bg-white shadow-sm ${
                    isDragging
                      ? "border-indigo-500 bg-indigo-50"
                      : file
                        ? "border-indigo-500 bg-indigo-50/50"
                        : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {file ? (
                    <div className="flex items-center justify-center gap-4">
                      <div className="w-14 h-14 rounded-xl bg-indigo-100 flex items-center justify-center">
                        <FileCheck className="w-7 h-7 text-indigo-600" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-slate-900">{file.name}</p>
                        <p className="text-sm text-slate-500">
                          {(file.size / 1024).toFixed(1)} KB • Ready to analyze
                        </p>
                      </div>
                      <button
                        onClick={() => setFile(null)}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors ml-4"
                      >
                        <X className="w-5 h-5 text-slate-400" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                      <p className="text-lg font-medium text-slate-900 mb-2">
                        Drop your resume here
                      </p>
                      <p className="text-slate-500 mb-4">PDF format only (max 5MB)</p>
                      <label className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl cursor-pointer transition-colors">
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
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-3">
                    <Target className="w-4 h-4 text-indigo-600" />
                    Target Role
                  </label>
                  <GoalSelector
                    value={targetRole}
                    onChange={setTargetRole}
                  />
                </div>

                {/* Error */}
                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Analyze Button */}
                <button
                  onClick={handleAnalyze}
                  disabled={!file || !targetRole || isAnalyzing}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-3 text-lg shadow-lg shadow-indigo-600/20 disabled:shadow-none"
                >
                  <Sparkles className="w-5 h-5" />
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
                className="text-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm"
              >
                <div className="relative inline-block mb-8">
                  <div className="w-24 h-24 rounded-full border-4 border-slate-100 flex items-center justify-center">
                    <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-3">Analyzing Your Resume...</h2>
                <p className="text-slate-500">
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
                <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
                  <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 p-8">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                      {/* Left: Summary */}
                      <div className="flex-1 text-center md:text-left">
                        <div className="flex items-center justify-center md:justify-start gap-2 mb-3">
                          <Target className="w-5 h-5 text-white/80" />
                          <span className="text-white/80 text-sm font-medium uppercase tracking-wider">
                            Analysis Complete
                          </span>
                        </div>
                        <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
                          {result.score <= 50 ? "Room for Improvement" : 
                           result.score <= 75 ? "Good Foundation!" : 
                           "Excellent Resume!"}
                        </h2>
                        <p className="text-white/90 text-lg leading-relaxed">
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
                              <span className="text-4xl font-bold text-white">
                                {displayScore}
                              </span>
                              <p className="text-white/70 text-sm font-medium">
                                / 100
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Run Again Button */}
                  <div className="p-4 bg-slate-50 border-t border-slate-100">
                    <button
                      onClick={handleStartOver}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-medium rounded-xl transition-colors"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Analyze Another Resume
                    </button>
                  </div>
                </div>

                {/* Blurred Analysis Preview */}
                <div className="relative bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  {/* Blurred content */}
                  <div className="p-6 filter blur-md select-none pointer-events-none opacity-60">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">Detailed Analysis</h3>
                        <p className="text-slate-500 text-sm">Strengths, weaknesses, and recommendations</p>
                      </div>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-4 mb-6">
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                        <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                          <Check className="w-5 h-5 text-indigo-600" />
                          Strengths
                        </h4>
                        <ul className="space-y-2 text-slate-600 text-sm">
                          <li>• Strong technical skills alignment</li>
                          <li>• Clear work history progression</li>
                          <li>• Good use of action verbs</li>
                        </ul>
                      </div>
                      
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                        <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                          <TrendingUp className="w-5 h-5 text-amber-600" />
                          Areas to Improve
                        </h4>
                        <ul className="space-y-2 text-slate-600 text-sm">
                          <li>• Add quantified achievements</li>
                          <li>• Include more keywords</li>
                          <li>• Strengthen summary section</li>
                        </ul>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                        <h4 className="font-medium text-slate-900 mb-2">Keywords Found</h4>
                        <div className="flex flex-wrap gap-2">
                          <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs">Leadership</span>
                          <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs">Strategy</span>
                          <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs">Management</span>
                        </div>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                        <h4 className="font-medium text-slate-900 mb-2">Missing Keywords</h4>
                        <div className="flex flex-wrap gap-2">
                          <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">Agile</span>
                          <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">ROI</span>
                          <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">KPIs</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Lock Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-white via-white/95 to-white/80">
                    <div className="text-center px-6 max-w-md">
                      <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto mb-5">
                        <Lock className="w-8 h-8 text-slate-400" />
                      </div>
                      
                      <h3 className="text-xl font-bold text-slate-900 mb-2">
                        Unlock Full Analysis
                      </h3>
                      <p className="text-slate-600 mb-6">
                        See exactly what's holding your resume back and get AI-powered suggestions to fix it.
                      </p>
                      
                      <SignUpButton mode="modal">
                        <button className="inline-flex items-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/20">
                          <Sparkles className="w-5 h-5" />
                          Create Free Account
                          <ArrowRight className="w-5 h-5" />
                        </button>
                      </SignUpButton>
                      
                      <p className="text-sm text-slate-500 mt-4 flex items-center justify-center gap-4">
                        <span className="flex items-center gap-1">
                          <Check className="w-4 h-4 text-indigo-600" />
                          Free forever
                        </span>
                        <span className="flex items-center gap-1">
                          <Check className="w-4 h-4 text-indigo-600" />
                          No credit card
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full px-6 lg:px-12 py-8 border-t border-slate-100 bg-white/50">
        <div className="max-w-3xl mx-auto text-center text-slate-500 text-sm">
          <p>Your resume is analyzed securely and never stored without your permission.</p>
        </div>
      </footer>
    </div>
  );
}
