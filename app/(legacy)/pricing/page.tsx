import Link from 'next/link';
import { Check, Sparkles, BarChart3, ShieldCheck, Lock, RotateCcw, ArrowRight } from 'lucide-react';
import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import { Logo } from "@/components/Logo";
import { CreditBalance } from "@/components/CreditBalance";
import { PolarCheckoutButton } from '@/components/PolarCheckoutButton';
import { CouponRedeem } from '@/components/CouponRedeem';
import { SiteFooter } from '@/components/shared/SiteFooter';
import { getServerT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

// One-time credit packs — the "pay as you go" track beneath the Unlimited hero.
// Starter ($3/5) is retired here: that price point now belongs to the 24h
// welcome flash (10 credits for $3).
const PACKS: { plan: "mini" | "pro" | "ultimate"; name: string; price: number; credits: number; perCredit: string; best?: boolean }[] = [
  { plan: "mini", name: "Mini", price: 3, credits: 3, perCredit: "$1.00 / credit" },
  { plan: "pro", name: "Pro", price: 9, credits: 20, perCredit: "$0.45 / credit", best: true },
  { plan: "ultimate", name: "Ultimate", price: 20, credits: 60, perCredit: "$0.33 / credit" },
];

export default async function PricingPage() {
  const { t } = await getServerT();
  const unlimitedConfigured = Boolean(process.env.POLAR_PRODUCT_UNLIMITED_MONTHLY);
  // The 3-month Job Search Pass: $90 once → 90 days of Unlimited, no auto-renew.
  // Fits a short, intense search better than a recurring plan people forget to cancel.
  const passConfigured = Boolean(process.env.POLAR_PRODUCT_UNLIMITED_QUARTER);

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-brand-ink">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-md border-b border-stone-200/60">
        <div className="relative w-full px-4 sm:px-8 md:px-16 h-16 sm:h-20 flex items-center justify-between gap-2">
          <Logo variant="dark" size="md" />
          <nav className="hidden md:flex items-center gap-10 absolute left-1/2 -translate-x-1/2">
            <Link href="/#hero" className="font-serif text-sm text-stone-500 hover:text-brand-navy transition-colors focus-visible:outline-none">{t("Home")}</Link>
            <Link href="/#templates" className="font-serif text-sm text-stone-500 hover:text-brand-navy transition-colors focus-visible:outline-none">{t("Templates")}</Link>
            <Link href="/#testimonials" className="font-serif text-sm text-stone-500 hover:text-brand-navy transition-colors focus-visible:outline-none">{t("Testimonials")}</Link>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3 md:gap-5">
            <Link
              href="/score"
              className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 sm:px-5 sm:py-2.5 bg-brand-navy hover:bg-brand-navy-hover text-white text-xs sm:text-sm font-medium rounded-sm shadow-sm hover:shadow-md transition-all duration-200 tracking-wide whitespace-nowrap focus-visible:outline-none"
            >
              <BarChart3 className="w-4 h-4" strokeWidth={1.5} />
              <span className="sm:hidden">{t("Score")}</span>
              <span className="hidden sm:inline">{t("CV Score Check")}</span>
            </Link>
            <SignedOut>
              <SignInButton mode="modal">
                <button className="hidden md:inline-flex px-5 py-2.5 text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors tracking-wide focus-visible:outline-none">{t("Sign In")}</button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="px-3 sm:px-6 py-1.5 sm:py-2.5 text-xs sm:text-sm font-medium bg-brand-navy hover:bg-brand-navy-hover text-white rounded-sm transition-colors tracking-wide whitespace-nowrap focus-visible:outline-none">{t("Get Started")}</button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <CreditBalance />
              <UserButton appearance={{ elements: { avatarBox: "w-9 h-9 sm:w-10 sm:h-10 ring-2 ring-stone-200" } }} />
            </SignedIn>
          </div>
        </div>
      </header>

      <div className="pt-10 sm:pt-14 pb-16 px-4 sm:px-8 lg:px-16">
        <div className="max-w-7xl mx-auto">
          {/* Hero header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-navy/5 text-brand-navy rounded-sm text-sm font-medium mb-7 tracking-wide">
              <Sparkles className="w-4 h-4" strokeWidth={1.5} />
              {t("Pricing")}
            </div>
            <h1 className="font-serif text-4xl sm:text-5xl font-light text-brand-ink mb-5 leading-tight">
              {t("Go unlimited, or pay as you go")}
            </h1>
            <div className="w-16 h-px bg-brand-navy mx-auto mb-6" />
            <p className="text-lg text-stone-500 max-w-2xl mx-auto font-light">
              {t("One plan for the whole job search, or buy a few credits when you just need one fix.")}
            </p>
          </div>

          {/* One lineup: Free · credit packs · Unlimited (highlighted) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-stretch max-w-7xl mx-auto">
            {/* Free */}
            <div className="bg-white rounded-sm border border-stone-200 p-6 flex flex-col">
              <h3 className="font-serif text-lg text-brand-ink">{t("Free")}</h3>
              <div className="mt-3 mb-4 flex items-baseline gap-1.5">
                <span className="font-serif text-3xl font-light text-brand-ink">$0</span>
              </div>
              <ul className="space-y-2.5 text-sm flex-1">
                <li className="flex items-start gap-2 text-stone-600 font-light"><Check className="w-4 h-4 text-brand-navy flex-shrink-0 mt-0.5" strokeWidth={1.8} />{t("ATS score & keyword gaps")}</li>
                <li className="flex items-start gap-2 text-stone-600 font-light"><Check className="w-4 h-4 text-brand-navy flex-shrink-0 mt-0.5" strokeWidth={1.8} />{t("Build with chat (3 free)")}</li>
                <li className="flex items-start gap-2 text-stone-400 font-light"><span className="w-4 text-center flex-shrink-0">·</span>{t("Downloads & full rewrite locked")}</li>
              </ul>
              <Link href="/score" className="mt-5 w-full px-4 py-2.5 border border-stone-300 hover:border-stone-400 text-stone-700 hover:text-stone-900 text-sm font-medium rounded-sm transition-all text-center">
                {t("Check my score")}
              </Link>
            </div>

            {/* Credit packs */}
            {PACKS.map((p) => (
              <div
                key={p.plan}
                className={`bg-white rounded-sm p-6 flex flex-col transition-all ${
                  p.best ? "border-2 border-brand-navy shadow-[0_8px_30px_-12px_rgba(10,38,71,0.25)]" : "border border-stone-200 hover:border-stone-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-lg text-brand-ink">{t(p.name)}</h3>
                  {p.best ? (
                    <span className="text-[10px] uppercase tracking-wider font-medium text-brand-navy bg-brand-navy/8 px-2 py-0.5 rounded-sm">{t("Popular")}</span>
                  ) : null}
                </div>
                <div className="mt-3 mb-1 flex items-baseline gap-1.5">
                  <span className="font-serif text-3xl font-light text-brand-ink">${p.price}</span>
                  <span className="text-xs text-stone-500 font-light">{t("once")}</span>
                </div>
                <p className="text-xs text-brand-navy font-medium">{t("{credits} credits", { credits: p.credits })}</p>
                <p className="text-xs text-stone-400 font-light mt-0.5 mb-4">{t(p.perCredit)}</p>
                <div className="flex-1" />
                <PolarCheckoutButton plan={p.plan} planName={p.name} amount={p.price} variant="primary" />
              </div>
            ))}

            {/* Unlimited — the flagship, sitting right in the lineup.
                order-first: ~90% of traffic is mobile, where the grid stacks —
                the "Best value" plan must lead, not sit buried in 5th place.
                lg:order-none restores the desktop lineup. */}
            <div className="relative order-first lg:order-none mt-3 lg:mt-0 bg-brand-navy text-white rounded-sm border-2 border-brand-gold shadow-[0_12px_44px_-14px_rgba(184,134,11,0.5)] p-6 flex flex-col">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-brand-gold text-white text-[10px] font-medium px-3 py-1 rounded-sm tracking-[0.12em] uppercase whitespace-nowrap">{t("Best value")}</span>
              </div>
              <h3 className="font-serif text-lg text-white">{t("Unlimited")}</h3>
              <div className="mt-3 mb-1 flex items-baseline gap-1.5">
                <span className="font-serif text-3xl font-light text-white">$15</span>
                <span className="text-xs text-white/55 font-light">{t("/ mo")}</span>
              </div>
              <p className="text-xs text-[#e7c66a] font-medium mb-4">{t("Everything, no limits")}</p>
              <ul className="space-y-2.5 text-sm flex-1">
                <li className="flex items-start gap-2 text-white/85 font-light"><Check className="w-4 h-4 text-[#e7c66a] flex-shrink-0 mt-0.5" strokeWidth={2} />{t("Unlimited scores & optimization")}</li>
                <li className="flex items-start gap-2 text-white/85 font-light"><Check className="w-4 h-4 text-[#e7c66a] flex-shrink-0 mt-0.5" strokeWidth={2} />{t("Unlimited downloads, every template")}</li>
                <li className="flex items-start gap-2 text-white/85 font-light"><Check className="w-4 h-4 text-[#e7c66a] flex-shrink-0 mt-0.5" strokeWidth={2} />{t("Unlimited chat & voice building")}</li>
                <li className="flex items-start gap-2 text-white/85 font-light"><Check className="w-4 h-4 text-[#e7c66a] flex-shrink-0 mt-0.5" strokeWidth={2} />{t("No credits — ever")}</li>
              </ul>
              {unlimitedConfigured ? (
                <Link
                  href="/api/checkout/polar?plan=unlimited_monthly"
                  className="group mt-5 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-gold hover:bg-brand-gold-deep text-white text-sm font-medium rounded-sm transition-colors text-center"
                >
                  {t("Go Unlimited")}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" strokeWidth={1.8} />
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  title={t("Available soon")}
                  className="mt-5 w-full px-4 py-2.5 bg-white/10 text-white/60 text-sm font-medium rounded-sm cursor-not-allowed border border-white/15"
                >
                  {t("Coming soon")}
                </button>
              )}
            </div>
          </div>
          <p className="text-center text-xs text-stone-400 font-light mt-4">
            {t("Credits never expire · Unlimited has no credits at all · Cancel anytime.")}
          </p>

          {/* Job Search Pass — one-time, time-boxed Unlimited. Surfaced only when the
              Polar product is configured (otherwise the CTA would dead-end). */}
          {passConfigured && (
            <div className="mt-8 max-w-3xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-sm border border-brand-gold/40 bg-brand-gold/[0.06] px-6 py-5">
                <div className="flex-1">
                  <p className="font-serif text-lg text-brand-ink">
                    {t("On an active search?")}{" "}
                    <span className="text-brand-navy">{t("Get the 3-month Job Search Pass")}</span>
                  </p>
                  <p className="text-sm text-stone-500 font-light mt-1">
                    {t("$90 once · 90 days of everything unlimited ·")} <strong className="font-medium text-stone-600">{t("no auto-renew")}</strong>. {t("Cheaper than 6 monthly bills, nothing to cancel.")}
                  </p>
                </div>
                <Link
                  href="/api/checkout/polar?plan=unlimited_quarter"
                  className="group flex-shrink-0 inline-flex items-center justify-center gap-2 px-6 py-3 bg-brand-navy hover:bg-brand-navy-hover text-white text-sm font-medium rounded-sm transition-colors whitespace-nowrap"
                >
                  {t("Get the Pass — $90")}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" strokeWidth={1.8} />
                </Link>
              </div>
            </div>
          )}

          {/* Trust signals */}
          <div className="mt-14 max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Matches /refund-policy: 14-day money-back on credit purchases. */}
            <Link href="/refund-policy" className="flex items-center gap-4 p-5 bg-white border border-stone-200 hover:border-stone-300 rounded-sm transition-colors">
              <ShieldCheck className="w-6 h-6 text-brand-navy flex-shrink-0" strokeWidth={1.5} />
              <div>
                <p className="font-medium text-brand-ink text-sm">{t("14-day money-back")}</p>
                <p className="text-stone-500 text-xs font-light">{t("Credit packs, no questions asked.")}</p>
              </div>
            </Link>
            <div className="flex items-center gap-4 p-5 bg-white border border-stone-200 rounded-sm">
              <RotateCcw className="w-6 h-6 text-brand-navy flex-shrink-0" strokeWidth={1.5} />
              <div>
                <p className="font-medium text-brand-ink text-sm">{t("Cancel anytime")}</p>
                <p className="text-stone-500 text-xs font-light">{t("Keep access through the period you paid for.")}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-5 bg-white border border-stone-200 rounded-sm">
              <Lock className="w-6 h-6 text-brand-navy flex-shrink-0" strokeWidth={1.5} />
              <div>
                <p className="font-medium text-brand-ink text-sm">{t("Secure checkout")}</p>
                <p className="text-stone-500 text-xs font-light">{t("Powered by Polar. Cards, Apple Pay, Google Pay.")}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-5 bg-white border border-stone-200 rounded-sm">
              <Check className="w-6 h-6 text-brand-navy flex-shrink-0" strokeWidth={1.5} />
              <div>
                <p className="font-medium text-brand-ink text-sm">{t("No lock-in")}</p>
                <p className="text-stone-500 text-xs font-light">{t("Prefer one-time? Credit packs never expire.")}</p>
              </div>
            </div>
          </div>

          {/* Coupon */}
          <div className="mt-12 max-w-2xl mx-auto">
            <CouponRedeem />
          </div>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
