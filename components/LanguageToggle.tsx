"use client";

import { Languages } from "lucide-react";
import { useT } from "@/lib/i18n/LanguageProvider";

type Props = {
  /** Visual style. "ghost" suits light headers; "light" suits dark footers. */
  variant?: "ghost" | "light";
  className?: string;
};

/**
 * Language toggle button. Flips the whole app between English (LTR) and
 * Hebrew (RTL) instantly via the LanguageProvider, persisting the choice to a
 * cookie so SSR renders the correct `dir`/`lang` on the next load.
 *
 * The label always shows the language you'd switch TO, so it reads naturally in
 * either direction ("עברית" while in English, "English" while in Hebrew).
 */
export function LanguageToggle({ variant = "ghost", className = "" }: Props) {
  const { lang, toggle, t } = useT();
  const switchingToHebrew = lang === "en";
  const targetLabel = switchingToHebrew ? "עברית" : "English";

  const base =
    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1";
  const skin =
    variant === "light"
      ? "text-white/80 hover:text-white border border-white/20 hover:border-white/40 focus-visible:ring-white/40"
      : "text-stone-600 hover:text-stone-900 border border-stone-300 hover:border-stone-400 focus-visible:ring-stone-400";

  return (
    <button
      type="button"
      onClick={toggle}
      className={`${base} ${skin} ${className}`}
      aria-label={t(switchingToHebrew ? "Switch to Hebrew" : "Switch to English")}
      title={t(switchingToHebrew ? "Switch to Hebrew" : "Switch to English")}
      lang={switchingToHebrew ? "he" : "en"}
    >
      <Languages className="h-4 w-4" aria-hidden />
      <span>{targetLabel}</span>
    </button>
  );
}
