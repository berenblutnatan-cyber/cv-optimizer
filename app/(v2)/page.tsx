import type { Metadata } from "next";
import Link from "next/link";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { ArrowRight, BriefcaseBusiness, Mic, MessagesSquare, Wrench } from "lucide-react";
import { ScrollDepthTracker } from "@/components/ScrollDepthTracker";
import { Button, DiffLine, ScoreBar, ScoreGauge, SCORE_DISCLAIMER } from "@/components/ui";
import { AppHeader } from "@/components/v2/AppHeader";
import { SiteFooter } from "@/components/v2/SiteFooter";
import { CvThumbnail } from "@/components/v2/cv/CvThumbnail";
import { SAMPLE_RESUME_DATA } from "@/lib/builder/sampleResume";
import type { ThemeColor } from "@/lib/design/accents";
import { getServerT } from "@/lib/i18n/server";
import { POLAR_PLANS } from "@/lib/polar";
import { DEFAULT_DESIGN, type DesignState } from "@/lib/resume/document";
import { toTemplateData } from "@/lib/resume/view";
import { getTemplateEntry, TEMPLATE_IDS, type TemplateRegistryId } from "@/lib/templates/registry";
import { voiceConfig } from "@/lib/voice/elevenlabs";

export const metadata: Metadata = {
  title: { absolute: "Hired: AI CV builder. A stronger CV, every word still yours." },
  description: "Tell us what you did. Hired sharpens your CV for each job and never invents a thing. Free to build and download.",
  alternates: { canonical: "/" },
};

const SAMPLE = toTemplateData(SAMPLE_RESUME_DATA);
const design = (template: TemplateRegistryId, accentColor: ThemeColor): DesignState => ({ ...DEFAULT_DESIGN, template, accentColor });

const SHOWCASE: { template: TemplateRegistryId; accent: ThemeColor }[] = [
  { template: "minimalist", accent: "slate" },
  { template: "ivy-league", accent: "navy" },
  { template: "modern-sidebar", accent: "indigo" },
  { template: "executive", accent: "black" },
  { template: "techie", accent: "blue" },
  { template: "aurora", accent: "violet" },
];

type T = (s: string, vars?: Record<string, string | number>) => string;

function PrimaryCta({ t, size = "lg" }: { t: T; size?: "md" | "lg" }) {
  return (
    <>
      <SignedOut>
        <Button asChild variant="primary" size={size}>
          <Link href="/start">
            {t("Build my CV")} <ArrowRight className="rtl:-scale-x-100" aria-hidden />
          </Link>
        </Button>
      </SignedOut>
      <SignedIn>
        <Button asChild variant="primary" size={size}>
          <Link href="/cv">
            {t("My CVs")} <ArrowRight className="rtl:-scale-x-100" aria-hidden />
          </Link>
        </Button>
      </SignedIn>
    </>
  );
}

