"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CVUpload } from "@/components/CVUpload";
import { JobInput } from "@/components/JobInput";
import { saveAnalysisToSession } from "@/lib/analysisSession";

interface AnalysisResult {
  overallScore: number;
  summary: string;
  strengths: string[];
  improvements: string[];
  suggestedChanges: {
    id?: string;
    section: string;
    original: string;
    suggested: string;
    reason: string;
  }[];
  keywords: {
    missing: string[];
    present: string[];
  };
  missingKeySkills?: string[];
  optimizedCV: string;
}

export default function Home() {
  const router = useRouter();
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvText, setCvText] = useState<string>("");
  const [jobDescription, setJobDescription] = useState<string>("");
  const [jobUrl, setJobUrl] = useState<string>("");
  const [jobTitle, setJobTitle] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string>("");

  const handleAnalyze = async () => {
    if (!cvText && !cvFile) {
      setError("Please upload your CV first");
      return;
    }
    if (!jobDescription && !jobUrl && !jobTitle) {
      setError("Please provide a job title, job description, or job URL");
      return;
    }

    setError("");
    setIsAnalyzing(true);

    try {
      const formData = new FormData();
      if (cvFile) {
        formData.append("cv", cvFile);
      }
      if (cvText) {
        formData.append("cvText", cvText);
      }
      if (jobDescription) {
        formData.append("jobDescription", jobDescription);
      }
      if (jobUrl) {
        formData.append("jobUrl", jobUrl);
      }
      if (jobTitle) {
        formData.append("jobTitle", jobTitle);
      }

      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Analysis failed");
      }

      saveAnalysisToSession(data.analysis);
      router.push("/results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b1220] text-white">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-600/25 via-sky-500/20 to-fuchsia-500/20 blur-3xl" />
        <div className="absolute -bottom-32 right-[-120px] h-[420px] w-[420px] rounded-full bg-indigo-500/15 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.08),transparent_40%),radial-gradient(circle_at_80%_30%,rgba(99,102,241,0.12),transparent_45%)]" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/10 bg-white/5 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="leading-tight">
              <h1 className="text-base font-semibold text-white">CV Optimizer</h1>
              <p className="text-xs text-white/70">Improve ATS & recruiter screening</p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs">
            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/80">Data privacy</span>
            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/80">PDF export</span>
            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/80">Job-title-only mode</span>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-4 py-10">
        {/* Hero Section */}
        <div className="text-center mb-6">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-3">
            AI That Adapts Your CV to the Job
          </h2>
          <p className="text-white/75 max-w-3xl mx-auto">
            Upload your CV and job description (or a LinkedIn job link). Get a screening score and an optimized CV in seconds.
          </p>

          <div className="mt-5 flex items-center justify-center gap-8 text-white/80">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16V8a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2z" />
              </svg>
              <span className="text-sm">1. Upload</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19a8 8 0 100-16 8 8 0 000 16zm10 2l-4.35-4.35" />
              </svg>
              <span className="text-sm">2. Analyze</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-sm">3. Optimize</span>
            </div>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-[28px] p-5 sm:p-6 shadow-[0_30px_90px_rgba(0,0,0,0.45)] backdrop-blur">
        {/* Main Content */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* CV Upload Section */}
          <CVUpload 
            onFileSelect={setCvFile} 
            onTextChange={setCvText}
            selectedFile={cvFile}
            cvText={cvText}
          />

          {/* Job Description Section */}
          <JobInput 
            jobTitle={jobTitle}
            jobUrl={jobUrl}
            jobDescription={jobDescription}
            onTitleChange={setJobTitle}
            onUrlChange={setJobUrl}
            onDescriptionChange={setJobDescription}
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-400/30 rounded-2xl text-red-200 text-center">
            {error}
          </div>
        )}

        {/* Analyze Button */}
        <div className="flex justify-center mb-10">
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || (!cvFile && !cvText) || (!jobDescription && !jobUrl && !jobTitle)}
            className="px-8 py-4 bg-white/10 hover:bg-white/15 disabled:bg-white/5 border border-white/15 text-white font-semibold rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.45)] hover:shadow-[0_25px_70px_rgba(0,0,0,0.55)] transition-all duration-200 flex items-center gap-3 backdrop-blur"
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

        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 py-6 mt-auto">
        <div className="max-w-6xl mx-auto px-4 text-center text-white/60 text-sm">
          Powered by OpenAI • Your data is not stored
        </div>
      </footer>
    </div>
  );
}
