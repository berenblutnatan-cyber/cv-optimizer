"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Lock, Coins, Check, ArrowRight } from "lucide-react";
import { useT } from "@/lib/i18n/LanguageProvider";

type Props = {
  open: boolean;
  templateName: string;
  templateDescription?: string;
  templatePreview?: string;
  /** Disable the confirm button while the credit charge is in flight. */
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export function TemplateUnlockModal({
  open,
  templateName,
  templateDescription,
  templatePreview,
  loading = false,
  onConfirm,
  onClose,
}: Props) {
  const { t } = useT();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, loading, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="unlock-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[65] flex items-center justify-center px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="unlock-title"
        >
          <button
            type="button"
            aria-label={t("Close")}
            onClick={() => !loading && onClose()}
            className="absolute inset-0 bg-[#0A2647]/65 backdrop-blur-sm"
          />

          <motion.div
            initial={{ y: 20, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 12, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
            className="relative w-full max-w-md bg-white rounded-sm shadow-modal overflow-hidden"
          >
            <button
              type="button"
              onClick={() => !loading && onClose()}
              aria-label={t("Close")}
              className="absolute top-4 right-4 z-10 p-2 rounded-full hover:bg-stone-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A2647]/30"
            >
              <X className="w-4 h-4 text-stone-500" strokeWidth={2} />
            </button>

            <div className="px-6 sm:px-8 pt-9 pb-7">
              {/* Preview swatch + lock badge */}
              <div className="flex items-center justify-center mb-6">
                <div className="relative">
                  <div
                    className="w-24 h-32 rounded-sm border border-stone-200 shadow-soft"
                    style={{ background: templatePreview ?? "linear-gradient(180deg, #fafafa 0%, #f1f5f9 100%)" }}
                  />
                  <div className="absolute -bottom-2 -right-2 w-9 h-9 rounded-full bg-[#B8860B] flex items-center justify-center shadow-md">
                    <Lock className="w-4 h-4 text-white" strokeWidth={2} />
                  </div>
                </div>
              </div>

              <h2
                id="unlock-title"
                className="font-serif text-xl sm:text-2xl text-[#1a1a1a] font-light text-center tracking-tight mb-2"
              >
                {t("Unlock")}{" "}
                <span className="text-[#B8860B] font-normal">{templateName}</span>
              </h2>
              {templateDescription && (
                <p className="text-sm text-stone-500 font-light text-center mb-6 max-w-sm mx-auto">
                  {templateDescription}
                </p>
              )}

              {/* Cost line */}
              <div className="flex items-center justify-center gap-2 px-4 py-3 mb-5 bg-[#B8860B]/5 border border-[#B8860B]/20 rounded-sm">
                <Coins className="w-4 h-4 text-[#B8860B]" strokeWidth={2} />
                <span className="text-sm text-stone-700 font-light">
                  <span className="font-medium text-[#B8860B]">{t("1 credit")}</span> {t("· unlocks this template forever")}
                </span>
              </div>

              {/* Reassurance bullets */}
              <ul className="space-y-2 mb-7 max-w-xs mx-auto">
                <li className="flex items-center gap-2 text-xs text-stone-500 font-light">
                  <Check className="w-3.5 h-3.5 text-[#0A2647] flex-shrink-0" strokeWidth={2} />
                  {t("One-time charge — keep it forever")}
                </li>
                <li className="flex items-center gap-2 text-xs text-stone-500 font-light">
                  <Check className="w-3.5 h-3.5 text-[#0A2647] flex-shrink-0" strokeWidth={2} />
                  {t("Switch back to free template anytime")}
                </li>
                <li className="flex items-center gap-2 text-xs text-stone-500 font-light">
                  <Check className="w-3.5 h-3.5 text-[#0A2647] flex-shrink-0" strokeWidth={2} />
                  {t("Works with PDF + DOCX export")}
                </li>
              </ul>

              <div className="flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1 px-5 py-3 text-sm font-medium text-stone-600 hover:text-stone-900 border border-stone-300 hover:border-stone-400 rounded-sm transition-colors tracking-wide focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-300 disabled:opacity-60"
                >
                  {t("Not now")}
                </button>
                <button
                  type="button"
                  onClick={onConfirm}
                  disabled={loading}
                  className="group flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#B8860B] hover:bg-[#9c7409] disabled:opacity-70 disabled:cursor-wait text-white text-sm font-medium rounded-sm transition-all tracking-wide shadow-sm hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B8860B]/40"
                >
                  {loading ? (
                    <span>{t("Unlocking…")}</span>
                  ) : (
                    <>
                      {t("Unlock for 1 credit")}
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" strokeWidth={2} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
