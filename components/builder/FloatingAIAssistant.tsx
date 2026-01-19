"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Wand2, CheckCircle, Type, Briefcase, Loader2, X } from "lucide-react";
import { useAIAssistant } from "@/context/BuilderContext";

/**
 * FloatingAIAssistant Component
 * 
 * A floating "magic button" that appears next to the active editable field.
 * Provides AI-powered writing assistance options:
 * - Improve Writing
 * - Fix Grammar
 * - Make Professional
 * 
 * FEATURES:
 * - Smooth animations with framer-motion
 * - Positioned relative to active field
 * - Dropdown menu with AI actions
 * - Loading states during AI processing
 */

// ==========================================
// TYPES
// ==========================================

interface AIAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
  prompt: string;
}

interface FloatingAIAssistantProps {
  /** Callback when AI improves text - receives the improved text */
  onImproveText?: (originalText: string, improvedText: string, actionId: string) => void;
  /** Custom offset from the field (x, y) */
  offset?: { x: number; y: number };
  /** Z-index for the floating element */
  zIndex?: number;
}

// ==========================================
// AI ACTIONS
// ==========================================

const AI_ACTIONS: AIAction[] = [
  {
    id: "improve",
    label: "Improve Writing",
    icon: <Wand2 className="w-4 h-4" />,
    description: "Make it more impactful",
    prompt: "Improve this text to be more professional and impactful while keeping the same meaning",
  },
  {
    id: "grammar",
    label: "Fix Grammar",
    icon: <CheckCircle className="w-4 h-4" />,
    description: "Correct spelling & grammar",
    prompt: "Fix any grammar, spelling, or punctuation errors in this text",
  },
  {
    id: "professional",
    label: "Make Professional",
    icon: <Briefcase className="w-4 h-4" />,
    description: "More formal tone",
    prompt: "Rewrite this text in a more professional and formal tone suitable for a resume",
  },
  {
    id: "concise",
    label: "Make Concise",
    icon: <Type className="w-4 h-4" />,
    description: "Shorter & clearer",
    prompt: "Make this text more concise while keeping the key information",
  },
];

// ==========================================
// COMPONENT
// ==========================================

export function FloatingAIAssistant({
  onImproveText,
  offset = { x: -12, y: -8 },
  zIndex = 50,
}: FloatingAIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  
  const {
    hasActiveField,
    fieldRect,
    fieldValue,
    isThinking,
    setThinking,
  } = useAIAssistant();

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Close menu when field changes
  useEffect(() => {
    setIsOpen(false);
  }, [fieldRect]);

  // Handle AI action click
  const handleActionClick = useCallback(async (action: AIAction) => {
    if (!fieldValue || isThinking) return;
    
    console.log(`[AI Assistant] Action: ${action.id}`);
    console.log(`[AI Assistant] Original text: "${fieldValue}"`);
    console.log(`[AI Assistant] Prompt: ${action.prompt}`);
    
    setProcessingAction(action.id);
    setThinking(true);
    
    try {
      // TODO: Replace with actual API call
      // Simulating AI processing
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock improved text for demonstration
      const improvedText = `[Improved] ${fieldValue}`;
      
      console.log(`[AI Assistant] Improved text: "${improvedText}"`);
      
      onImproveText?.(fieldValue, improvedText, action.id);
    } catch (error) {
      console.error("[AI Assistant] Error:", error);
    } finally {
      setProcessingAction(null);
      setThinking(false);
      setIsOpen(false);
    }
  }, [fieldValue, isThinking, setThinking, onImproveText]);

  // Don't render if no active field
  if (!hasActiveField || !fieldRect) {
    return null;
  }

  // Calculate position (top-left of the field)
  const position = {
    top: fieldRect.top + offset.y,
    left: fieldRect.left + offset.x,
  };

  return (
    <AnimatePresence>
      <motion.div
        ref={menuRef}
        initial={{ opacity: 0, y: 10, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.9 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        style={{
          position: "fixed",
          top: position.top,
          left: position.left,
          zIndex,
          transform: "translateY(-100%)",
        }}
        className="pointer-events-auto"
      >
        {/* Main Button */}
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          disabled={isThinking}
          className={`
            flex items-center gap-2
            px-3 py-1.5
            bg-white
            border border-indigo-200
            rounded-full
            shadow-lg shadow-indigo-100/50
            text-sm font-medium
            transition-all duration-200
            ${isOpen ? "ring-2 ring-indigo-500/30" : ""}
            ${isThinking ? "opacity-75" : "hover:shadow-xl hover:border-indigo-300"}
          `}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {isThinking ? (
            <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4 text-indigo-600" />
          )}
          <span className="text-slate-700">
            {isThinking ? "Improving..." : "AI Assistant"}
          </span>
        </motion.button>

        {/* Dropdown Menu */}
        <AnimatePresence>
          {isOpen && !isThinking && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden"
            >
              {/* Header */}
              <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  AI Actions
                </span>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-slate-200 rounded transition-colors"
                >
                  <X className="w-3 h-3 text-slate-400" />
                </button>
              </div>

              {/* Actions */}
              <div className="py-1">
                {AI_ACTIONS.map((action) => (
                  <button
                    key={action.id}
                    onClick={() => handleActionClick(action)}
                    disabled={processingAction === action.id}
                    className={`
                      w-full px-3 py-2.5
                      flex items-center gap-3
                      text-left
                      transition-colors
                      ${processingAction === action.id 
                        ? "bg-indigo-50" 
                        : "hover:bg-slate-50"
                      }
                    `}
                  >
                    <div className={`
                      w-8 h-8 rounded-lg flex items-center justify-center
                      ${processingAction === action.id 
                        ? "bg-indigo-100 text-indigo-600" 
                        : "bg-slate-100 text-slate-600"
                      }
                    `}>
                      {processingAction === action.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        action.icon
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800">
                        {action.label}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {action.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Footer Tip */}
              <div className="px-3 py-2 bg-slate-50 border-t border-slate-100">
                <p className="text-[10px] text-slate-400 text-center">
                  Tip: Select text before clicking for better results
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}

export default FloatingAIAssistant;
