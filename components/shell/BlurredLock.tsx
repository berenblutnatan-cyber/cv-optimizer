"use client";

import { ReactNode } from "react";
import { Lock } from "lucide-react";

export function BlurredLock({
  children,
  locked,
  scoreImpact,
  label = "Unlock",
  onUnlock,
}: {
  children: ReactNode;
  locked: boolean;
  scoreImpact?: number;
  label?: string;
  onUnlock?: () => void;
}) {
  if (!locked) return <>{children}</>;

  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none select-none filter blur-[8px] opacity-80"
      >
        {children}
      </div>
      <button
        type="button"
        onClick={onUnlock}
        className="absolute inset-0 grid place-items-center rounded-2xl bg-black/20 hover:bg-black/30 transition-colors group"
      >
        <span className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/95 text-[#1a1a1a] text-sm font-medium shadow-glow group-hover:scale-[1.02] transition-transform">
          <Lock className="h-3.5 w-3.5" />
          {label}
          {typeof scoreImpact === "number" && scoreImpact > 0 ? (
            <span className="ml-1 px-2 py-0.5 rounded-full bg-[#f5b8c8] text-[11px] font-semibold">
              +{scoreImpact} pts
            </span>
          ) : null}
        </span>
      </button>
    </div>
  );
}
