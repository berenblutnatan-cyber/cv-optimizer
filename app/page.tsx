import Link from "next/link";
import { ArrowRight, BarChart3, ChevronDown, Quote } from "lucide-react";
import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import { Logo } from "@/components/Logo";
import { ActiveNavLinks } from "@/components/landing/ActiveNavLinks";
import { CreditBalance } from "@/components/CreditBalance";
import { SiteFooter } from "@/components/shared/SiteFooter";
import { ScrollDepthTracker } from "@/components/ScrollDepthTracker";
import { BuildOnboarding } from "@/components/build/BuildOnboarding";
import { SocialProofBadge } from "@/components/landing/SocialProofBadge";
import { RewriteShowcase } from "@/components/landing/RewriteShowcase";
import { TwoReaders } from "@/components/landing/TwoReaders";
import { TemplateGallery } from "@/components/landing/TemplateGallery";
import { LanguageToggle } from "@/components/LanguageToggle";
import { getServerT } from "@/lib/i18n/server";

export default async function LandingPage() {
  const { t } = await getServerT();
  return (
    <div className="min-h-screen bg-[#FAFAF8] text-brand-navy">
      <ScrollDepthTracker page="landing" />

      {/* Header — premium full-width navbar. Sticky (not fixed) so the global
          in-app-browser banner can sit above it in normal flow without either
          bar covering the other. */}
      <header className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-md border-b border-stone-200/60">
        <div className="w-full px-4 sm:px-8 md:px-16 h-16 sm:h-20 flex items-center justify-between gap-2 sm:gap-3">
          <Logo variant="dark" size="md" />
          <ActiveNavLinks />
          <div className="flex items-center gap-2 sm:gap-3 md:gap-5">
            <Link
              href="/score"
              className="inline-flex min-h-11 items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-5 sm:py-2.5 bg-brand-navy hover:bg-brand-navy-hover text-white text-xs sm:text-sm font-medium rounded-sm shadow-sm hover:shadow-md transition-all duration-200 tracking-wide whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/70 focus-visible:ring-offset-2"
            >
              <BarChart3 className="w-4 h-4" strokeWidth={1.5} />
              <span className="sm:hidden">{t("Score")}</span>
              <span className="hidden sm:inline">{t("CV Score Check")}</span>
            </Link>

            <LanguageToggle className="sm:hidden" compact />
            <LanguageToggle className="hidden sm:inline-flex" />

            <SignedOut>
              <SignInButton mode="modal">
                <button className="hidden md:inline-flex px-5 py-2.5 text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors tracking-wide focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/70 focus-visible:ring-offset-2 rounded-sm">
                  {t("Sign In")}
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="inline-flex min-h-11 items-center justify-center px-3 sm:px-6 py-1.5 sm:py-2.5 text-xs sm:text-sm font-medium bg-brand-navy hover:bg-brand-navy-hover text-white rounded-sm transition-colors tracking-wide whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/70 focus-visible:ring-offset-2">
                  {t("Get Started")}
                </button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <CreditBalance />
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "w-9 h-9 sm:w-10 sm:h-10 ring-2 ring-stone-200",
                  },
                }}
              />
            </SignedIn>
          </div>
        </div>
      </header>

      {/* HERO — the home IS the guided funnel (role → goal → template), which
          drafts the CV live. The narrative below is for scrollers / SEO. */}
      <section id="hero" className="relative w-full bg-[#FAFAF8]">
        {/* Header is sticky (in flow), so the hero fills the REST of the
            viewport: 100dvh minus the 4rem/5rem header. The scroll cue is in
            flow at the bottom on every breakpoint — mobile (~90% of traffic)
            gets the same "there's more below" signal as desktop. Mobile keeps
            an extra 2rem of slack so the cue stays above the fold even when
            the in-app-browser banner is pushing the page down. */}
        <div className="h-[calc(100dvh-6rem)] sm:h-[calc(100dvh-5rem)] flex flex-col pb-2">
          <div className="flex-1 min-h-0">
            <BuildOnboarding embedded />
          </div>
          {/* Quiet scroll affordance into the story */}
          <a
            href="#rewrite"
            className="mx-auto flex min-h-11 flex-col items-center justify-center gap-1 rounded-md px-4 text-brand-navy/60 transition-colors hover:text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/70 focus-visible:ring-offset-2"
          >
            <span className="font-mono text-xs uppercase tracking-[0.24em]">
              {t("See how it works")}
            </span>
            <ChevronDown className="h-4 w-4 motion-safe:animate-bounce" strokeWidth={1.75} />
          </a>
        </div>
      </section>

      {/* ============================================================
          SIGNATURE — THE REWRITE ENGINE
          One line, two voices: the flat draft (mono) → the sharp,
          quantified rewrite (serif), with the ATS score climbing.
          ============================================================ */}
      <section id="rewrite" className="relative w-full overflow-hidden bg-[#FAFAF8] py-20 sm:py-28">
        {/* faint warm halo, echoing the funnel above */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 h-80 w-[42rem] -translate-x-1/2 rounded-full bg-brand-gold opacity-[0.05] blur-[120px]"
        />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-8 lg:px-16">
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-brand-gold-deep">
              {t("The rewrite engine")}
            </p>
            <h2 className="mt-4 text-balance font-serif text-3xl leading-[1.08] text-brand-navy sm:text-4xl md:text-[2.7rem]">
              {t("One line decides whether they keep reading.")}
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-brand-navy/70 sm:text-lg">
              {t("Hired turns the lines you’d actually write into the ones a recruiter repeats out loud. Same job — sharper proof.")}
            </p>
          </div>

          <div className="mt-12 sm:mt-14">
            <RewriteShowcase />
          </div>
        </div>
      </section>

      {/* ============================================================
          TWO READERS — why the rewrite works (navy / machine register)
          ============================================================ */}
      <section
        id="two-readers"
        className="w-full bg-gradient-to-b from-brand-navy to-[#061A33] py-20 sm:py-28"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-8 lg:px-16">
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-brand-gold-soft">
              {t("Before a human ever sees it")}
            </p>
            <h2 className="mt-4 text-balance font-serif text-3xl leading-[1.08] text-white sm:text-4xl md:text-[2.7rem]">
              {t("Your CV is read twice.")}
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-white/60 sm:text-lg">
              {t("First by software deciding if you’re worth forwarding. Then by a person deciding if you’re worth meeting. Most tools write for one. Hired writes for both.")}
            </p>
          </div>

          <div className="mt-12 sm:mt-14">
            <TwoReaders />
          </div>
        </div>
      </section>

      {/* ============================================================
          TEMPLATES — the artifact (premium documents)
          ============================================================ */}
      <section id="templates" className="w-full bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-8 lg:px-16">
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-brand-gold-deep">
              {t("The templates")}
            </p>
            <h2 className="mt-4 text-balance font-serif text-3xl leading-[1.08] text-brand-navy sm:text-4xl md:text-[2.7rem]">
              {t("Built to survive the scan and earn the read.")}
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-brand-navy/70 sm:text-lg">
              {t("Every layout parses cleanly for the software and looks composed to the person. Start with one — switch anytime, nothing’s locked in.")}
            </p>
          </div>

          <div className="mt-12 sm:mt-14">
            <TemplateGallery />
          </div>

          <div className="mt-10 flex flex-col items-center gap-4">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-brand-navy/60">
              {t("+ 9 more in the studio")}
            </p>
            <Link
              href="/build/chat"
              className="group inline-flex items-center gap-2.5 rounded-full bg-brand-navy px-7 py-3.5 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-brand-navy-hover hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/70 focus-visible:ring-offset-2"
            >
              {t("Start with a template")}
              <ArrowRight
                className="h-4 w-4 transition-transform group-hover:translate-x-1"
                strokeWidth={1.75}
              />
            </Link>
          </div>
        </div>
      </section>

      {/* ============================================================
          STORIES — proof, editorial pull-quotes (honest)
          ============================================================ */}
      <section id="stories" className="w-full bg-[#FAFAF8] py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-8 lg:px-16">
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-brand-gold-deep">
              {t("Early signals")}
            </p>
            <h2 className="mt-4 text-balance font-serif text-3xl leading-[1.08] text-brand-navy sm:text-4xl md:text-[2.7rem]">
              {t("What people tell us after the rewrite.")}
            </h2>
            <div className="mt-6 flex justify-center">
              <SocialProofBadge />
            </div>
          </div>

          {/* Featured pull-quote */}
          <figure className="mx-auto mt-14 max-w-3xl text-center">
            <Quote
              className="mx-auto h-9 w-9 text-brand-gold/40"
              strokeWidth={1.25}
              aria-hidden
            />
            <blockquote className="mt-5 text-balance font-serif text-2xl leading-snug text-brand-navy sm:text-3xl md:text-[2.1rem] md:leading-[1.25]">
              {t("“I’d been editing the same bullet for a week. Hired rewrote it in one line — and it was the line I actually wanted to say.”")}
            </blockquote>
            <figcaption className="mt-6 font-mono text-xs uppercase tracking-[0.2em] text-brand-navy/60">
              Maya G. · {t("Product Manager")}
            </figcaption>
          </figure>

          {/* Supporting quotes */}
          <div className="mx-auto mt-14 grid max-w-4xl gap-5 sm:grid-cols-2">
            {[
              {
                quote:
                  "It caught keyword gaps I'd never have spotted — then made the rewrite sound like me, not a template.",
                name: "Amit R.",
                role: "Software Engineer",
              },
              {
                quote:
                  "Coming from a non-traditional background, it gave me language for skills I could never put into words myself.",
                name: "Shaked A.",
                role: "Data Analyst",
              },
            ].map((item) => (
              <blockquote
                key={item.name}
                className="rounded-2xl border border-brand-navy/8 bg-white p-7 text-start shadow-[0_18px_44px_-30px_rgba(10,38,71,0.4)]"
              >
                <p className="text-[15px] leading-relaxed text-brand-navy/75">
                  &ldquo;{t(item.quote)}&rdquo;
                </p>
                <footer className="mt-5 font-mono text-[11px] uppercase tracking-[0.18em] text-brand-navy/60">
                  {item.name} · {t(item.role)}
                </footer>
              </blockquote>
            ))}
          </div>

          <p className="mt-10 text-center font-mono text-[11px] tracking-wide text-brand-navy/60">
            {t("Quotes from anonymized user interviews. Outcomes vary.")}
          </p>
        </div>
      </section>

      {/* ============================================================
          FINAL CTA — the "Hired" payoff (deep navy + foil seal)
          ============================================================ */}
      <section className="relative w-full overflow-hidden bg-[#061A33] py-24 sm:py-32">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 h-[30rem] w-[30rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-gold opacity-[0.08] blur-[130px]"
        />
        <div className="relative mx-auto max-w-2xl px-4 text-center sm:px-8">
          <HiredSeal />
          <h2 className="mt-9 text-balance font-serif text-4xl leading-[1.05] text-white sm:text-5xl">
            {t("Stop tweaking. Get")}{" "}
            <span className="italic text-brand-gold-soft">{t("hired.")}</span>
          </h2>
          <p className="mx-auto mt-6 max-w-md text-pretty text-lg font-light leading-relaxed text-white/70">
            {t("See where your CV stands in 60 seconds — no signup, no card.")}
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-5">
            <SignedOut>
              <Link
                href="/score"
                className="group inline-flex items-center justify-center gap-3 rounded-sm bg-white px-8 py-4 font-medium text-brand-navy shadow-sm transition-all hover:-translate-y-0.5 hover:bg-stone-50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 sm:px-10 sm:py-5"
              >
                {t("Check your score — free")}
                <ArrowRight
                  className="h-5 w-5 transition-transform group-hover:translate-x-1"
                  strokeWidth={1.5}
                />
              </Link>
              <Link
                href="#hero"
                className="text-sm font-light tracking-wide text-white/70 underline-offset-4 transition-colors hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#061A33] rounded-sm"
              >
                {t("or build one from scratch")}
              </Link>
            </SignedOut>
            <SignedIn>
              <Link
                href="/build/chat"
                className="group inline-flex items-center justify-center gap-3 rounded-sm bg-white px-8 py-4 font-medium text-brand-navy shadow-sm transition-all hover:-translate-y-0.5 hover:bg-stone-50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 sm:px-10 sm:py-5"
              >
                {t("Continue building")}
                <ArrowRight
                  className="h-5 w-5 transition-transform group-hover:translate-x-1"
                  strokeWidth={1.5}
                />
              </Link>
            </SignedIn>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

/* The foil seal — the page's closing signature. A stamp of approval that ties
   the product name to the emotional payoff. Static by choice (calm, not spinny). */
function HiredSeal() {
  return (
    <svg
      viewBox="0 0 200 200"
      className="mx-auto h-28 w-28 sm:h-32 sm:w-32"
      role="img"
      aria-label="Get Hired seal"
    >
      <defs>
        <linearGradient id="brassFoil" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F3D58A" />
          <stop offset="50%" stopColor="#D4A83F" />
          <stop offset="100%" stopColor="#B8860B" />
        </linearGradient>
        <path
          id="sealArc"
          d="M 100,100 m -76,0 a 76,76 0 1,1 152,0 a 76,76 0 1,1 -152,0"
          fill="none"
        />
      </defs>

      {/* rings */}
      <circle cx="100" cy="100" r="92" fill="none" stroke="url(#brassFoil)" strokeWidth="1.5" opacity="0.5" />
      <circle cx="100" cy="100" r="84" fill="none" stroke="url(#brassFoil)" strokeWidth="2.5" />
      <circle cx="100" cy="100" r="58" fill="none" stroke="url(#brassFoil)" strokeWidth="1" opacity="0.5" />

      {/* curved seal text */}
      <text
        fill="url(#brassFoil)"
        style={{
          fontFamily: "var(--font-mono), monospace",
          fontSize: "13px",
          letterSpacing: "5px",
          textTransform: "uppercase",
        }}
      >
        <textPath href="#sealArc" startOffset="2%">
          Get hired · Get hired · Get hired ·
        </textPath>
      </text>

      {/* center monogram — the Hired mark */}
      <g transform="translate(100 100)">
        <rect x="-26" y="-22" width="11" height="44" rx="1" fill="url(#brassFoil)" />
        <rect x="15" y="-22" width="11" height="44" rx="1" fill="url(#brassFoil)" />
        <path d="M -15 -3 L 15 2 L 15 9 L -15 4 Z" fill="#FFFFFF" opacity="0.85" />
      </g>
    </svg>
  );
}
