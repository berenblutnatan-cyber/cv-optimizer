// Central i18n configuration. The app uses an "English-as-key" dictionary:
// every UI string is written in English at the call site and `t("English")`
// looks up the Hebrew translation, falling back to the English source string
// when no translation exists. This lets us retrofit i18n onto an app that had
// ~1,000 hardcoded strings without inventing key names or risking missing-key
// crashes — an untranslated string simply renders in English.

export const LOCALES = ["en", "he"] as const;
export type Lang = (typeof LOCALES)[number];

export const DEFAULT_LANG: Lang = "en";

/** Cookie that persists the user's language choice across SSR + reloads. */
export const LANG_COOKIE = "lang";
/** 1 year. */
export const LANG_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isLang(value: unknown): value is Lang {
  return value === "en" || value === "he";
}

export function dirFor(lang: Lang): "rtl" | "ltr" {
  return lang === "he" ? "rtl" : "ltr";
}
