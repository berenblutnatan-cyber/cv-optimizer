"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { he } from "./he";
import {
  DEFAULT_LANG,
  LANG_COOKIE,
  LANG_COOKIE_MAX_AGE,
  dirFor,
  isLang,
  type Lang,
} from "./config";

type Vars = Record<string, string | number>;

type TFn = (source: string, vars?: Vars) => string;

type LanguageContextValue = {
  lang: Lang;
  dir: "rtl" | "ltr";
  t: TFn;
  setLang: (lang: Lang) => void;
  toggle: () => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

const DICTS: Record<Lang, Record<string, string>> = {
  en: {},
  he,
};

function interpolate(str: string, vars?: Vars): string {
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (m, key) =>
    key in vars ? String(vars[key]) : m,
  );
}

function makeT(lang: Lang): TFn {
  const dict = DICTS[lang];
  return (source, vars) => {
    const translated = dict[source] ?? source;
    return interpolate(translated, vars);
  };
}

function writeCookie(lang: Lang) {
  try {
    document.cookie = `${LANG_COOKIE}=${lang}; path=/; max-age=${LANG_COOKIE_MAX_AGE}; samesite=lax`;
    localStorage.setItem(LANG_COOKIE, lang);
  } catch {
    /* storage may be unavailable (private mode, SSR) — non-fatal */
  }
}

function applyDocument(lang: Lang) {
  if (typeof document === "undefined") return;
  const el = document.documentElement;
  el.lang = lang;
  el.dir = dirFor(lang);
}

export function LanguageProvider({
  initialLang = DEFAULT_LANG,
  children,
}: {
  initialLang?: Lang;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [lang, setLangState] = useState<Lang>(
    isLang(initialLang) ? initialLang : DEFAULT_LANG,
  );

  const setLang = useCallback(
    (next: Lang) => {
      if (!isLang(next)) return;
      setLangState(next);
      writeCookie(next);
      applyDocument(next);
      // Re-render Server Components with the new cookie so server-rendered text
      // (landing, legal pages, etc.) updates in step with client components.
      router.refresh();
    },
    [router],
  );

  const toggle = useCallback(() => {
    setLang(lang === "he" ? "en" : "he");
  }, [lang, setLang]);

  // Keep <html lang/dir> in sync if the client cookie disagrees with the SSR
  // value (e.g. a stale prerender). The server already sets these correctly on
  // first paint, so this is just a safety net — no flash in the common case.
  useEffect(() => {
    applyDocument(lang);
  }, [lang]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      lang,
      dir: dirFor(lang),
      t: makeT(lang),
      setLang,
      toggle,
    }),
    [lang, setLang, toggle],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

/**
 * Access the translation function + current language.
 * Safe to call outside a provider (falls back to English passthrough) so that
 * isolated components / tests don't crash, but in-app it always has a provider.
 */
export function useT(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (ctx) return ctx;
  return {
    lang: DEFAULT_LANG,
    dir: "ltr",
    t: (source, vars) => interpolate(source, vars),
    setLang: () => {},
    toggle: () => {},
  };
}
