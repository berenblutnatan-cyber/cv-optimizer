import type { Metadata } from "next";
import Link from "next/link";
import { Check, Infinity as InfinityIcon, Info } from "lucide-react";
import { POLAR_PLANS, type PolarPlanKey } from "@/lib/polar";
import { getServerT } from "@/lib/i18n/server";
import { voiceConfig } from "@/lib/voice/elevenlabs";
import { VOICE } from "@/lib/voice/protocol";
import { Badge, Card, cn, Tooltip } from "@/components/ui";
import { AppHeader } from "@/components/v2/AppHeader";
import { CheckoutButton } from "@/components/v2/billing/CheckoutButton";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Build, edit and download your CV free. Pay only for AI work: credit packs from $3, or Unlimited.",
};
export const dynamic = "force-dynamic";

const PACKS: { key: PolarPlanKey; best?: boolean }[] = [{ key: "mini" }, { key: "pro", best: true }, { key: "ultimate" }];

// What each tier includes. Voice lines only appear when voice is set up, so
// the page never sells a call the app can't make.
type T = (s: string, vars?: Record<string, string | number>) => string;
function freeItems(voice: boolean, t: T): string[] {
  return [
    t("Build and edit by typing or chat"),
    ...(voice ? [t("Your first {n}-minute voice call", { n: Math.round(VOICE.freeSeconds / 60) })] : []),
    t("Import a PDF or Word CV"),
    t("All 18 templates"),
    t("PDF, Word and text downloads"),
    t("Version history"),
    t("Job tracker"),
  ];
}
function oneCreditItems(voice: boolean, t: T): string[] {
  return [
    t("A CV tailored to one job"),
    t("Cover letter"),
    voice ? t("Mock interview, by voice or typing") : t("Mock interview with feedback"),
    ...(voice ? [t("A {n}-minute voice call", { n: Math.round(VOICE.paidSeconds / 60) })] : []),
  ];
}

const money = (n: number) => (Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`);

function Price({ amount, unit }: { amount: number; unit?: string }) {
  return (
    <p className="flex items-baseline gap-1.5">
      <span className="text-h1 font-semibold tabular text-ink">{money(amount)}</span>
      {unit && <span className="text-body text-ink-2">{unit}</span>}
    </p>
  );
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((t) => (
        <li key={t} className="flex items-start gap-2.5 text-body text-ink">
          <Check className="mt-[3px] size-4 shrink-0 text-accent" aria-hidden />
          {t}
        </li>
      ))}
    </ul>
  );
}

export default async function PricingPage() {
  const { t, dir } = await getServerT();
  const voice = !!voiceConfig();
  const available = (k: PolarPlanKey) => Boolean(POLAR_PLANS[k].productId);
  const unl = POLAR_PLANS.unlimited_monthly;
  const pass = POLAR_PLANS.unlimited_quarter;

  return (
    <div className="min-h-dvh bg-canvas">
      <AppHeader />
      <main dir={dir} className="mx-auto max-w-5xl px-4 py-12 md:px-8 md:py-16">
        <h1 className="text-h1 font-semibold tracking-tight text-ink md:text-display">{t("Pricing")}</h1>
        <p className="mt-3 max-w-xl text-emph text-ink-2">{t("Your CV is free to build, edit and download. You pay only for AI work.")}</p>

        <section aria-labelledby="credits" className="mt-12">
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <h2 id="credits" className="text-h2 font-semibold text-ink">
              {t("Credits")}
            </h2>
            <p className="text-body text-ink-2">{t("Never expire")}</p>
          </div>
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {PACKS.map(({ key, best }) => {
              const p = POLAR_PLANS[key];
              return (
                <li key={key}>
                  <Card className={cn("flex h-full flex-col gap-5 p-6", best && "border-accent ring-1 ring-accent")}>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-h3 font-semibold text-ink">{p.name}</h3>
                      {best && <Badge tone="accent">{t("Best value")}</Badge>}
                    </div>
                    <div>
                      <Price amount={p.amount} />
                      <p className="mt-1 text-body text-ink-2">
                        {t("{n} credits · {price} each", { n: p.credits, price: `$${(p.amount / p.credits).toFixed(2)}` })}
                      </p>
                    </div>
                    <CheckoutButton plan={key} planName={p.name} amount={p.amount} available={available(key)} variant={best ? "primary" : "secondary"} className="mt-auto w-full">
                      {t("Buy {n} credits", { n: p.credits })}
                    </CheckoutButton>
                  </Card>
                </li>
              );
            })}
          </ul>
        </section>

        <section aria-labelledby="unlimited" className="mt-12">
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <h2 id="unlimited" className="flex items-center gap-2 text-h2 font-semibold text-ink">
              <InfinityIcon className="size-6 text-accent" aria-hidden /> {t("Unlimited")}
            </h2>
            <Tooltip content={t("Voice calls: {n} minutes a month, then credits.", { n: VOICE.unlimitedSecondsPer30d / 60 })}>
              <p tabIndex={0} className="inline-flex items-center gap-1.5 text-body text-ink-2">
                {t("No credits counted")} <Info className="size-4 text-ink-3" aria-hidden />
              </p>
            </Tooltip>
          </div>
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <li>
              <Card className="flex h-full flex-col gap-5 p-6">
                <h3 className="text-h3 font-semibold text-ink">{t("Monthly")}</h3>
                <div>
                  <Price amount={unl.amount} unit={t("/ month")} />
                  <p className="mt-1 text-body text-ink-2">{t("Cancel anytime")}</p>
                </div>
                <CheckoutButton plan="unlimited_monthly" planName={unl.name} amount={unl.amount} available={available("unlimited_monthly")} variant="secondary" className="mt-auto w-full">
                  {t("Go Unlimited")}
                </CheckoutButton>
              </Card>
            </li>
            <li>
              <Card className="flex h-full flex-col gap-5 p-6">
                <h3 className="text-h3 font-semibold text-ink">{t("Job Search Pass")}</h3>
                <div>
                  <Price amount={pass.amount} unit={t("once")} />
                  <p className="mt-1 text-body text-ink-2">{t("{n} days · no renewal", { n: pass.grantsUnlimitedDays ?? 0 })}</p>
                </div>
                <CheckoutButton plan="unlimited_quarter" planName={pass.name} amount={pass.amount} available={available("unlimited_quarter")} variant="secondary" className="mt-auto w-full">
                  {t("Get the pass")}
                </CheckoutButton>
              </Card>
            </li>
          </ul>
        </section>

        <section aria-label={t("What's included")} className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card className="p-6">
            <h2 className="mb-4 text-h3 font-semibold text-ink">{t("Always free")}</h2>
            <List items={freeItems(voice, t)} />
          </Card>
          <Card className="p-6">
            <h2 className="mb-4 text-h3 font-semibold text-ink">{t("One credit")}</h2>
            <List items={oneCreditItems(voice, t)} />
          </Card>
        </section>

        <p className="mt-10 flex flex-wrap gap-x-5 gap-y-2 text-body text-ink-2">
          <span>{t("Secure checkout by Polar")}</span>
          <Link href="/refund-policy" className="underline decoration-hairline-strong underline-offset-4 hover:text-ink">
            {t("Refunds")}
          </Link>
          <Link href="/terms" className="underline decoration-hairline-strong underline-offset-4 hover:text-ink">
            {t("Terms")}
          </Link>
        </p>
      </main>
    </div>
  );
}
