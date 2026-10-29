"use client";

import * as React from "react";

const rtf = typeof Intl !== "undefined" ? new Intl.RelativeTimeFormat("en", { numeric: "auto" }) : null;

function label(date: Date): string {
  const s = (date.getTime() - Date.now()) / 1000;
  const abs = Math.abs(s);
  if (!rtf) return date.toLocaleDateString();
  if (abs < 60) return "just now";
  if (abs < 3600) return rtf.format(Math.round(s / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(s / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(s / 86400), "day");
  return date.toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" });
}

export function RelativeTime({ iso }: { iso: string }) {
  const date = React.useMemo(() => new Date(iso), [iso]);
  // Render the absolute date on the server; relative after mount (no hydration mismatch).
  const [text, setText] = React.useState(() => date.toLocaleDateString("en", { month: "short", day: "numeric" }));
  React.useEffect(() => {
    setText(label(date));
    // Keep "3 minutes ago" true while the page stays open.
    const t = setInterval(() => setText(label(date)), 60_000);
    return () => clearInterval(t);
  }, [date]);
  return (
    <time dateTime={iso} title={date.toLocaleString()}>
      {text}
    </time>
  );
}
