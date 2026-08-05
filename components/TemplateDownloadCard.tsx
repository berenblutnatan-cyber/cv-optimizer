"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { Download, Maximize2, X, FileText, FileEdit, Loader2, Lock } from "lucide-react";
import { useAuth, SignInButton } from "@clerk/nextjs";
import { ResumePreview, ResumePreviewData } from "@/components/builder/ResumePreview";
import { BuilderTemplateId, ThemeColor } from "@/context/BuilderContext";
import { ALL_TEMPLATES, AllTemplateId } from "@/components/cv-templates";
import { DEFAULT_FREE_TEMPLATE_ID } from "@/lib/templates/registry";
import { useTemplateGating, TemplateOption } from "@/components/builder/TemplateSwitcher";
import { TemplateUnlockModal } from "@/components/TemplateUnlockModal";
import { OutOfCreditsModal } from "@/components/OutOfCreditsModal";
import { formatName, formatJobTitle } from "@/utils/formatting";
import { exportToPdf } from "@/utils/exportToPdf";
import { exportToWord } from "@/utils/exportToWord";
import { Watermark } from "@/components/Watermark";
import Link from "next/link";
import { FreeCreditToast } from "@/components/FreeCreditToast";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/LanguageProvider";

interface TemplateDownloadCardProps {
  templateId: AllTemplateId;
  data: ResumePreviewData;
  fileName?: string;
  themeColor?: ThemeColor;
}

// Map AllTemplateId to BuilderTemplateId
const templateIdMap: Record<AllTemplateId, BuilderTemplateId> = {
  "modern-sidebar": "modern-sidebar",
  "ivy-league": "ivy-league",
  "minimalist": "minimalist",
  "executive": "executive",
  "techie": "techie",
  "creative": "creative",
  "startup": "startup",
  "international": "international",
  "aurora": "aurora",
  "banner": "banner",
  "spotlight": "spotlight",
  "ledger": "ledger",
  "devfolio": "devfolio",
  "canvas": "canvas",
  "timeline": "timeline",
  "double-column": "double-column",
  "compact": "compact",
  "photo-left": "photo-left",
};

