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

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#0A2647]">
      <ScrollDepthTracker page="landing" />

      {/* Header — premium full-width navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 w-full bg-white/90 backdrop-blur-md border-b border-stone-200/60">
        <div className="w-full px-4 sm:px-8 md:px-16 h-16 sm:h-20 flex items-center justify-between gap-2 sm:gap-3">
          <Logo variant="dark" size="md" />
          <ActiveNavLinks />
          <div className="flex items-center gap-2 sm:gap-3 md:gap-5">
            <Link
              href="/score"
              className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 sm:px-5 sm:py-2.5 bg-[#0A2647] hover:bg-[#0d3259] text-white text-xs sm:text-sm font-medium rounded-sm shadow-sm hover:shadow-md transition-all duration-200 tracking-wide whitespace-nowrap focus-visible:outline-none"
            >
              <BarChart3 className="w-4 h-4" strokeWidth={1.5} />
              <span className="sm:hidden">Score</span>
              <span className="hidden sm:inline">CV Score Check</span>
            </Link>

            <SignedOut>
              <SignInButton mode="modal">
                <button className="hidden md:inline-flex px-5 py-2.5 text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors tracking-wide focus-visible:outline-none">
                  Sign In
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="px-3 sm:px-6 py-1.5 sm:py-2.5 text-xs sm:text-sm font-medium bg-[#0A2647] hover:bg-[#0d3259] text-white rounded-sm transition-colors tracking-wide whitespace-nowrap focus-visible:outline-none">
                  Get Started
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
        <div className="h-[100dvh] flex flex-col pt-16 sm:pt-20 pb-4">
          <div className="flex-1 min-h-0">
            <BuildOnboarding embedded />
          </div>
        </div>
        {/* Quiet scroll affordance into the story */}
        <a
          href="#rewrite"
          className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 lg:flex flex-col items-center gap-1.5 text-[#0A2647]/40 transition-colors hover:text-[#0A2647] focus-visible:outline-none"
        >
          <span className="font-mono text-[10px] uppercase tracking-[0.24em]">
            See how it works
          </span>
          <ChevronDown className="h-4 w-4 animate-bounce" strokeWidth={1.75} />
        </a>
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
          className="pointer-events-none absolute left-1/2 top-0 h-80 w-[42rem] -translate-x-1/2 rounded-full bg-[#B8860B] opacity-[0.05] blur-[120px]"
        />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-8 lg:px-16">
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-[#B8860B]">
              The rewrite engine
            </p>
            <h2 className="mt-4 text-balance font-serif text-3xl leading-[1.08] text-[#0A2647] sm:text-4xl md:text-[2.7rem]">
              One line decides whether they keep reading.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-[#0A2647]/55 sm:text-lg">
              Hired turns the lines you&rsquo;d actually write into the ones a
              recruiter repeats out loud. Same job — sharper proof.
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
        className="w-full bg-gradient-to-b from-[#0A2647] to-[#061A33] py-20 sm:py-28"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-8 lg:px-16">
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-[#D4A83F]">
              Before a human ever sees it
            </p>
            <h2 className="mt-4 text-balance font-serif text-3xl leading-[1.08] text-white sm:text-4xl md:text-[2.7rem]">
              Your résumé is read twice.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-white/60 sm:text-lg">
              First by software deciding if you&rsquo;re worth forwarding. Then by
              a person deciding if you&rsquo;re worth meeting. Most tools write for
              one. Hired writes for both.
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
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-[#B8860B]">
              The templates
            </p>
            <h2 className="mt-4 text-balance font-serif text-3xl leading-[1.08] text-[#0A2647] sm:text-4xl md:text-[2.7rem]">
              Built to survive the scan and earn the read.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-[#0A2647]/55 sm:text-lg">
              Every layout parses cleanly for the software and looks composed to
              the person. Start with one — switch anytime, nothing&rsquo;s locked in.
            </p>
          </div>

          <div className="mt-12 sm:mt-14">
            <TemplateGallery />
          </div>

          <div className="mt-10 flex flex-col items-center gap-4">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#0A2647]/40">
              + 9 more in the studio
            </p>
            <Link
              href="/build/chat"
              className="group inline-flex items-center gap-2.5 rounded-full bg-[#0A2647] px-7 py-3.5 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-[#0d3259] hover:shadow-md focus-visible:outline-none"
            >
              Start with a template
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
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-[#B8860B]">
              Early signals
            </p>
            <h2 className="mt-4 text-balance font-serif text-3xl leading-[1.08] text-[#0A2647] sm:text-4xl md:text-[2.7rem]">
              What people tell us after the rewrite.
            </h2>
            <div className="mt-6 flex justify-center">
              <SocialProofBadge />
            </div>
          </div>

          {/* Featured pull-quote */}
          <figure className="mx-auto mt-14 max-w-3xl text-center">
            <Quote
              className="mx-auto h-9 w-9 text-[#B8860B]/40"
              strokeWidth={1.25}
              aria-hidden
            />
            <blockquote className="mt-5 text-balance font-serif text-2xl leading-snug text-[#0A2647] sm:text-3xl md:text-[2.1rem] md:leading-[1.25]">
              &ldquo;I&rsquo;d been editing the same bullet for a week. Hired rewrote
              it in <span className="italic text-[#9a6b08]">one line</span> — and it
              was the line I actually wanted to say.&rdquo;
            </blockquote>
            <figcaption className="mt-6 font-mono text-xs uppercase tracking-[0.2em] text-[#0A2647]/50">
              Maya G. · Product Manager
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
            ].map((t) => (
              <blockquote
                key={t.name}
                className="rounded-2xl border border-[#0A2647]/8 bg-white p-7 text-left shadow-[0_18px_44px_-30px_rgba(10,38,71,0.4)]"
              >
                <p className="text-[15px] leading-relaxed text-[#0A2647]/75">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <footer className="mt-5 font-mono text-[11px] uppercase tracking-[0.18em] text-[#0A2647]/45">
                  {t.name} · {t.role}
                </footer>
              </blockquote>
            ))}
          </div>

          <p className="mt-10 text-center font-mono text-[11px] tracking-wide text-[#0A2647]/40">
            Quotes from anonymized user interviews. Outcomes vary.
          </p>
        </div>
      </section>

      {/* ============================================================
          FINAL CTA — the "Hired" payoff (deep navy + foil seal)
          ============================================================ */}
      <section className="relative w-full overflow-hidden bg-[#061A33] py-24 sm:py-32">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 h-[30rem] w-[30rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#B8860B] opacity-[0.08] blur-[130px]"
        />
        <div className="relative mx-auto max-w-2xl px-4 text-center sm:px-8">
          <HiredSeal />
          <h2 className="mt-9 text-balance font-serif text-4xl leading-[1.05] text-white sm:text-5xl">
            Stop tweaking. Get{" "}
            <span className="italic text-[#D4A83F]">hired.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-md text-pretty text-lg font-light leading-relaxed text-white/70">
            See where your résumé stands in 60 seconds — no signup, no card.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-5">
            <SignedOut>
              <Link
                href="/score"
                className="group inline-flex items-center justify-center gap-3 rounded-sm bg-white px-8 py-4 font-medium text-[#0A2647] shadow-sm transition-all hover:-translate-y-0.5 hover:bg-stone-50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 sm:px-10 sm:py-5"
              >
                Check your score — free
                <ArrowRight
                  className="h-5 w-5 transition-transform group-hover:translate-x-1"
                  strokeWidth={1.5}
                />
              </Link>
              <Link
                href="#hero"
                className="text-sm font-light tracking-wide text-white/70 underline-offset-4 transition-colors hover:text-white hover:underline focus-visible:outline-none"
              >
                or build one from scratch
              </Link>
            </SignedOut>
            <SignedIn>
              <Link
                href="/build/chat"
                className="group inline-flex items-center justify-center gap-3 rounded-sm bg-white px-8 py-4 font-medium text-[#0A2647] shadow-sm transition-all hover:-translate-y-0.5 hover:bg-stone-50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 sm:px-10 sm:py-5"
              >
                Continue building
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
