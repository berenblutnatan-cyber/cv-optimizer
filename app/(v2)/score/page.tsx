import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "@/components/v2/AppHeader";
import { StartFlow } from "@/components/v2/start/StartFlow";

export const metadata: Metadata = {
  title: "Free CV score",
  description: "Score your CV free in seconds. Then tailor it to a job, with every change traced to your own facts.",
};

export default function ScorePage() {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <AppHeader nav={false}>
        <Link href="/pricing" className="inline-flex h-9 items-center rounded-control px-3 text-body font-medium text-ink-2 hover:bg-surface-2 hover:text-ink">
          Pricing
        </Link>
      </AppHeader>
      <main className="flex flex-1 flex-col">
        <StartFlow variant="score" />
      </main>
    </div>
  );
}
