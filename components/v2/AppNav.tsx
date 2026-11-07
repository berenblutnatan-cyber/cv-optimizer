"use client";

import Link from "next/link";
import { msg } from "@/lib/i18n/config";
import { usePathname } from "next/navigation";
import * as React from "react";
import { Briefcase, FileText, MessagesSquare, Wrench } from "lucide-react";
import { useT } from "@/lib/i18n/LanguageProvider";
import { cn } from "@/components/ui";

const ITEMS = [
  { href: "/cv", label: msg("CVs"), icon: FileText },
  { href: "/jobs", label: msg("Jobs"), icon: Briefcase },
  { href: "/interview", label: msg("Interview"), icon: MessagesSquare },
  { href: "/toolkit", label: msg("Toolkit"), icon: Wrench },
];

const isCurrent = (path: string, href: string) => path === href || path.startsWith(`${href}/`);

// Every page renders its own header, so the nav remounts on each section change
// and a layout animation has nothing to animate from. A click records where the
// indicator stood; the next nav to mount takes that once and slides in from it.
// (Recorded at the click, not at mount: during the switch the leaving page's nav
// re-renders and remounts, and measuring then records the wrong section.)
const leaving = new Map<string, { x: number; w: number }>();

function useSlideFrom(key: string) {
  const ref = React.useRef<HTMLSpanElement>(null);
  React.useLayoutEffect(() => {
    const el = ref.current;
    const prev = leaving.get(key);
    leaving.delete(key);
    if (!el || !prev) return;
    const box = el.getBoundingClientRect();
    if (box.width === 0 || Math.abs(prev.x - box.left) < 1) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    el.animate(
      [{ transform: `translateX(${prev.x - box.left}px) scaleX(${prev.w / box.width})` }, { transform: "none" }],
      { duration: 320, easing: "cubic-bezier(0.23, 1, 0.32, 1)" },
    );
  }, [key]);
  const record = () => {
    const box = ref.current?.getBoundingClientRect();
    if (box && box.width > 0) leaving.set(key, { x: box.left, w: box.width });
  };
  return [ref, record] as const;
}

/**
 * The app's sections: in the header on wider screens, a bottom tab bar on a
 * phone (the header can't fit four sections plus the account at 375px). The
 * bar's height is published as --bottom-nav (styles/v2/app.css), so sticky
 * bottom controls sit above it.
 */
export function AppNav() {
  const path = usePathname() ?? "";
  const { t, dir } = useT();
  const [pill, recordPill] = useSlideFrom("pill");
  const [bar, recordBar] = useSlideFrom("bar");
  return (
    <>
      {/* The current section's pill slides to the next one: a jump between sections reads as one move. */}
      <nav aria-label={t("Sections")} dir={dir} className="hidden items-center gap-1 sm:flex">
        {ITEMS.map((i) => {
          const current = isCurrent(path, i.href);
          return (
            <Link
              key={i.href}
              href={i.href}
              onClick={recordPill}
              aria-current={current ? "page" : undefined}
              className={cn(
                "relative inline-flex h-9 items-center rounded-control px-3 text-body font-medium transition-colors duration-micro touch:h-11",
                current ? "text-ink" : "text-ink-2 hover:bg-surface-2/70 hover:text-ink",
              )}
            >
              {current && <span ref={pill} className="absolute inset-0 origin-left rounded-control bg-surface-2 shadow-[inset_0_0_0_1px_rgb(var(--c-hairline))]" aria-hidden />}
              <span className="relative">{t(i.label)}</span>
            </Link>
          );
        })}
      </nav>
      <nav
        aria-label={t("Sections")}
        dir={dir}
        data-bottom-nav
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-hairline bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
      >
        {ITEMS.map((i) => {
          const current = isCurrent(path, i.href);
          const Icon = i.icon;
          return (
            <Link
              key={i.href}
              href={i.href}
              onClick={recordBar}
              aria-current={current ? "page" : undefined}
              className={cn("relative flex h-16 flex-col items-center justify-center gap-1 text-dense font-medium transition-colors duration-micro", current ? "text-ink" : "text-ink-3 hover:text-ink")}
            >
              {current && <span ref={bar} className="absolute inset-x-6 top-0 origin-left h-0.5 rounded-full bg-accent" aria-hidden />}
              <Icon className={cn("size-5 transition-transform duration-micro ease-strong", current && "-translate-y-px text-accent")} aria-hidden />
              {t(i.label)}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
