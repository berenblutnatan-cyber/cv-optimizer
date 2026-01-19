"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { Download, Maximize2, X, FileText, FileEdit, Loader2 } from "lucide-react";
import { useAuth, SignInButton } from "@clerk/nextjs";
import { ResumePreview, ResumePreviewData } from "@/components/builder/ResumePreview";
import { BuilderTemplateId, ThemeColor } from "@/context/BuilderContext";
import { ALL_TEMPLATES, AllTemplateId } from "@/components/cv-templates";
import { formatName, formatJobTitle } from "@/utils/formatting";
import { exportToPdf } from "@/utils/exportToPdf";
import { exportToWord } from "@/utils/exportToWord";

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
};

export function TemplateDownloadCard({
  templateId,
  data,
  fileName = "My-CV",
  themeColor = "indigo",
}: TemplateDownloadCardProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [showSignInPrompt, setShowSignInPrompt] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadType, setDownloadType] = useState<"pdf" | "word" | null>(null);
  const { isSignedIn } = useAuth();
  const info = ALL_TEMPLATES[templateId];
  const builderTemplateId = templateIdMap[templateId];

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

  // Direct PDF download (no print dialog)
  const handleDownloadPdf = async () => {
    if (!isSignedIn) {
      setShowSignInPrompt(true);
      return;
    }
    
    if (!printRef.current) return;
    
    setIsDownloading(true);
    setDownloadType("pdf");
    
    try {
      await exportToPdf(printRef.current, `${fileName}-${info.name}`);
    } catch (error) {
      console.error("PDF export failed:", error);
      alert("PDF export failed. Please try again.");
    } finally {
      setIsDownloading(false);
      setDownloadType(null);
    }
  };

  // Word document download
  const handleDownloadWord = async () => {
    if (!isSignedIn) {
      setShowSignInPrompt(true);
      return;
    }
    
    setIsDownloading(true);
    setDownloadType("word");
    
    try {
      await exportToWord(formattedData, `${fileName}-${info.name}`);
    } catch (error) {
      console.error("Word export failed:", error);
      alert("Word export failed. Please try again.");
    } finally {
      setIsDownloading(false);
      setDownloadType(null);
    }
  };

  const closePreview = () => setShowFullPreview(false);

  return (
    <>
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-indigo-300 hover:shadow-md transition-all">
        {/* Header */}
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900 text-sm">{info.name}</h3>
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
              Preview
            </span>
          </div>
        </div>

        {/* Download Buttons */}
        <div className="p-3 border-t border-slate-100 flex gap-2">
          <button
            onClick={handleDownloadPdf}
            disabled={isDownloading}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium rounded-xl transition-colors shadow-sm text-sm"
          >
            {isDownloading && downloadType === "pdf" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
            PDF
          </button>
          <button
            onClick={handleDownloadWord}
            disabled={isDownloading}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-blue-500 text-blue-600 hover:bg-blue-50 disabled:border-blue-300 disabled:text-blue-300 font-medium rounded-xl transition-colors text-sm"
          >
            {isDownloading && downloadType === "word" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileEdit className="w-4 h-4" />
            )}
            Word
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
            Close
          </button>

          <div 
            className="relative bg-white rounded-2xl shadow-2xl max-w-4xl max-h-[95vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{info.name}</h3>
                <p className="text-sm text-slate-500">Press ESC or click outside to close</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadPdf}
                  disabled={isDownloading}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium rounded-lg transition-colors"
                >
                  {isDownloading && downloadType === "pdf" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileText className="w-4 h-4" />
                  )}
                  PDF
                </button>
                <button
                  onClick={handleDownloadWord}
                  disabled={isDownloading}
                  className="flex items-center gap-2 px-4 py-2 border border-blue-500 text-blue-600 hover:bg-blue-50 disabled:border-blue-300 disabled:text-blue-300 font-medium rounded-lg transition-colors"
                >
                  {isDownloading && downloadType === "word" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileEdit className="w-4 h-4" />
                  )}
                  Word
                </button>
              </div>
            </div>

            {/* Preview Content */}
            <div className="flex-1 overflow-auto p-6 bg-slate-100 flex justify-center">
              <div className="shadow-2xl">
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
              <h3 className="text-xl font-bold text-slate-900 mb-2">Sign in to Download</h3>
              <p className="text-slate-600">
                Create a free account to download your CV in PDF or Word format.
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
    </>
  );
}

export default TemplateDownloadCard;
