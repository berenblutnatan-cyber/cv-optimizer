import type { Metadata } from "next";
import Link from "next/link";
import { Check, Infinity as InfinityIcon, Info } from "lucide-react";
import { POLAR_PLANS, type PolarPlanKey } from "@/lib/polar";
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
function freeItems(voice: boolean): string[] {
  return ["Build and edit by typing or chat", ...(voice ? [`Your first ${Math.round(VOICE.freeSeconds / 60)}-minute voice call`] : []), "Import a PDF or Word CV", "All 18 templates", "PDF, Word and text downloads", "Version history", "Job tracker"];
}
function oneCreditItems(voice: boolean): string[] {
  return ["A CV tailored to one job", "Cover letter", voice ? "Mock interview, by voice or typing" : "Mock interview with feedback", ...(voice ? [`A ${Math.round(VOICE.paidSeconds / 60)}-minute voice call`] : [])];
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

export default function PricingPage() {
  const voice = !!voiceConfig();
  const available = (k: PolarPlanKey) => Boolean(POLAR_PLANS[k].productId);
  const unl = POLAR_PLANS.unlimited_monthly;
  const pass = POLAR_PLANS.unlimited_quarter;

  return (
    <div className="min-h-dvh bg-canvas">
      <AppHeader>
        <Link href="/cv" className="inline-flex h-9 items-center rounded-control px-3 text-body font-medium text-ink-2 hover:bg-surface-2 hover:text-ink">
          Your CVs
        </Link>
      </AppHeader>
      <main className="mx-auto max-w-5xl px-4 py-12 md:px-8 md:py-16">
        <h1 className="text-h1 font-semibold tracking-tight text-ink md:text-display">Pricing</h1>
        <p className="mt-3 max-w-xl text-emph text-ink-2">Your CV is free to build, edit and download. You pay only for AI work.</p>

        <section aria-labelledby="credits" className="mt-12">
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <h2 id="credits" className="text-h2 font-semibold text-ink">
              Credits
            </h2>
            <p className="text-body text-ink-2">Never expire</p>
          </div>
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {PACKS.map(({ key, best }) => {
              const p = POLAR_PLANS[key];
              return (
                <li key={key}>
                  <Card className={cn("flex h-full flex-col gap-5 p-6", best && "border-accent ring-1 ring-accent")}>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-h3 font-semibold text-ink">{p.name}</h3>
                      {best && <Badge tone="accent">Best value</Badge>}
                    </div>
                    <div>
                      <Price amount={p.amount} />
                      <p className="mt-1 text-body text-ink-2">
                        {p.credits} credits · ${(p.amount / p.credits).toFixed(2)} each
                      </p>
                    </div>
                    <CheckoutButton plan={key} planName={p.name} amount={p.amount} available={available(key)} variant={best ? "primary" : "secondary"} className="mt-auto w-full">
                      Buy {p.credits} credits
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
              <InfinityIcon className="size-6 text-accent" aria-hidden /> Unlimited
            </h2>
            <Tooltip content={`Voice calls: ${VOICE.unlimitedSecondsPer30d / 60} minutes a month, then credits.`}>
              <p tabIndex={0} className="inline-flex items-center gap-1.5 text-body text-ink-2">
                No credits counted <Info className="size-4 text-ink-3" aria-hidden />
              </p>
            </Tooltip>
          </div>
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <li>
              <Card className="flex h-full flex-col gap-5 p-6">
                <h3 className="text-h3 font-semibold text-ink">Monthly</h3>
                <div>
                  <Price amount={unl.amount} unit="/ month" />
                  <p className="mt-1 text-body text-ink-2">Cancel anytime</p>
                </div>
                <CheckoutButton plan="unlimited_monthly" planName={unl.name} amount={unl.amount} available={available("unlimited_monthly")} variant="secondary" className="mt-auto w-full">
                  Go Unlimited
                </CheckoutButton>
              </Card>
            </li>
            <li>
              <Card className="flex h-full flex-col gap-5 p-6">
                <h3 className="text-h3 font-semibold text-ink">Job Search Pass</h3>
                <div>
                  <Price amount={pass.amount} unit="once" />
                  <p className="mt-1 text-body text-ink-2">{pass.grantsUnlimitedDays} days · no renewal</p>
                </div>
                <CheckoutButton plan="unlimited_quarter" planName={pass.name} amount={pass.amount} available={available("unlimited_quarter")} variant="secondary" className="mt-auto w-full">
                  Get the pass
                </CheckoutButton>
              </Card>
            </li>
          </ul>
        </section>

        <section aria-label="What's included" className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card className="p-6">
            <h2 className="mb-4 text-h3 font-semibold text-ink">Always free</h2>
            <List items={freeItems(voice)} />
          </Card>
          <Card className="p-6">
            <h2 className="mb-4 text-h3 font-semibold text-ink">One credit</h2>
            <List items={oneCreditItems(voice)} />
          </Card>
        </section>

        <p className="mt-10 flex flex-wrap gap-x-5 gap-y-2 text-body text-ink-2">
          <span>Secure checkout by Polar</span>
          <Link href="/refund-policy" className="underline decoration-hairline-strong underline-offset-4 hover:text-ink">
            Refunds
          </Link>
          <Link href="/terms" className="underline decoration-hairline-strong underline-offset-4 hover:text-ink">
            Terms
          </Link>
        </p>
      </main>
    </div>
  );
}
