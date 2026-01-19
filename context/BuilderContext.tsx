"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";

/**
 * BuilderContext
 * 
 * Global state management for the WYSIWYG resume builder.
 * Tracks which field is currently focused to position AI tools
 * and manage editing state across the application.
 */

// ==========================================
// TYPES
// ==========================================

export interface FieldRect {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

// Theme color options - 8 accent colors (Professional Indigo/Violet Rebrand)
export type ThemeColor = 
  | "indigo"
  | "blue" 
  | "purple" 
  | "rose" 
  | "amber" 
  | "slate"
  | "navy"
  | "violet"
  | "orange"
  | "black";

// Color palette with hex values for inline styling
export const THEME_COLOR_VALUES: Record<ThemeColor, { primary: string; dark: string; light: string; ring: string }> = {
  indigo: { primary: "#6366f1", dark: "#4f46e5", light: "#e0e7ff", ring: "ring-indigo-500" },
  blue: { primary: "#3b82f6", dark: "#2563eb", light: "#dbeafe", ring: "ring-blue-500" },
  purple: { primary: "#8b5cf6", dark: "#7c3aed", light: "#ede9fe", ring: "ring-purple-500" },
  rose: { primary: "#f43f5e", dark: "#e11d48", light: "#ffe4e6", ring: "ring-rose-500" },
  amber: { primary: "#f59e0b", dark: "#d97706", light: "#fef3c7", ring: "ring-amber-500" },
  slate: { primary: "#475569", dark: "#334155", light: "#f1f5f9", ring: "ring-slate-500" },
  navy: { primary: "#1e3a8a", dark: "#1e40af", light: "#dbeafe", ring: "ring-blue-900" },
  violet: { primary: "#8b5cf6", dark: "#7c3aed", light: "#ede9fe", ring: "ring-violet-500" },
  orange: { primary: "#f97316", dark: "#ea580c", light: "#ffedd5", ring: "ring-orange-500" },
  black: { primary: "#18181b", dark: "#09090b", light: "#f4f4f5", ring: "ring-zinc-900" },
};

// Template IDs - 8 distinct archetypes
export type BuilderTemplateId = 
  | "modern-sidebar"   // 1. Two-column with sidebar
  | "ivy-league"       // 2. Classic serif, conservative
  | "minimalist"       // 3. Clean whitespace, centered
  | "executive"        // 4. Bold dark header
  | "techie"           // 5. Developer-optimized
  | "creative"         // 6. Unique split design
  | "startup"          // 7. Modern, punchy
  | "international";   // 8. Photo support, standardized

export interface BuilderContextState {
  // Active field tracking
  activeFieldId: string | null;
  activeFieldRect: FieldRect | null;
  activeFieldValue: string;
  
  // AI Assistant state
  isAIThinking: boolean;
  aiSuggestion: string | null;
  
  // Editor mode
  isEditMode: boolean;
  
  // Template & Theme
  selectedTemplateId: BuilderTemplateId;
  themeColor: ThemeColor;
}

export interface BuilderContextActions {
  // Field focus management
  setFocusedField: (id: string, rect: DOMRect, value: string) => void;
  clearFocus: () => void;
  updateActiveFieldRect: (rect: DOMRect) => void;
  
  // AI Assistant actions
  setAIThinking: (thinking: boolean) => void;
  setAISuggestion: (suggestion: string | null) => void;
  
  // Editor mode
  setEditMode: (enabled: boolean) => void;
  
