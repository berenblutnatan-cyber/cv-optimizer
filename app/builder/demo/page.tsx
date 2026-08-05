"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  BuilderProvider,
  FloatingAIAssistant,
  TemplateSwitcher,
  EditableResumePreview,
  ResumePreview,
  ResumePreviewData,
  useBuilder,
} from "@/components/builder";
import { Eye, Edit3, Download, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useAuth, SignInButton } from "@clerk/nextjs";
import { toast } from "sonner";
import { exportToPdf } from "@/utils/exportToPdf";
import { OutOfCreditsModal, useOutOfCreditsModal } from "@/components/OutOfCreditsModal";
import { useResumeStore } from "@/store/useResumeStore";
import { convertToPreviewData } from "@/lib/resumeDataConverter";
import { useT } from "@/lib/i18n/LanguageProvider";

/**
 * Builder Demo Page
 * 
 * Demonstrates the Live Interactive Editor (WYSIWYG) for resume building.
 * Users can click on any text in the preview to edit it directly.
 * 
 * Now syncs with the main Builder form data!
 */

// Fallback sample data - used only if no data exists in store
const FALLBACK_DATA: ResumePreviewData = {
  name: "Your Full Name",
  title: "Professional Title",
  contact: {
    email: "email@example.com",
    phone: "+1 (555) 123-4567",
    location: "City, State",
    linkedin: "linkedin.com/in/yourname",
  },
  skills: [
    "Add your skills...",
  ],
  languages: [
    "English - Native",
  ],
  summary: "Write a compelling professional summary that highlights your key strengths, experience, and career objectives. This is your elevator pitch to potential employers.",
  sections: [
    {
      id: "experience",
      title: "Experience",
      type: "experience",
      items: [
        {
          id: "exp-1",
          title: "Job Title",
          subtitle: "Company Name",
          date: "Start - Present",
          bullets: [
            "Key achievement or responsibility...",
            "Another accomplishment with measurable results...",
          ],
        },
      ],
    },
    {
      id: "education",
      title: "Education",
      type: "education",
      items: [
        {
          id: "edu-1",
          title: "Degree Name",
          subtitle: "University Name",
          date: "Start - End",
          description: "Relevant coursework or achievements",
        },
      ],
    },
  ],
};

