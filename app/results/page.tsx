"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, SignInButton } from "@clerk/nextjs";
import { Download, X, ArrowLeft } from "lucide-react";
import { AnalysisResults } from "@/components/AnalysisResults";
import { AnalysisSessionPayload, clearAnalysisSession, loadAnalysisFromSession, saveAnalysisToSession } from "@/lib/analysisSession";
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

  useEffect(() => {
    const stored = loadAnalysisFromSession<AnalysisSessionPayload>();
    setPayload(stored);
    setCoverLetter(stored?.coverLetter || "");
  }, []);

  const closeSignInPrompt = useCallback(() => setShowSignInPrompt(false), []);

  // ESC closes the sign-in prompt
  useEffect(() => {
    if (!showSignInPrompt) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSignInPrompt();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [showSignInPrompt, closeSignInPrompt]);

  const cleanTitleForUi = (raw: string) => raw.replace(/[*_`~]/g, "").replace(/\s+/g, " ").trim();

  if (!payload) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex flex-col">
        <ShellNav active="optimizer" />
        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="max-w-lg w-full">
            <div className="bg-white rounded-sm shadow-card border border-stone-100 p-8 sm:p-10 text-center reveal-up">
              <div className="w-14 h-14 mx-auto mb-5 rounded-full bg-[#0A2647]/5 flex items-center justify-center">
                <ArrowLeft className="w-6 h-6 text-[#0A2647]" strokeWidth={1.5} />
              </div>
              <h1 className="font-serif text-2xl text-[#1a1a1a] mb-3">No analysis yet</h1>
              <p className="text-stone-500 font-light mb-8">
                Run an analysis first to see your tailored results, suggested
                changes, and downloadable resume.
              </p>
              <button
                onClick={() => router.push("/optimize")}
                className="inline-flex items-center gap-3 px-8 py-3.5 bg-[#0A2647] hover:bg-[#0d3259] text-white font-medium rounded-sm transition-colors tracking-wide focus-visible:outline-none"
              >
                Start an Analysis
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col overflow-hidden">
      <ShellNav
        active="optimizer"
        rightSlot={
          <button
            onClick={() => {
              clearAnalysisSession();
              router.push("/optimize");
            }}
            className="hidden sm:inline-flex px-4 py-2 text-sm font-medium text-[#0A2647] hover:text-white hover:bg-[#0A2647] border border-[#0A2647]/30 hover:border-[#0A2647] rounded-sm transition-colors tracking-wide focus-visible:outline-none"
          >
            New Analysis
          </button>
        }
      />

      {/* Main Content */}
      <main className="flex-1 w-full px-8 lg:px-16 py-10 relative z-10">
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
          // ENHANCE FEATURE TEMPORARILY HIDDEN
          onEnhanceWithDeepDive={undefined}
          /* onEnhanceWithDeepDive={async (answers) => {
            setIsEnhancing(true);
            try {
              const formData = new FormData();
              
              const optimizedCV = (payload.analysis as { optimizedCV?: string })?.optimizedCV;
              if (optimizedCV) {
                formData.append("cvText", optimizedCV);
              } else if (payload.meta.cvTextUsed) {
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
              
              console.log("=== SENDING ENHANCE REQUEST ===");
              console.log("Deep dive answers:", JSON.stringify(answers, null, 2));
              formData.append("deepDiveAnswers", JSON.stringify(answers));

              const response = await fetch("/api/analyze", { method: "POST", body: formData });
              const data = await response.json();
              
              console.log("=== ENHANCE RESPONSE ===");
              console.log("Suggested changes count:", data.analysis?.suggestedChanges?.length || 0);
              console.log("Suggested changes:", JSON.stringify(data.analysis?.suggestedChanges?.slice(0, 3), null, 2));
              
              if (!response.ok) throw new Error(data.error || "Enhancement failed");

              const newPayload: AnalysisSessionPayload = {
                ...payload,
                analysis: data.analysis,
                meta: data.meta,
              };
              setPayload(newPayload);
              saveAnalysisToSession(newPayload);

            } catch (err) {
              alert(err instanceof Error ? err.message : "Enhancement failed");
            } finally {
              setIsEnhancing(false);
            }
          }} */
        />
      </main>

      <footer className="w-full border-t border-stone-200/60 py-5 bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-8 lg:px-16 text-center text-stone-500 text-xs font-light tracking-wide">
          Powered by AI • Your data is secure and never stored
        </div>
      </footer>

      {/* Sign In Prompt Modal */}
      {showSignInPrompt && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 backdrop-blur-sm p-4 animate-fade-in"
          onClick={closeSignInPrompt}
          role="dialog"
          aria-modal="true"
          aria-labelledby="signin-prompt-title"
        >
          <div
            className="relative bg-white rounded-sm shadow-modal border border-stone-200/80 p-8 sm:p-10 max-w-md w-full text-center reveal-up"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeSignInPrompt}
              aria-label="Close"
              className="absolute top-4 right-4 p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-full transition-colors focus-visible:outline-none"
            >
              <X className="w-5 h-5" strokeWidth={1.5} />
            </button>
            <div className="mb-6">
              <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-[#0A2647]/10 flex items-center justify-center">
                <Download className="w-7 h-7 text-[#0A2647]" strokeWidth={1.5} />
              </div>
              <h3 id="signin-prompt-title" className="font-serif text-2xl text-[#1a1a1a] mb-3">
                Sign in to Download
              </h3>
              <p className="text-stone-500 font-light">
                Create a free account to download your cover letter as a PDF.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <SignInButton mode="modal">
                <button className="w-full px-6 py-3.5 bg-[#0A2647] hover:bg-[#0d3259] text-white font-medium rounded-sm transition-colors tracking-wide focus-visible:outline-none">
                  Sign In
                </button>
              </SignInButton>
              <button
                onClick={closeSignInPrompt}
                className="w-full px-6 py-3.5 text-stone-600 hover:text-stone-900 hover:bg-stone-50 font-medium rounded-sm transition-colors focus-visible:outline-none"
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
