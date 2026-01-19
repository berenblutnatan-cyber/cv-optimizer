"use client";

import Link from "next/link";
import { Logo } from "@/components/Logo";

type ShellNavProps = {
  rightSlot?: React.ReactNode;
};

export function ShellNav({ rightSlot }: ShellNavProps) {
  return (
    <header className="relative z-10 mx-auto w-full max-w-6xl px-4 pt-5">
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <Logo variant="dark" size="md" linkTo="/" />

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600">
              <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              Data privacy
            </span>
            {rightSlot}
          </div>
        </div>
      </div>
    </header>
  );
}
