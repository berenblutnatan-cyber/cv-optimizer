"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, SignInButton } from "@clerk/nextjs";
import { Download, X, Check, Sparkles, Loader2, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
import { AnalysisResults } from "@/components/AnalysisResults";
import { AnalysisSessionPayload, clearAnalysisSession, loadAnalysisFromSession, saveAnalysisToSession } from "@/lib/analysisSession";
import { Logo } from "@/components/Logo";
import { ShellNav } from "@/components/ShellNav";

export default function ResultsPage() {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const [payload, setPayload] = useState<AnalysisSessionPayload | null>(null);
  const [coverLetter, setCoverLetter] = useState<string>("");
  const [generatingCoverLetter, setGeneratingCoverLetter] = useState(false);
  const [downloadingCoverLetterPdf, setDownloadingCoverLetterPdf] = useState(false);
  const [copiedCoverLetter, setCopiedCoverLetter] = useState(false);
  const [showSignInPrompt, setShowSignInPrompt] = useState(false);
  const [coverLetterError, setCoverLetterError] = useState<string | null>(null);
  const [isEnhancing, setIsEnhancing] = useState(false);
  
  // Gap Analysis State
  const [showGapAnalysis, setShowGapAnalysis] = useState(false);
  const [userSkillsInput, setUserSkillsInput] = useState<Record<string, boolean>>({});
  const [additionalAchievements, setAdditionalAchievements] = useState("");
  const [isReOptimizing, setIsReOptimizing] = useState(false);
  const [reOptimizeError, setReOptimizeError] = useState("");

  useEffect(() => {
    const stored = loadAnalysisFromSession<AnalysisSessionPayload>();
    setPayload(stored);
    setCoverLetter(stored?.coverLetter || "");
    
    // Initialize skills toggle state from missing keywords
    if (stored?.analysis) {
      const analysis = stored.analysis as { missingKeySkills?: string[] };
      const missingSkills = analysis.missingKeySkills || [];
      const initialSkills: Record<string, boolean> = {};
      missingSkills.forEach((skill) => {
        initialSkills[skill] = false;
      });
      setUserSkillsInput(initialSkills);
    }
  }, []);

  const cleanTitleForUi = (raw: string) => raw.replace(/[*_`~]/g, "").replace(/\s+/g, " ").trim();
  
  // Get missing skills from analysis
  const missingKeySkills = payload?.analysis 
    ? ((payload.analysis as { missingKeySkills?: string[] }).missingKeySkills || [])
    : [];

  // Handle re-optimization with additional skills
  const handleReOptimize = async () => {
    if (!payload) return;
    
    setIsReOptimizing(true);
    setReOptimizeError("");

    try {
      // Get confirmed skills
      const confirmedSkills = Object.entries(userSkillsInput)
        .filter(([_, has]) => has)
        .map(([skill]) => skill);

      // Build form data
      const formData = new FormData();
      
      // Use stored CV text from meta
      if (payload.meta.cvTextUsed) {
        formData.append("cvText", payload.meta.cvTextUsed);
      }
      
      formData.append("mode", "specific_role");
      
      // Use original job context
      if (payload.originalInputs?.jobTitle || payload.meta.jobTitle) {
        formData.append("jobTitle", payload.originalInputs?.jobTitle || payload.meta.jobTitle);
      }
      if (payload.originalInputs?.jobDescription || payload.meta.jobDescriptionUsed) {
        formData.append("jobDescription", payload.originalInputs?.jobDescription || payload.meta.jobDescriptionUsed || "");
      }
      if (payload.originalInputs?.jobUrl || payload.meta.jobUrl) {
        formData.append("jobUrl", payload.originalInputs?.jobUrl || payload.meta.jobUrl || "");
      }
      
      formData.append("companyName", payload.meta.companyName || "Target Company");
      
      // Add gap analysis inputs
      if (confirmedSkills.length > 0) {
        formData.append("additionalSkills", confirmedSkills.join(", "));
      }
      if (additionalAchievements.trim()) {
        formData.append("additionalAchievements", additionalAchievements);
      }

      const response = await fetch("/api/analyze", { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Re-optimization failed");

      // Update payload with new analysis
      const newPayload: AnalysisSessionPayload = {
        ...payload,
        analysis: data.analysis,
        meta: data.meta,
      };
      setPayload(newPayload);
      saveAnalysisToSession(newPayload);
      
      // Reset gap analysis state
      setShowGapAnalysis(false);
      setAdditionalAchievements("");
      
      // Re-initialize skills from new analysis
      const newMissingSkills = data.analysis.missingKeySkills || [];
      const newSkillsState: Record<string, boolean> = {};
      newMissingSkills.forEach((skill: string) => {
        newSkillsState[skill] = false;
      });
      setUserSkillsInput(newSkillsState);

    } catch (err) {
      setReOptimizeError(err instanceof Error ? err.message : "Re-optimization failed");
    } finally {
      setIsReOptimizing(false);
    }
  };

  if (!payload) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 py-10">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-lg p-8">
            <h1 className="text-xl font-bold text-slate-900 mb-2">No analysis found</h1>
            <p className="text-slate-600 mb-6">
              Please run an analysis first. (If you refreshed, the results may have been cleared.)
            </p>
            <button
              onClick={() => router.push("/")}
              className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors"
            >
              Back to Optimizer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col overflow-hidden">
      {/* Subtle gradient background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-100/50 via-violet-50/30 to-cyan-100/40 blur-3xl" />
      </div>

      <ShellNav
        rightSlot={
          <button
            onClick={() => {
              clearAnalysisSession();
              router.push("/optimize");
            }}
            className="px-3 py-2 text-sm font-medium rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors shadow-sm"
          >
            New Analysis
          </button>
        }
      />

      {/* Main Content */}
      <main className="flex-1 w-full px-6 lg:px-12 py-8 relative z-10">
        <AnalysisResults
          results={payload.analysis as any}
          coverLetterTab={
            payload.meta.mode === "specific_role"
              ? {
                  title: "Cover Letter",
                  subtitle: `Tailored to ${payload.meta.companyName} — ${cleanTitleForUi(payload.meta.jobTitle)}`,
                  text: coverLetter,
                  onTextChange: setCoverLetter,
                  onGenerate: async () => {
                    try {
                      setGeneratingCoverLetter(true);
                      setCoverLetterError(null);
                      const res = await fetch("/api/cover-letter", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          cvText: payload.meta.cvTextUsed || "",
                          jobDescription: payload.meta.jobDescriptionUsed || "",
                          jobTitle: payload.meta.jobTitle,
                          companyName: payload.meta.companyName,
                        }),
                      });
                      const data = await res.json();
                      if (!res.ok) {
                        // Handle specific error cases
                        const errorMsg = data?.error || "Cover letter generation failed";
                        if (errorMsg.includes("API key") || errorMsg.includes("OPENAI")) {
                          setCoverLetterError("AI service is temporarily unavailable. Please try again later.");
                        } else if (errorMsg.includes("cvText") || errorMsg.includes("Missing")) {
                          setCoverLetterError("Please ensure your CV text is available. Try re-analyzing your resume first.");
                        } else if (errorMsg.includes("rate limit") || errorMsg.includes("429")) {
                          setCoverLetterError("Too many requests. Please wait a moment and try again.");
                        } else {
                          setCoverLetterError(errorMsg);
                        }
                        return;
                      }
                      setCoverLetter(data.coverLetter);
                      const nextPayload: AnalysisSessionPayload = { ...payload, coverLetter: data.coverLetter };
                      setPayload(nextPayload);
                      saveAnalysisToSession(nextPayload);
                    } catch (e) {
                      const errorMsg = e instanceof Error ? e.message : "Cover letter generation failed";
                      if (errorMsg.includes("fetch") || errorMsg.includes("network") || errorMsg.includes("Failed to fetch")) {
                        setCoverLetterError("Network error. Please check your internet connection and try again.");
                      } else {
                        setCoverLetterError(errorMsg);
                      }
                    } finally {
                      setGeneratingCoverLetter(false);
                    }
                  },
                  isGenerating: generatingCoverLetter,
                  onCopy: () => {
                    if (!coverLetter) return;
                    navigator.clipboard.writeText(coverLetter);
                    setCopiedCoverLetter(true);
                    setTimeout(() => setCopiedCoverLetter(false), 1500);
                  },
                  copied: copiedCoverLetter,
                  onDownloadPdf: async () => {
                    // Require sign-in to download
                    if (!isSignedIn) {
                      setShowSignInPrompt(true);
                      return;
                    }
                    try {
                      if (!coverLetter) return;
                      setDownloadingCoverLetterPdf(true);
                      const res = await fetch("/api/export-cover-letter-pdf", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ text: coverLetter, fileName: "Cover-Letter.pdf" }),
                      });
                      if (!res.ok) {
                        const data = await res.json().catch(() => ({}));
                        throw new Error(data?.error || "PDF export failed");
                      }
                      const blob = await res.blob();
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = "Cover-Letter.pdf";
                      document.body.appendChild(a);
                      a.click();
                      a.remove();
                      URL.revokeObjectURL(url);
                    } catch (e) {
                      alert(e instanceof Error ? e.message : "PDF export failed");
                    } finally {
                      setDownloadingCoverLetterPdf(false);
                    }
                  },
                  isDownloadingPdf: downloadingCoverLetterPdf,
                  error: coverLetterError,
                  onDismissError: () => setCoverLetterError(null),
                }
              : undefined
          }
          jobTitle={payload.meta.jobTitle}
          isEnhancing={isEnhancing}
          onEnhanceWithDeepDive={async (answers) => {
            setIsEnhancing(true);
            try {
              // Build form data for re-analysis with deep dive answers
              const formData = new FormData();
              
              if (payload.meta.cvTextUsed) {
                formData.append("cvText", payload.meta.cvTextUsed);
              }
              
              formData.append("mode", "specific_role");
              
              if (payload.meta.jobTitle) {
                formData.append("jobTitle", payload.meta.jobTitle);
              }
              if (payload.meta.jobDescriptionUsed) {
                formData.append("jobDescription", payload.meta.jobDescriptionUsed);
              }
              if (payload.meta.jobUrl) {
                formData.append("jobUrl", payload.meta.jobUrl);
              }
              formData.append("companyName", payload.meta.companyName || "Target Company");
              
              // Add deep dive answers
              formData.append("deepDiveAnswers", JSON.stringify(answers));

              const response = await fetch("/api/analyze", { method: "POST", body: formData });
              const data = await response.json();
              
              if (!response.ok) throw new Error(data.error || "Enhancement failed");

              // Update payload with new analysis
              const newPayload: AnalysisSessionPayload = {
                ...payload,
                analysis: data.analysis,
                meta: data.meta,
              };
              setPayload(newPayload);
              saveAnalysisToSession(newPayload);
              
              // Re-initialize skills from new analysis
              const newMissingSkills = data.analysis.missingKeySkills || [];
              const newSkillsState: Record<string, boolean> = {};
              newMissingSkills.forEach((skill: string) => {
                newSkillsState[skill] = false;
              });
              setUserSkillsInput(newSkillsState);

            } catch (err) {
              alert(err instanceof Error ? err.message : "Enhancement failed");
            } finally {
              setIsEnhancing(false);
            }
          }}
        />

        {/* Skills Suggestion Section - After Complete Analysis */}
        {missingKeySkills.length > 0 && (
          <div className="mt-8 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl overflow-hidden shadow-lg">
            {/* Header - Always Visible */}
            <div className="px-6 py-5 border-b border-amber-200/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center shadow-md">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-900">
                    Do You Have These Skills?
                  </h3>
                  <p className="text-sm text-slate-600">
                    We found <span className="font-semibold text-amber-700">{missingKeySkills.length} skills</span> the job requires that weren't mentioned in your resume. If you have any of them, let us know!
                  </p>
                </div>
                <button
                  onClick={() => setShowGapAnalysis(!showGapAnalysis)}
                  className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                >
                  {showGapAnalysis ? (
                    <ChevronUp className="w-5 h-5 text-slate-500" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-500" />
                  )}
                </button>
              </div>
            </div>

            {/* Expandable Content */}
            {showGapAnalysis && (
              <div className="px-6 pb-6 space-y-6 bg-white/50">
                {/* Missing Skills Checklist */}
                <div className="pt-6">
                  <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full bg-indigo-500 text-white text-sm font-bold flex items-center justify-center shadow-sm">1</span>
                    Select skills you have experience with
                  </h4>
                  <p className="text-slate-500 text-sm mb-4 ml-9">
                    Check any skills you've used professionally — we'll re-optimize to highlight them.
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 ml-9">
                    {missingKeySkills.map((skill) => (
                      <button
                        key={skill}
                        onClick={() => setUserSkillsInput(prev => ({ ...prev, [skill]: !prev[skill] }))}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left ${
                          userSkillsInput[skill]
                            ? "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm"
                            : "border-slate-200 bg-white hover:border-indigo-300 text-slate-600 hover:text-slate-800"
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                          userSkillsInput[skill]
                            ? "border-indigo-500 bg-indigo-500"
                            : "border-slate-300 bg-white"
                        }`}>
                          {userSkillsInput[skill] && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <span className="text-sm font-medium">{skill}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Additional Achievements */}
                <div>
                  <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full bg-indigo-500 text-white text-sm font-bold flex items-center justify-center shadow-sm">2</span>
                    Any other achievements to add?
                  </h4>
                  <p className="text-slate-500 text-sm mb-4 ml-9">
                    Add accomplishments that strengthen your application for this role.
                  </p>
                  <textarea
                    value={additionalAchievements}
                    onChange={(e) => setAdditionalAchievements(e.target.value)}
                    placeholder="e.g. Led a team of 5 engineers, Increased revenue by 30%, AWS certified..."
                    className="w-full h-28 p-4 bg-white border-2 border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 ml-9 max-w-[calc(100%-36px)]"
                  />
                </div>

                {/* Error Message */}
                {reOptimizeError && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700 ml-9">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{reOptimizeError}</span>
                  </div>
                )}

                {/* Action Button */}
                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleReOptimize}
                    disabled={isReOptimizing || (Object.values(userSkillsInput).every(v => !v) && !additionalAchievements.trim())}
                    className="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:from-slate-300 disabled:to-slate-300 disabled:text-slate-400 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/25 disabled:shadow-none"
                  >
                    {isReOptimizing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Re-optimizing Your Resume...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        Re-Optimize with My Skills
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Collapsed Preview - Show skill count when collapsed */}
            {!showGapAnalysis && (
              <div className="px-6 py-4 bg-white/30 flex items-center justify-between">
                <div className="flex flex-wrap gap-2">
                  {missingKeySkills.slice(0, 5).map((skill) => (
                    <span key={skill} className="px-3 py-1 bg-white border border-amber-200 text-amber-800 rounded-full text-xs font-medium">
                      {skill}
                    </span>
                  ))}
                  {missingKeySkills.length > 5 && (
                    <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                      +{missingKeySkills.length - 5} more
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setShowGapAnalysis(true)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
                >
                  Add My Skills
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="relative z-10 border-t border-slate-200 py-3 bg-white">
        <div className="max-w-6xl mx-auto px-4 text-center text-slate-500 text-xs">
          Powered by OpenAI • Your data is not stored
        </div>
      </footer>

      {/* Sign In Prompt Modal */}
      {showSignInPrompt && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setShowSignInPrompt(false)}
        >
          <div 
            className="relative bg-white border border-slate-200 rounded-2xl shadow-2xl p-8 max-w-md text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowSignInPrompt(false)}
              className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
            <div className="mb-4">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-indigo-100 flex items-center justify-center">
                <Download className="w-8 h-8 text-indigo-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Sign in to Download</h3>
              <p className="text-slate-600">
                Create a free account to download your cover letter as a PDF.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <SignInButton mode="modal">
                <button className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors">
                  Sign In
                </button>
              </SignInButton>
              <button
                onClick={() => setShowSignInPrompt(false)}
                className="w-full px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-colors"
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
