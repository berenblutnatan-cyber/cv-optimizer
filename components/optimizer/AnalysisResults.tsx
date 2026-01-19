"use client";

import React, { useRef, useState } from "react";
import { SmartResumePreview } from "@/components/shared/SmartResumePreview";
import { TemplateGallery } from "@/components/shared/TemplateGallery";
import { ResumePreview } from "@/components/builder/ResumePreview";
import { 
  Download, 
  CheckCircle, 
  FileText, 
  FileEdit, 
  ChevronDown,
  Loader2
} from "lucide-react";
import { ResumePreviewData } from "@/components/builder/ResumePreview";
import { BuilderTemplateId, ThemeColor } from "@/context/BuilderContext";
import { exportToWord } from "@/utils/exportToWord";
import { exportToPdf } from "@/utils/exportToPdf";

interface AnalysisResultsProps {
  optimizedData: ResumePreviewData;
  score?: number;
  improvements?: string[];
}

export default function AnalysisResults({ optimizedData, score, improvements }: AnalysisResultsProps) {
  // State for the preview
  const [selectedTemplate, setSelectedTemplate] = useState<BuilderTemplateId>("modern-sidebar");
  const [selectedColor, setSelectedColor] = useState<ThemeColor>("indigo");
  
  // Download state
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadType, setDownloadType] = useState<"pdf" | "word" | null>(null);
  
  // Ref for the PDF capture - points to ONLY the CV content (no toolbar)
  const pdfCaptureRef = useRef<HTMLDivElement>(null);

  // Handle PDF download
  const handleDownloadPdf = async () => {
    if (!pdfCaptureRef.current) return;
    
    setIsDownloading(true);
    setDownloadType("pdf");
    
    try {
      await exportToPdf(pdfCaptureRef.current, `Resume_${optimizedData.name || "Optimized"}`);
    } catch (error) {
      console.error("PDF export failed:", error);
      alert("PDF export failed. Please try again.");
    } finally {
      setIsDownloading(false);
      setDownloadType(null);
    }
  };

  // Handle Word download
  const handleDownloadWord = async () => {
    setIsDownloading(true);
    setDownloadType("word");
    
    try {
      await exportToWord(optimizedData, `Resume_${optimizedData.name || "Optimized"}`);
    } catch (error) {
      console.error("Word export failed:", error);
      alert("Word export failed. Please try again.");
    } finally {
      setIsDownloading(false);
      setDownloadType(null);
    }
  };

  if (!optimizedData) {
    return (
      <div className="p-8 text-center text-slate-500">
        Loading result...
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Hidden PDF Capture Element - ONLY the CV, no toolbar */}
      <div className="absolute left-[-9999px] top-0 pointer-events-none">
        <div 
          ref={pdfCaptureRef} 
          style={{ 
            width: "210mm", 
            minHeight: "297mm", 
            background: "#ffffff",
            padding: 0,
            margin: 0,
          }}
        >
          <ResumePreview
            data={optimizedData}
            templateId={selectedTemplate}
            themeColor={selectedColor}
          />
        </div>
      </div>
      
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Your Optimized Resume</h2>
          <p className="text-slate-500 text-sm mt-1">
            Review the layout, select a template, and download.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Score Display */}
          <div className="text-right mr-2 hidden md:block">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Match Score</span>
            <div className="text-2xl font-black text-indigo-600">{score || 85}%</div>
          </div>
          
          {/* Download Buttons */}
          <div className="flex items-center gap-2">
            {/* PDF Button - Primary Indigo */}
            <button 
              onClick={handleDownloadPdf}
              disabled={isDownloading}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold rounded-xl shadow-lg hover:shadow-indigo-200 transition-all"
            >
              {isDownloading && downloadType === "pdf" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
              Download PDF
            </button>
            
            {/* Word Button - Outline Style */}
            <button 
              onClick={handleDownloadWord}
              disabled={isDownloading}
              className="flex items-center gap-2 px-5 py-2.5 border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 disabled:border-indigo-300 disabled:text-indigo-300 font-semibold rounded-xl transition-all"
            >
              {isDownloading && downloadType === "word" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileEdit className="w-4 h-4" />
              )}
              Download Word
            </button>
          </div>
        </div>
      </div>

      {/* Template Gallery */}
      <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
        <TemplateGallery 
          selectedId={selectedTemplate} 
          onSelect={setSelectedTemplate} 
        />
      </div>

      {/* Main Preview Area */}
      <div className="grid lg:grid-cols-1 gap-8">
        
        {/* Preview Container */}
        <div className="border rounded-2xl overflow-hidden bg-slate-100/50 shadow-inner p-4 md:p-8 min-h-[800px] relative">
          
          {/* Helper Text */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur text-xs px-3 py-1 rounded-full border shadow-sm z-10 text-slate-500 pointer-events-none">
            Use Font & Spacing sliders to fit content to 1 page
          </div>

          {/* Live Preview with Toolbar (NOT captured for PDF) */}
          <div className="bg-white mx-auto">
            <SmartResumePreview
              data={optimizedData}
              templateId={selectedTemplate}
              themeColor={selectedColor}
              showToolbar={true}
              hideTemplateSelector={true}
              onColorChange={setSelectedColor}
              onTemplateChange={setSelectedTemplate}
            />
          </div>
        </div>
      </div>

      {/* Footer Improvements */}
      {improvements && improvements.length > 0 && (
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
            Key Improvements Applied
          </h3>
          <ul className="grid md:grid-cols-2 gap-3">
            {improvements.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-1.5 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Download Format Info */}
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-4 rounded-xl border border-indigo-100">
        <div className="flex items-start gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="font-medium text-slate-900 text-sm">PDF Format</p>
              <p className="text-xs text-slate-500">Best for sharing & ATS systems</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <FileEdit className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-slate-900 text-sm">Word Format</p>
              <p className="text-xs text-slate-500">Easy to edit & customize</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
