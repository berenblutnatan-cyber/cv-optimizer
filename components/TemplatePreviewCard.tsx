"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { useReactToPrint } from "react-to-print";
import { Download, Maximize2, X } from "lucide-react";
import { useAuth, SignInButton } from "@clerk/nextjs";
import {
  TemplateType,
  TEMPLATE_INFO,
  TEMPLATE_COMPONENTS,
} from "./cv-templates";

interface TemplatePreviewCardProps {
  templateId: TemplateType;
  cvData: string;
  fileName?: string;
  photo?: string; // Optional photo for templates that support it (e.g., Executive)
}

export function TemplatePreviewCard({
  templateId,
  cvData,
  fileName = "Optimized-CV",
  photo,
}: TemplatePreviewCardProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [showSignInPrompt, setShowSignInPrompt] = useState(false);
  const { isSignedIn } = useAuth();
  const info = TEMPLATE_INFO[templateId];
  const Component = TEMPLATE_COMPONENTS[templateId];

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

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `${fileName}-${info.name}`,
    pageStyle: `
      @page {
        size: A4;
        margin: 0;
      }
      @media print {
        html, body {
          height: auto;
          width: 210mm;
          margin: 0;
          padding: 0;
        }
      }
    `,
  });

  const handleDownloadClick = () => {
    if (!isSignedIn) {
      setShowSignInPrompt(true);
      return;
    }
    handlePrint();
  };

  const closePreview = () => setShowFullPreview(false);

  return (
    <>
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-indigo-300 hover:shadow-md transition-all">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
          <div>
            <h3 className="font-semibold text-slate-900 text-sm">{info.name}</h3>
            <p className="text-xs text-slate-500">{info.description}</p>
          </div>
        </div>

        {/* Mini Preview */}
        <div
          className="relative bg-slate-100 p-3 cursor-pointer group"
          onClick={() => setShowFullPreview(true)}
        >
          <div className="mx-auto overflow-hidden rounded shadow-lg" style={{ width: "100%", height: "200px" }}>
            <div
              className="origin-top-left bg-white"
              style={{
                transform: "scale(0.25)",
                transformOrigin: "top left",
                width: "210mm",
                height: "297mm",
              }}
            >
              <Component data={cvData} photo={templateId === "creative" ? photo : undefined} />
            </div>
          </div>
          
          {/* Hover overlay */}
          <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <span className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg text-slate-800 text-sm font-medium shadow-md">
              <Maximize2 className="w-4 h-4" />
              Click to Preview
            </span>
          </div>
        </div>

        {/* Download Button */}
        <div className="p-3 border-t border-slate-100">
          <button
            onClick={handleDownloadClick}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            Download PDF
          </button>
        </div>

        {/* Hidden print content */}
        <div className="hidden">
          <div ref={printRef}>
            <Component data={cvData} photo={templateId === "creative" ? photo : undefined} />
          </div>
        </div>
      </div>

      {/* Full Preview Modal */}
      {showFullPreview && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={closePreview}
        >
          {/* Floating Close Button - Always visible */}
          <button
            onClick={closePreview}
            className="absolute top-4 right-4 z-50 flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-medium rounded-lg transition-colors shadow-lg"
          >
            <X className="w-5 h-5" />
            Close Preview
          </button>

          <div 
            className="relative bg-white rounded-2xl shadow-2xl max-w-4xl max-h-[95vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{info.name} Template</h3>
                <p className="text-sm text-slate-500">Press ESC or click outside to close</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleDownloadClick}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download PDF
                </button>
                <button
                  onClick={closePreview}
                  className="p-2 bg-slate-100 hover:bg-red-100 hover:text-red-600 rounded-lg transition-colors"
                  title="Close (ESC)"
                >
                  <X className="w-5 h-5 text-slate-600" />
                </button>
              </div>
            </div>

            {/* Preview Content */}
            <div className="flex-1 overflow-auto p-6 bg-slate-100 flex justify-center">
              <div className="shadow-2xl">
                <Component data={cvData} photo={templateId === "creative" ? photo : undefined} />
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
                Create a free account to download your optimized CV as a PDF.
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
