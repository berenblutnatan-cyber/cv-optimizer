"use client";

import * as React from "react";
import { useT } from "@/lib/i18n/LanguageProvider";
import type { Lang } from "@/lib/i18n/config";

const locale = (lang: Lang) => (lang === "he" ? "he-IL" : "en");

function label(date: Date, lang: Lang, justNow: string): string {
  const s = (date.getTime() - Date.now()) / 1000;
  const abs = Math.abs(s);
  if (typeof Intl === "undefined") return date.toLocaleDateString();
  const rtf = new Intl.RelativeTimeFormat(locale(lang), { numeric: "auto" });
  if (abs < 60) return justNow;
  if (abs < 3600) return rtf.format(Math.round(s / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(s / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(s / 86400), "day");
  return date.toLocaleDateString(locale(lang), { month: "short", day: "numeric", year: "numeric" });
}

export function RelativeTime({ iso }: { iso: string }) {
  const { t, lang } = useT();
  const justNow = t("just now");
  const date = React.useMemo(() => new Date(iso), [iso]);
  // Render the absolute date on the server; relative after mount (no hydration mismatch).
  const [text, setText] = React.useState(() => date.toLocaleDateString(locale(lang), { month: "short", day: "numeric" }));
  React.useEffect(() => {
    setText(label(date, lang, justNow));
    // Keep "3 minutes ago" true while the page stays open.
    const timer = setInterval(() => setText(label(date, lang, justNow)), 60_000);
    return () => clearInterval(timer);
  }, [date, lang, justNow]);
  return (
    <time dateTime={iso} title={date.toLocaleString(locale(lang))}>
      {text}
    </time>
  );
}
