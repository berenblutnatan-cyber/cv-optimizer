"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnalysisResults } from "@/components/AnalysisResults";
import { clearAnalysisSession, loadAnalysisFromSession } from "@/lib/analysisSession";

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

export default function ResultsPage() {
  const router = useRouter();
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);

  useEffect(() => {
    const stored = loadAnalysisFromSession<AnalysisResult>();
    setAnalysis(stored);
  }, []);

  if (!analysis) {
    return (
      <div className="min-h-screen bg-[#0b1220] text-white">
        <div className="max-w-4xl mx-auto px-4 py-10">
          <div className="bg-white/10 border border-white/15 rounded-2xl shadow-[0_30px_90px_rgba(0,0,0,0.35)] p-8 backdrop-blur">
            <h1 className="text-xl font-bold text-white mb-2">No analysis found</h1>
            <p className="text-white/70 mb-6">
              Please run an analysis first. (If you refreshed, the results may have been cleared.)
            </p>
            <button
              onClick={() => router.push("/")}
              className="px-5 py-3 bg-white/10 hover:bg-white/15 border border-white/15 text-white font-semibold rounded-xl transition-colors"
            >
              Back to Analyzer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b1220] text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-600/25 via-sky-500/20 to-fuchsia-500/20 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.08),transparent_40%),radial-gradient(circle_at_80%_30%,rgba(99,102,241,0.12),transparent_45%)]" />
      </div>

      <header className="relative z-10 border-b border-white/10 bg-white/5 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-white leading-tight">CV Optimizer</p>
              <p className="text-xs text-white/70 leading-tight">Screening-focused report</p>
            </div>
          </div>
          <button
            onClick={() => {
              clearAnalysisSession();
              router.push("/");
            }}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-white/15 bg-white/10 hover:bg-white/15 text-white transition-colors"
          >
            New Analysis
          </button>
        </div>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-4 py-8">
        <AnalysisResults results={analysis} />
      </main>

      <footer className="relative z-10 border-t border-white/10 py-6 mt-auto">
        <div className="max-w-6xl mx-auto px-4 text-center text-white/60 text-sm">
          Powered by OpenAI • Your data is not stored
        </div>
      </footer>
    </div>
  );
}


