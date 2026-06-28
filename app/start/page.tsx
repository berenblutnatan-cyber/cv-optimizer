import { Suspense } from "react";
import { GradientShell } from "@/components/shell/GradientShell";
import { StartChoice } from "@/components/welcome/StartChoice";
import { getServerT } from "@/lib/i18n/server";

export const metadata = {
  title: "Upload or build your CV · Hired",
};

export default async function StartPage() {
  const { t } = await getServerT();
  return (
    <GradientShell>
      <main className="mx-auto max-w-4xl px-5 pt-20 md:pt-28 pb-12">
        <div className="text-center">
          <div className="text-sm uppercase tracking-[0.22em] text-white/65">{t("Step {n} of {total}", { n: 2, total: 2 })}</div>
          <h1 className="mt-3 font-serif italic text-4xl md:text-6xl text-white leading-tight">
            {t("Do you have a CV?")}
          </h1>
          <p className="mt-4 text-white/75 text-base md:text-lg">
            {t("Upload what you have, or let us help you build one from scratch.")}
          </p>
        </div>
        <Suspense>
          <StartChoice />
        </Suspense>
      </main>
    </GradientShell>
  );
}
