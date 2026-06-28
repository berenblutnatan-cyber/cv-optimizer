"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import { useBuilder, BuilderTemplateId, ThemeColor, THEME_COLOR_VALUES } from "@/context/BuilderContext";
import { TEMPLATE_METADATA } from "@/components/cv-templates/ThemeEngine";
import { Layout, Palette, Check, Sparkles, Lock } from "lucide-react";
import {
  ALL_TEMPLATES,
  DEFAULT_FREE_TEMPLATE_ID,
  isPremiumTemplate,
} from "@/components/cv-templates";
import { getUnlockedTemplates, unlockTemplate } from "@/lib/templateUnlocks";
import { TemplateUnlockModal } from "@/components/TemplateUnlockModal";
import { OutOfCreditsModal, useOutOfCreditsModal } from "@/components/OutOfCreditsModal";
import { track } from "@/lib/analytics";
import { useT } from "@/lib/i18n/LanguageProvider";

/**
 * TemplateSwitcher
 * 
 * A tabbed UI for selecting resume templates and accent colors.
 * Supports both sidebar and toolbar variants.
 */

interface TemplateSwitcherProps {
  variant?: "sidebar" | "toolbar";
  showColors?: boolean;
}

// Types for exports
export interface TemplateOption {
  id: BuilderTemplateId;
  name: string;
  description: string;
  preview: string;
  category: string;
}

export interface ColorOption {
  id: ThemeColor;
  name: string;
}

// All 8 templates
export const TEMPLATE_OPTIONS: TemplateOption[] = [
  {
    id: "modern-sidebar",
    name: "Modern Sidebar",
    description: "Two-column with dark sidebar",
    preview: "linear-gradient(135deg, #0f172a 35%, #ffffff 35%)",
    category: "professional",
  },
  {
    id: "ivy-league",
    name: "Ivy League",
    description: "Classic serif elegance",
    preview: "linear-gradient(180deg, #fafafa 0%, #f1f5f9 100%)",
    category: "classic",
  },
  {
    id: "minimalist",
    name: "Minimalist",
    description: "Clean whitespace design",
    preview: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
    category: "professional",
  },
  {
    id: "executive",
    name: "Executive",
    description: "Bold dark header",
    preview: "linear-gradient(180deg, #111827 30%, #ffffff 30%)",
    category: "professional",
  },
  {
    id: "techie",
    name: "Techie",
    description: "Developer-focused layout",
    preview: "linear-gradient(180deg, #1e293b 20%, #ffffff 20%)",
    category: "technical",
  },
  {
    id: "creative",
    name: "Creative",
    description: "Unique split design",
    preview: "linear-gradient(135deg, #10b981 35%, #ffffff 35%)",
    category: "creative",
  },
  {
    id: "startup",
    name: "Startup",
    description: "Bold modern typography",
    preview: "linear-gradient(180deg, #ffffff 0%, #f0fdf4 100%)",
    category: "creative",
  },
  {
    id: "international",
    name: "International",
    description: "Photo support, standardized",
    preview: "linear-gradient(135deg, #f1f5f9 30%, #ffffff 30%)",
    category: "professional",
  },
  {
    id: "aurora",
    name: "Aurora",
    description: "Accent rail, tinted header",
    preview: "linear-gradient(90deg, #6366f1 7%, #eef2ff 7%, #ffffff 60%)",
    category: "professional",
  },
  {
    id: "banner",
    name: "Banner",
    description: "Full-width color banner",
    preview: "linear-gradient(180deg, #4f46e5 28%, #ffffff 28%)",
    category: "professional",
  },
  {
    id: "spotlight",
    name: "Spotlight",
    description: "Centered, ATS-safe",
    preview: "linear-gradient(180deg, #ffffff 0%, #eef2ff 100%)",
    category: "professional",
  },
  {
    id: "ledger",
    name: "Ledger",
    description: "Editorial serif, date rail",
    preview: "linear-gradient(180deg, #fbf6ec 0%, #f3ece0 100%)",
    category: "classic",
  },
  {
    id: "devfolio",
    name: "Devfolio",
    description: "Developer / mono style",
    preview: "linear-gradient(180deg, #0f172a 7%, #ffffff 7%)",
    category: "technical",
  },
  {
    id: "canvas",
    name: "Canvas",
    description: "Creative accent sidebar",
    preview: "linear-gradient(120deg, #6366f1 34%, #ffffff 34%)",
    category: "creative",
  },
  {
    id: "timeline",
    name: "Timeline",
    description: "Vertical timeline rail",
    preview: "linear-gradient(90deg, #6366f1 6%, #ffffff 6%)",
    category: "professional",
  },
  {
    id: "double-column",
    name: "Double Column",
    description: "Full header + two columns",
    preview: "linear-gradient(90deg, #ffffff 60%, #f1f5f9 60%)",
    category: "professional",
  },
  {
    id: "compact",
    name: "Compact",
    description: "Dense, ATS-friendly",
    preview: "linear-gradient(180deg, #6366f1 5%, #ffffff 5%)",
    category: "professional",
  },
  {
    id: "photo-left",
    name: "Photo Left",
    description: "Photo rail + content",
    preview: "linear-gradient(90deg, #e0e7ff 34%, #ffffff 34%)",
    category: "professional",
  },
];

