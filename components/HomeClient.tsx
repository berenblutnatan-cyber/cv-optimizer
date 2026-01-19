"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CVUpload } from "@/components/CVUpload";
import { JobInput } from "@/components/JobInput";
import { AnalysisMode, saveAnalysisToSession } from "@/lib/analysisSession";
import { FileText, Sparkles, Link2, Target, Check, ArrowDown, Upload, Download, Briefcase } from "lucide-react";
import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";

export function HomeClient({ initialCount }: { initialCount: number }) {
  const router = useRouter();
  const [cvOptimizedCount, setCvOptimizedCount] = useState<number>(initialCount);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvText, setCvText] = useState<string>("");
  const [mode, setMode] = useState<AnalysisMode | null>(null);
  const [stepTab, setStepTab] = useState<"choose" | "upload">("choose");
  const [jobDescription, setJobDescription] = useState<string>("");
  const [jobUrl, setJobUrl] = useState<string>("");
  const [jobTitle, setJobTitle] = useState<string>("");
  const [companyName, setCompanyName] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string>("");

  const handleAnalyze = async () => {
    if (!mode) {
      setError("Please choose an option first");
      return;
    }
    if (!cvText && !cvFile) {
      setError("Please upload your CV first");
      return;
    }
    if (mode === "specific_role" && !jobDescription && !jobUrl) {
      setError("Please provide a job description or LinkedIn URL");
      return;
    }
    if (mode === "specific_role" && !companyName.trim()) {
      setError("Please provide a company name");
      return;
    }
    if (mode === "title_only" && !jobTitle.trim()) {
      setError("Please provide a job title");
      return;
    }

    setError("");
    setIsAnalyzing(true);

    try {
      const formData = new FormData();
      if (cvFile) formData.append("cv", cvFile);
      if (cvText) formData.append("cvText", cvText);
      formData.append("mode", mode);
      if (jobDescription && mode === "specific_role") formData.append("jobDescription", jobDescription);
      if (jobUrl && mode === "specific_role") formData.append("jobUrl", jobUrl);
      if (jobTitle) formData.append("jobTitle", jobTitle);
      if (mode === "specific_role") formData.append("companyName", companyName);

      const response = await fetch("/api/analyze", { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Analysis failed");

      // Increment global counter ONLY after a successful optimization run.
      try {
        const trackRes = await fetch("/api/track", { method: "POST" });
        const trackData = await trackRes.json().catch(() => ({}));
        if (trackRes.ok && typeof trackData?.count === "number") {
          setCvOptimizedCount(trackData.count);
        }
      } catch {
        // ignore
      }

      saveAnalysisToSession({ analysis: data.analysis, meta: data.meta });
      router.push("/results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen text-white bg-black flex flex-col overflow-x-hidden overflow-y-auto">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[540px] w-[920px] -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-600/22 via-sky-500/14 to-fuchsia-500/12 blur-3xl" />
        <div className="absolute -bottom-40 right-[-120px] h-[520px] w-[520px] rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_12%,rgba(255,255,255,0.05),transparent_45%),radial-gradient(circle_at_80%_18%,rgba(99,102,241,0.10),transparent_50%)]" />
      </div>

      {/* Auth Header */}
      <header className="relative z-20 w-full px-4 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="text-xl font-bold text-white">CV Optimizer</div>
          <div className="flex items-center gap-3">
            <SignedOut>
              <SignInButton mode="modal">
                <button className="px-4 py-2 text-sm font-medium text-white/80 hover:text-white transition-colors">
                  Sign In
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="px-4 py-2 text-sm font-medium bg-purple-500 hover:bg-purple-400 text-white rounded-lg transition-colors">
                  Sign Up
                </button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <UserButton 
                appearance={{
                  elements: {
                    avatarBox: "w-9 h-9"
                  }
                }}
              />
            </SignedIn>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 pt-4 pb-5 w-full">
        <div className="flex flex-col">
          {/* Hero Section */}
          <div className="text-center mb-7">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-3">
              Land More Interviews with an{" "}
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
                AI-Optimized CV
              </span>
            </h2>
            <p className="text-white/60 max-w-2xl mx-auto text-lg">
              Upload your CV, get a tailored version that matches the job — plus a cover letter ready to send.
            </p>

            <div className="mt-5 flex items-center justify-center gap-10 text-white/80">
              <div className="flex items-center gap-2">
                <svg className="w-6 h-6 text-indigo-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16V8a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2z" />
                </svg>
                <span className="text-base">Upload</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-6 h-6 text-indigo-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19a8 8 0 100-16 8 8 0 000 16zm10 2l-4.35-4.35" />
                </svg>
                <span className="text-base">Analyze</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-6 h-6 text-indigo-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-base">Optimize</span>
              </div>
            </div>
          </div>

          <div className="bg-white/4 border border-white/10 rounded-2xl p-6 sm:p-7 shadow-[0_28px_80px_rgba(0,0,0,0.50)] backdrop-blur-md flex flex-col overflow-visible">
            {/* Progress Stepper */}
            <div className="mb-6 flex items-center justify-center">
              <div className="flex items-center gap-0">
                {/* Step 1 */}
                <div className="flex items-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all ${
                    stepTab === "choose" 
                      ? "bg-purple-500 border-purple-500 text-white" 
                      : mode 
                        ? "bg-purple-500 border-purple-500 text-white"
                        : "bg-white/10 border-white/30 text-white/50"
                  }`}>
                    {mode ? <Check className="w-4 h-4" /> : <span className="text-sm font-semibold">1</span>}
                  </div>
                  <span className={`ml-3 text-sm font-medium transition-colors ${
                    stepTab === "choose" ? "text-white" : "text-white/50"
                  }`}>
                    Choose Option
                  </span>
                </div>

                {/* Connector Line */}
                <div className={`w-16 sm:w-24 h-0.5 mx-4 transition-colors ${
                  mode ? "bg-purple-500" : "bg-white/20"
                }`} />

                {/* Step 2 */}
                <div className="flex items-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all ${
                    stepTab === "upload" 
                      ? "bg-purple-500 border-purple-500 text-white" 
                      : "bg-white/10 border-white/30 text-white/50"
                  }`}>
                    <span className="text-sm font-semibold">2</span>
                  </div>
                  <span className={`ml-3 text-sm font-medium transition-colors ${
                    stepTab === "upload" ? "text-white" : "text-white/50"
                  }`}>
                    Upload & Analyze
                  </span>
                </div>
              </div>
            </div>

            <div className="overflow-visible">
              {stepTab === "choose" ? (
                <div className="grid md:grid-cols-2 gap-6 pt-4">
                  {/* Left Card - Quick Optimize (Neutral) */}
                  <div
                    className={`rounded-2xl border px-6 py-6 transition-all duration-200 ${
                      mode === "title_only"
                        ? "border-white/30 bg-white/10 shadow-lg"
                        : "border-white/15 bg-white/5 hover:border-white/25 hover:bg-white/[0.07]"
                    }`}
                  >
                    <div className="flex flex-col">
                        <div className="flex items-start gap-4">
                        <div className="mt-0.5 h-14 w-14 rounded-2xl border border-white/15 bg-white/5 flex items-center justify-center flex-shrink-0">
                          <FileText className="h-6 w-6 text-white/70" />
                        </div>
                        <div>
                          <div className="text-xl font-semibold text-white tracking-tight">Quick Optimize</div>
                          <div className="mt-2 text-base text-white/60 leading-relaxed">
                            Polishes your existing CV for general roles.
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 space-y-4">
                        {/* Input Section */}
                        <div className="rounded-xl bg-white/[0.03] border border-white/10 p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Upload className="w-3.5 h-3.5 text-white/40" />
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-white/40">You provide</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                              <FileText className="w-4 h-4 text-white/60" />
                            </div>
                            <div>
                              <span className="text-sm font-medium text-white/90">Your CV</span>
                              <span className="text-xs text-white/40 ml-2">+ Job title</span>
                            </div>
                          </div>
                        </div>

                        {/* Arrow */}
                        <div className="flex justify-center">
                          <ArrowDown className="w-4 h-4 text-white/30" />
                        </div>

                        {/* Output Section */}
                        <div className="rounded-xl bg-indigo-500/5 border border-indigo-500/20 p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Download className="w-3.5 h-3.5 text-indigo-400/60" />
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400/60">You get</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                              <Sparkles className="w-4 h-4 text-indigo-400" />
                            </div>
                            <span className="text-sm font-medium text-white/90">Polished CV</span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setError("");
                          setMode("title_only");
                          setStepTab("upload");
                        }}
                        className="mt-8 w-full px-7 py-4 bg-white/10 hover:bg-white/15 border border-white/15 text-white text-lg font-semibold rounded-2xl transition-all duration-200"
                      >
                        Quick Polish
                      </button>
                    </div>
                  </div>

                  {/* Right Card - Tailor to Job (Recommended) */}
                  <div className="relative">
                    {/* Recommended Badge */}
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                      <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-purple-500 text-white text-xs font-semibold uppercase tracking-wide shadow-lg shadow-purple-500/30">
                        <Sparkles className="w-3.5 h-3.5" />
                        Recommended
                      </span>
                    </div>

                    <div
                      className={`rounded-2xl border-2 px-6 py-6 pt-8 transition-all duration-200 ${
                        mode === "specific_role"
                          ? "border-purple-400 bg-purple-500/15 shadow-[0_0_40px_rgba(168,85,247,0.25)]"
                          : "border-purple-500/50 bg-purple-500/5 shadow-[0_0_30px_rgba(168,85,247,0.15)] hover:border-purple-400/70 hover:bg-purple-500/10"
                      }`}
                    >
                      <div className="flex flex-col">
                        <div className="flex items-start gap-4">
                          <div className="mt-0.5 h-14 w-14 rounded-2xl border border-purple-400/30 bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                            <Target className="h-6 w-6 text-purple-300" />
                          </div>
                          <div>
                            <div className="text-xl font-semibold text-white tracking-tight">Tailor to Job</div>
                            <div className="mt-2 text-base text-white/60 leading-relaxed">
                              Rewrite your CV to match a specific job description perfectly.
                            </div>
                          </div>
                        </div>

                        <div className="mt-6 space-y-4">
                          {/* Input Section */}
                          <div className="rounded-xl bg-purple-500/5 border border-purple-400/15 p-4">
                            <div className="flex items-center gap-2 mb-3">
                              <Upload className="w-3.5 h-3.5 text-purple-300/50" />
                              <span className="text-[11px] font-semibold uppercase tracking-wider text-purple-300/50">You provide</span>
                            </div>
                            <div className="space-y-2.5">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-400/20 flex items-center justify-center">
                                  <FileText className="w-4 h-4 text-purple-300" />
                                </div>
                                <span className="text-sm font-medium text-white/90">Your CV</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-400/20 flex items-center justify-center">
                                  <Link2 className="w-4 h-4 text-purple-300" />
                                </div>
                                <span className="text-sm font-medium text-white/90">Job URL or description</span>
                              </div>
                            </div>
                          </div>

                          {/* Arrow */}
                          <div className="flex justify-center">
                            <ArrowDown className="w-4 h-4 text-purple-400/40" />
                          </div>

                          {/* Output Section */}
                          <div className="rounded-xl bg-indigo-500/5 border border-indigo-500/20 p-4">
                            <div className="flex items-center gap-2 mb-3">
                              <Download className="w-3.5 h-3.5 text-indigo-400/60" />
                              <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400/60">You get</span>
                            </div>
                            <div className="space-y-2.5">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                                  <Target className="w-4 h-4 text-indigo-400" />
                                </div>
                                <span className="text-sm font-medium text-white/90">Tailored CV</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                                  <FileText className="w-4 h-4 text-indigo-400" />
                                </div>
                                <span className="text-sm font-medium text-white/90">Cover Letter</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setError("");
                            setMode("specific_role");
                            setStepTab("upload");
                          }}
                          className="mt-8 w-full px-7 py-4 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 border border-purple-400/30 text-white text-lg font-semibold rounded-2xl transition-all duration-200 shadow-lg shadow-purple-500/25"
                        >
                          Tailor My CV
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="text-xs text-white/70">
                      Selected:{" "}
                      <span className="text-white font-medium">
                        {mode === "title_only" ? "Quick Optimize (Title-only)" : "Tailor to a Job (Company + JD)"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setError("");
                        setMode(null);
                        setStepTab("choose");
                      }}
                      className="px-3 py-2 text-xs font-medium rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white transition-colors"
                    >
                      Back to options
                    </button>
                  </div>

                  <div className="grid lg:grid-cols-2 gap-4 mb-5">
                    <CVUpload onFileSelect={setCvFile} onTextChange={setCvText} selectedFile={cvFile} cvText={cvText} />
                    <JobInput
                      mode={mode!}
                      jobTitle={jobTitle}
                      jobUrl={jobUrl}
                      jobDescription={jobDescription}
                      companyName={companyName}
                      onTitleChange={setJobTitle}
                      onUrlChange={setJobUrl}
                      onDescriptionChange={setJobDescription}
                      onCompanyNameChange={setCompanyName}
                    />
                  </div>
                </>
              )}
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-400/30 rounded-2xl text-red-200 text-center">
                {error}
              </div>
            )}

            {stepTab === "upload" && (
              <div className="flex justify-center mt-auto">
                <button
                  onClick={handleAnalyze}
                  disabled={
                    isAnalyzing ||
                    !mode ||
                    (!cvFile && !cvText) ||
                    (mode === "title_only" && !jobTitle.trim()) ||
                    (mode === "specific_role" && (!jobDescription && !jobUrl)) ||
                    (mode === "specific_role" && !companyName.trim())
                  }
                  className="px-8 py-4 bg-indigo-500 hover:bg-indigo-400 disabled:bg-white/10 border border-white/10 text-white text-lg font-semibold rounded-2xl shadow-[0_18px_50px_rgba(0,0,0,0.50)] transition-all duration-200 flex items-center gap-3"
                >
                  {isAnalyzing ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Building your report...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      Analyze & Generate Report
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="relative z-10 border-t border-white/10 py-3 mt-auto">
        <div className="max-w-6xl mx-auto px-4 flex flex-col items-center gap-2">
          <div className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 py-2 text-sm font-semibold text-white">
            {cvOptimizedCount.toLocaleString()} CVs optimized
          </div>
          <div className="text-center text-white/60 text-xs">Powered by Google Gemini • Your data is not stored</div>
        </div>
      </footer>
    </div>
  );
}



