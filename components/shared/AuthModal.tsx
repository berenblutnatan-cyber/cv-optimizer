"use client";

import { useState, useEffect, useCallback } from "react";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { X, Lock, Sparkles, FileDown, BarChart3 } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  trigger: "download" | "analyze" | "save";
  title?: string;
  description?: string;
}

/**
 * AuthModal - A beautiful modal that prompts users to sign up/sign in
 * when they try to perform premium actions (download, analyze, save)
 * 
 * This enables "try before you sign up" experience
 */
export function AuthModal({ 
  isOpen, 
  onClose, 
  trigger,
  title,
  description 
}: AuthModalProps) {
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Default content based on trigger type
  const content = {
    download: {
      icon: <FileDown className="w-8 h-8 text-indigo-600" />,
      title: title || "Download Your Resume",
      description: description || "Create a free account to download your beautifully formatted resume as a PDF.",
      benefits: [
        "Download unlimited PDFs",
        "Save multiple resume versions",
        "Access premium templates",
      ],
    },
    analyze: {
      icon: <BarChart3 className="w-8 h-8 text-violet-600" />,
      title: title || "See Your Full Analysis",
      description: description || "Create a free account to see your detailed resume score and AI-powered improvement suggestions.",
      benefits: [
        "Get detailed ATS compatibility score",
        "Receive personalized suggestions",
        "Track your improvement over time",
      ],
    },
    save: {
      icon: <Lock className="w-8 h-8 text-blue-600" />,
      title: title || "Save Your Progress",
      description: description || "Create a free account to save your resume and access it from anywhere.",
      benefits: [
        "Save your work in the cloud",
        "Access from any device",
        "Never lose your progress",
      ],
    },
  };

  const currentContent = content[trigger];
  const accentColor = trigger === "download" ? "indigo" : trigger === "analyze" ? "violet" : "blue";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with gradient */}
        <div className={`px-8 pt-10 pb-6 bg-gradient-to-br ${
          accentColor === "indigo" ? "from-indigo-50 to-violet-50" :
          accentColor === "violet" ? "from-violet-50 to-purple-50" :
          "from-blue-50 to-indigo-50"
        }`}>
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${
            accentColor === "indigo" ? "bg-indigo-100" :
            accentColor === "violet" ? "bg-violet-100" :
            "bg-blue-100"
          }`}>
            {currentContent.icon}
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            {currentContent.title}
          </h2>
          <p className="text-slate-600">
            {currentContent.description}
          </p>
        </div>

        {/* Benefits */}
        <div className="px-8 py-6 space-y-3">
          {currentContent.benefits.map((benefit, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                accentColor === "indigo" ? "bg-indigo-100 text-indigo-600" :
                accentColor === "violet" ? "bg-violet-100 text-violet-600" :
                "bg-blue-100 text-blue-600"
              }`}>
                <Sparkles className="w-3 h-3" />
              </div>
              <span className="text-slate-700">{benefit}</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="px-8 pb-8 space-y-3">
          <SignUpButton mode="modal">
            <button className={`w-full py-3.5 rounded-xl font-semibold text-white transition-all shadow-lg ${
              accentColor === "indigo" 
                ? "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20" 
                : accentColor === "violet"
                ? "bg-violet-600 hover:bg-violet-700 shadow-violet-600/20"
                : "bg-blue-600 hover:bg-blue-700 shadow-blue-600/20"
            }`}>
              Create Free Account
            </button>
          </SignUpButton>
          
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-sm text-slate-400">or</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>
          
          <SignInButton mode="modal">
            <button className="w-full py-3 rounded-xl font-medium text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors">
              Sign In
            </button>
          </SignInButton>
          
          <p className="text-center text-xs text-slate-400 pt-2">
            No credit card required • Free forever plan
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook to manage auth modal state with localStorage persistence
 */
export function useAuthModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [trigger, setTrigger] = useState<"download" | "analyze" | "save">("download");

  const openModal = useCallback((triggerType: "download" | "analyze" | "save") => {
    setTrigger(triggerType);
    setIsOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  return {
    isOpen,
    trigger,
    openModal,
    closeModal,
  };
}

export default AuthModal;