// Color swatches - Updated for Indigo/Violet rebrand
export const COLOR_OPTIONS: ColorOption[] = [
  { id: "indigo", name: "Indigo" },
  { id: "violet", name: "Violet" },
  { id: "blue", name: "Blue" },
  { id: "navy", name: "Navy" },
  { id: "purple", name: "Purple" },
  { id: "orange", name: "Orange" },
  { id: "rose", name: "Rose" },
  { id: "amber", name: "Amber" },
  { id: "slate", name: "Slate" },
  { id: "black", name: "Black" },
];

/**
 * Hook: handles the unlock flow for premium templates. Wraps the bare
 * `setTemplate` setter from BuilderContext so callers can use one function and
 * not worry about whether the template needs a credit charge first.
 */
function useTemplateGating(
  setTemplate: (id: BuilderTemplateId) => void,
  currentTemplateId: BuilderTemplateId,
) {
  const { t: translate } = useT();
  const { userId } = useAuth();
  const oocModal = useOutOfCreditsModal();
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set());
  const [pendingTemplate, setPendingTemplate] = useState<TemplateOption | null>(null);
  const [unlockLoading, setUnlockLoading] = useState(false);

  // Re-read localStorage when userId changes (anon → signed-in).
  useEffect(() => {
    setUnlocked(new Set(getUnlockedTemplates(userId ?? null)));
  }, [userId]);

  const isLocked = (id: string) =>
    isPremiumTemplate(id) && !unlocked.has(id) && id !== DEFAULT_FREE_TEMPLATE_ID;

  /** Call this from a tile/button click. If locked, opens the unlock modal. */
  const handleSelect = (template: TemplateOption) => {
    // Re-clicking the active template is a no-op — even if it's a premium one
    // the user hasn't paid for (grandfathered selection).
    if (template.id === currentTemplateId) return;

    if (!isLocked(template.id)) {
      setTemplate(template.id);
      return;
    }
    track("template_unlock_modal_shown", { template_id: template.id });
    setPendingTemplate(template);
  };

  const cancelUnlock = () => setPendingTemplate(null);

  const confirmUnlock = async () => {
    if (!pendingTemplate) return;
    const target = pendingTemplate;
    setUnlockLoading(true);
    try {
      const res = await fetch("/api/use-credit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!data?.success) {
        track("credit_check_failed", { reason: "insufficient_credits", source: "template_unlock" });
        setPendingTemplate(null);
        oocModal.open({
          trigger: "template_unlock",
          title: translate("Unlock {name}?", { name: translate(target.name) }),
          subtitle: translate("You're out of credits. Top up to unlock this and any other premium template."),
        });
        return;
      }

      // Persist unlock + apply it.
      unlockTemplate(userId ?? null, target.id);
      setUnlocked((prev) => {
        const next = new Set(prev);
        next.add(target.id);
        return next;
      });
      track("template_unlocked", { template_id: target.id });
      setTemplate(target.id);
      setPendingTemplate(null);
      toast.success(translate("{name} unlocked", { name: translate(target.name) }), {
        description: translate("You can switch back to it anytime."),
      });
    } catch (err) {
      console.error("Template unlock failed:", err);
      toast.error(translate("Couldn't unlock template"), {
        description: translate("Please try again — no credit was charged."),
      });
    } finally {
      setUnlockLoading(false);
    }
  };

  return {
    isLocked,
    handleSelect,
    pendingTemplate,
    unlockLoading,
    confirmUnlock,
    cancelUnlock,
    oocModal,
  };
}

