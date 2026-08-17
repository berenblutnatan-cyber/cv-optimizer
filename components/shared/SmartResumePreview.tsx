"use client";

import React, { useState, useEffect, useRef } from "react";
import useMeasure from "react-use-measure";
import { ResumePreview, ResumePreviewData } from "@/components/builder/ResumePreview";
import { BuilderTemplateId, ThemeColor, THEME_COLOR_VALUES } from "@/context/BuilderContext";
import {
  ChevronDown, Check, Palette, Layout, X, Pencil,
  AlertTriangle, Type, ArrowUpDown, Zap, ZoomIn, ZoomOut, Lock
} from "lucide-react";
import { TEMPLATE_LIST } from "@/lib/templates/registry";
import { useTemplateGating, TemplateOption } from "@/components/builder/TemplateSwitcher";
import { TemplateUnlockModal } from "@/components/TemplateUnlockModal";
import { OutOfCreditsModal } from "@/components/OutOfCreditsModal";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/LanguageProvider";
import { densityTokenVars } from "@/lib/builder/density";
import { solveFit, type FitSolution } from "@/lib/builder/autofit";
import { useAutoFit } from "@/hooks/useAutoFit";
import { clearPagination, paginateCvItems } from "@/lib/builder/paginate";

// A4 dimensions at 96 DPI
const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;

