"use client";

import Link from "next/link";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import { Logo } from "@/components/Logo";
import { CreditBalance } from "@/components/CreditBalance";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useT } from "@/lib/i18n/LanguageProvider";

type ShellNavProps = {
  rightSlot?: React.ReactNode;
  /** Highlight the active product link */
  active?: "builder" | "optimizer" | null;
};

export function ShellNav({ rightSlot, active = null }: ShellNavProps) {
  const { t } = useT();
  const linkBase =
    "text-sm font-medium transition-colors tracking-wide focus-visible:outline-none";
  const linkClass = (isActive: boolean) =>
    `${linkBase} ${
      isActive
        ? "text-[#0A2647]"
        : "text-stone-500 hover:text-stone-900"
    }`;

  return (
    <header className="w-full bg-white/85 backdrop-blur-md border-b border-stone-200/60">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-8 lg:px-16 h-16 sm:h-20 flex items-center justify-between gap-3">
        <Logo variant="dark" size="md" />

        <div className="flex items-center gap-3 sm:gap-5">
          <nav className="hidden sm:flex items-center gap-5">
            <Link
              href="/builder"
              aria-current={active === "builder" ? "page" : undefined}
              className={linkClass(active === "builder")}
            >
              {t("Resume Builder")}
            </Link>
            <span className="w-px h-4 bg-stone-300" />
            <Link
              href="/optimize"
              aria-current={active === "optimizer" ? "page" : undefined}
              className={linkClass(active === "optimizer")}
            >
              {t("Optimizer")}
            </Link>
          </nav>

          <LanguageToggle />

          <SignedIn>
            <CreditBalance />
            <UserButton
              appearance={{
                elements: { avatarBox: "w-9 h-9 ring-2 ring-stone-200" },
              }}
            />
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="px-4 sm:px-5 py-2 sm:py-2.5 text-sm font-medium text-stone-600 hover:text-stone-900 border border-stone-300 hover:border-stone-400 rounded-sm transition-colors tracking-wide focus-visible:outline-none">
                {t("Sign In")}
              </button>
            </SignInButton>
          </SignedOut>

          {rightSlot}
        </div>
      </div>
    </header>
  );
}
