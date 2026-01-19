"use client";

import { cn } from "@/lib/utils";
import { BuilderTemplateId } from "@/context/BuilderContext";
import { Check } from "lucide-react";

interface TemplateGalleryProps {
  selectedId: BuilderTemplateId;
  onSelect: (id: BuilderTemplateId) => void;
  className?: string;
}

// Template configurations with visual styling
const TEMPLATES: { 
  id: BuilderTemplateId; 
  name: string; 
  color: string;
  description: string;
  structure: "sidebar" | "classic" | "modern" | "minimal";
}[] = [
  { id: 'modern-sidebar', name: 'Modern', color: 'bg-gradient-to-br from-indigo-500 to-violet-600', description: 'Clean with sidebar', structure: 'sidebar' },
  { id: 'ivy-league', name: 'Ivy League', color: 'bg-gradient-to-br from-slate-700 to-slate-900', description: 'Classic academic', structure: 'classic' },
  { id: 'minimalist', name: 'Minimalist', color: 'bg-gradient-to-br from-slate-400 to-slate-600', description: 'Simple & clean', structure: 'minimal' },
  { id: 'executive', name: 'Executive', color: 'bg-gradient-to-br from-violet-600 to-purple-800', description: 'Bold leadership', structure: 'modern' },
  { id: 'techie', name: 'Techie', color: 'bg-gradient-to-br from-cyan-500 to-blue-600', description: 'Developer focused', structure: 'sidebar' },
  { id: 'creative', name: 'Creative', color: 'bg-gradient-to-br from-pink-500 to-rose-600', description: 'Stand out design', structure: 'modern' },
  { id: 'startup', name: 'Startup', color: 'bg-gradient-to-br from-orange-500 to-amber-600', description: 'Punchy & modern', structure: 'modern' },
  { id: 'international', name: 'International', color: 'bg-gradient-to-br from-indigo-500 to-blue-700', description: 'Photo compatible', structure: 'sidebar' },
];

// Mini visual representations of template structures
function TemplatePreviewMini({ structure, color }: { structure: string; color: string }) {
  if (structure === 'sidebar') {
    return (
      <div className={cn("w-full h-full rounded-sm overflow-hidden flex", color)}>
        <div className="w-1/3 bg-black/20" />
        <div className="flex-1 p-1.5 flex flex-col gap-1">
          <div className="h-2 w-3/4 bg-white/30 rounded-sm" />
          <div className="h-1 w-full bg-white/20 rounded-sm" />
          <div className="h-1 w-full bg-white/20 rounded-sm" />
          <div className="h-1 w-2/3 bg-white/20 rounded-sm" />
        </div>
      </div>
    );
  }
  
  if (structure === 'classic') {
    return (
      <div className={cn("w-full h-full rounded-sm overflow-hidden flex flex-col", color)}>
        <div className="h-1/4 flex items-center justify-center border-b border-white/20">
          <div className="h-2 w-2/3 bg-white/30 rounded-sm" />
        </div>
        <div className="flex-1 p-1.5 flex flex-col gap-1">
          <div className="h-1 w-full bg-white/20 rounded-sm" />
          <div className="h-1 w-full bg-white/20 rounded-sm" />
          <div className="h-1 w-3/4 bg-white/20 rounded-sm" />
        </div>
      </div>
    );
  }
  
  if (structure === 'minimal') {
    return (
      <div className={cn("w-full h-full rounded-sm overflow-hidden flex flex-col p-2", color)}>
        <div className="h-2 w-1/2 mx-auto bg-white/30 rounded-sm mb-2" />
        <div className="flex-1 flex flex-col gap-1">
          <div className="h-1 w-full bg-white/15 rounded-sm" />
          <div className="h-1 w-full bg-white/15 rounded-sm" />
          <div className="h-1 w-2/3 bg-white/15 rounded-sm" />
        </div>
      </div>
    );
  }
  
  // modern
  return (
    <div className={cn("w-full h-full rounded-sm overflow-hidden flex flex-col", color)}>
      <div className="h-1/3 bg-black/30 p-1.5 flex items-end">
        <div className="h-2 w-2/3 bg-white/40 rounded-sm" />
      </div>
      <div className="flex-1 p-1.5 flex flex-col gap-1">
        <div className="h-1 w-full bg-white/20 rounded-sm" />
        <div className="h-1 w-full bg-white/20 rounded-sm" />
        <div className="h-1 w-1/2 bg-white/20 rounded-sm" />
      </div>
    </div>
  );
}

export function TemplateGallery({ selectedId, onSelect, className }: TemplateGalleryProps) {
  return (
    <div className={cn("w-full", className)}>
      <h3 className="text-sm font-medium text-slate-600 mb-3 flex items-center gap-2">
        <span>Choose Template</span>
        <span className="text-xs text-slate-400 font-normal">({TEMPLATES.length} styles)</span>
      </h3>
      
      {/* Horizontal scrollable gallery */}
      <div className="flex gap-3 overflow-x-auto pb-3 -mx-1 px-1 custom-scrollbar">
        {TEMPLATES.map((template) => {
          const isSelected = selectedId === template.id;
          
          return (
            <button
              key={template.id}
              onClick={() => onSelect(template.id)}
              className={cn(
                "group relative flex flex-col items-center gap-2 min-w-[90px] p-2 rounded-xl border-2 transition-all duration-200",
                "hover:border-indigo-300 hover:shadow-lg hover:-translate-y-0.5",
                isSelected 
                  ? "border-indigo-500 bg-indigo-50 shadow-md" 
                  : "border-slate-200 bg-white shadow-sm hover:bg-slate-50"
              )}
            >
              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center shadow-sm">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
              
              {/* Visual Preview */}
              <div className={cn(
                "w-14 h-20 rounded-md shadow-inner overflow-hidden transition-transform",
                "group-hover:scale-105"
              )}>
                <TemplatePreviewMini structure={template.structure} color={template.color} />
              </div>
              
              {/* Template Name */}
              <div className="text-center">
                <span className={cn(
                  "text-xs font-semibold transition-colors block",
                  isSelected ? "text-indigo-700" : "text-slate-700"
                )}>
                  {template.name}
                </span>
                <span className="text-[10px] text-slate-400 leading-tight block">
                  {template.description}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default TemplateGallery;