// Template options — derived from the canonical registry
// (lib/templates/registry.ts) so this dropdown can never go stale. Full
// TemplateOption shape so selections run through the shared premium gate.
const TEMPLATE_OPTIONS: TemplateOption[] = TEMPLATE_LIST.map((entry) => ({
  id: entry.id,
  name: entry.name,
  description: entry.description,
  preview: entry.preview,
  category: entry.category,
}));

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
  /** Controlled font-size level (1-10). When provided, the slider reflects and
   *  reports it via onFontLevelChange instead of using internal state — lets
   *  the AI builder set density after reading a CV. */
  fontLevel?: number;
  /** Controlled spacing level (1-10). See fontLevel. */
  spacingLevel?: number;
  onFontLevelChange?: (level: number) => void;
  onSpacingLevelChange?: (level: number) => void;
  /** Auto-fit (controlled): when true, the solver keeps the CV to one page by
   *  re-solving font/spacing on every content/template change. Omit to keep
   *  the manual one-shot Auto Fit button (which now runs a real solve too). */
  autoFit?: boolean;
  onAutoFitChange?: (on: boolean) => void;
  /** Receives every solver result. When provided, the PARENT applies the
   *  solved levels (e.g. via the store's history-bypassing applyAutoFit);
   *  otherwise the component applies them itself. */
  onFitSolution?: (solution: FitSolution) => void;
  /** "one" (default): clip at one page + auto-fit. "multi": real page 2+ with
   *  truthful page separators (spacer paginator keeps items off slice lines). */
  pageMode?: "one" | "multi";
  onPageModeChange?: (mode: "one" | "multi") => void;
  /** Opens the parent's trim-content flow (shown when even the tightest
   *  density overflows). */
  onTrimRequest?: () => void;
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
  fontLevel: fontLevelProp,
  spacingLevel: spacingLevelProp,
  onFontLevelChange,
  onSpacingLevelChange,
  autoFit,
  onAutoFitChange,
  onFitSolution,
  pageMode = "one",
  onPageModeChange,
  onTrimRequest,
  onClose,
  onEdit,
  className = "",
  minScale = 0.3,
  maxScale = 1,
}: SmartResumePreviewProps) {
  const { t } = useT();
  // Measure the container
  const [containerRef, bounds] = useMeasure();
  const contentRef = useRef<HTMLDivElement>(null);
  
  // Local state for UI
  const [localTemplateId, setLocalTemplateId] = useState<BuilderTemplateId>(initialTemplateId);
  const [localThemeColor, setLocalThemeColor] = useState<ThemeColor>(initialThemeColor);
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  
  // GRANULAR LAYOUT CONTROLS (1 = Small/Tight, 10 = Large/Spacious).
  // Controllable: when fontLevel/spacingLevel props are passed the parent owns
  // them (so the AI builder can set density after reading a CV); otherwise the
  // component keeps its own state. Mirrors the template/color pattern above.
  const [localFontLevel, setLocalFontLevel] = useState(5);
  const [localSpacingLevel, setLocalSpacingLevel] = useState(5);
  // Small-screen zoom toggle: false = fit page width, true = readable 100%.
  const [zoomedIn, setZoomedIn] = useState(false);
  const fontLevel = fontLevelProp ?? localFontLevel;
  const spacingLevel = spacingLevelProp ?? localSpacingLevel;
  const setFontLevel = (v: number) => {
    setLocalFontLevel(v);
    onFontLevelChange?.(v);
  };
  const setSpacingLevel = (v: number) => {
    setLocalSpacingLevel(v);
    onSpacingLevelChange?.(v);
  };
  const [isOverflowing, setIsOverflowing] = useState(false);

  // Determine active values
  const activeTemplate = onTemplateChange ? initialTemplateId : localTemplateId;
  const activeColor = onColorChange ? initialThemeColor : localThemeColor;

  // Premium gate — the SAME shared unlock/charge flow as TemplateSwitcher and
  // TemplateGalleryModal, so this dropdown can never apply a locked premium
  // template without the 1-credit unlock (incl. the out-of-credits paywall).
  const gating = useTemplateGating((tpl) => applyTemplate(tpl.id), activeTemplate);

  // Sync local state with props
  useEffect(() => {
    setLocalTemplateId(initialTemplateId);
  }, [initialTemplateId]);

  useEffect(() => {
    setLocalThemeColor(initialThemeColor);
  }, [initialThemeColor]);

  // Check overflow whenever controls, template, or data changes
  const [overflowRatio, setOverflowRatio] = useState(1);
  useEffect(() => {
    const checkOverflow = () => {
      const node = contentRef.current;
      if (!node) return;
      // The A4 wrapper clips at exactly one page (fixed height +
      // overflow:hidden), so its own box never grows — measure the wrapper's
      // scrollHeight, which still reports the full (clipped) content height.
      const wrapper = node.querySelector<HTMLElement>(".a4-wrapper");
      const contentHeight = wrapper ? wrapper.scrollHeight : node.scrollHeight;
      setIsOverflowing(contentHeight > A4_HEIGHT_PX + 10); // Small buffer
      setOverflowRatio(contentHeight / A4_HEIGHT_PX);
    };

    // Delay check to allow rendering
    const timer = setTimeout(checkOverflow, 100);
    return () => clearTimeout(timer);
  }, [fontLevel, spacingLevel, activeTemplate, data]);

  // ── Auto-fit ──────────────────────────────────────────────────────────────
  const [lastSolution, setLastSolution] = useState<FitSolution | null>(null);

  // The solve ceiling: the user's levels, but never below "normal" — when
  // content shrinks, the document grows back toward its designed look instead
  // of staying stuck at whatever tight levels a longer draft needed.
  const solveCeiling = () => ({
    fontLevel: Math.max(fontLevel, 5),
    spacingLevel: Math.max(spacingLevel, 5),
  });

  const applySolution = (solution: FitSolution) => {
    setLastSolution(solution);
    if (onFitSolution) {
      onFitSolution(solution);
      return;
    }
    if (solution.fontLevel !== fontLevel) setFontLevel(solution.fontLevel);
    if (solution.spacingLevel !== spacingLevel) setSpacingLevel(solution.spacingLevel);
  };

  // Continuous mode: re-solve on every content/template change while enabled.
  const multiPage = pageMode === "multi";
  useAutoFit({
    containerRef: contentRef,
    contentKey: data,
    templateKey: activeTemplate,
    enabled: autoFit === true && !multiPage,
    getCurrent: solveCeiling,
    onSolve: applySolution,
  });

  // Multi-page: lift the one-page clip, keep items off page boundaries, and
  // draw truthful separators. Preview, print engine, and raster slicer all
  // agree because nothing straddles a 1123px line after the paginate pass.
  const [pageCount, setPageCount] = useState(1);
  useEffect(() => {
    const node = contentRef.current;
    if (!node) return;
    if (!multiPage) {
      clearPagination(node);
      setPageCount(1);
      return;
    }
    const timer = setTimeout(() => {
      setPageCount(paginateCvItems(node));
    }, 150);
    return () => clearTimeout(timer);
  }, [multiPage, data, activeTemplate, fontLevel, spacingLevel]);

  // One-shot (legacy button / turn-on click): run a real solve immediately —
  // largest levels that fit, never a blind jump to the tightest.
  const handleAutoFit = () => {
    const varsEl = contentRef.current;
    if (!varsEl) return;
    const measureEl = varsEl.querySelector<HTMLElement>(".a4-wrapper") ?? varsEl;
    applySolution(solveFit(varsEl, measureEl, solveCeiling()));
    onAutoFitChange?.(true);
  };

  // Font/spacing density styles are shared with the PDF-export render (see
  // lib/builder/density.ts) so the preview and the download stay identical.

  // Apply a template AFTER it cleared the premium gate (gating.handleSelect
  // is the entry point — it opens the unlock modal for locked templates and
  // only calls this once the template is free, unlocked, or just paid for).
  function applyTemplate(newTemplateId: BuilderTemplateId) {
    setLocalTemplateId(newTemplateId);
    setShowTemplateDropdown(false);
    onTemplateChange?.(newTemplateId);
  }

  // Handle color change
  const handleColorChange = (newColor: ThemeColor) => {
    setLocalThemeColor(newColor);
    setShowColorPicker(false);
    onColorChange?.(newColor);
  };

  // Calculate the fit-to-width scale
  const containerWidth = bounds.width;
  const fitScale = containerWidth > 0
    ? Math.max(minScale, Math.min(maxScale, (containerWidth - 32) / A4_WIDTH_PX))
    : 0.5;

  // MOBILE ZOOM: at phone widths the fit scale renders A4 text at ~4px —
  // illegible. Offer a tap-to-toggle between "fit width" and a readable 100%
  // scale with natural pan/scroll. The toggle only appears when the fit scale
  // is small enough to be unreadable, so desktop behavior is unchanged.
  const READABLE_SCALE = 1;
  const ZOOM_AFFORDANCE_THRESHOLD = 0.6;
  const canZoom = fitScale < ZOOM_AFFORDANCE_THRESHOLD;
  const zoomActive = canZoom && zoomedIn;
  const scale = zoomActive ? READABLE_SCALE : fitScale;
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
                      {TEMPLATE_OPTIONS.map((template) => {
                        const locked = gating.isLocked(template.id);
                        return (
                          <button
                            key={template.id}
                            onClick={() => gating.handleSelect(template)}
                            className={`w-full flex items-center justify-between gap-2 px-4 py-2 text-sm hover:bg-slate-50 transition-colors ${
                              activeTemplate === template.id ? "text-indigo-600 bg-indigo-50" : "text-slate-700"
                            }`}
                          >
                            <span className="flex items-center gap-1.5 truncate">
                              {template.name}
                              {locked && (
                                <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] text-brand-gold font-semibold bg-brand-gold/10 px-1.5 py-0.5 rounded-sm shrink-0">
                                  <Lock className="w-3 h-3" strokeWidth={2.5} />
                                  {t("1 cr")}
                                </span>
                              )}
                            </span>
                            {activeTemplate === template.id && !locked && <Check className="w-4 h-4 shrink-0" />}
                          </button>
                        );
                      })}
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
                    <p className="text-xs font-medium text-slate-500 mb-2 px-1">{t("Accent Color")}</p>
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
                          title={t(color.name)}
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
                  <span className="hidden sm:inline">{t("Edit")}</span>
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
              <span className="w-10 text-slate-500 font-medium flex-shrink-0">{t("Font")}</span>
              <input 
                type="range" 
                min="1" 
                max="10" 
                step="1"
                value={fontLevel}
                onChange={(e) => {
                  setFontLevel(Number(e.target.value));
                  onAutoFitChange?.(false); // manual drag = user takes the wheel
                }}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <span className="w-4 text-slate-400 text-center flex-shrink-0">{fontLevel}</span>
            </div>

            {/* Spacing Slider */}
            <div className="flex items-center gap-2 flex-1">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <span className="w-14 text-slate-500 font-medium flex-shrink-0">{t("Spacing")}</span>
              <input 
                type="range" 
                min="1" 
                max="10" 
                step="1"
                value={spacingLevel}
                onChange={(e) => {
                  setSpacingLevel(Number(e.target.value));
                  onAutoFitChange?.(false);
                }}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <span className="w-4 text-slate-400 text-center flex-shrink-0">{spacingLevel}</span>
            </div>
          </div>

        </div>
      )}

      {/* OVERFLOW NOTICE — always on (never gated behind the toolbar): the
          preview clips at one page, so the user must be told page 2 exists
          and will be in their download. Magnitude-aware; the Auto Fit button
          runs a real solve (largest levels that fit), and when even the
          tightest fit overflows the message says so honestly. */}
      {!multiPage && isOverflowing && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between gap-3 shrink-0 z-10 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2 text-amber-800 text-sm font-medium">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>
              {autoFit === true && lastSolution?.atMinimum
                ? t("Over a page even at the tightest fit — trim content, or keep page 2.")
                : t("{percent}% of one page — page 2 is included in your download.", {
                    percent: Math.round(overflowRatio * 100),
                  })}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {autoFit !== true && (
              <button
                onClick={handleAutoFit}
                className="flex items-center gap-1.5 min-h-[44px] px-4 text-sm font-semibold border border-amber-300 text-amber-800 hover:bg-amber-100 bg-white rounded-md transition-colors"
              >
                <Zap className="w-3.5 h-3.5" />
                {t("Auto Fit")}
              </button>
            )}
            {autoFit === true && lastSolution?.atMinimum && onTrimRequest && (
              <button
                onClick={onTrimRequest}
                className="min-h-[44px] px-4 text-sm font-semibold border border-amber-300 text-amber-800 hover:bg-amber-100 bg-white rounded-md transition-colors"
              >
                {t("Trim…")}
              </button>
            )}
            {onPageModeChange && (
              <button
                onClick={() => onPageModeChange("multi")}
                className="min-h-[44px] px-3 text-sm font-medium text-amber-800 hover:bg-amber-100 rounded-md transition-colors"
              >
                {t("Keep page 2")}
              </button>
            )}
          </div>
        </div>
      )}
      {multiPage && onPageModeChange && (
        <div className="bg-stone-50 border-b border-stone-200 px-4 py-2 flex items-center justify-between gap-3 shrink-0 z-10">
          <span className="text-sm font-medium text-stone-600">
            {t("{count} pages", { count: pageCount })}
          </span>
          <button
            onClick={() => onPageModeChange("one")}
            className="flex items-center gap-1.5 min-h-[44px] px-3 text-sm font-semibold text-brand-navy hover:bg-stone-100 rounded-md transition-colors"
          >
            <Zap className="w-3.5 h-3.5" />
            {t("Fit to one page")}
          </button>
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
        <div
          className={cn(
            "h-full overflow-y-auto custom-scrollbar p-4 flex",
            // While zoomed the page is wider than the container: allow
            // horizontal panning and anchor to the start edge so the whole
            // page is reachable. In fit mode keep the original centered look.
            zoomActive ? "overflow-x-auto justify-start" : "overflow-x-hidden justify-center"
          )}
        >

          {/* The Scaled A4 Page (pageCount pages tall in multi mode) */}
          <div
            style={{
              width: `${A4_WIDTH_PX}px`,
              minHeight: `${A4_HEIGHT_PX * pageCount}px`,
              transform: `scale(${scale})`,
              transformOrigin: zoomActive ? "top left" : "top center",
              marginBottom: `-${A4_HEIGHT_PX * pageCount - scaledHeight * pageCount}px`,
              // Reserve real layout width while zoomed so the scroll area pans
              // across the full page (transforms don't affect layout size).
              flexShrink: 0,
            }}
            className={cn(
              "bg-white shadow-xl transition-all duration-200 ease-out relative",
              !multiPage && isOverflowing && "ring-4 ring-amber-400/40"
            )}
          >
            {multiPage ? (
              // Lift the one-page clip so pages 2+ render for real.
              <style>{`.cv-multi .a4-wrapper { height: auto !important; max-height: none !important; overflow: visible !important; }`}</style>
            ) : null}
            {/* Content wrapper for overflow measurement. Density flows through
                the --cv-*-mult tokens every template consumes via scaled()/
                spaced()/leading() — headings, spans, and padding all follow
                the sliders now (the old override CSS only reached p/li/td). */}
            <div
              ref={contentRef}
              className={cn("smart-resume-override", multiPage && "cv-multi")}
              style={densityTokenVars(fontLevel, spacingLevel)}
            >
              <ResumePreview
                data={data}
                templateId={activeTemplate}
                themeColor={activeColor}
              />
            </div>

            {multiPage ? (
              // Truthful page separators — items were pushed off these lines.
              Array.from({ length: Math.max(0, pageCount - 1) }, (_, i) => (
                <div
                  key={i}
                  className="absolute left-0 w-full border-b border-dashed border-stone-300 z-50 pointer-events-none"
                  style={{ top: `${A4_HEIGHT_PX * (i + 1)}px` }}
                >
                  <span className="absolute right-2 -top-5 text-sm text-stone-400 bg-white/80 px-1.5 py-0.5 rounded">
                    {i + 2}
                  </span>
                </div>
              ))
            ) : (
              /* Page Break Marker (Visual Guide) */
              <div
                className="absolute left-0 w-full border-b-2 border-dashed border-red-300/60 z-50 pointer-events-none"
                style={{ top: `${A4_HEIGHT_PX}px` }}
              >
                <span className="absolute right-2 -top-4 text-[10px] text-red-400 bg-white/80 px-1.5 py-0.5 rounded">
                  {t("End of Page 1")}
                </span>
              </div>
            )}
          </div>

        </div>

        {/* Small-screen zoom toggle + zoom-state indicator. Only rendered when
            the fit scale is too small to read (phones / narrow panels), so
            desktop behavior is untouched. */}
        {canZoom && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setZoomedIn((z) => !z);
            }}
            aria-label={zoomActive ? t("Fit page to screen") : t("Zoom in to read")}
            aria-pressed={zoomActive}
            className="absolute bottom-4 end-4 z-30 inline-flex items-center gap-1.5 min-h-[44px] min-w-[44px] px-3.5 rounded-full bg-slate-900/90 text-white shadow-lg backdrop-blur-sm active:scale-95 transition-transform"
          >
            {zoomActive ? <ZoomOut className="w-4 h-4" /> : <ZoomIn className="w-4 h-4" />}
            <span className="text-xs font-semibold tabular-nums">
              {zoomActive ? "100%" : `${Math.round(fitScale * 100)}%`}
            </span>
          </button>
        )}
      </div>

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
    </div>
  );
}

export default SmartResumePreview;