export function TemplateDownloadCard({
  templateId,
  data,
  fileName = "My-CV",
  themeColor = "indigo",
}: TemplateDownloadCardProps) {
  const { t } = useT();
  const printRef = useRef<HTMLDivElement>(null);
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [showSignInPrompt, setShowSignInPrompt] = useState(false);
  const [showNoCreditsModal, setShowNoCreditsModal] = useState(false);
  const [showFreeCreditToast, setShowFreeCreditToast] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadType, setDownloadType] = useState<"pdf" | "word" | null>(null);
  const [showWatermark, setShowWatermark] = useState(true);
  const { isSignedIn } = useAuth();
  const info = ALL_TEMPLATES[templateId];
  const builderTemplateId = templateIdMap[templateId];

  // Premium gate — the SAME shared unlock/charge flow as the builder's
  // template switchers. A locked premium template must be unlocked (1 credit)
  // before it can be downloaded; the pending download resumes after unlock.
  const pendingDownloadRef = useRef<(() => void) | null>(null);
  const gating = useTemplateGating(() => {
    const run = pendingDownloadRef.current;
    pendingDownloadRef.current = null;
    run?.();
  }, DEFAULT_FREE_TEMPLATE_ID);
  const templateOption: TemplateOption = {
    id: builderTemplateId,
    name: info.name,
    description: info.description,
    preview: info.preview,
    category: info.category,
  };
  const locked = gating.isLocked(builderTemplateId);

  /** Run `download` directly for free/unlocked templates; otherwise open the
   *  shared unlock modal first and resume the download after the unlock. */
  const gatekeep = (download: () => void) => {
    if (!gating.isLocked(builderTemplateId)) {
      download();
      return;
    }
    pendingDownloadRef.current = download;
    gating.handleSelect(templateOption);
  };

  // Format the data with proper capitalization
  const formattedData: ResumePreviewData = {
    ...data,
    name: formatName(data.name),
    title: data.title ? formatJobTitle(data.title) : undefined,
  };

  // Close on Escape key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") {
      setShowFullPreview(false);
    }
  }, []);

  useEffect(() => {
    if (showFullPreview) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [showFullPreview, handleKeyDown]);

  // Charge-safety: the export runs BEFORE any credit is charged, so a failed
  // export can never burn a credit (there is no client refund path). Order:
  //   1. cheap read-only balance check (no charge) — out of credits? stop.
  //   2. run the export; if it throws, nothing was charged.
  //   3. only after the file was produced, charge the credit.
  // The tiny race (balance spent elsewhere between check and charge) at worst
  // gives the user one uncharged file — strictly better than charging for a
  // download that never happened.
  const hasCreditAvailable = async (): Promise<boolean> => {
    try {
      const res = await fetch("/api/get-credits");
      const info = await res.json();
      return info?.unlimited === true || (info?.credits ?? 0) >= 1;
    } catch {
      // Balance check unreachable — let the charge step be the arbiter.
      return true;
    }
  };

  const chargeCredit = async (): Promise<boolean> => {
    const creditResponse = await fetch("/api/use-credit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const creditResult = await creditResponse.json();
    return creditResult?.success === true;
  };

  // PDF download (vector print pipeline, raster fallback in exportToPdf)
  const runPdfDownload = async () => {
    if (!printRef.current) return;

    setIsDownloading(true);
    setDownloadType("pdf");

    try {
      // 1. Read-only balance check — nothing charged, nothing exported yet.
      if (!(await hasCreditAvailable())) {
        setShowNoCreditsModal(true);
        return;
      }

      // 2. Produce the file first. Hide watermark temporarily.
      setShowWatermark(false);

      // Small delay to ensure watermark is hidden
      await new Promise(resolve => setTimeout(resolve, 100));

      // Generate PDF
      await exportToPdf(printRef.current, `${fileName}-${info.name}`);

      // Restore watermark after download
      setShowWatermark(true);

      // 3. The export succeeded — now charge the credit.
      if (!(await chargeCredit())) {
        setShowNoCreditsModal(true);
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
      setShowWatermark(true); // Restore watermark on error
    } finally {
      setIsDownloading(false);
      setDownloadType(null);
    }
  };

  // Word document download
  const runWordDownload = async () => {
    setIsDownloading(true);
    setDownloadType("word");

    try {
      // 1. Read-only balance check — nothing charged, nothing exported yet.
      if (!(await hasCreditAvailable())) {
        setShowNoCreditsModal(true);
        return;
      }

      // 2. Produce the file first. Hide watermark temporarily.
      setShowWatermark(false);

      // Small delay to ensure watermark is hidden
      await new Promise(resolve => setTimeout(resolve, 100));

      // Generate Word document
      await exportToWord(formattedData, `${fileName}-${info.name}`);

      // Restore watermark after download
      setShowWatermark(true);

      // 3. The export succeeded — now charge the credit.
      if (!(await chargeCredit())) {
        setShowNoCreditsModal(true);
        return;
      }

      toast.success(t("Success!"), {
        description: t("Your CV has been downloaded."),
      });
    } catch (error) {
      console.error("Word export failed:", error);
      toast.error(t("Word export failed"), {
        description: t("Please try again — no credit was charged."),
      });
      setShowWatermark(true); // Restore watermark on error
    } finally {
      setIsDownloading(false);
      setDownloadType(null);
    }
  };

  // Public handlers: sign-in first, then the premium unlock gate, then the
  // actual download (which itself charges the 1-credit download cost).
  const requireSignIn = (): boolean => {
    if (isSignedIn) return true;
    // Show free credit toast before sign-in prompt
    setShowFreeCreditToast(true);
    setTimeout(() => {
      setShowSignInPrompt(true);
    }, 500); // Small delay to show toast first
    return false;
  };

  const handleDownloadPdf = () => {
    if (!requireSignIn()) return;
    gatekeep(() => void runPdfDownload());
  };

  const handleDownloadWord = () => {
    if (!requireSignIn()) return;
    gatekeep(() => void runWordDownload());
  };

  const closePreview = () => setShowFullPreview(false);

  return (
    <>
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-indigo-300 hover:shadow-md transition-all">
        {/* Header */}
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-slate-900 text-sm">{info.name}</h3>
            {/* Locked-premium state, surfaced BEFORE any download attempt */}
            {locked && (
              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] text-brand-gold font-semibold bg-brand-gold/10 px-1.5 py-0.5 rounded-sm shrink-0">
                <Lock className="w-3 h-3" strokeWidth={2.5} />
                {t("1 cr")}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 line-clamp-2">{info.description}</p>
        </div>

        {/* Mini Preview with gradient background */}
        <div
          className="relative p-3 cursor-pointer group"
          style={{ background: info.preview }}
          onClick={() => setShowFullPreview(true)}
        >
          <div className="mx-auto overflow-hidden rounded shadow-lg bg-white" style={{ width: "100%", height: "180px" }}>
            <div
              className="origin-top-left"
              style={{
                transform: "scale(0.22)",
                transformOrigin: "top left",
                width: "210mm",
                height: "297mm",
              }}
            >
              <ResumePreview 
                data={formattedData} 
                templateId={builderTemplateId} 
                themeColor={themeColor} 
              />
            </div>
          </div>
          
          {/* Hover overlay */}
          <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <span className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg text-slate-800 text-sm font-medium shadow-md">
              <Maximize2 className="w-4 h-4" />
              {t("Preview")}
            </span>
          </div>
        </div>

        {/* Download Buttons — cost shown up front, never only at failure */}
        <div className="p-3 border-t border-slate-100 flex gap-2">
          <button
            onClick={handleDownloadPdf}
            disabled={isDownloading}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 min-h-[44px] bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium rounded-xl transition-colors shadow-sm text-sm"
          >
            {isDownloading && downloadType === "pdf" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
            PDF · {t("1 cr")}
          </button>
          <button
            onClick={handleDownloadWord}
            disabled={isDownloading}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 min-h-[44px] border border-blue-500 text-blue-600 hover:bg-blue-50 disabled:border-blue-300 disabled:text-blue-300 font-medium rounded-xl transition-colors text-sm"
          >
            {isDownloading && downloadType === "word" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileEdit className="w-4 h-4" />
            )}
            Word · {t("1 cr")}
          </button>
        </div>

        {/* Hidden content for PDF capture */}
        <div className="absolute left-[-9999px] top-0">
          <div ref={printRef} style={{ width: "210mm", minHeight: "297mm", background: "#fff" }}>
            <ResumePreview 
              data={formattedData} 
              templateId={builderTemplateId} 
              themeColor={themeColor} 
            />
          </div>
        </div>
      </div>

      {/* Full Preview Modal */}
      {showFullPreview && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={closePreview}
        >
          {/* Floating Close Button */}
          <button
            onClick={closePreview}
            className="absolute top-4 right-4 z-50 flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-medium rounded-lg transition-colors shadow-lg"
          >
            <X className="w-5 h-5" />
            {t("Close")}
          </button>

          <div 
            className="relative bg-white rounded-2xl shadow-2xl max-w-4xl max-h-[95vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{info.name}</h3>
                <p className="text-sm text-slate-500">{t("Press ESC or click outside to close")}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadPdf}
                  disabled={isDownloading}
                  className="flex items-center gap-2 px-4 py-2 min-h-[44px] bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium rounded-lg transition-colors"
                >
                  {isDownloading && downloadType === "pdf" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileText className="w-4 h-4" />
                  )}
                  PDF · {t("1 cr")}
                </button>
                <button
                  onClick={handleDownloadWord}
                  disabled={isDownloading}
                  className="flex items-center gap-2 px-4 py-2 min-h-[44px] border border-blue-500 text-blue-600 hover:bg-blue-50 disabled:border-blue-300 disabled:text-blue-300 font-medium rounded-lg transition-colors"
                >
                  {isDownloading && downloadType === "word" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileEdit className="w-4 h-4" />
                  )}
                  Word · {t("1 cr")}
                </button>
              </div>
            </div>

            {/* Preview Content */}
            <div className="flex-1 overflow-auto p-6 bg-slate-100 flex justify-center relative">
              <div className="shadow-2xl relative z-10">
                {showWatermark && <Watermark />}
                <ResumePreview 
                  data={formattedData} 
                  templateId={builderTemplateId} 
                  themeColor={themeColor} 
                />
              </div>
            </div>
          </div>
        </div>
      )}

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
              <h3 className="text-xl font-bold text-slate-900 mb-2">{t("Sign in to Download")}</h3>
              <p className="text-slate-600">
                {t("Create a free account to download your CV in PDF or Word format.")}
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <SignInButton mode="modal">
                <button className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors">
                  {t("Sign In")}
                </button>
              </SignInButton>
              <button
                onClick={() => setShowSignInPrompt(false)}
                className="w-full px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-colors"
              >
                {t("Maybe Later")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* No Credits Modal */}
      {showNoCreditsModal && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setShowNoCreditsModal(false)}
        >
          <div 
            className="relative bg-white border border-slate-200 rounded-2xl shadow-2xl p-8 max-w-md text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowNoCreditsModal(false)}
              className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
            <div className="mb-4">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100 flex items-center justify-center">
                <FileText className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">{t("Out of Credits")}</h3>
              <p className="text-slate-600 mb-4">
                {t("You need credits to download your CV. Credit packs start at just $3.")}
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Link
                href="/pricing"
                onClick={() => setShowNoCreditsModal(false)}
                className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors text-center"
              >
                {t("View Pricing")}
              </Link>
              <button
                onClick={() => setShowNoCreditsModal(false)}
                className="w-full px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-colors"
              >
                {t("Maybe Later")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Premium unlock confirmation (shared gate) */}
      <TemplateUnlockModal
        open={!!gating.pendingTemplate}
        templateName={gating.pendingTemplate?.name ?? ""}
        templateDescription={gating.pendingTemplate?.description}
        templatePreview={gating.pendingTemplate?.preview}
        loading={gating.unlockLoading}
        onConfirm={gating.confirmUnlock}
        onClose={gating.cancelUnlock}
      />

      {/* Paywall fallback when the unlock attempt finds zero credits */}
      <OutOfCreditsModal
        open={gating.oocModal.isOpen}
        onClose={gating.oocModal.close}
        trigger={gating.oocModal.trigger}
        title={gating.oocModal.title}
        subtitle={gating.oocModal.subtitle}
      />

      {/* Free Credit Toast */}
      <FreeCreditToast
        isOpen={showFreeCreditToast}
        onClose={() => setShowFreeCreditToast(false)}
      />
    </>
  );
}

export default TemplateDownloadCard;
