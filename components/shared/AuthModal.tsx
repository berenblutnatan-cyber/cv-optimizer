"use client";

import { useState, useEffect, useCallback } from "react";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { X, FileDown, BarChart3, Shield, Check } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  trigger: "download" | "analyze" | "save";
  title?: string;
  description?: string;
}

/**
 * AuthModal - Premium modal that prompts users to sign up/sign in
 * Redesigned to match the classy, upper-class website aesthetic
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
      icon: <FileDown className="w-6 h-6 text-[#0A2647]" strokeWidth={1.5} />,
      title: title || "Download Your Resume",
      description: description || "Create a free account to download your beautifully formatted resume.",
      benefits: [
        "Download unlimited PDFs",
        "Save multiple versions",
        "Access all templates",
      ],
    },
    analyze: {
      icon: <BarChart3 className="w-6 h-6 text-[#0A2647]" strokeWidth={1.5} />,
      title: title || "See Your Full Analysis",
      description: description || "Create a free account to see your detailed resume score and suggestions.",
      benefits: [
        "Detailed ATS compatibility score",
        "Personalized improvements",
        "Track your progress",
      ],
    },
    save: {
      icon: <Shield className="w-6 h-6 text-[#0A2647]" strokeWidth={1.5} />,
      title: title || "Save Your Progress",
      description: description || "Create a free account to save your resume and access it anywhere.",
      benefits: [
        "Cloud-synced storage",
        "Access from any device",
        "Never lose your work",
      ],
    },
  };

  const currentContent = content[trigger];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-[#1a1a1a]/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-[#FAFAF8] rounded-sm shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-stone-200">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-sm transition-colors z-10"
        >
          <X className="w-5 h-5" strokeWidth={1.5} />
        </button>

        {/* Content */}
        <div className="px-10 pt-12 pb-10">
          {/* Icon */}
          <div className="w-14 h-14 rounded-full bg-[#0A2647]/5 flex items-center justify-center mb-6">
            {currentContent.icon}
          </div>
          
          {/* Title */}
          <h2 className="font-serif text-2xl font-light text-[#1a1a1a] mb-3">
            {currentContent.title}
          </h2>
          
          {/* Description */}
          <p className="text-stone-500 font-light leading-relaxed mb-8">
            {currentContent.description}
          </p>
          
          {/* Divider */}
          <div className="w-12 h-px bg-[#B8860B] mb-8" />

          {/* Benefits */}
          <div className="space-y-4 mb-10">
            {currentContent.benefits.map((benefit, index) => (
              <div key={index} className="flex items-center gap-4">
                <div className="w-5 h-5 rounded-full bg-[#0A2647]/10 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-[#0A2647]" strokeWidth={2} />
                </div>
                <span className="text-sm text-stone-600 font-light">{benefit}</span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="space-y-4">
            <SignUpButton mode="modal">
              <button className="w-full py-4 bg-[#0A2647] hover:bg-[#0d3259] text-white font-medium rounded-sm transition-all tracking-wide">
                Create Free Account
              </button>
            </SignUpButton>
            
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-stone-200" />
              <span className="text-xs text-stone-400 font-light tracking-wide">or</span>
              <div className="flex-1 h-px bg-stone-200" />
            </div>
            
            <SignInButton mode="modal">
              <button className="w-full py-4 rounded-sm font-medium text-[#1a1a1a] border border-stone-300 hover:bg-white hover:border-stone-400 transition-all tracking-wide">
                Sign In
              </button>
            </SignInButton>
            
            <p className="text-center text-xs text-stone-400 font-light pt-2 tracking-wide">
              No credit card required
            </p>
          </div>
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