// Inner component that uses the builder context
function BuilderContent() {
  const { t } = useT();
  const { selectedTemplateId, themeColor, isEditMode, setEditMode } = useBuilder();
  const storeData = useResumeStore((state) => state.resumeData);
  
  // Convert store data to preview format, or use fallback if empty
  const initialData = React.useMemo(() => {
    const converted = convertToPreviewData(storeData);
    // Check if we have any meaningful data
    const hasRealData = storeData.personalInfo.name || 
                        storeData.personalInfo.email ||
                        storeData.experience.length > 0 ||
                        storeData.education.length > 0;
    return hasRealData ? converted : FALLBACK_DATA;
  }, [storeData]);
  
  const [resumeData, setResumeData] = useState<ResumePreviewData>(initialData);

  // Sync with store data when it changes
  useEffect(() => {
    const converted = convertToPreviewData(storeData);
    const hasRealData = storeData.personalInfo.name ||
                        storeData.personalInfo.email ||
                        storeData.experience.length > 0 ||
                        storeData.education.length > 0;
    if (hasRealData) {
      setResumeData(converted);
    }
  }, [storeData]);

  // ── Real PDF export (same rules as everywhere else: sign in, have a credit,
  //    export first, charge only after the file was produced). ──────────────
  const { isSignedIn } = useAuth();
  const exportRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const oocModal = useOutOfCreditsModal();

  const handleDownloadPdf = async () => {
    if (!exportRef.current || isDownloading) return;
    setIsDownloading(true);
    try {
      // 1. Read-only balance check — nothing charged, nothing exported yet.
      try {
        const res = await fetch("/api/get-credits");
        const info = await res.json();
        if (!(info?.unlimited === true || (info?.credits ?? 0) >= 1)) {
          oocModal.open({
            trigger: "manual",
            title: t("Download your CV as a PDF"),
            subtitle: t("You're out of credits. Top up to download your CV."),
          });
          return;
        }
      } catch {
        // Balance check unreachable — let the charge step be the arbiter.
      }

      // 2. Produce the file first, so a failed export never burns a credit.
      const safeName = (resumeData.name || "My-CV").trim().replace(/\s+/g, "-");
      await exportToPdf(exportRef.current, safeName);

      // 3. Only after the file exists, charge the credit.
      const creditResponse = await fetch("/api/use-credit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const creditResult = await creditResponse.json();
      if (!creditResult?.success) {
        oocModal.open({
          trigger: "manual",
          title: t("Download your CV as a PDF"),
          subtitle: t("You're out of credits. Top up to download your CV."),
        });
        return;
      }

      toast.success(t("Success!"), {
        description: t("Your CV has been downloaded."),
      });
    } catch (error) {
      console.error("PDF export failed:", error);
      toast.error(t("PDF export failed"), {
        description: t("Please try again — no credit was charged."),
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <>
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            {/* Back Button */}
            <Link
              href="/builder"
              className="flex items-center gap-2 px-3 py-1.5 min-h-[44px] text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">{t("Back")}</span>
            </Link>
            <div className="w-px h-6 bg-slate-200 hidden sm:block" />
            <h1 className="text-lg font-bold text-slate-900 truncate">{t("Resume Builder")}</h1>
            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
              {t("Demo")}
            </span>
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-2">
            {/* Edit/Preview Toggle */}
            <div className="flex items-center bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => setEditMode(true)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isEditMode ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Edit3 className="w-4 h-4" />
                {t("Edit")}
              </button>
              <button
                onClick={() => setEditMode(false)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  !isEditMode ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Eye className="w-4 h-4" />
                {t("Preview")}
              </button>
            </div>

            {/* Download Button — signed-out users get the sign-in modal;
                signed-in users run the real gated export. */}
            {isSignedIn ? (
              <button
                onClick={handleDownloadPdf}
                disabled={isDownloading}
                className="flex items-center gap-2 px-4 py-2 min-h-[44px] bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {isDownloading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {t("Download PDF")}
              </button>
            ) : (
              <SignInButton mode="modal">
                <button className="flex items-center gap-2 px-4 py-2 min-h-[44px] bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">
                  <Download className="w-4 h-4" />
                  {t("Download PDF")}
                </button>
              </SignInButton>
            )}
          </div>
        </div>
      </header>

      {/* Main Content — stacks below lg so the fixed sidebar never crushes
          the preview at phone widths (375px) */}
      <main className="py-6 flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto px-4">
        {/* Template Switcher — full-width card on mobile, sidebar on desktop */}
        <aside className="w-full lg:w-64 flex-shrink-0">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm lg:sticky lg:top-20">
            <TemplateSwitcher variant="sidebar" showColors={true} />
          </div>
        </aside>

        {/* Resume Preview */}
        <div className="flex-1 min-w-0">
          {/* Instructions Banner */}
          {isEditMode && (
            <div className="mb-4 p-4 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center gap-4">
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                <Edit3 className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-semibold text-indigo-900">{t("Live Editor Mode")}</h3>
                <p className="text-sm text-indigo-700">
                  {t("Click any text to edit. Switch templates on the left without losing your work.")}
                </p>
              </div>
            </div>
          )}

          {/* overflow-x-auto: the A4 page is 794px wide — phones pan it
              instead of blowing the page layout apart */}
          <div className="flex justify-start lg:justify-center bg-slate-100 rounded-xl p-3 sm:p-6 min-h-[60vh] lg:min-h-[800px] overflow-x-auto">
            <EditableResumePreview
              data={resumeData}
              onChange={setResumeData}
              templateId={selectedTemplateId}
              themeColor={themeColor}
              readOnly={!isEditMode}
            />
          </div>
        </div>
      </main>

      {/* Floating AI Assistant */}
      <FloatingAIAssistant />

      {/* Off-screen full-size render — rasterized to PDF on Download. */}
      <div aria-hidden className="fixed -left-[10000px] top-0 pointer-events-none">
        <div ref={exportRef} style={{ width: "210mm", minHeight: "297mm", background: "#ffffff" }}>
          <ResumePreview
            data={resumeData}
            templateId={selectedTemplateId}
            themeColor={themeColor}
          />
        </div>
      </div>

      {/* Paywall when the download finds zero credits */}
      <OutOfCreditsModal
        open={oocModal.isOpen}
        onClose={oocModal.close}
        trigger={oocModal.trigger}
        title={oocModal.title}
        subtitle={oocModal.subtitle}
      />
    </>
  );
}

export default function BuilderDemoPage() {
  return (
    <BuilderProvider initialEditMode={true} initialTemplate="modern-sidebar" initialThemeColor="indigo">
      <div className="min-h-screen bg-slate-100">
        <BuilderContent />
      </div>
    </BuilderProvider>
  );
}
