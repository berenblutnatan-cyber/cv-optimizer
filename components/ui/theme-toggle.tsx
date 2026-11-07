"use client";

import * as React from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { Tooltip } from "./tooltip";
import { useT } from "@/lib/i18n/LanguageProvider";

type Theme = "system" | "light" | "dark";
const KEY = "hired-theme";

/** Inline script for <head>: pins the theme before first paint (no flash). */
export const themeBootScript = `try{var t=localStorage.getItem("${KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export function ThemeToggle() {
  const { t: tr } = useT();
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
  // One control, three states: it steps system → light → dark, and the icon turns over.
  const next: Record<Theme, Theme> = { system: "light", light: "dark", dark: "system" };
  const label: Record<Theme, string> = { system: tr("System theme"), light: tr("Light theme"), dark: tr("Dark theme") };
  const Icon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;
  return (
    <Tooltip content={label[theme]}>
      <button
        type="button"
        onClick={() => apply(next[theme])}
        aria-label={`${tr("Theme")}: ${label[theme]}`}
        className="inline-grid size-9 shrink-0 place-items-center overflow-hidden rounded-control text-ink-2 transition-colors duration-micro hover:bg-surface-2 hover:text-ink active:scale-[0.94] touch:size-11"
      >
        <MotionConfig reducedMotion="user">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={theme}
              initial={{ opacity: 0, transform: "translateY(10px) rotate(-60deg)" }}
              animate={{ opacity: 1, transform: "translateY(0px) rotate(0deg)" }}
              exit={{ opacity: 0, transform: "translateY(-10px) rotate(60deg)" }}
              transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
              className="grid place-items-center"
            >
              <Icon className="size-[18px]" aria-hidden />
            </motion.span>
          </AnimatePresence>
        </MotionConfig>
      </button>
    </Tooltip>
  );
}
