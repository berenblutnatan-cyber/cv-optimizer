"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CVUpload } from "@/components/CVUpload";
import { JobInput } from "@/components/JobInput";
import { AnalysisMode, saveAnalysisToSession } from "@/lib/analysisSession";

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
    <div className="min-h-screen text-white bg-black flex flex-col overflow-hidden">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[540px] w-[920px] -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-600/22 via-sky-500/14 to-fuchsia-500/12 blur-3xl" />
        <div className="absolute -bottom-40 right-[-120px] h-[520px] w-[520px] rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_12%,rgba(255,255,255,0.05),transparent_45%),radial-gradient(circle_at_80%_18%,rgba(99,102,241,0.10),transparent_50%)]" />
      </div>

      <main className="relative z-10 max-w-7xl mx-auto px-4 pt-8 pb-5 flex-1 min-h-0 w-full">
        <div className="h-full min-h-0 flex flex-col">
          {/* Hero Section */}
          <div className="text-center mb-7">
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white mb-2">
              AI That Adapts Your CV to the Job
            </h2>
            <p className="text-white/70 max-w-3xl mx-auto text-base">
              Pick quick optimization or tailor to a specific posting — with an optimized CV and a cover letter.
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

          <div className="bg-white/4 border border-white/10 rounded-2xl p-6 sm:p-7 shadow-[0_28px_80px_rgba(0,0,0,0.50)] backdrop-blur-md flex-1 min-h-0 flex flex-col">
            {/* Step tabs */}
            <div className="mb-4 flex gap-2 bg-white/5 p-1 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setMode(null);
                  setStepTab("choose");
                }}
                className={`flex-1 py-3.5 px-5 rounded-lg text-base font-medium transition-colors ${
                  stepTab === "choose" ? "bg-indigo-500 text-white" : "text-white/70 hover:bg-white/5"
                }`}
              >
                1) Choose option
              </button>
              <button
                type="button"
                disabled={!mode}
                onClick={() => mode && setStepTab("upload")}
                className={`flex-1 py-3.5 px-5 rounded-lg text-base font-medium transition-colors ${
                  stepTab === "upload" ? "bg-indigo-500 text-white" : "text-white/70 hover:bg-white/5"
                } disabled:opacity-40 disabled:hover:bg-transparent`}
              >
                2) Upload & Analyze
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-auto pr-1">
              {stepTab === "choose" ? (
                <div className="grid md:grid-cols-2 gap-6 min-h-full">
                  <div
                    className={`rounded-2xl border px-8 py-8 transition-colors min-h-[320px] h-full ${
                      mode === "title_only"
                        ? "border-indigo-300/35 bg-indigo-500/15 shadow-[0_0_0_1px_rgba(129,140,248,0.35)]"
                        : "border-white/10 bg-white/5"
                    }`}
                  >
                    <div className="flex flex-col h-full">
                      <div className="flex items-start gap-4">
                        <div className="mt-0.5 h-14 w-14 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center flex-shrink-0">
                          <svg className="h-6 w-6 text-indigo-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6M7 4h10a2 2 0 012 2v14H5V6a2 2 0 012-2z" />
                          </svg>
                        </div>
                        <div>
                          <div className="text-xl font-semibold text-white tracking-tight">Quick Optimize</div>
                          <div className="mt-2 text-base text-white/70 leading-relaxed">
                            General CV optimization for a role type — no job posting needed.
                          </div>
                        </div>
                      </div>

                      <div className="mt-7 space-y-3 text-base flex-1">
                        <div className="text-white/80">
                          <span className="font-semibold text-white">You provide:</span>{" "}
                          <span className="text-white/70">Job title + CV</span>
                        </div>
                        <div className="text-white/80">
                          <span className="font-semibold text-white">You get:</span>{" "}
                          <span className="text-white/70">Match score + optimized CV + key improvements</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setError("");
                          setMode("title_only");
                          setStepTab("upload");
                        }}
                        className="mt-8 w-full px-7 py-4 bg-indigo-500 hover:bg-indigo-400 border border-white/10 text-white text-lg font-semibold rounded-2xl transition-colors"
                      >
                        Select Quick Optimize
                      </button>
                    </div>
                  </div>

                  <div
                    className={`rounded-2xl border px-8 py-8 transition-colors min-h-[320px] h-full ${
                      mode === "specific_role"
                        ? "border-indigo-300/35 bg-indigo-500/15 shadow-[0_0_0_1px_rgba(129,140,248,0.35)]"
                        : "border-white/10 bg-white/5"
                    }`}
                  >
                    <div className="flex flex-col h-full">
                      <div className="flex items-start gap-4">
                        <div className="mt-0.5 h-14 w-14 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center flex-shrink-0">
                          <svg className="h-6 w-6 text-indigo-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19a8 8 0 100-16 8 8 0 000 16zm10 2l-4.35-4.35" />
                          </svg>
                        </div>
                        <div>
                          <div className="text-xl font-semibold text-white tracking-tight">Tailor to a Specific Job</div>
                          <div className="mt-2 text-base text-white/70 leading-relaxed">
                            Tailored optimization for a real posting + a cover letter you can download.
                          </div>
                        </div>
                      </div>

                      <div className="mt-7 space-y-3 text-base flex-1">
                        <div className="text-white/80">
                          <span className="font-semibold text-white">You provide:</span>{" "}
                          <span className="text-white/70">Company + job description / LinkedIn URL + CV</span>
                        </div>
                        <div className="text-white/80">
                          <span className="font-semibold text-white">You get:</span>{" "}
                          <span className="text-white/70">Match score + tailored CV + cover letter (PDF)</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setError("");
                          setMode("specific_role");
                          setStepTab("upload");
                        }}
                        className="mt-8 w-full px-7 py-4 bg-indigo-500 hover:bg-indigo-400 border border-white/10 text-white text-lg font-semibold rounded-2xl transition-colors"
                      >
                        Select Tailored Job Mode
                      </button>
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
          <div className="text-center text-white/60 text-xs">Powered by OpenAI • Your data is not stored</div>
        </div>
      </footer>
    </div>
  );
}



