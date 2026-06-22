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

export const dynamic = "force-dynamic";

// One-time credit packs — the "pay as you go" track beneath the Unlimited hero.
// Starter ($3/5) is retired here: that price point now belongs to the 24h
// welcome flash (10 credits for $3).
const PACKS: { plan: "mini" | "pro" | "ultimate"; name: string; price: number; credits: number; perCredit: string; best?: boolean }[] = [
  { plan: "mini", name: "Mini", price: 3, credits: 3, perCredit: "just a few" },
  { plan: "pro", name: "Pro", price: 9, credits: 20, perCredit: "$0.45 / credit", best: true },
  { plan: "ultimate", name: "Ultimate", price: 20, credits: 60, perCredit: "$0.33 / credit" },
];

export default function PricingPage() {
  const unlimitedConfigured = Boolean(process.env.POLAR_PRODUCT_UNLIMITED_MONTHLY);

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#1a1a1a]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 w-full bg-white/90 backdrop-blur-md border-b border-stone-200/60">
        <div className="relative w-full px-4 sm:px-8 md:px-16 h-16 sm:h-20 flex items-center justify-between gap-2">
          <Logo variant="dark" size="md" />
          <nav className="hidden md:flex items-center gap-10 absolute left-1/2 -translate-x-1/2">
            <Link href="/#hero" className="font-serif text-sm text-stone-500 hover:text-[#0A2647] transition-colors focus-visible:outline-none">Home</Link>
            <Link href="/#templates" className="font-serif text-sm text-stone-500 hover:text-[#0A2647] transition-colors focus-visible:outline-none">Templates</Link>
            <Link href="/#testimonials" className="font-serif text-sm text-stone-500 hover:text-[#0A2647] transition-colors focus-visible:outline-none">Testimonials</Link>
          </nav>
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
                <button className="hidden md:inline-flex px-5 py-2.5 text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors tracking-wide focus-visible:outline-none">Sign In</button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="px-3 sm:px-6 py-1.5 sm:py-2.5 text-xs sm:text-sm font-medium bg-[#0A2647] hover:bg-[#0d3259] text-white rounded-sm transition-colors tracking-wide whitespace-nowrap focus-visible:outline-none">Get Started</button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <CreditBalance />
              <UserButton appearance={{ elements: { avatarBox: "w-9 h-9 sm:w-10 sm:h-10 ring-2 ring-stone-200" } }} />
            </SignedIn>
          </div>
        </div>
      </header>

      <div className="pt-28 sm:pt-32 pb-16 px-4 sm:px-8 lg:px-16">
        <div className="max-w-7xl mx-auto">
          {/* Hero header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#0A2647]/5 text-[#0A2647] rounded-sm text-sm font-medium mb-7 tracking-wide">
              <Sparkles className="w-4 h-4" strokeWidth={1.5} />
              Pricing
            </div>
            <h1 className="font-serif text-4xl sm:text-5xl font-light text-[#1a1a1a] mb-5 leading-tight">
              Go unlimited, or pay as you go
            </h1>
            <div className="w-16 h-px bg-[#0A2647] mx-auto mb-6" />
            <p className="text-lg text-stone-500 max-w-2xl mx-auto font-light">
              One plan for the whole job search, or buy a few credits when you just need one fix.
            </p>
          </div>

          {/* One lineup: Free · credit packs · Unlimited (highlighted) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-stretch max-w-7xl mx-auto">
            {/* Free */}
            <div className="bg-white rounded-sm border border-stone-200 p-6 flex flex-col">
              <h3 className="font-serif text-lg text-[#1a1a1a]">Free</h3>
              <div className="mt-3 mb-4 flex items-baseline gap-1.5">
                <span className="font-serif text-3xl font-light text-[#1a1a1a]">$0</span>
              </div>
              <ul className="space-y-2.5 text-sm flex-1">
                <li className="flex items-start gap-2 text-stone-600 font-light"><Check className="w-4 h-4 text-[#0A2647] flex-shrink-0 mt-0.5" strokeWidth={1.8} />ATS score & keyword gaps</li>
                <li className="flex items-start gap-2 text-stone-600 font-light"><Check className="w-4 h-4 text-[#0A2647] flex-shrink-0 mt-0.5" strokeWidth={1.8} />Build with chat (3 free)</li>
                <li className="flex items-start gap-2 text-stone-400 font-light"><span className="w-4 text-center flex-shrink-0">·</span>Downloads & full rewrite locked</li>
              </ul>
              <Link href="/score" className="mt-5 w-full px-4 py-2.5 border border-stone-300 hover:border-stone-400 text-stone-700 hover:text-stone-900 text-sm font-medium rounded-sm transition-all text-center">
                Check my score
              </Link>
            </div>

            {/* Credit packs */}
            {PACKS.map((p) => (
              <div
                key={p.plan}
                className={`bg-white rounded-sm p-6 flex flex-col transition-all ${
                  p.best ? "border-2 border-[#0A2647] shadow-[0_8px_30px_-12px_rgba(10,38,71,0.25)]" : "border border-stone-200 hover:border-stone-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-lg text-[#1a1a1a]">{p.name}</h3>
                  {p.best ? (
                    <span className="text-[10px] uppercase tracking-wider font-medium text-[#0A2647] bg-[#0A2647]/8 px-2 py-0.5 rounded-sm">Popular</span>
                  ) : null}
                </div>
                <div className="mt-3 mb-1 flex items-baseline gap-1.5">
                  <span className="font-serif text-3xl font-light text-[#1a1a1a]">${p.price}</span>
                  <span className="text-xs text-stone-500 font-light">once</span>
                </div>
                <p className="text-xs text-[#0A2647] font-medium">{p.credits} credits</p>
                <p className="text-xs text-stone-400 font-light mt-0.5 mb-4">{p.perCredit}</p>
                <div className="flex-1" />
                <PolarCheckoutButton plan={p.plan} planName={p.name} amount={p.price} variant="primary" />
              </div>
            ))}

            {/* Unlimited — the flagship, sitting right in the lineup */}
            <div className="relative bg-[#0A2647] text-white rounded-sm border-2 border-[#B8860B] shadow-[0_12px_44px_-14px_rgba(184,134,11,0.5)] p-6 flex flex-col">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-[#B8860B] text-white text-[10px] font-medium px-3 py-1 rounded-sm tracking-[0.12em] uppercase whitespace-nowrap">Best value</span>
              </div>
              <h3 className="font-serif text-lg text-white">Unlimited</h3>
              <div className="mt-3 mb-1 flex items-baseline gap-1.5">
                <span className="font-serif text-3xl font-light text-white">$15</span>
                <span className="text-xs text-white/55 font-light">/ mo</span>
              </div>
              <p className="text-xs text-[#e7c66a] font-medium mb-4">Everything, no limits</p>
              <ul className="space-y-2.5 text-sm flex-1">
                <li className="flex items-start gap-2 text-white/85 font-light"><Check className="w-4 h-4 text-[#e7c66a] flex-shrink-0 mt-0.5" strokeWidth={2} />Unlimited scores & optimization</li>
                <li className="flex items-start gap-2 text-white/85 font-light"><Check className="w-4 h-4 text-[#e7c66a] flex-shrink-0 mt-0.5" strokeWidth={2} />Unlimited downloads, every template</li>
                <li className="flex items-start gap-2 text-white/85 font-light"><Check className="w-4 h-4 text-[#e7c66a] flex-shrink-0 mt-0.5" strokeWidth={2} />Unlimited chat & voice building</li>
                <li className="flex items-start gap-2 text-white/85 font-light"><Check className="w-4 h-4 text-[#e7c66a] flex-shrink-0 mt-0.5" strokeWidth={2} />No credits — ever</li>
              </ul>
              {unlimitedConfigured ? (
                <Link
                  href="/api/checkout/polar?plan=unlimited_monthly"
                  className="group mt-5 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#B8860B] hover:bg-[#a3760a] text-white text-sm font-medium rounded-sm transition-colors text-center"
                >
                  Go Unlimited
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" strokeWidth={1.8} />
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  title="Available soon"
                  className="mt-5 w-full px-4 py-2.5 bg-white/10 text-white/60 text-sm font-medium rounded-sm cursor-not-allowed border border-white/15"
                >
                  Coming soon
                </button>
              )}
            </div>
          </div>
          <p className="text-center text-xs text-stone-400 font-light mt-4">
            Credits never expire · Unlimited has no credits at all · Cancel anytime.
          </p>

          {/* Trust signals */}
          <div className="mt-14 max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-4 p-5 bg-white border border-stone-200 rounded-sm">
              <RotateCcw className="w-6 h-6 text-[#0A2647] flex-shrink-0" strokeWidth={1.5} />
              <div>
                <p className="font-medium text-[#1a1a1a] text-sm">Cancel anytime</p>
                <p className="text-stone-500 text-xs font-light">Keep access through the period you paid for.</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-5 bg-white border border-stone-200 rounded-sm">
              <Lock className="w-6 h-6 text-[#0A2647] flex-shrink-0" strokeWidth={1.5} />
              <div>
                <p className="font-medium text-[#1a1a1a] text-sm">Secure checkout</p>
                <p className="text-stone-500 text-xs font-light">Powered by Polar. Cards, Apple Pay, Google Pay.</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-5 bg-white border border-stone-200 rounded-sm">
              <ShieldCheck className="w-6 h-6 text-[#0A2647] flex-shrink-0" strokeWidth={1.5} />
              <div>
                <p className="font-medium text-[#1a1a1a] text-sm">No lock-in</p>
                <p className="text-stone-500 text-xs font-light">Prefer one-time? Credit packs never expire.</p>
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
