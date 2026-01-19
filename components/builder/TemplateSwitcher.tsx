"use client";

import React, { useState } from "react";
import { useBuilder, BuilderTemplateId, ThemeColor, THEME_COLOR_VALUES } from "@/context/BuilderContext";
import { TEMPLATE_METADATA } from "@/components/cv-templates/ThemeEngine";
import { Layout, Palette, Check, Sparkles } from "lucide-react";

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

export function TemplateSwitcher({ variant = "sidebar", showColors = true }: TemplateSwitcherProps) {
  const { selectedTemplateId, themeColor, setTemplate, setThemeColor } = useBuilder();
  const [activeTab, setActiveTab] = useState<"layout" | "design">("layout");

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
          Layout
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
            Design
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "layout" ? (
          <LayoutTab
            templates={TEMPLATE_OPTIONS}
            selectedId={selectedTemplateId}
            onSelect={setTemplate}
          />
        ) : (
          <DesignTab
            colors={COLOR_OPTIONS}
            selectedColor={themeColor}
            onSelectColor={setThemeColor}
          />
        )}
      </div>
    </div>
  );
}

// Layout Tab - Template Grid
function LayoutTab({
  templates,
  selectedId,
  onSelect,
}: {
  templates: typeof TEMPLATE_OPTIONS;
  selectedId: BuilderTemplateId;
  onSelect: (id: BuilderTemplateId) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500 mb-4">
        Choose a layout that fits your industry and style.
      </p>
      <div className="grid grid-cols-2 gap-3">
        {templates.map((template) => (
          <button
            key={template.id}
            onClick={() => onSelect(template.id)}
            className={`group relative rounded-lg overflow-hidden transition-all duration-200 ${
              selectedId === template.id
                ? "ring-2 ring-indigo-500 ring-offset-2"
                : "ring-1 ring-slate-200 hover:ring-slate-300"
            }`}
          >
            {/* Preview Thumbnail */}
            <div
              className="aspect-[3/4] w-full"
              style={{ background: template.preview }}
            >
              {/* Mini layout indicator */}
              <div className="absolute inset-2 opacity-20">
                <div className="h-full rounded-sm bg-white/40 flex">
                  {template.id === "modern-sidebar" || template.id === "creative" || template.id === "international" ? (
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
            </div>

            {/* Info */}
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-900/90 to-transparent p-2 pt-6">
              <p className="text-xs font-semibold text-white truncate">{template.name}</p>
              <p className="text-[10px] text-slate-300 truncate">{template.description}</p>
            </div>

            {/* Selected Check */}
            {selectedId === template.id && (
              <div className="absolute top-2 right-2 w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center">
                <Check className="w-3 h-3 text-white" />
              </div>
            )}
          </button>
        ))}
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
  return (
    <div className="space-y-6">
      {/* Accent Color */}
      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          Accent Color
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Pick a color that represents your personal brand.
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
                title={color.name}
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
                <span className="text-[10px] text-slate-600 font-medium">{color.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Preview */}
      <div className="p-4 bg-slate-50 rounded-xl">
        <p className="text-xs font-medium text-slate-600 mb-2">Preview</p>
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
  const { selectedTemplateId, themeColor, setTemplate, setThemeColor } = useBuilder();
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
          {selectedTemplate?.name || "Template"}
          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showTemplates && (
          <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2 max-h-80 overflow-y-auto">
            {TEMPLATE_OPTIONS.map((template) => (
              <button
                key={template.id}
                onClick={() => { setTemplate(template.id); setShowTemplates(false); }}
                className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${
                  selectedTemplateId === template.id
                    ? "bg-indigo-50 text-indigo-700"
                    : "hover:bg-slate-50 text-slate-700"
                }`}
              >
                <div
                  className="w-10 h-12 rounded-md border border-slate-200 overflow-hidden"
                  style={{ background: template.preview }}
                />
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium">{template.name}</p>
                  <p className="text-xs text-slate-500">{template.description}</p>
                </div>
                {selectedTemplateId === template.id && (
                  <Check className="w-4 h-4 text-indigo-500" />
                )}
              </button>
            ))}
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
            <p className="text-xs font-medium text-slate-600 mb-2">Accent Color</p>
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
                    title={color.name}
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
    </div>
  );
}

export default TemplateSwitcher;
