// Career toolkit hub — free, rate-limited generators built on the same
// expert knowledge layer as the optimizer.

import { Suspense } from "react";
import { ShellNav } from "@/components/ShellNav";
import { ToolkitHub } from "@/components/toolkit/ToolkitHub";
import { getServerT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Career Toolkit · Hired" };

export default async function ToolkitPage() {
  const { t } = await getServerT();
  return (
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col">
      <ShellNav active="toolkit" />
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-8 py-10">
        <h1 className="font-serif text-3xl font-light text-brand-ink mb-1">{t("Career toolkit")}</h1>
        <p className="text-sm text-stone-500 mb-8">{t("Free tools for every step after the CV.")}</p>
        <Suspense>
          <ToolkitHub />
        </Suspense>
      </main>
    </div>
  );
}
