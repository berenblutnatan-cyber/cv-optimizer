"use client";

import Link from "next/link";
import { Logo } from "@/components/Logo";

type ShellNavProps = {
  rightSlot?: React.ReactNode;
};

export function ShellNav({ rightSlot }: ShellNavProps) {
  return (
    <header className="w-full bg-white/80 backdrop-blur-sm border-b border-stone-200/60 px-8 lg:px-16 py-5">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Logo variant="dark" size="md" />

        <div className="flex items-center gap-6">
          <Link 
            href="/builder" 
            className="text-sm font-medium text-stone-500 hover:text-stone-900 transition-colors tracking-wide"
          >
            Resume Builder
          </Link>
          <span className="w-px h-4 bg-stone-300" />
          <Link 
            href="/optimize" 
            className="text-sm font-medium text-stone-500 hover:text-stone-900 transition-colors tracking-wide"
          >
            Optimizer
          </Link>
          {rightSlot}
        </div>
      </div>
    </header>
  );
}