export function TemplateSwitcher({ variant = "sidebar", showColors = true }: TemplateSwitcherProps) {
  const { t: translate } = useT();
  const { selectedTemplateId, themeColor, setTemplate, setThemeColor } = useBuilder();
  const [activeTab, setActiveTab] = useState<"layout" | "design">("layout");
  const gating = useTemplateGating(setTemplate, selectedTemplateId);

  if (variant === "toolbar") {
    return <ToolbarSwitcher />;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab("layout")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === "layout"
              ? "text-slate-900 border-b-2 border-indigo-500 bg-indigo-50/50"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <Layout className="w-4 h-4" />
          {translate("Layout")}
        </button>
        {showColors && (
          <button
            onClick={() => setActiveTab("design")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "design"
                ? "text-slate-900 border-b-2 border-indigo-500 bg-indigo-50/50"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Palette className="w-4 h-4" />
            {translate("Design")}
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "layout" ? (
          <LayoutTab
            templates={TEMPLATE_OPTIONS}
            selectedId={selectedTemplateId}
            onSelect={(id) => {
              const t = TEMPLATE_OPTIONS.find((x) => x.id === id);
              if (t) gating.handleSelect(t);
            }}
            isLocked={gating.isLocked}
          />
        ) : (
          <DesignTab
            colors={COLOR_OPTIONS}
            selectedColor={themeColor}
            onSelectColor={setThemeColor}
          />
        )}
      </div>

      {/* Unlock confirmation */}
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

// Layout Tab - Template Grid
function LayoutTab({
  templates,
  selectedId,
  onSelect,
  isLocked,
}: {
  templates: typeof TEMPLATE_OPTIONS;
  selectedId: BuilderTemplateId;
  onSelect: (id: BuilderTemplateId) => void;
  isLocked: (id: string) => boolean;
}) {
  const { t: translate } = useT();
  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500 mb-4">
        {translate("Choose a layout that fits your industry and style.")}
      </p>
      <div className="grid grid-cols-2 gap-3">
        {templates.map((template) => {
          const locked = isLocked(template.id);
          const isSelected = selectedId === template.id;
          return (
            <button
              key={template.id}
              onClick={() => onSelect(template.id)}
              aria-label={locked ? translate("{name} — unlock for 1 credit", { name: translate(template.name) }) : translate(template.name)}
              className={`group relative rounded-lg overflow-hidden transition-all duration-200 ${
                isSelected
                  ? "ring-2 ring-indigo-500 ring-offset-2"
                  : "ring-1 ring-slate-200 hover:ring-slate-300"
              }`}
            >
              {/* Preview Thumbnail */}
              <div
                className="aspect-[3/4] w-full relative"
                style={{ background: template.preview }}
              >
                {/* Mini layout indicator */}
                <div className="absolute inset-2 opacity-20">
                  <div className="h-full rounded-sm bg-white/40 flex">
                    {template.id === "modern-sidebar" || template.id === "creative" || template.id === "international" || template.id === "double-column" || template.id === "photo-left" ? (
                      <>
                        <div className="w-1/3 bg-slate-800/30 rounded-l-sm" />
                        <div className="flex-1" />
                      </>
                    ) : template.id === "executive" ? (
                      <div className="w-full flex flex-col">
                        <div className="h-1/4 bg-slate-800/30 rounded-t-sm" />
                        <div className="flex-1" />
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Locked overlay — hidden on the currently-selected tile so
                    pre-existing users on a premium template aren't disrupted. */}
                {locked && !isSelected && (
                  <div className="absolute inset-0 bg-slate-900/35 backdrop-blur-[1px] flex items-center justify-center">
                    <div className="flex flex-col items-center gap-1.5 px-3 py-2 bg-white/95 rounded-sm shadow-md">
                      <Lock className="w-4 h-4 text-[#B8860B]" strokeWidth={2} />
                      <span className="text-[10px] uppercase tracking-[0.18em] text-[#B8860B] font-semibold">
                        {translate("1 Credit")}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-900/90 to-transparent p-2 pt-6">
                <p className="text-xs font-semibold text-white truncate">{translate(template.name)}</p>
                <p className="text-[10px] text-slate-300 truncate">{translate(template.description)}</p>
              </div>

              {/* Selected Check */}
              {isSelected && !locked && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}

              {/* Free badge on the default template */}
              {template.id === DEFAULT_FREE_TEMPLATE_ID && !locked && (
                <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-emerald-500/95 rounded-sm">
                  <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white">{translate("Free")}</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Design Tab - Color Picker
function DesignTab({
  colors,
  selectedColor,
  onSelectColor,
}: {
  colors: typeof COLOR_OPTIONS;
  selectedColor: ThemeColor;
  onSelectColor: (color: ThemeColor) => void;
}) {
  const { t: translate } = useT();
  return (
    <div className="space-y-6">
      {/* Accent Color */}
      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          {translate("Accent Color")}
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          {translate("Pick a color that represents your personal brand.")}
        </p>
        
        {/* Color Swatches Grid */}
        <div className="grid grid-cols-5 gap-3">
          {colors.map((color) => {
            const colorValue = THEME_COLOR_VALUES[color.id];
            const isSelected = selectedColor === color.id;
            
            return (
              <button
                key={color.id}
                onClick={() => onSelectColor(color.id)}
                className={`group relative flex flex-col items-center gap-1.5 p-2 rounded-lg transition-all ${
                  isSelected ? "bg-slate-100" : "hover:bg-slate-50"
                }`}
                title={translate(color.name)}
              >
                <div
                  className={`w-8 h-8 rounded-full transition-transform group-hover:scale-110 ${
                    isSelected ? "ring-2 ring-offset-2 ring-slate-400" : ""
                  }`}
                  style={{ backgroundColor: colorValue.primary }}
                >
                  {isSelected && (
                    <div className="w-full h-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-slate-600 font-medium">{translate(color.name)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Preview */}
      <div className="p-4 bg-slate-50 rounded-xl">
        <p className="text-xs font-medium text-slate-600 mb-2">{translate("Preview")}</p>
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-lg"
            style={{ backgroundColor: THEME_COLOR_VALUES[selectedColor].primary }}
          />
          <div className="flex-1">
            <div
              className="h-2 rounded-full mb-2"
              style={{ backgroundColor: THEME_COLOR_VALUES[selectedColor].primary, width: "80%" }}
            />
            <div
              className="h-2 rounded-full"
              style={{ backgroundColor: THEME_COLOR_VALUES[selectedColor].light, width: "60%" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Compact Toolbar variant
function ToolbarSwitcher() {
  const { t: translate } = useT();
  const { selectedTemplateId, themeColor, setTemplate, setThemeColor } = useBuilder();
  const gating = useTemplateGating(setTemplate, selectedTemplateId);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showColors, setShowColors] = useState(false);

  const selectedTemplate = TEMPLATE_OPTIONS.find((t) => t.id === selectedTemplateId);

  return (
    <div className="flex items-center gap-2">
      {/* Template Dropdown */}
      <div className="relative">
        <button
          onClick={() => { setShowTemplates(!showTemplates); setShowColors(false); }}
          className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <Layout className="w-4 h-4 text-slate-500" />
          {selectedTemplate ? translate(selectedTemplate.name) : translate("Template")}
          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showTemplates && (
          <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2 max-h-80 overflow-y-auto">
            {TEMPLATE_OPTIONS.map((template) => {
              const locked = gating.isLocked(template.id);
              return (
                <button
                  key={template.id}
                  onClick={() => {
                    gating.handleSelect(template);
                    // Keep menu open if a modal will appear, otherwise close.
                    if (!locked) setShowTemplates(false);
                  }}
                  className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${
                    selectedTemplateId === template.id
                      ? "bg-indigo-50 text-indigo-700"
                      : "hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <div
                    className="relative w-10 h-12 rounded-md border border-slate-200 overflow-hidden flex-shrink-0"
                    style={{ background: template.preview }}
                  >
                    {locked && (
                      <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center">
                        <Lock className="w-3 h-3 text-white" strokeWidth={2.5} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 text-start">
                    <p className="text-sm font-medium flex items-center gap-1.5">
                      {translate(template.name)}
                      {locked && (
                        <span className="text-[9px] uppercase tracking-[0.14em] text-[#B8860B] font-semibold bg-[#B8860B]/10 px-1.5 py-0.5 rounded-sm">
                          {translate("1 cr")}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-500">{translate(template.description)}</p>
                  </div>
                  {selectedTemplateId === template.id && !locked && (
                    <Check className="w-4 h-4 text-indigo-500" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Color Dropdown */}
      <div className="relative">
        <button
          onClick={() => { setShowColors(!showColors); setShowTemplates(false); }}
          className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <div
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: THEME_COLOR_VALUES[themeColor].primary }}
          />
          <span className="sr-only">{themeColor}</span>
          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showColors && (
          <div className="absolute top-full right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-3">
            <p className="text-xs font-medium text-slate-600 mb-2">{translate("Accent Color")}</p>
            <div className="grid grid-cols-5 gap-2">
              {COLOR_OPTIONS.map((color) => {
                const colorValue = THEME_COLOR_VALUES[color.id];
                return (
                  <button
                    key={color.id}
                    onClick={() => { setThemeColor(color.id); setShowColors(false); }}
                    className={`w-7 h-7 rounded-full transition-transform hover:scale-110 ${
                      themeColor === color.id ? "ring-2 ring-offset-2 ring-slate-400" : ""
                    }`}
                    style={{ backgroundColor: colorValue.primary }}
                    title={translate(color.name)}
                  >
                    {themeColor === color.id && (
                      <Check className="w-3 h-3 text-white mx-auto" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Unlock + paywall modals (mounted in the toolbar variant too) */}
      <TemplateUnlockModal
        open={!!gating.pendingTemplate}
        templateName={gating.pendingTemplate?.name ?? ""}
        templateDescription={gating.pendingTemplate?.description}
        templatePreview={gating.pendingTemplate?.preview}
        loading={gating.unlockLoading}
        onConfirm={gating.confirmUnlock}
        onClose={gating.cancelUnlock}
      />
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

export default TemplateSwitcher;
