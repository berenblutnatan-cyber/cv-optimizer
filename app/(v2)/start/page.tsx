import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "@/components/v2/AppHeader";
import { StartFlow } from "@/components/v2/start/StartFlow";

export const metadata: Metadata = { title: "Start your CV", robots: { index: false } };

export default function StartPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <AppHeader>
        <Link href="/cv" className="inline-flex h-9 items-center rounded-control px-3 text-body font-medium text-ink-2 hover:bg-surface-2 hover:text-ink">
          Your CVs
        </Link>
      </AppHeader>
      <main className="flex flex-1 flex-col">
        <StartFlow />
      </main>
    </div>
  );
}
