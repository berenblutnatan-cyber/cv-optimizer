import type { Metadata } from "next";
import { getServerT } from "@/lib/i18n/server";
import Link from "next/link";
import { AppHeader } from "@/components/v2/AppHeader";
import { StartFlow } from "@/components/v2/start/StartFlow";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerT();
  return {
    title: t("Free CV score"),
    description: t("Score your CV free in seconds. Then tailor it to a job, with every change traced to your own facts."),
  };
}

export default async function ScorePage() {
  const { t } = await getServerT();
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <AppHeader nav={false}>
        <Link href="/pricing" className="inline-flex h-9 items-center rounded-control px-3 text-body font-medium text-ink-2 hover:bg-surface-2 hover:text-ink">
          {t("Pricing")}
        </Link>
      </AppHeader>
      <main className="flex flex-1 flex-col">
        <StartFlow variant="score" />
      </main>
    </div>
  );
}
