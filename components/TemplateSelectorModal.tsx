"use client";

import React, { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { X, Download } from "lucide-react";
import {
  HarvardTemplate,
  ModernTemplate,
  CreativeTemplate,
  TemplateType,
  TEMPLATE_INFO,
} from "./cv-templates";

interface TemplateSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  cvData: string; // The optimized CV text
  fileName?: string;
}

// Template components map
const TEMPLATE_COMPONENTS: Record<TemplateType, React.ComponentType<{ data: string }>> = {
  harvard: HarvardTemplate,
  modern: ModernTemplate,
  creative: CreativeTemplate,
};

// Individual template card with its own print ref
function TemplateCard({
  templateId,
  cvData,
  fileName,
}: {
  templateId: TemplateType;
  cvData: string;
  fileName: string;
}) {
  const printRef = useRef<HTMLDivElement>(null);
  const info = TEMPLATE_INFO[templateId];
  const Component = TEMPLATE_COMPONENTS[templateId];

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
          height: 297mm;
          width: 210mm;
          margin: 0;
          padding: 0;
        }
      }
    `,
  });

  return (
    <div className="flex flex-col bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
      {/* Template Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white/5 border-b border-white/10">
        <div>
          <h3 className="font-semibold text-white">{info.name}</h3>
          <p className="text-xs text-white/60">{info.description}</p>
        </div>
        <button
          onClick={() => handlePrint()}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-lg transition-colors"
        >
          <Download className="w-4 h-4" />
          Download PDF
        </button>
      </div>

      {/* Template Preview - Scaled down to fit */}
      <div className="p-4 bg-gray-800 overflow-auto">
        <div className="mx-auto shadow-2xl" style={{ width: "fit-content" }}>
          {/* Scaled preview container */}
          <div
            className="origin-top-left bg-white"
            style={{
              transform: "scale(0.35)",
              transformOrigin: "top left",
              width: "210mm",
              height: "297mm",
            }}
          >
            <div ref={printRef}>
              <Component data={cvData} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TemplateSelectorModal({
  isOpen,
  onClose,
  cvData,
  fileName = "Optimized-CV",
}: TemplateSelectorModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative z-10 w-full max-w-7xl max-h-[95vh] mx-4 bg-gray-900 border border-white/20 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white">Choose Your Template</h2>
            <p className="text-sm text-white/60">
              Preview your CV in different styles and download as PDF
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Template Previews Grid */}
        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {(Object.keys(TEMPLATE_INFO) as TemplateType[]).map((templateId) => (
              <TemplateCard
                key={templateId}
                templateId={templateId}
                cvData={cvData}
                fileName={fileName}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 flex-shrink-0 bg-gray-900/50">
          <p className="text-sm text-white/50">
            All templates are optimized for ATS systems and one-page printing
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white font-medium rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
