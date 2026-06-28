"use client";

import { useEffect, useState } from "react";
import { Gift, X } from "lucide-react";
import { useT } from "@/lib/i18n/LanguageProvider";

interface FreeCreditToastProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FreeCreditToast({ isOpen, onClose }: FreeCreditToastProps) {
  const { t } = useT();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      // Auto-close after 5 seconds
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Wait for animation
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed top-4 left-4 right-4 sm:left-auto sm:right-4 z-[100] transition-all duration-300 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
      }`}
    >
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg shadow-2xl p-4 flex items-center gap-3 sm:min-w-[320px] sm:max-w-md mx-auto">
        <div className="flex-shrink-0">
          <Gift className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">🎁 {t("Sign up now & get 1 FREE Credit!")}</p>
          <p className="text-xs text-indigo-100 mt-0.5">
            {t("Use it to download or optimize your resume")}
          </p>
        </div>
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(onClose, 300);
          }}
          aria-label={t("Dismiss")}
          className="flex-shrink-0 p-2 hover:bg-white/20 rounded transition-colors focus-visible:outline-none"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
