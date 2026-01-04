"use client";

import Link from "next/link";

type ShellNavProps = {
  rightSlot?: React.ReactNode;
};

export function ShellNav({ rightSlot }: ShellNavProps) {
  return (
    <header className="relative z-10 mx-auto w-full max-w-6xl px-4 pt-5">
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl border border-white/10 bg-gradient-to-br from-indigo-500/90 to-sky-500/70 shadow-[0_10px_30px_rgba(0,0,0,0.35)] flex items-center justify-center">
              <svg className="h-4.5 w-4.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-tight text-white">CV Optimizer</div>
              <div className="text-[11px] text-white/60">ATS & recruiter screening</div>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70">
              <svg className="h-4 w-4 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 11c0 1.105-.895 2-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2h4a2 2 0 012 2v4zm10 0c0 1.105-.895 2-2 2h-4a2 2 0 01-2-2V7a2 2 0 012-2h4a2 2 0 012 2v4zM4 17h16"
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


