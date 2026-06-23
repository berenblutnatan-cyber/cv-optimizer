"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, MessageCircle, Mic, Wand2, Briefcase, FileText, CreditCard, LayoutGrid } from "lucide-react";

const ITEMS = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/build/chat", icon: MessageCircle, label: "Build (chat)" },
  { href: "/roles", icon: Briefcase, label: "Roles" },
  { href: "/build/voice", icon: Mic, label: "Voice" },
  { href: "/builder", icon: Wand2, label: "Manual build" },
  { href: "/optimize", icon: LayoutGrid, label: "Optimize" },
  { href: "/templates", icon: FileText, label: "Templates" },
  { href: "/pricing", icon: CreditCard, label: "Pricing" },
];

export function Sidebar() {
  const pathname = usePathname() ?? "/";
  return (
    <>
      {/* Desktop rail */}
      <aside className="hidden md:flex fixed left-3 top-1/2 -translate-y-1/2 z-30 flex-col gap-2 p-2 rounded-2xl bg-glass border border-glass-border backdrop-blur-glass shadow-glow">
        {ITEMS.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className={`group relative grid place-items-center h-11 w-11 rounded-xl transition-colors ${
                active ? "bg-white/15 text-white" : "text-white/65 hover:text-white hover:bg-white/8"
              }`}
            >
              <Icon className="h-5 w-5" strokeWidth={1.7} />
              <span className="pointer-events-none absolute left-full ml-3 px-2 py-1 rounded-md bg-black/70 text-[11px] text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {label}
              </span>
            </Link>
          );
        })}
      </aside>

      {/* Mobile bottom dock */}
      <nav className="md:hidden fixed bottom-3 left-3 right-3 z-30 flex items-center justify-around p-2 rounded-2xl bg-glass-strong border border-glass-border backdrop-blur-glass shadow-glow">
        {ITEMS.slice(0, 5).map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className={`grid place-items-center h-11 w-11 rounded-xl transition-colors ${
                active ? "bg-white/15 text-white" : "text-white/65"
              }`}
            >
              <Icon className="h-5 w-5" strokeWidth={1.7} />
            </Link>
          );
        })}
      </nav>
    </>
  );
}
