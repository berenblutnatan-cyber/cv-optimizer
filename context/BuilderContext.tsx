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

// Accent palette lives in a server-safe module (the DOCX route needs it too).
export { THEME_COLOR_VALUES, type ThemeColor } from "@/lib/design/accents";
import type { ThemeColor } from "@/lib/design/accents";

// Template IDs - 8 distinct archetypes
export type BuilderTemplateId = 
  | "modern-sidebar"   // 1. Two-column with sidebar
  | "ivy-league"       // 2. Classic serif, conservative
  | "minimalist"       // 3. Clean whitespace, centered
  | "executive"        // 4. Bold dark header
  | "techie"           // 5. Developer-optimized
  | "creative"         // 6. Unique split design
  | "startup"          // 7. Modern, punchy
  | "international"    // 8. Photo support, standardized
  | "aurora"           // 9. Accent rail + tinted header (bold/colorful)
  | "banner"           // 10. Full-width color banner
  | "spotlight"        // 11. Centered minimal, ATS-safe
  | "ledger"           // 12. Editorial serif, date rail
  | "devfolio"         // 13. Developer / mono
  | "canvas"           // 14. Creative accent sidebar
  | "timeline"         // 15. Vertical timeline rail
  | "double-column"    // 16. Full header + two light columns
  | "compact"          // 17. Dense, ATS-friendly single column
  | "photo-left";      // 18. Photo rail + content column

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
  selectedTemplateId: "ivy-league",
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
  initialTemplate = "ivy-league",
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
