"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase, FileText, MessagesSquare, Wrench } from "lucide-react";
import { useT } from "@/lib/i18n/LanguageProvider";
import { cn } from "@/components/ui";

const ITEMS = [
  { href: "/cv", label: "CVs", icon: FileText },
  { href: "/jobs", label: "Jobs", icon: Briefcase },
  { href: "/interview", label: "Interview", icon: MessagesSquare },
  { href: "/toolkit", label: "Toolkit", icon: Wrench },
];

const isCurrent = (path: string, href: string) => path === href || path.startsWith(`${href}/`);

/**
 * The app's sections: in the header on wider screens, a bottom tab bar on a
 * phone (the header can't fit four sections plus the account at 375px). The
 * bar's height is published as --bottom-nav (styles/v2/app.css), so sticky
 * bottom controls sit above it.
 */
export function AppNav() {
  const path = usePathname() ?? "";
  const { t, dir } = useT();
  return (
    <>
      <nav aria-label={t("Sections")} dir={dir} className="hidden items-center gap-1 sm:flex">
        {ITEMS.map((i) => {
          const current = isCurrent(path, i.href);
          return (
            <Link
              key={i.href}
              href={i.href}
              aria-current={current ? "page" : undefined}
              className={cn(
                "inline-flex h-9 items-center rounded-control px-3 text-body font-medium transition-colors duration-micro touch:h-11",
                current ? "bg-surface-2 text-ink" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
              )}
            >
              {t(i.label)}
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
              aria-current={current ? "page" : undefined}
              className={cn("flex h-16 flex-col items-center justify-center gap-1 text-dense font-medium transition-colors duration-micro", current ? "text-ink" : "text-ink-3 hover:text-ink")}
            >
              <Icon className={cn("size-5", current && "text-accent")} aria-hidden />
              {t(i.label)}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
