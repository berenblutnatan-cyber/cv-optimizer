import Link from "next/link";
import { Logo } from "@/components/Logo";

export function SiteFooter() {
  const linkClass =
    "hover:text-white transition-colors focus-visible:outline-none focus-visible:text-white";
  return (
    <footer className="w-full bg-[#0A2647] border-t border-white/10 text-white/70 py-10 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-16">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 md:gap-4">
          <Logo variant="light" size="md" />
          <nav className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 md:gap-8 text-xs sm:text-sm font-light tracking-wide">
            <Link href="/pricing" className={linkClass}>Pricing</Link>
            <Link href="/privacy" className={linkClass}>Privacy</Link>
            <Link href="/terms" className={linkClass}>Terms</Link>
            <Link href="/refund-policy" className={linkClass}>Refund Policy</Link>
            <Link href="/contact" className={linkClass}>Contact</Link>
          </nav>
          <p className="text-xs sm:text-sm font-light text-center md:text-right">© 2026 Hired. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
