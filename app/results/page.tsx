"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, SignInButton } from "@clerk/nextjs";
import { Download, X } from "lucide-react";
import { AnalysisResults } from "@/components/AnalysisResults";
import { AnalysisSessionPayload, clearAnalysisSession, loadAnalysisFromSession, saveAnalysisToSession } from "@/lib/analysisSession";
import { Logo } from "@/components/Logo";

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
      <div className="min-h-screen bg-slate-50">
        <header className="w-full bg-white border-b border-slate-200 px-6 lg:px-12 py-4">
          <div className="flex items-center justify-between">
            <Logo variant="dark" size="md" />
          </div>
        </header>
        <div className="max-w-4xl mx-auto px-4 py-16">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
            <h1 className="text-xl font-bold text-slate-900 mb-2">No analysis found</h1>
            <p className="text-slate-600 mb-6">
              Please run an analysis first. (If you refreshed, the results may have been cleared.)
            </p>
            <button
              onClick={() => router.push("/optimize")}
              className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors"
            >
              Back to Optimizer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="w-full bg-white border-b border-slate-200 px-6 lg:px-12 py-4">
        <div className="flex items-center justify-between">
          <Logo variant="dark" size="md" linkTo="/" />
          <button
            onClick={() => {
              clearAnalysisSession();
              router.push("/optimize");
            }}
            className="px-4 py-2 text-sm font-medium rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
          >
            New Analysis
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full px-6 lg:px-12 py-8">
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
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
                <Download className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Sign in to Download</h3>
              <p className="text-slate-600">
                Create a free account to download your cover letter as a PDF.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <SignInButton mode="modal">
                <button className="w-full px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors">
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


