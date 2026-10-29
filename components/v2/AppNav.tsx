"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/components/ui";

const ITEMS = [
  { href: "/cv", label: "CVs" },
  { href: "/jobs", label: "Jobs" },
  { href: "/interview", label: "Interview" },
];

/** The app's sections. The current one is marked for sight and for screen readers. */
export function AppNav() {
  const path = usePathname() ?? "";
  return (
    <nav aria-label="Sections" className="flex items-center gap-1">
      {ITEMS.map((i) => {
        const current = path === i.href || path.startsWith(`${i.href}/`);
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
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
