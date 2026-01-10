"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, SignInButton } from "@clerk/nextjs";
import { Download, X } from "lucide-react";
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

  useEffect(() => {
    const stored = loadAnalysisFromSession<AnalysisSessionPayload>();
    setPayload(stored);
    setCoverLetter(stored?.coverLetter || "");
  }, []);

  const cleanTitleForUi = (raw: string) => raw.replace(/[*_`~]/g, "").replace(/\s+/g, " ").trim();

  if (!payload) {
    return (
      <div className="min-h-screen bg-black text-white">
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
    <div className="min-h-screen bg-black text-white flex flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-600/22 via-sky-500/14 to-fuchsia-500/12 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.05),transparent_45%),radial-gradient(circle_at_80%_30%,rgba(99,102,241,0.10),transparent_50%)]" />
      </div>

      <ShellNav
        rightSlot={
          <button
            onClick={() => {
              clearAnalysisSession();
              router.push("/");
            }}
            className="px-3 py-2 text-sm font-medium rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white transition-colors"
          >
            New Analysis
          </button>
        }
      />

      <main className="relative z-10 max-w-6xl mx-auto px-4 py-4 flex-1 min-h-0 w-full">
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
                      if (!res.ok) throw new Error(data?.error || "Cover letter failed");
                      setCoverLetter(data.coverLetter);
                      const nextPayload: AnalysisSessionPayload = { ...payload, coverLetter: data.coverLetter };
                      setPayload(nextPayload);
                      saveAnalysisToSession(nextPayload);
                    } catch (e) {
                      alert(e instanceof Error ? e.message : "Cover letter failed");
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
                }
              : undefined
          }
        />
      </main>

      <footer className="relative z-10 border-t border-white/10 py-3">
        <div className="max-w-6xl mx-auto px-4 text-center text-white/60 text-xs">
          Powered by OpenAI • Your data is not stored
        </div>
      </footer>

      {/* Sign In Prompt Modal */}
      {showSignInPrompt && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setShowSignInPrompt(false)}
        >
          <div 
            className="relative bg-gray-900 border border-white/20 rounded-2xl shadow-2xl p-8 max-w-md text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowSignInPrompt(false)}
              className="absolute top-4 right-4 p-1.5 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-white/60" />
            </button>
            <div className="mb-4">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Download className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Sign in to Download</h3>
              <p className="text-white/60">
                Create a free account to download your cover letter as a PDF.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <SignInButton mode="modal">
                <button className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl transition-colors">
                  Sign In
                </button>
              </SignInButton>
              <button
                onClick={() => setShowSignInPrompt(false)}
                className="w-full px-6 py-3 bg-white/10 hover:bg-white/15 text-white font-medium rounded-xl transition-colors"
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


