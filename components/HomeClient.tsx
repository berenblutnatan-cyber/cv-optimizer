"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CVUpload } from "@/components/CVUpload";
import { JobInput } from "@/components/JobInput";
import { AnalysisMode, saveAnalysisToSession } from "@/lib/analysisSession";
import { FileText, Sparkles, Link2, Target, Check, ArrowRight, Upload, Briefcase, ArrowLeft } from "lucide-react";
import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import { Logo } from "@/components/Logo";
import Link from "next/link";

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
            <Link 
              href="/optimize" 
              className="text-sm font-medium text-stone-500 hover:text-stone-900 transition-colors tracking-wide"
            >
              Optimizer
            </Link>
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
              <div className="flex items-center gap-3">
                <SignInButton mode="modal">
                  <button className="px-5 py-2.5 text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors tracking-wide">
                    Sign In
                  </button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="px-5 py-2.5 text-sm font-medium text-white bg-[#0A2647] hover:bg-[#0d3259] rounded transition-colors tracking-wide">
                    Get Started
                  </button>
                </SignUpButton>
              </div>
            </SignedOut>
          </nav>
        </div>
      </header>

      <main className="flex-1 w-full px-8 lg:px-16 py-16">
        <div className="max-w-5xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <h1 className="font-serif text-5xl md:text-6xl font-light text-[#1a1a1a] mb-6 tracking-tight leading-tight">
              Don't Just Apply.
              <br />
              <span className="text-[#0A2647]">Get Hired.</span>
            </h1>
            <div className="w-20 h-px bg-[#0A2647] mx-auto mb-6" />
            <p className="text-stone-500 text-xl font-light tracking-wide max-w-2xl mx-auto leading-relaxed">
              Upload your resume, provide the target role, and receive a tailored version 
              that maximizes your interview chances.
            </p>
          </div>

          {/* Main Card */}
          <div className="bg-white rounded-sm shadow-[0_8px_60px_-12px_rgba(0,0,0,0.12)] p-10 lg:p-14">
            {/* Progress Steps */}
            <div className="mb-12 flex items-center justify-center">
              <div className="flex items-center gap-0">
                {/* Step 1 */}
                <div className="flex items-center">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
                    stepTab === "choose" 
                      ? "bg-[#0A2647] border-[#0A2647] text-white" 
                      : mode 
                        ? "bg-[#0A2647] border-[#0A2647] text-white"
                        : "bg-stone-100 border-stone-300 text-stone-400"
                  }`}>
                    {mode ? <Check className="w-4 h-4" strokeWidth={1.5} /> : <span className="text-sm font-medium">1</span>}
                  </div>
                  <span className={`ml-4 text-sm font-medium tracking-wide transition-colors ${
                    stepTab === "choose" ? "text-[#1a1a1a]" : "text-stone-400"
                  }`}>
                    Select Option
                  </span>
                </div>

                {/* Connector */}
                <div className={`w-20 sm:w-32 h-px mx-6 transition-colors ${
                  mode ? "bg-[#0A2647]" : "bg-stone-200"
                }`} />

                {/* Step 2 */}
                <div className="flex items-center">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
                    stepTab === "upload" 
                      ? "bg-[#0A2647] border-[#0A2647] text-white" 
                      : "bg-stone-100 border-stone-300 text-stone-400"
                  }`}>
                    <span className="text-sm font-medium">2</span>
                  </div>
                  <span className={`ml-4 text-sm font-medium tracking-wide transition-colors ${
                    stepTab === "upload" ? "text-[#1a1a1a]" : "text-stone-400"
                  }`}>
                    Upload & Optimize
                  </span>
                </div>
              </div>
            </div>

            {stepTab === "choose" ? (
              <div className="grid md:grid-cols-2 gap-8">
                {/* Quick Optimize Card */}
                <div
                  className={`rounded-sm border p-8 transition-all cursor-pointer ${
                    mode === "title_only"
                      ? "border-[#0A2647] bg-[#0A2647]/5 shadow-lg"
                      : "border-stone-200 hover:border-stone-300 hover:shadow-md"
                  }`}
                  onClick={() => {
                    setError("");
                    setMode("title_only");
                  }}
                >
                  <div className="flex items-start gap-4 mb-6">
                    <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-stone-600" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3 className="font-serif text-xl text-[#1a1a1a] mb-2">Quick Polish</h3>
                      <p className="text-stone-500 text-sm font-light leading-relaxed">
                        General optimization for any role in your field
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4 mb-8">
                    <div className="flex items-center gap-3 text-sm text-stone-600">
                      <Check className="w-4 h-4 text-[#0A2647]" strokeWidth={1.5} />
                      <span className="font-light">Your CV + Job title</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-stone-600">
                      <ArrowRight className="w-4 h-4 text-stone-400" strokeWidth={1.5} />
                      <span className="font-light">Polished, ATS-ready resume</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setError("");
                      setMode("title_only");
                      setStepTab("upload");
                    }}
                    className="w-full px-6 py-4 bg-transparent border border-stone-300 text-stone-700 font-medium rounded-sm hover:bg-stone-50 transition-all tracking-wide"
                  >
                    Quick Polish
                  </button>
                </div>

                {/* Tailor to Job Card */}
                <div className="relative">
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                    <span className="inline-flex items-center gap-2 px-5 py-2 bg-[#0A2647] text-white text-xs font-medium uppercase tracking-widest rounded-sm">
                      <Sparkles className="w-3.5 h-3.5" strokeWidth={1.5} />
                      Recommended
                    </span>
                  </div>

                  <div
                    className={`rounded-sm border-2 p-8 pt-10 transition-all cursor-pointer ${
                      mode === "specific_role"
                        ? "border-[#0A2647] bg-[#0A2647]/5 shadow-lg"
                        : "border-[#0A2647]/30 hover:border-[#0A2647]/50 hover:shadow-md"
                    }`}
                    onClick={() => {
                      setError("");
                      setMode("specific_role");
                    }}
                  >
                    <div className="flex items-start gap-4 mb-6">
                      <div className="w-12 h-12 rounded-full bg-[#0A2647]/10 flex items-center justify-center flex-shrink-0">
                        <Target className="w-5 h-5 text-[#0A2647]" strokeWidth={1.5} />
                      </div>
                      <div>
                        <h3 className="font-serif text-xl text-[#1a1a1a] mb-2">Tailor to Role</h3>
                        <p className="text-stone-500 text-sm font-light leading-relaxed">
                          Perfect match for a specific job posting
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4 mb-8">
                      <div className="flex items-center gap-3 text-sm text-stone-600">
                        <Check className="w-4 h-4 text-[#0A2647]" strokeWidth={1.5} />
                        <span className="font-light">Your CV + Job description</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-stone-600">
                        <ArrowRight className="w-4 h-4 text-stone-400" strokeWidth={1.5} />
                        <span className="font-light">Tailored resume + Cover letter</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setError("");
                        setMode("specific_role");
                        setStepTab("upload");
                      }}
                      className="w-full px-6 py-4 bg-[#0A2647] text-white font-medium rounded-sm hover:bg-[#0d3259] transition-all tracking-wide"
                    >
                      Tailor My Resume
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-4 mb-8 pb-6 border-b border-stone-100">
                  <div className="text-sm text-stone-500 font-light">
                    Selected:{" "}
                    <span className="text-[#1a1a1a] font-medium">
                      {mode === "title_only" ? "Quick Polish" : "Tailor to Role"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setError("");
                      setMode(null);
                      setStepTab("choose");
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
                    Back
                  </button>
                </div>

                <div className="grid lg:grid-cols-2 gap-8 mb-8">
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

            {error && (
              <div className="mt-8 p-5 bg-red-50/80 border border-red-200/60 rounded-sm flex items-center gap-4 text-red-700">
                <span className="font-light">{error}</span>
              </div>
            )}

            {stepTab === "upload" && (
              <div className="flex justify-center mt-10 pt-8 border-t border-stone-100">
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
                  className="group inline-flex items-center gap-4 px-12 py-5 bg-[#0A2647] hover:bg-[#0d3259] disabled:bg-stone-200 disabled:text-stone-400 text-white font-medium rounded-sm transition-all tracking-wide"
                >
                  {isAnalyzing ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
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
            )}
          </div>

          {/* Stats */}
          <div className="mt-12 text-center">
            <p className="text-stone-400 text-sm font-light tracking-wide">
              <span className="text-[#0A2647] font-medium">{cvOptimizedCount.toLocaleString()}</span> resumes optimized
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-stone-200/60 py-6">
        <div className="max-w-7xl mx-auto px-8 lg:px-16 flex items-center justify-between">
          <p className="text-stone-400 text-xs font-light tracking-wide">
            Your data is secure and never stored
          </p>
          <p className="text-stone-400 text-xs font-light tracking-wide">
            Powered by AI
          </p>
        </div>
      </footer>
    </div>
  );
}
