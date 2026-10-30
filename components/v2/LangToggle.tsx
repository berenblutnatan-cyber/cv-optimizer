"use client";

import { useT } from "@/lib/i18n/LanguageProvider";

/** English ⇄ Hebrew. Shows the language you'd switch to, in that language. */
export function LangToggle() {
  const { lang, setLang } = useT();
  const next = lang === "he" ? "en" : "he";
  return (
    <button
      type="button"
      onClick={() => setLang(next)}
      lang={next}
      aria-label={next === "he" ? "עברית" : "English"}
      className="inline-flex h-9 min-w-9 items-center justify-center rounded-control px-2.5 text-body font-medium text-ink-2 transition-colors duration-micro hover:bg-surface-2 hover:text-ink touch:h-11"
    >
      {next === "he" ? "עב" : "EN"}
    </button>
  );
}
