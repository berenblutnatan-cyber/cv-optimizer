"use client";

import React, { useMemo } from "react";
import { 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  XCircle,
  Minimize2,
  LayoutTemplate,
  FileText
} from "lucide-react";
import { 
  analyzeContentFit, 
  ContentAnalysis, 
  ContentWarning,
  getTemplateLimits,
  TEMPLATE_LIMITS
} from "@/utils/contentLimits";
import { ResumeData } from "@/types/resume";

interface ContentFitAdvisorProps {
  /** Resume data to analyze */
  data: ResumeData;
  /** Current template ID */
  templateId: string;
  /** Callback when user wants to change density */
  onDensityChange?: (density: "compact" | "normal" | "spacious") => void;
  /** Callback when user wants to change template */
  onTemplateChange?: (templateId: string) => void;
  /** Whether to show in compact mode */
  compact?: boolean;
  /** Current density setting */
  currentDensity?: "compact" | "normal" | "spacious";
}

export function ContentFitAdvisor({
  data,
  templateId,
  onDensityChange,
  onTemplateChange,
  compact = false,
  currentDensity = "normal",
}: ContentFitAdvisorProps) {
  // Analyze content fit
  const analysis = useMemo(() => {
    // Convert ResumeData to the format expected by analyzeContentFit
    const analysisData = {
      summary: data.summary,
      sections: data.sections?.map(s => ({
        items: s.items?.map(item => ({
          bullets: item.bullets || [],
        })),
      })),
      skills: data.skills,
      languages: data.languages,
    };
    return analyzeContentFit(analysisData, templateId);
  }, [data, templateId]);

  const limits = getTemplateLimits(templateId);

  // Don't show anything if content fits perfectly
  if (analysis.fits && analysis.warnings.length === 0) {
    if (compact) return null;
    
    return (
      <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg">
        <CheckCircle className="w-4 h-4" />
        <span>Content fits perfectly on one A4 page</span>
      </div>
    );
  }

  // Severity icon mapping
  const getSeverityIcon = (severity: ContentWarning["severity"]) => {
    switch (severity) {
      case "error":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      default:
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  // Compact view - just show a status badge
  if (compact) {
    const statusColor = analysis.fits 
      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
      : analysis.overflowPercent > 50 
        ? "bg-red-100 text-red-700 border-red-200"
        : "bg-amber-100 text-amber-700 border-amber-200";
    
    return (
      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border ${statusColor}`}>
        {analysis.fits ? (
          <CheckCircle className="w-3 h-3" />
        ) : (
          <AlertTriangle className="w-3 h-3" />
        )}
        <span>
          {analysis.fits 
            ? "Fits A4" 
            : `${Math.round(analysis.overflowPercent)}% overflow`
          }
        </span>
      </div>
    );
  }

  // Full view with warnings and suggestions
  return (
    <div className="space-y-4 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-slate-400" />
          <h3 className="font-semibold text-slate-800">A4 Content Fit</h3>
        </div>
        
        {/* Overflow indicator */}
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
          analysis.fits 
            ? "bg-emerald-100 text-emerald-700"
            : analysis.overflowPercent > 50
              ? "bg-red-100 text-red-700"
              : "bg-amber-100 text-amber-700"
        }`}>
          {analysis.fits ? "✓ Fits" : `${Math.round(analysis.overflowPercent)}% overflow`}
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
        <div 
          className={`absolute h-full transition-all duration-300 ${
            analysis.overflowPercent > 50 
              ? "bg-red-500" 
              : analysis.overflowPercent > 25 
                ? "bg-amber-500" 
                : "bg-emerald-500"
          }`}
          style={{ width: `${Math.min(analysis.overflowPercent + 25, 100)}%` }}
        />
        {/* A4 limit marker */}
        <div className="absolute left-[25%] top-0 bottom-0 w-0.5 bg-slate-400" />
      </div>
      <p className="text-xs text-slate-500 -mt-2">
        ← Within A4 | Overflow →
      </p>

      {/* Warnings */}
      {analysis.warnings.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-slate-600">Issues Found:</h4>
          {analysis.warnings.slice(0, 3).map((warning, idx) => (
            <div 
              key={idx}
              className="flex items-start gap-2 text-sm p-2 rounded-lg bg-slate-50"
            >
              {getSeverityIcon(warning.severity)}
              <div>
                <span className="text-slate-700">{warning.message}</span>
                <span className="text-slate-400 ml-2">
                  ({warning.currentValue}/{warning.maxValue})
                </span>
              </div>
            </div>
          ))}
          {analysis.warnings.length > 3 && (
            <p className="text-xs text-slate-500">
              +{analysis.warnings.length - 3} more issues
            </p>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
        {/* Density toggle */}
        {analysis.recommendedDensity !== currentDensity && onDensityChange && (
          <button
            onClick={() => onDensityChange(analysis.recommendedDensity)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
          >
            <Minimize2 className="w-4 h-4" />
            Use {analysis.recommendedDensity} mode
          </button>
        )}
        
        {/* Suggest different template */}
        {!analysis.fits && limits.hasSidebar === false && onTemplateChange && (
          <button
            onClick={() => {
              // Find a template with sidebar
              const sidebarTemplate = Object.values(TEMPLATE_LIMITS).find(t => t.hasSidebar);
              if (sidebarTemplate) {
                onTemplateChange(sidebarTemplate.id);
              }
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <LayoutTemplate className="w-4 h-4" />
            Try sidebar layout
          </button>
        )}
      </div>

      {/* Extended format suggestion */}
      {analysis.overflowPercent > 50 && (
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
          <div className="flex items-start gap-2">
            <Info className="w-5 h-5 text-blue-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-800">
                Consider Extended Format
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Your content may be too extensive for a single A4 page. 
                Consider creating a 2-page resume or removing less relevant entries.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ContentFitAdvisor;