function Hero({ t }: { t: T }) {
  return (
    <section className="overflow-hidden border-b border-hairline bg-surface">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 pt-14 md:px-8 lg:grid-cols-2 lg:gap-14 lg:pt-20">
        <div className="lg:pb-20">
          <h1 className="text-balance text-display font-semibold text-ink md:text-hero">{t("A stronger CV. Every word still yours.")}</h1>
          <p className="mt-5 max-w-md text-pretty text-h3 font-normal text-ink-2">{t("Tell us what you did. Hired sharpens it for each job and never invents a thing.")}</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <PrimaryCta t={t} />
            <Button asChild size="lg">
              <Link href="/score">{t("Score my CV")}</Link>
            </Button>
          </div>
          <p className="mt-4 text-body text-ink-2">{t("Free to build and download. No card.")}</p>
        </div>

        <div className="relative h-[500px] sm:h-[560px] lg:h-auto lg:min-h-[560px]">
          <div dir="ltr" className="absolute inset-x-6 top-0 overflow-hidden rounded-t-control shadow-pop sm:inset-x-20 lg:inset-x-8">
            <CvThumbnail data={SAMPLE} design={design("modern-sidebar", "indigo")} eager />
          </div>
          <div className="absolute inset-x-0 bottom-6 rounded-card shadow-pop lg:-start-6 lg:end-auto lg:bottom-10 lg:w-[400px]">
            <DiffLine
              grounded
              before={t("Worked on onboarding for new users")}
              after={t("Launched self-serve onboarding that lifted activation 34%")}
              evidence={t("activation up 34% after the launch")}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function Sources({ t }: { t: T }) {
  return (
    <section className="border-b border-hairline py-20 md:py-28">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 md:px-8 lg:grid-cols-[2fr_3fr] lg:gap-16">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <h2 className="text-balance text-h1 font-semibold text-ink md:text-display">{t("Every line holds up in an interview")}</h2>
          <p className="mt-4 max-w-md text-pretty text-emph text-ink-2">{t("Each rewrite links to something you said. Missing a fact? You get a question, not an invention.")}</p>
        </div>
        <div className="flex flex-col gap-3">
          <DiffLine
            grounded
            requirement={t("Cross-functional leadership")}
            before={t("Responsible for a team")}
            after={t("Led a 12-person squad across engineering, design and data")}
            evidence={t("12 people: eng, design and data")}
          />
          <DiffLine
            grounded
            requirement={t("Product-led growth")}
            before={t("Worked on onboarding for new users")}
            after={t("Launched self-serve onboarding that lifted activation 34%")}
            evidence={t("activation up 34% after the launch")}
          />
          <DiffLine grounded={false} requirement={t("Customer growth")} after={t("How many customers used the referral program? Add the number if you know it.")} />
          <p className="text-dense text-ink-2">{t("Example")}</p>
        </div>
      </div>
    </section>
  );
}

function Score({ t }: { t: T }) {
  return (
    <section className="border-b border-hairline bg-surface py-20 md:py-28">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-4 md:px-8 lg:grid-cols-2 lg:gap-16">
        <div>
          <h2 className="text-balance text-h1 font-semibold text-ink md:text-display">{t("Know where you stand before you apply")}</h2>
          <p className="mt-4 max-w-md text-pretty text-emph text-ink-2">{t("See how a recruiter and an ATS likely read your CV. It can't predict callbacks, and we won't pretend it can.")}</p>
          <Button asChild size="lg" className="mt-8">
            <Link href="/score">{t("Score my CV")}</Link>
          </Button>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col items-center gap-8 sm:flex-row sm:gap-10">
            <ScoreGauge value={78} size={148} label={t("CV score")} tip={t(SCORE_DISCLAIMER)} />
            <div className="flex w-full flex-col gap-4">
              <ScoreBar label="ATS" value={84} why={t("Can screening software read it and find this job's keywords.")} />
              <ScoreBar label={t("Impact")} value={71} why={t("Results with numbers, not duties.")} />
              <ScoreBar label={t("Clarity")} value={79} why={t("Easy to scan in ten seconds.")} />
            </div>
          </div>
          <p className="text-dense text-ink-2">{t("Example")}</p>
        </div>
      </div>
    </section>
  );
}

function Templates({ t }: { t: T }) {
  return (
    <section className="border-b border-hairline py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4 md:px-8">
        <h2 className="text-balance text-h1 font-semibold text-ink md:text-display">{t("{n} templates. All free.", { n: TEMPLATE_IDS.length })}</h2>
        <ul className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {SHOWCASE.map(({ template, accent }) => (
            <li key={template}>
              <Link href="/start" className="group block rounded-control">
                <span dir="ltr" className="block overflow-hidden rounded-control border border-hairline shadow-card transition-[border-color,transform] duration-micro group-hover:-translate-y-0.5 group-hover:border-hairline-strong">
                  <CvThumbnail data={SAMPLE} design={design(template, accent)} />
                </span>
                <span className="mt-2.5 block text-body text-ink-2 group-hover:text-ink">{getTemplateEntry(template)?.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function RestOfSearch({ t, voice }: { t: T; voice: boolean }) {
  const items = [
    ...(voice ? [{ icon: Mic, name: t("Talk"), line: t("Say it out loud. Watch your CV write itself.") }] : []),
    { icon: BriefcaseBusiness, name: t("Jobs"), line: t("Track every application in one place.") },
    { icon: MessagesSquare, name: t("Interview"), line: t("Rehearse the weak spots before the real thing.") },
    { icon: Wrench, name: t("Toolkit"), line: t("Cover letters, cold emails, salary talks.") },
  ];
  return (
    <section className="border-b border-hairline bg-surface py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4 md:px-8">
        <h2 className="text-balance text-h1 font-semibold text-ink md:text-display">{t("From first draft to final interview")}</h2>
        <ul className="mt-10 divide-y divide-hairline border-y border-hairline">
          {items.map(({ icon: Icon, name, line }) => (
            <li key={name} className="grid grid-cols-[24px_minmax(0,1fr)] items-baseline gap-x-4 gap-y-1 py-5 md:grid-cols-[24px_200px_minmax(0,1fr)]">
              <Icon className="size-5 translate-y-1 text-accent" aria-hidden />
              <h3 className="text-h3 font-semibold text-ink">{name}</h3>
              <p className="col-start-2 text-emph text-ink-2 md:col-start-3">{line}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Pricing({ t }: { t: T }) {
  const credits = POLAR_PLANS.mini;
  const unlimited = POLAR_PLANS.unlimited_monthly;
  const rows = [
    { name: t("Free"), price: "$0", line: t("CV, templates, PDF and Word") },
    { name: t("Credits"), price: t("From {price}", { price: `$${credits.amount}` }), line: t("Pay per AI task") },
    { name: t("Unlimited"), price: `$${unlimited.amount} ${t("/ month")}`, line: t("Cancel anytime") },
  ];
  return (
    <section className="border-b border-hairline py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4 md:px-8">
        <h2 className="text-balance text-h1 font-semibold text-ink md:text-display">{t("Free to build. Free to download.")}</h2>
        <dl className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
          {rows.map((r) => (
            <div key={r.name} className="border-t border-hairline-strong pt-4">
              <dt className="text-emph text-ink-2">{r.name}</dt>
              <dd className="mt-1 text-h1 font-semibold tabular text-ink">{r.price}</dd>
              <dd className="mt-1 text-body text-ink-2">{r.line}</dd>
            </div>
          ))}
        </dl>
        <Link href="/pricing" className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-control text-emph font-medium text-accent-ink underline-offset-4 hover:underline">
          {t("See pricing")} <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden />
        </Link>
      </div>
    </section>
  );
}

function FinalCta({ t }: { t: T }) {
  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-8 px-4 md:px-8">
        <h2 className="text-balance text-display font-semibold text-ink md:text-hero">{t("You've done the work. Now say it well.")}</h2>
        <PrimaryCta t={t} />
      </div>
    </section>
  );
}

export default async function LandingPage() {
  const { t, dir } = await getServerT();
  return (
    <div className="min-h-dvh bg-canvas">
      <ScrollDepthTracker page="landing" />
      <div className="sticky top-0 z-40">
        <AppHeader nav={false} logoHref="/">
          <Link href="/pricing" className="hidden h-9 items-center rounded-control px-3 text-body font-medium text-ink-2 hover:bg-surface-2 hover:text-ink sm:inline-flex">
            {t("Pricing")}
          </Link>
        </AppHeader>
      </div>
      <main dir={dir}>
        <Hero t={t} />
        <Sources t={t} />
        <Score t={t} />
        <Templates t={t} />
        <RestOfSearch t={t} voice={!!voiceConfig()} />
        <Pricing t={t} />
        <FinalCta t={t} />
      </main>
      <SiteFooter />
    </div>
  );
}
