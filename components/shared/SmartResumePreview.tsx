"use client";

import React, { useState, useEffect, useRef } from "react";
import useMeasure from "react-use-measure";
import { ResumePreview, ResumePreviewData } from "@/components/builder/ResumePreview";
import { BuilderTemplateId, ThemeColor, THEME_COLOR_VALUES } from "@/context/BuilderContext";
import { 
  ChevronDown, Check, Palette, Layout, X, Pencil,
  AlertTriangle, Type, ArrowUpDown, Zap
} from "lucide-react";
import { cn } from "@/lib/utils";

// A4 dimensions at 96 DPI
const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;

// Template options
const TEMPLATE_OPTIONS: { id: BuilderTemplateId; name: string }[] = [
  { id: "modern-sidebar", name: "Modern Sidebar" },
  { id: "ivy-league", name: "Ivy League" },
  { id: "minimalist", name: "Minimalist" },
  { id: "executive", name: "Executive" },
  { id: "techie", name: "Techie" },
  { id: "creative", name: "Creative" },
  { id: "startup", name: "Startup" },
  { id: "international", name: "International" },
];

// Color options
const COLOR_OPTIONS: { id: ThemeColor; name: string; color: string }[] = [
  { id: "indigo", name: "Indigo", color: THEME_COLOR_VALUES.indigo.primary },
  { id: "blue", name: "Blue", color: THEME_COLOR_VALUES.blue.primary },
  { id: "purple", name: "Purple", color: THEME_COLOR_VALUES.purple.primary },
  { id: "rose", name: "Rose", color: THEME_COLOR_VALUES.rose.primary },
  { id: "amber", name: "Amber", color: THEME_COLOR_VALUES.amber.primary },
  { id: "slate", name: "Slate", color: THEME_COLOR_VALUES.slate.primary },
  { id: "navy", name: "Navy", color: THEME_COLOR_VALUES.navy.primary },
  { id: "violet", name: "Violet", color: THEME_COLOR_VALUES.violet.primary },
  { id: "orange", name: "Orange", color: THEME_COLOR_VALUES.orange.primary },
  { id: "black", name: "Black", color: THEME_COLOR_VALUES.black.primary },
];

interface SmartResumePreviewProps {
  data: ResumePreviewData;
  templateId?: BuilderTemplateId;
  themeColor?: ThemeColor;
  showToolbar?: boolean;
  /** Hide the template dropdown (use external TemplateGallery instead) */
  hideTemplateSelector?: boolean;
  onTemplateChange?: (templateId: BuilderTemplateId) => void;
  onColorChange?: (color: ThemeColor) => void;
  onClose?: () => void;
  onEdit?: () => void;
  className?: string;
  /** Min scale to prevent resume from getting too small */
  minScale?: number;
  /** Max scale to prevent resume from getting too large */
  maxScale?: number;
}

/**
 * SmartResumePreview
 * 
 * A unified resume preview component with granular layout controls:
 * - Font size slider (1-10)
 * - Spacing slider (1-10)
 * - Overflow detection with "Auto Fit" button
 * - Page break visual indicator
 */
