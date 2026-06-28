// Server-side translation for React Server Components (the landing page, legal
// pages, etc.). Reads the same `lang` cookie the client provider uses, so SSR
// text matches the client. After a language toggle the client provider calls
// router.refresh(), which re-renders these server components with the new
// cookie — keeping server-rendered text in sync with the instant client swap.

import { cookies } from "next/headers";
import { he } from "./he";
import {
  DEFAULT_LANG,
  LANG_COOKIE,
  dirFor,
  isLang,
  type Lang,
} from "./config";

type Vars = Record<string, string | number>;

const DICTS: Record<Lang, Record<string, string>> = { en: {}, he };

function interpolate(str: string, vars?: Vars): string {
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (m, key) =>
    key in vars ? String(vars[key]) : m,
  );
}

export async function getServerLang(): Promise<Lang> {
  const cookieStore = await cookies();
  const value = cookieStore.get(LANG_COOKIE)?.value;
  return isLang(value) ? value : DEFAULT_LANG;
}

export async function getServerT(): Promise<{
  t: (source: string, vars?: Vars) => string;
  lang: Lang;
  dir: "rtl" | "ltr";
}> {
  const lang = await getServerLang();
  const dict = DICTS[lang];
  return {
    lang,
    dir: dirFor(lang),
    t: (source, vars) => interpolate(dict[source] ?? source, vars),
  };
}