  // Template & Theme
  setTemplate: (templateId: BuilderTemplateId) => void;
  setThemeColor: (color: ThemeColor) => void;
}

export type BuilderContextValue = BuilderContextState & BuilderContextActions;

// ==========================================
// DEFAULT VALUES
// ==========================================

const defaultState: BuilderContextState = {
  activeFieldId: null,
  activeFieldRect: null,
  activeFieldValue: "",
  isAIThinking: false,
  aiSuggestion: null,
  isEditMode: true,
  selectedTemplateId: "modern-sidebar",
  themeColor: "indigo",
};

const defaultActions: BuilderContextActions = {
  setFocusedField: () => {},
  clearFocus: () => {},
  updateActiveFieldRect: () => {},
  setAIThinking: () => {},
  setAISuggestion: () => {},
  setEditMode: () => {},
  setTemplate: () => {},
  setThemeColor: () => {},
};

// ==========================================
// CONTEXT
// ==========================================

const BuilderContext = createContext<BuilderContextValue>({
  ...defaultState,
  ...defaultActions,
});

// ==========================================
// PROVIDER
// ==========================================

interface BuilderProviderProps {
  children: ReactNode;
  /** Initial edit mode state (default: true) */
  initialEditMode?: boolean;
  /** Initial template (default: modern-sidebar) */
  initialTemplate?: BuilderTemplateId;
  /** Initial theme color (default: indigo) */
  initialThemeColor?: ThemeColor;
}

export function BuilderProvider({ 
  children, 
  initialEditMode = true,
  initialTemplate = "modern-sidebar",
  initialThemeColor = "indigo",
}: BuilderProviderProps) {
  // State
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const [activeFieldRect, setActiveFieldRect] = useState<FieldRect | null>(null);
  const [activeFieldValue, setActiveFieldValue] = useState<string>("");
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [aiSuggestion, setAISuggestion] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(initialEditMode);
  const [selectedTemplateId, setSelectedTemplateId] = useState<BuilderTemplateId>(initialTemplate);
  const [themeColor, setThemeColor] = useState<ThemeColor>(initialThemeColor);

  // Convert DOMRect to serializable FieldRect
  const domRectToFieldRect = useCallback((domRect: DOMRect): FieldRect => ({
    top: domRect.top,
    left: domRect.left,
    right: domRect.right,
    bottom: domRect.bottom,
    width: domRect.width,
    height: domRect.height,
  }), []);

  // Actions
  const setFocusedField = useCallback((id: string, rect: DOMRect, value: string) => {
    setActiveFieldId(id);
    setActiveFieldRect(domRectToFieldRect(rect));
    setActiveFieldValue(value);
    // Clear any previous AI suggestion when switching fields
    setAISuggestion(null);
  }, [domRectToFieldRect]);

  const clearFocus = useCallback(() => {
    // Small delay to allow click events on AI assistant to fire
    setTimeout(() => {
      setActiveFieldId(null);
      setActiveFieldRect(null);
      setActiveFieldValue("");
      setAISuggestion(null);
    }, 150);
  }, []);

  const updateActiveFieldRect = useCallback((rect: DOMRect) => {
    setActiveFieldRect(domRectToFieldRect(rect));
  }, [domRectToFieldRect]);

  const handleSetAIThinking = useCallback((thinking: boolean) => {
    setIsAIThinking(thinking);
  }, []);

  const handleSetAISuggestion = useCallback((suggestion: string | null) => {
    setAISuggestion(suggestion);
  }, []);

  const handleSetEditMode = useCallback((enabled: boolean) => {
    setIsEditMode(enabled);
    if (!enabled) {
      // Clear focus when exiting edit mode
      setActiveFieldId(null);
      setActiveFieldRect(null);
      setActiveFieldValue("");
    }
  }, []);

  const handleSetTemplate = useCallback((templateId: BuilderTemplateId) => {
    setSelectedTemplateId(templateId);
  }, []);

  const handleSetThemeColor = useCallback((color: ThemeColor) => {
    setThemeColor(color);
  }, []);

  // Context value
  const value: BuilderContextValue = {
    // State
    activeFieldId,
    activeFieldRect,
    activeFieldValue,
    isAIThinking,
    aiSuggestion,
    isEditMode,
    selectedTemplateId,
    themeColor,
    // Actions
    setFocusedField,
    clearFocus,
    updateActiveFieldRect,
    setAIThinking: handleSetAIThinking,
    setAISuggestion: handleSetAISuggestion,
    setEditMode: handleSetEditMode,
    setTemplate: handleSetTemplate,
    setThemeColor: handleSetThemeColor,
  };

  return (
    <BuilderContext.Provider value={value}>
      {children}
    </BuilderContext.Provider>
  );
}

// ==========================================
// HOOKS
// ==========================================

/**
 * Hook to access the full builder context
 */
export function useBuilder(): BuilderContextValue {
  const context = useContext(BuilderContext);
  if (!context) {
    throw new Error("useBuilder must be used within a BuilderProvider");
  }
  return context;
}

/**
 * Hook to check if a specific field is active
 */
export function useIsFieldActive(fieldId: string): boolean {
  const { activeFieldId } = useBuilder();
  return activeFieldId === fieldId;
}

/**
 * Hook for AI assistant state only
 */
export function useAIAssistant() {
  const { 
    isAIThinking, 
    aiSuggestion, 
    setAIThinking, 
    setAISuggestion,
    activeFieldId,
    activeFieldRect,
    activeFieldValue,
  } = useBuilder();
  
  return {
    isThinking: isAIThinking,
    suggestion: aiSuggestion,
    setThinking: setAIThinking,
    setSuggestion: setAISuggestion,
    hasActiveField: !!activeFieldId,
    fieldRect: activeFieldRect,
    fieldValue: activeFieldValue,
  };
}

export default BuilderContext;