export function SmartResumePreview({
  data,
  templateId: initialTemplateId = "modern-sidebar",
  themeColor: initialThemeColor = "indigo",
  showToolbar = false,
  hideTemplateSelector = false,
  onTemplateChange,
  onColorChange,
  onClose,
  onEdit,
  className = "",
  minScale = 0.3,
  maxScale = 1,
}: SmartResumePreviewProps) {
  // Measure the container
  const [containerRef, bounds] = useMeasure();
  const contentRef = useRef<HTMLDivElement>(null);
  
  // Local state for UI
  const [localTemplateId, setLocalTemplateId] = useState<BuilderTemplateId>(initialTemplateId);
  const [localThemeColor, setLocalThemeColor] = useState<ThemeColor>(initialThemeColor);
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  
  // GRANULAR LAYOUT CONTROLS (1 = Small/Tight, 10 = Large/Spacious)
  const [fontLevel, setFontLevel] = useState(5);
  const [spacingLevel, setSpacingLevel] = useState(5);
  const [isOverflowing, setIsOverflowing] = useState(false);

  // Determine active values
  const activeTemplate = onTemplateChange ? initialTemplateId : localTemplateId;
  const activeColor = onColorChange ? initialThemeColor : localThemeColor;

  // Sync local state with props
  useEffect(() => {
    setLocalTemplateId(initialTemplateId);
  }, [initialTemplateId]);

  useEffect(() => {
    setLocalThemeColor(initialThemeColor);
  }, [initialThemeColor]);

  // Check overflow whenever controls, template, or data changes
  useEffect(() => {
    const checkOverflow = () => {
      if (contentRef.current) {
        const currentHeight = contentRef.current.scrollHeight;
        setIsOverflowing(currentHeight > A4_HEIGHT_PX + 10); // Small buffer
      }
    };
    
    // Delay check to allow rendering
    const timer = setTimeout(checkOverflow, 100);
    return () => clearTimeout(timer);
  }, [fontLevel, spacingLevel, activeTemplate, data]);

  // "Auto Fit" - Aggressively reduce font and spacing
  const handleAutoFit = () => {
    setFontLevel(2);
    setSpacingLevel(2);
  };

  // Calculate dynamic styles based on slider levels
  const getDynamicStyles = (): React.CSSProperties => {
    // Font size: Range from 8px (level 1) to 14px (level 10)
    const fontSize = 8 + (fontLevel - 1) * 0.67;
    
    // Line height: Range from 1.1 (level 1) to 1.8 (level 10)
    const lineHeight = 1.1 + (spacingLevel - 1) * 0.078;
    
    // Section gaps: Range from 4px to 24px
    const sectionGap = 4 + (spacingLevel - 1) * 2.2;
    
    // Heading scales
    const h1Size = fontSize * 2.2;
    const h2Size = fontSize * 1.4;
    const h3Size = fontSize * 1.2;

    return {
      fontSize: `${fontSize}px`,
      lineHeight: lineHeight,
      // CSS custom properties for child elements
      '--base-font-size': `${fontSize}px`,
      '--line-height': `${lineHeight}`,
      '--section-gap': `${sectionGap}px`,
      '--item-gap': `${sectionGap * 0.5}px`,
      '--h1-size': `${h1Size}px`,
      '--h2-size': `${h2Size}px`,
      '--h3-size': `${h3Size}px`,
      '--p-margin': `${spacingLevel * 0.5}px`,
      '--li-margin': `${spacingLevel * 0.3}px`,
    } as React.CSSProperties;
  };

  // Generate CSS classes for dynamic styling
  const getDynamicClasses = (): string => {
    // Create Tailwind-like classes based on levels
    const fontClasses = fontLevel <= 3 
      ? '[&_*]:!text-[8pt] [&_h1]:!text-[14pt] [&_h2]:!text-[10pt] [&_h3]:!text-[9pt]'
      : fontLevel <= 6
        ? '[&_*]:!text-[10pt] [&_h1]:!text-[18pt] [&_h2]:!text-[12pt] [&_h3]:!text-[11pt]'
        : '[&_*]:!text-[12pt] [&_h1]:!text-[22pt] [&_h2]:!text-[14pt] [&_h3]:!text-[12pt]';
    
    const spacingClasses = spacingLevel <= 3
      ? '[&_*]:!leading-[1.15] [&_p]:!mb-0.5 [&_li]:!mb-0 [&_section]:!mb-1.5 [&_ul]:!my-0.5'
      : spacingLevel <= 6
        ? '[&_*]:!leading-[1.35] [&_p]:!mb-1 [&_li]:!mb-0.5 [&_section]:!mb-3 [&_ul]:!my-1'
        : '[&_*]:!leading-[1.6] [&_p]:!mb-2 [&_li]:!mb-1.5 [&_section]:!mb-5 [&_ul]:!my-2';
    
    // Additional padding/margin adjustments for very compact mode
    const compactExtras = fontLevel <= 2 && spacingLevel <= 2
      ? '[&_aside]:!py-2 [&_main]:!py-2 [&_header]:!mb-1 [&_[style*="padding"]]:!p-2'
      : '';

    return `${fontClasses} ${spacingClasses} ${compactExtras}`.trim();
  };

  // Handle template change
  const handleTemplateChange = (newTemplateId: BuilderTemplateId) => {
    setLocalTemplateId(newTemplateId);
    setShowTemplateDropdown(false);
    onTemplateChange?.(newTemplateId);
  };

  // Handle color change
  const handleColorChange = (newColor: ThemeColor) => {
    setLocalThemeColor(newColor);
    setShowColorPicker(false);
    onColorChange?.(newColor);
  };

  // Calculate scale
  const containerWidth = bounds.width;
  const scale = containerWidth > 0 
    ? Math.max(minScale, Math.min(maxScale, (containerWidth - 32) / A4_WIDTH_PX))
    : 0.5;
  const scaledHeight = A4_HEIGHT_PX * scale;

  // Get current template name
  const currentTemplateName = TEMPLATE_OPTIONS.find(t => t.id === activeTemplate)?.name || "Modern Sidebar";

  return (
    <div className={cn("flex flex-col h-full bg-slate-50/50 border-l border-slate-200", className)}>
      
      {/* ADVANCED TOOLBAR */}
      {showToolbar && (
        <div className="flex flex-col border-b bg-white shadow-sm shrink-0 z-20">
          
          {/* Top Row: Main Actions */}
          <div className="flex items-center justify-between p-2 px-3">
            <div className="flex items-center gap-2">
              
              {/* Template Selector */}
              {!hideTemplateSelector && (
                <div className="relative">
                  <button
                    onClick={() => {
                      setShowTemplateDropdown(!showTemplateDropdown);
                      setShowColorPicker(false);
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors text-xs font-medium text-slate-700"
                  >
                    <Layout className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline max-w-[100px] truncate">{currentTemplateName}</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showTemplateDropdown ? "rotate-180" : ""}`} />
                  </button>

                  {showTemplateDropdown && (
                    <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 max-h-64 overflow-y-auto">
                      {TEMPLATE_OPTIONS.map((template) => (
                        <button
                          key={template.id}
                          onClick={() => handleTemplateChange(template.id)}
                          className={`w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-slate-50 transition-colors ${
                            activeTemplate === template.id ? "text-indigo-600 bg-indigo-50" : "text-slate-700"
                          }`}
                        >
                          {template.name}
                          {activeTemplate === template.id && <Check className="w-4 h-4" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Color Picker */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowColorPicker(!showColorPicker);
                    setShowTemplateDropdown(false);
                  }}
                  className="relative h-8 w-8 flex items-center justify-center hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <Palette className="w-4 h-4 text-slate-600" />
                  <div 
                    className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white shadow-sm" 
                    style={{ backgroundColor: THEME_COLOR_VALUES[activeColor].primary }} 
                  />
                </button>
                
                {showColorPicker && (
                  <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-200 p-3 z-50">
                    <p className="text-xs font-medium text-slate-500 mb-2 px-1">Accent Color</p>
                    <div className="grid grid-cols-5 gap-2">
                      {COLOR_OPTIONS.map((color) => (
                        <button
                          key={color.id}
                          onClick={() => handleColorChange(color.id)}
                          className={cn(
                            "w-7 h-7 rounded-full transition-all hover:scale-110",
                            activeColor === color.id ? "ring-2 ring-offset-2 ring-slate-400" : ""
                          )}
                          style={{ backgroundColor: color.color }}
                          title={color.name}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-1">
              {onEdit && (
                <button
                  onClick={onEdit}
                  className="flex items-center gap-1.5 h-8 px-3 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Edit</span>
                </button>
              )}
              
              {onClose && (
                <button
                  onClick={onClose}
                  className="h-8 w-8 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Bottom Row: Layout Sliders */}
          <div className="flex items-center gap-6 px-4 py-2.5 bg-slate-50/80 border-t border-slate-100 text-xs">
            
            {/* Font Size Slider */}
            <div className="flex items-center gap-2 flex-1">
              <Type className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <span className="w-10 text-slate-500 font-medium flex-shrink-0">Font</span>
              <input 
                type="range" 
                min="1" 
                max="10" 
                step="1"
                value={fontLevel}
                onChange={(e) => setFontLevel(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <span className="w-4 text-slate-400 text-center flex-shrink-0">{fontLevel}</span>
            </div>

            {/* Spacing Slider */}
            <div className="flex items-center gap-2 flex-1">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <span className="w-14 text-slate-500 font-medium flex-shrink-0">Spacing</span>
              <input 
                type="range" 
                min="1" 
                max="10" 
                step="1"
                value={spacingLevel}
                onChange={(e) => setSpacingLevel(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <span className="w-4 text-slate-400 text-center flex-shrink-0">{spacingLevel}</span>
            </div>
          </div>

          {/* OVERFLOW WARNING BANNER */}
          {isOverflowing && (
            <div className="bg-amber-50 border-t border-amber-200 px-4 py-2 flex items-center justify-between animate-in slide-in-from-top-2 duration-300">
              <div className="flex items-center gap-2 text-amber-700 text-xs font-medium">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>Resume exceeds 1 page! Reduce font or spacing to fit.</span>
              </div>
              <button 
                onClick={handleAutoFit}
                className="flex items-center gap-1.5 h-6 px-3 text-[10px] font-semibold border border-amber-300 text-amber-800 hover:bg-amber-100 bg-white rounded-md transition-colors"
              >
                <Zap className="w-3 h-3" />
                Auto Fit
              </button>
            </div>
          )}
        </div>
      )}

      {/* PREVIEW AREA */}
      <div 
        ref={containerRef} 
        className="flex-1 overflow-hidden relative w-full bg-slate-200/50"
        onClick={() => {
          setShowTemplateDropdown(false);
          setShowColorPicker(false);
        }}
      >
        <div className="h-full overflow-y-auto overflow-x-hidden custom-scrollbar p-4 flex justify-center">
          
          {/* The Scaled A4 Page */}
          <div
            style={{
              width: `${A4_WIDTH_PX}px`,
              minHeight: `${A4_HEIGHT_PX}px`,
              transform: `scale(${scale})`,
              transformOrigin: "top center",
              marginBottom: `-${A4_HEIGHT_PX - scaledHeight}px`,
            }}
            className={cn(
              "bg-white shadow-xl transition-all duration-200 ease-out relative",
              isOverflowing && "ring-4 ring-amber-400/40",
              getDynamicClasses()
            )}
          >
            {/* Content wrapper for overflow measurement */}
            <div ref={contentRef} style={getDynamicStyles()}>
              <ResumePreview
                data={data}
                templateId={activeTemplate}
                themeColor={activeColor}
              />
            </div>

            {/* Page Break Marker (Visual Guide) */}
            <div 
              className="absolute left-0 w-full border-b-2 border-dashed border-red-300/60 z-50 pointer-events-none"
              style={{ top: `${A4_HEIGHT_PX}px` }}
            >
              <span className="absolute right-2 -top-4 text-[9px] text-red-400 bg-white/80 px-1.5 py-0.5 rounded">
                End of Page 1
              </span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default SmartResumePreview;
