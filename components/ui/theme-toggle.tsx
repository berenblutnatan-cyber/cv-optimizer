"use client";

import * as React from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { Segmented } from "./segmented";

type Theme = "system" | "light" | "dark";
const KEY = "hired-theme";

/** Inline script for <head>: pins the theme before first paint (no flash). */
export const themeBootScript = `try{var t=localStorage.getItem("${KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export function ThemeToggle() {
  const [theme, setTheme] = React.useState<Theme>("system");
  React.useEffect(() => {
    try {
      const t = localStorage.getItem(KEY);
      if (t === "light" || t === "dark") setTheme(t);
    } catch {}
  }, []);
  const apply = (t: Theme) => {
    setTheme(t);
    const el = document.documentElement;
    if (t === "system") delete el.dataset.theme;
    else el.dataset.theme = t;
    try {
      if (t === "system") localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, t);
    } catch {}
  };
  return (
    <Segmented<Theme>
      aria-label="Theme"
      size="sm"
      value={theme}
      onChange={apply}
      options={[
        { value: "system", label: null, icon: <Monitor />, ariaLabel: "System theme" },
        { value: "light", label: null, icon: <Sun />, ariaLabel: "Light theme" },
        { value: "dark", label: null, icon: <Moon />, ariaLabel: "Dark theme" },
      ]}
    />
  );
}
