import Link from "next/link";
import { Logo } from "@/components/Logo";

export function SiteFooter() {
  return (
    <footer className="w-full bg-[#0A2647] border-t border-white/10 text-white/70 py-10">
      <div className="max-w-7xl mx-auto px-8 lg:px-16">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Logo variant="light" size="md" />
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-6 md:gap-10 text-sm font-light tracking-wide">
            <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
            <Link href="/refund-policy" className="hover:text-white transition-colors">Refund Policy</Link>
            <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
          </nav>
          <p className="text-sm font-light">© 2026 Hired. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
