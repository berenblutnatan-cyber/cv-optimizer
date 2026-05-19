import Link from "next/link";
import { Check, Star, Zap, ArrowRight, FileText, Target, Lock, Bot, BarChart3, Plus, Wand2, ArrowUp, Coins } from "lucide-react";
import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import { Logo } from "@/components/Logo";
import { HeroResumeVisual } from "@/components/landing/HeroResumeVisual";
import { ActiveNavLinks } from "@/components/landing/ActiveNavLinks";
import { CreditBalance } from "@/components/CreditBalance";
import { SiteFooter } from "@/components/shared/SiteFooter";
import { ScrollDepthTracker } from "@/components/ScrollDepthTracker";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#1a1a1a]">
      <ScrollDepthTracker page="landing" />
      {/* Header - Premium Full Width Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 w-full bg-white/90 backdrop-blur-md border-b border-stone-200/60">
        <div className="w-full px-4 sm:px-8 md:px-16 h-16 sm:h-20 flex items-center justify-between gap-2 sm:gap-3">
          {/* Logo - Far Left */}
          <Logo variant="dark" size="md" />

          {/* Navigation Links - Center */}
          <ActiveNavLinks />

          {/* Score Button + Auth Buttons - Far Right */}
          <div className="flex items-center gap-2 sm:gap-3 md:gap-5">
            {/* Lead Magnet: Check Score */}
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
                    avatarBox: "w-9 h-9 sm:w-10 sm:h-10 ring-2 ring-stone-200"
                  }
                }}
              />
            </SignedIn>
          </div>
        </div>
      </header>

      {/* Hero Section. Heights/margins are tight on mobile because Clarity
          shows scroll-depth dies at ~25% on prod — the duo cards must be
          visible without scrolling. */}
      <section id="hero" className="relative w-full lg:min-h-screen flex flex-col pt-20 sm:pt-28 pb-10 sm:pb-8">
        {/* Subtle background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#FAFAF8] via-white to-stone-50" />

        <div className="relative flex-1 flex items-center max-w-7xl mx-auto px-4 sm:px-8 lg:px-16 w-full">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center w-full">
            {/* Left Content */}
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-[#0A2647]/5 text-[#0A2647] rounded-sm text-xs sm:text-sm font-medium mb-4 sm:mb-8 tracking-wide">
                <Wand2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={1.5} />
                AI-Powered Resume Builder
              </div>

              <h1 className="font-serif text-3xl sm:text-5xl lg:text-[4rem] font-normal tracking-tight text-[#1a1a1a] mb-4 sm:mb-8 leading-[1.1]">
                Beat the bots.{" "}
                <span className="text-indigo-600">Land the interview.</span>
              </h1>

              <p className="text-sm sm:text-lg text-stone-500 mb-6 sm:mb-8 leading-relaxed font-light">
                AI tailors your resume for every job posting — ATS-ready in under 60 seconds. Don't just apply. <span className="text-[#0A2647] font-bold">Get Hired.</span>
              </p>

              {/* Primary Lead Magnet — Big Score CTA. This is the highest-converting
                  entry point (no signup, 60s result). It must dominate above the fold. */}
              <Link
                href="/score"
                className="group relative inline-flex items-center justify-center gap-2 sm:gap-3 w-full sm:w-auto px-6 sm:px-10 py-4 sm:py-5 bg-gradient-to-r from-[#B8860B] to-[#d4a017] hover:from-[#9c7409] hover:to-[#b8870e] text-white font-semibold rounded-sm transition-all duration-300 mb-3 sm:mb-4 tracking-wide focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B8860B]/40 overflow-hidden animate-cta-glow motion-reduce:animate-none"
              >
                <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 animate-shimmer-x motion-reduce:hidden" />
                <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 relative" strokeWidth={2} />
                <span className="relative text-base sm:text-xl">Check Your CV Score — Free</span>
                <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 group-hover:translate-x-1 transition-transform relative" strokeWidth={2} />
              </Link>
              <p className="text-xs sm:text-sm text-stone-500 font-light mb-6 sm:mb-10 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="inline-flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-[#0A2647]" strokeWidth={2} />
                  No signup
                </span>
                <span className="text-stone-300">·</span>
                <span className="inline-flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-[#0A2647]" strokeWidth={2} />
                  60-second result
                </span>
                <span className="text-stone-300">·</span>
                <span className="inline-flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-[#0A2647]" strokeWidth={2} />
                  ATS-graded
                </span>
              </p>

              <div className="flex items-center gap-3 mb-4 sm:mb-5">
                <div className="h-px flex-1 bg-stone-200" />
                <span className="text-[10px] sm:text-xs uppercase tracking-[0.18em] text-stone-400 font-medium">Or start from scratch</span>
                <div className="h-px flex-1 bg-stone-200" />
              </div>

              {/* Secondary entry points — keep visible but visually subordinate
                  to the score CTA above. */}
              <div className="grid grid-cols-2 gap-3 sm:gap-5 mb-10">
                {/* Create New Resume Card */}
                <Link
                  href="/builder"
                  className="group relative flex flex-col p-4 sm:p-7 bg-white hover:bg-stone-50 border border-stone-200 hover:border-stone-300 rounded-sm transition-all duration-300 shadow-soft hover:shadow-lift focus-visible:outline-none"
                >
                  <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-[#0A2647]/5 flex items-center justify-center mb-3 sm:mb-5 group-hover:scale-105 transition-transform">
                    <Plus className="w-4 h-4 sm:w-5 sm:h-5 text-[#0A2647]" strokeWidth={1.5} />
                  </div>
                  <h3 className="font-serif text-base sm:text-xl text-[#1a1a1a] mb-1 sm:mb-2">Create New Resume</h3>
                  <p className="hidden sm:block text-sm text-stone-500 font-light mb-5">Start fresh with our guided builder</p>
                  <div className="flex items-center gap-1.5 sm:gap-2 text-[#0A2647] font-medium text-xs sm:text-sm mt-auto tracking-wide">
                    Build my resume
                    <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:translate-x-1 transition-transform" strokeWidth={1.5} />
                  </div>
                </Link>

                {/* Optimize Existing Card */}
                <Link
                  href="/optimize"
                  className="group relative flex flex-col p-4 sm:p-7 bg-white hover:bg-stone-50 border border-stone-200 hover:border-stone-300 rounded-sm transition-all duration-300 shadow-soft hover:shadow-lift focus-visible:outline-none"
                >
                  <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-[#B8860B]/10 flex items-center justify-center mb-3 sm:mb-5 group-hover:scale-105 transition-transform">
                    <Wand2 className="w-4 h-4 sm:w-5 sm:h-5 text-[#B8860B]" strokeWidth={1.5} />
                  </div>
                  <h3 className="font-serif text-base sm:text-xl text-[#1a1a1a] mb-1 sm:mb-2">Optimize Existing</h3>
                  <p className="hidden sm:block text-sm text-stone-500 font-light mb-5">Upload & enhance with AI magic</p>
                  <div className="flex items-center gap-1.5 sm:gap-2 text-[#0A2647] font-medium text-xs sm:text-sm mt-auto tracking-wide">
                    Optimize mine
                    <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:translate-x-1 transition-transform" strokeWidth={1.5} />
                  </div>
                </Link>
              </div>

            </div>
            
            {/* Right Visual - 3D Floating Resume */}
            <div className="hidden md:block relative">
              <HeroResumeVisual />
            </div>
          </div>
          
        </div>
        
        {/* Trust Bar - Full width at bottom of hero content */}
        <div className="relative z-10 w-full mt-12 lg:mt-auto pt-8 border-t border-stone-200/60 px-4 sm:px-8 lg:px-16">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 max-w-5xl mx-auto">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#0A2647]/5 flex items-center justify-center flex-shrink-0">
                <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-[#0A2647]" strokeWidth={1.5} />
              </div>
              <span className="text-xs sm:text-sm text-[#1a1a1a] font-semibold">Privacy First</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#0A2647]/5 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-[#0A2647]" strokeWidth={1.5} />
              </div>
              <span className="text-xs sm:text-sm text-[#1a1a1a] font-semibold">AI Powered</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#0A2647]/5 flex items-center justify-center flex-shrink-0">
                <Target className="w-4 h-4 sm:w-5 sm:h-5 text-[#0A2647]" strokeWidth={1.5} />
              </div>
              <span className="text-xs sm:text-sm text-[#1a1a1a] font-semibold">ATS Optimized</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#0A2647]/5 flex items-center justify-center flex-shrink-0">
                <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-[#0A2647]" strokeWidth={1.5} />
              </div>
              <span className="text-xs sm:text-sm text-[#1a1a1a] font-semibold">60-Second Score</span>
            </div>
          </div>
        </div>
      </section>

      {/* Templates Section */}
      <section id="templates" className="w-full lg:min-h-screen flex items-center py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-16">
          <div className="grid lg:grid-cols-2 gap-12 sm:gap-16 lg:gap-20 items-center">
            {/* Template Grid Visual */}
            <div className="order-2 lg:order-1">
              <div className="grid grid-cols-2 gap-4 sm:gap-5 max-w-md mx-auto lg:mx-0">
                {/* Template 1: The Ivy */}
                <div className="bg-white rounded-sm border border-stone-200 p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="aspect-[3/4] bg-white border border-stone-100 rounded-sm mb-3 p-3 overflow-hidden">
                    <div className="space-y-2">
                      <div className="text-center border-b border-stone-100 pb-2 mb-2">
                        <div className="h-2 w-16 bg-stone-800 rounded-sm mx-auto mb-1" />
                        <div className="h-1 w-20 bg-stone-300 rounded-sm mx-auto" />
                      </div>
                      <div className="h-1 w-8 bg-stone-400 rounded-sm" />
                      <div className="space-y-1">
                        <div className="h-0.5 w-full bg-stone-200 rounded-sm" />
                        <div className="h-0.5 w-5/6 bg-stone-200 rounded-sm" />
                      </div>
                      <div className="h-1 w-10 bg-stone-400 rounded-sm mt-2" />
                      <div className="space-y-1">
                        <div className="h-0.5 w-full bg-stone-200 rounded-sm" />
                        <div className="h-0.5 w-4/5 bg-stone-200 rounded-sm" />
                        <div className="h-0.5 w-full bg-stone-200 rounded-sm" />
                      </div>
                    </div>
                  </div>
                  <p className="font-serif text-sm text-[#1a1a1a]">The Ivy</p>
                  <p className="text-xs text-stone-500 font-light">Classic & Professional</p>
                </div>
                {/* Template 2: The Modern (Popular) */}
                <div className="bg-white rounded-sm border-2 border-indigo-500 p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="aspect-[3/4] bg-white border border-stone-100 rounded-sm mb-3 overflow-hidden flex">
                    <div className="w-1/3 bg-indigo-600 p-2">
                      <div className="w-6 h-6 rounded-full bg-white/30 mx-auto mb-2" />
                      <div className="space-y-1">
                        <div className="h-0.5 w-full bg-white/40 rounded-sm" />
                        <div className="h-0.5 w-4/5 bg-white/30 rounded-sm" />
                      </div>
                    </div>
                    <div className="flex-1 p-2">
                      <div className="h-1.5 w-12 bg-stone-700 rounded-sm mb-2" />
                      <div className="space-y-1 mb-2">
                        <div className="h-0.5 w-full bg-stone-200 rounded-sm" />
                        <div className="h-0.5 w-5/6 bg-stone-200 rounded-sm" />
                      </div>
                      <div className="h-1 w-8 bg-stone-400 rounded-sm mb-1" />
                      <div className="space-y-0.5">
                        <div className="h-0.5 w-full bg-stone-200 rounded-sm" />
                        <div className="h-0.5 w-4/5 bg-stone-200 rounded-sm" />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-serif text-sm text-[#1a1a1a]">The Modern</p>
                      <p className="text-xs text-stone-500 font-light">Bold & Contemporary</p>
                    </div>
                    <span className="text-[10px] font-medium text-indigo-600 bg-indigo-100 px-2 py-1 rounded-sm">Popular</span>
                  </div>
                </div>
                {/* Template 3: Executive */}
                <div className="bg-white rounded-sm border border-stone-200 p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="aspect-[3/4] bg-white border border-stone-100 rounded-sm mb-3 p-3 overflow-hidden">
                    <div className="border-b-2 border-[#B8860B] pb-2 mb-2">
                      <div className="h-2 w-20 bg-stone-800 rounded-sm mb-1" />
                      <div className="h-1 w-24 bg-stone-300 rounded-sm" />
                    </div>
                    <div className="space-y-2">
                      <div className="h-1 w-10 bg-[#B8860B] rounded-sm" />
                      <div className="space-y-1">
                        <div className="h-0.5 w-full bg-stone-200 rounded-sm" />
                        <div className="h-0.5 w-5/6 bg-stone-200 rounded-sm" />
                      </div>
                      <div className="h-1 w-8 bg-[#B8860B] rounded-sm mt-2" />
                      <div className="space-y-1">
                        <div className="h-0.5 w-full bg-stone-200 rounded-sm" />
                        <div className="h-0.5 w-4/5 bg-stone-200 rounded-sm" />
                      </div>
                    </div>
                  </div>
                  <p className="font-serif text-sm text-[#1a1a1a]">Executive</p>
                  <p className="text-xs text-stone-500 font-light">Senior Leadership</p>
                </div>
                {/* Template 4: Creative */}
                <div className="bg-white rounded-sm border border-stone-200 p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="aspect-[3/4] bg-white border border-stone-100 rounded-sm mb-3 overflow-hidden">
                    <div className="h-8 bg-gradient-to-r from-violet-500 to-purple-600 mb-2" />
                    <div className="px-3 space-y-2">
                      <div className="h-1.5 w-16 bg-stone-700 rounded-sm" />
                      <div className="space-y-1">
                        <div className="h-0.5 w-full bg-stone-200 rounded-sm" />
                        <div className="h-0.5 w-5/6 bg-stone-200 rounded-sm" />
                      </div>
                      <div className="flex gap-1 mt-2">
                        <div className="h-3 w-8 bg-violet-100 rounded-sm" />
                        <div className="h-3 w-6 bg-purple-100 rounded-sm" />
                        <div className="h-3 w-7 bg-violet-100 rounded-sm" />
                      </div>
                    </div>
                  </div>
                  <p className="font-serif text-sm text-[#1a1a1a]">Creative</p>
                  <p className="text-xs text-stone-500 font-light">Design & Marketing</p>
                </div>
              </div>
            </div>

            {/* Text Content */}
            <div className="order-1 lg:order-2 max-w-lg lg:justify-self-end">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#0A2647]/5 text-[#0A2647] rounded-sm text-sm font-medium mb-5 tracking-wide">
                <FileText className="w-4 h-4" strokeWidth={1.5} />
                Premium Templates
              </div>
              <h3 className="font-serif text-3xl sm:text-4xl font-light text-[#1a1a1a] mb-5">
                Designed to Get You Hired
              </h3>
              <p className="text-base text-stone-500 mb-8 leading-relaxed font-light">
                Our templates are designed by hiring experts from top companies. 
                Each template is optimized for both human recruiters and ATS systems.
              </p>
              <ul className="space-y-4">
                <li className="flex items-center gap-4 text-stone-600 font-light">
                  <Check className="w-5 h-5 text-[#0A2647] flex-shrink-0" strokeWidth={1.5} />
                  Designed by HR professionals
                </li>
                <li className="flex items-center gap-4 text-stone-600 font-light">
                  <Check className="w-5 h-5 text-[#0A2647] flex-shrink-0" strokeWidth={1.5} />
                  ATS-friendly formatting
                </li>
                <li className="flex items-center gap-4 text-stone-600 font-light">
                  <Check className="w-5 h-5 text-[#0A2647] flex-shrink-0" strokeWidth={1.5} />
                  Multiple industry styles
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="w-full lg:min-h-screen flex items-center py-16 sm:py-24 bg-[#FAFAF8]">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-16">
          <div className="text-center mb-16">
            <h2 className="font-serif text-4xl sm:text-5xl font-light text-[#1a1a1a] mb-5">
              What job seekers are telling us
            </h2>
            <div className="w-16 h-px bg-[#0A2647] mx-auto mb-6" />
            <p className="text-lg text-stone-500 font-light">
              A few quotes from early user feedback
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Testimonial 1 */}
            <div className="bg-white rounded-sm p-8 border border-stone-100 shadow-sm">
              <div className="flex items-center gap-1 mb-5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-[#B8860B] text-[#B8860B]" />
                ))}
              </div>
              <p className="text-stone-600 mb-6 leading-relaxed text-sm font-light">
                "I'd been tweaking my resume for weeks without making real progress. Hired pointed out keyword gaps I never would've spotted on my own — and the rewrite suggestions were ones I actually wanted to use."
              </p>
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-full bg-[#0A2647] flex items-center justify-center text-white text-sm font-medium">
                  MG
                </div>
                <div>
                  <p className="font-medium text-[#1a1a1a] text-sm">Maya G.</p>
                  <p className="text-xs text-stone-500 font-light">Product Manager</p>
                </div>
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className="bg-white rounded-sm p-8 border border-stone-100 shadow-sm">
              <div className="flex items-center gap-1 mb-5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-[#B8860B] text-[#B8860B]" />
                ))}
              </div>
              <p className="text-stone-600 mb-6 leading-relaxed text-sm font-light">
                "Most resume tools spit out generic templates. The feedback here was specific to the job I was applying for and called out things I'd actually missed."
              </p>
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-full bg-[#0A2647] flex items-center justify-center text-white text-sm font-medium">
                  AR
                </div>
                <div>
                  <p className="font-medium text-[#1a1a1a] text-sm">Amit R.</p>
                  <p className="text-xs text-stone-500 font-light">Software Engineer</p>
                </div>
              </div>
            </div>

            {/* Testimonial 3 */}
            <div className="bg-white rounded-sm p-8 border border-stone-100 shadow-sm">
              <div className="flex items-center gap-1 mb-5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-[#B8860B] text-[#B8860B]" />
                ))}
              </div>
              <p className="text-stone-600 mb-6 leading-relaxed text-sm font-light">
                "Coming from a non-traditional background, presenting transferable skills was the hardest part. The AI gave me language I'd been struggling to find myself."
              </p>
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-full bg-[#0A2647] flex items-center justify-center text-white text-sm font-medium">
                  SA
                </div>
                <div>
                  <p className="font-medium text-[#1a1a1a] text-sm">Shaked A.</p>
                  <p className="text-xs text-stone-500 font-light">Data Analyst</p>
                </div>
              </div>
            </div>
          </div>
          <p className="text-center text-xs text-stone-500 font-light mt-8 tracking-wide">
            Quotes from anonymized user interviews. Outcomes vary.
          </p>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="w-full py-20 sm:py-28 bg-[#0A2647]">
        <div className="max-w-3xl mx-auto px-4 sm:px-8 lg:px-16 text-center">
          <h2 className="font-serif text-4xl sm:text-5xl font-light text-white mb-6">
            Ready to get Hired?
          </h2>
          <div className="w-16 h-px bg-[#B8860B] mx-auto mb-6" />
          <p className="text-lg text-white/80 mb-10 font-light">
            See where your resume stands in 60 seconds — no signup, no card.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
            <SignedOut>
              <Link
                href="/score"
                className="group inline-flex items-center justify-center gap-3 px-8 sm:px-10 py-4 sm:py-5 bg-white text-[#0A2647] font-medium rounded-sm hover:bg-stone-50 shadow-sm hover:shadow-md transition-all tracking-wide focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              >
                Check Your Score — Free
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" strokeWidth={1.5} />
              </Link>
              <SignUpButton mode="modal">
                <button className="text-white/80 hover:text-white text-sm font-light underline-offset-4 hover:underline tracking-wide focus-visible:outline-none">
                  or create an account
                </button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <Link
                href="/builder"
                className="group inline-flex items-center justify-center gap-3 px-8 sm:px-10 py-4 sm:py-5 bg-white text-[#0A2647] font-medium rounded-sm hover:bg-stone-50 shadow-sm hover:shadow-md transition-all tracking-wide focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              >
                Continue Building
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" strokeWidth={1.5} />
              </Link>
            </SignedIn>
          </div>
          <p className="text-white/60 text-xs font-light mt-6 tracking-wide">
            "The feedback here was specific to the job I was applying for and called out things I'd actually missed." — Amit R., Software Engineer
          </p>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
