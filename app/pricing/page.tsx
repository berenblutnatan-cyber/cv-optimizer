import React from 'react';
import Link from 'next/link';
import { Check, X, Sparkles, Zap, Gift, BarChart3, ArrowRight } from 'lucide-react';
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

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#1a1a1a]">
      {/* Header - Premium Full Width Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 w-full bg-white/90 backdrop-blur-md border-b border-stone-200/60">
        <div className="w-full px-8 md:px-16 h-20 flex items-center justify-between">
          {/* Logo - Far Left */}
          <Logo variant="dark" size="md" />
          
          {/* Navigation Links - Center */}
          <nav className="hidden md:flex items-center gap-12 absolute left-1/2 -translate-x-1/2">
            <Link href="/#hero" className="font-serif text-sm text-stone-500 hover:text-[#0A2647] transition-colors">
              Home
            </Link>
            <Link href="/#templates" className="font-serif text-sm text-stone-500 hover:text-[#0A2647] transition-colors">
              Templates
            </Link>
            <Link href="/#testimonials" className="font-serif text-sm text-stone-500 hover:text-[#0A2647] transition-colors">
              Testimonials
            </Link>
          </nav>
          
          {/* Score Button + Auth Buttons - Far Right */}
          <div className="flex items-center gap-6">
            {/* Lead Magnet: Check Score */}
            <Link 
              href="/score"
              className="hidden md:inline-flex items-center gap-2 px-5 py-2.5 bg-[#0A2647] hover:bg-[#0d3259] text-white text-sm font-medium rounded-sm shadow-sm hover:shadow-md transition-all duration-200 tracking-wide"
            >
              <BarChart3 className="w-4 h-4" strokeWidth={1.5} />
              CV Score Check
            </Link>
            
            <SignedOut>
              <SignInButton mode="modal">
                <button className="px-5 py-2.5 text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors tracking-wide">
                  Sign In
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="px-6 py-2.5 text-sm font-medium bg-[#0A2647] hover:bg-[#0d3259] text-white rounded-sm transition-colors tracking-wide">
                  Get Started
                </button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <CreditBalance />
              <UserButton 
                appearance={{
                  elements: {
                    avatarBox: "w-10 h-10 ring-2 ring-stone-200"
                  }
                }}
              />
            </SignedIn>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="pt-28 pb-16 px-8 lg:px-16">
        <div className="max-w-7xl mx-auto">
          {/* Header Section */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#0A2647]/5 text-[#0A2647] rounded-sm text-sm font-medium mb-8 tracking-wide">
              <Sparkles className="w-4 h-4" strokeWidth={1.5} />
              Pricing Plans
            </div>
            <h1 className="font-serif text-4xl sm:text-5xl font-light text-[#1a1a1a] mb-5">
              Choose Your Plan
            </h1>
            <div className="w-16 h-px bg-[#0A2647] mx-auto mb-6" />
            <p className="text-lg text-stone-500 max-w-2xl mx-auto font-light">
              Optimize your resume with AI-powered analysis. Pick the plan that fits your job search needs.
            </p>
          </div>

          {/* Pricing Cards - 4 Column Layout (Free + 3 Paid Tiers) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            
            {/* Tier 1: Free Audit */}
            <div className="bg-white rounded-sm border border-stone-200 hover:border-stone-300 shadow-[0_2px_20px_-6px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.1)] transition-all duration-300 p-8 flex flex-col">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-10 h-10 rounded-full bg-[#0A2647]/5 flex items-center justify-center">
                    <Gift className="w-5 h-5 text-[#0A2647]" strokeWidth={1.5} />
                  </div>
                  <h3 className="font-serif text-xl text-[#1a1a1a]">Free Audit</h3>
                </div>
                <p className="text-sm text-stone-500 mb-6 font-light">Curious users</p>
                
                <div className="mb-6">
                  <div className="flex items-baseline gap-2">
                    <span className="font-serif text-4xl font-light text-[#1a1a1a]">$0</span>
                    <span className="text-sm text-stone-500 font-light">Free</span>
                  </div>
                </div>

                {/* Features List */}
                <ul className="space-y-4 mb-8">
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-[#0A2647] flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                    <span className="text-stone-600 font-light">ATS Score Analysis</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-[#0A2647] flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                    <span className="text-stone-600 font-light">Keyword Gap Detection</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <X className="w-5 h-5 text-stone-300 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                    <span className="text-stone-400 line-through font-light">Full AI Rewrite (Preview Only)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <X className="w-5 h-5 text-stone-300 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                    <span className="text-stone-400 line-through font-light">File Download (PDF/Docx)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <X className="w-5 h-5 text-stone-300 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                    <span className="text-stone-400 line-through font-light">Cover Letter</span>
                  </li>
                </ul>
              </div>

              {/* CTA Button - Outline Style */}
              <Link 
                href="/optimize"
                className="w-full px-6 py-3 border border-stone-300 hover:border-stone-400 text-stone-700 hover:text-stone-900 font-medium rounded-sm transition-all tracking-wide text-center"
              >
                Get Started for Free
              </Link>
            </div>

            {/* Tier 2: Starter */}
            <div className="bg-white rounded-sm border border-stone-200 hover:border-stone-300 shadow-[0_2px_20px_-6px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.1)] transition-all duration-300 p-8 flex flex-col">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-10 h-10 rounded-full bg-[#0A2647]/5 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-[#0A2647]" strokeWidth={1.5} />
                  </div>
                  <h3 className="font-serif text-xl text-[#1a1a1a]">Starter</h3>
                </div>
                <p className="text-sm text-stone-500 mb-6 font-light">Perfect for trying out our service</p>
                
                <div className="mb-6">
                  <div className="flex items-baseline gap-2">
                    <span className="font-serif text-4xl font-light text-[#1a1a1a]">$3</span>
                    <span className="text-sm text-stone-500 font-light">One-time</span>
                  </div>
                  <p className="text-xs text-[#0A2647] font-medium mt-1">5 Credits</p>
                </div>

                {/* Features List */}
                <ul className="space-y-4 mb-8">
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-[#0A2647] flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                    <span className="text-stone-600 font-light"><span className="font-medium">5 Credits</span> - Download or optimize 5 times</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-[#0A2647] flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                    <span className="text-stone-600 font-light">PDF & Docx Download</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-[#0A2647] flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                    <span className="text-stone-600 font-light">AI Optimization</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-[#0A2647] flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                    <span className="text-stone-600 font-light">ATS Score Check</span>
                  </li>
                </ul>
              </div>

              <div className="mt-auto">
                <PolarCheckoutButton plan="starter" planName="Starter" amount={3} />
              </div>
            </div>

            {/* Tier 3: Pro - MOST POPULAR (Elevated) */}
            <div className="bg-white rounded-sm border-2 border-[#0A2647] shadow-[0_4px_40px_-12px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_50px_-12px_rgba(0,0,0,0.15)] transition-all duration-300 p-8 flex flex-col relative">
              {/* Most Popular Badge */}
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <span className="bg-[#0A2647] text-white text-xs font-medium px-4 py-1.5 rounded-sm shadow-sm tracking-wide whitespace-nowrap">
                  MOST POPULAR
                </span>
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-10 h-10 rounded-full bg-[#0A2647]/10 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-[#0A2647]" strokeWidth={1.5} />
                  </div>
                  <h3 className="font-serif text-xl text-[#1a1a1a]">Pro</h3>
                </div>
                <p className="text-sm text-stone-500 mb-6 font-light">Best value for serious job seekers</p>
                
                <div className="mb-6">
                  <div className="flex items-baseline gap-2">
                    <span className="font-serif text-4xl font-light text-[#1a1a1a]">$9</span>
                    <span className="text-sm text-stone-500 font-light">One-time</span>
                  </div>
                  <p className="text-xs text-[#0A2647] font-medium mt-1">20 Credits</p>
                </div>

                {/* Features List */}
                <ul className="space-y-4 mb-8">
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-[#0A2647] flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                    <span className="text-stone-600 font-light"><span className="font-medium">20 Credits</span> - Download or optimize 20 times</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-[#0A2647] flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                    <span className="text-stone-600 font-light">PDF & Docx Download</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-[#0A2647] flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                    <span className="text-stone-600 font-light">AI Optimization</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-[#0A2647] flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                    <span className="text-stone-600 font-light">ATS Score Check</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-[#0A2647] flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                    <span className="text-stone-600 font-light">Bulk Job Tailoring</span>
                  </li>
                </ul>
              </div>

              <div className="mt-auto">
                <PolarCheckoutButton plan="pro" planName="Pro" amount={9} />
              </div>
            </div>

            {/* Tier 4: Ultimate - BEST VALUE (Elevated) */}
            <div className="bg-white rounded-sm border-2 border-[#B8860B] shadow-[0_4px_40px_-12px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_50px_-12px_rgba(0,0,0,0.15)] transition-all duration-300 p-8 flex flex-col relative">
              {/* Best Value Badge */}
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <span className="bg-[#B8860B] text-white text-xs font-medium px-4 py-1.5 rounded-sm shadow-sm tracking-wide whitespace-nowrap">
                  BEST VALUE
                </span>
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-10 h-10 rounded-full bg-[#B8860B]/10 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-[#B8860B]" strokeWidth={1.5} />
                  </div>
                  <h3 className="font-serif text-xl text-[#1a1a1a]">Ultimate</h3>
                </div>
                <p className="text-sm text-stone-500 mb-6 font-light">Maximum credits for power users</p>
                
                <div className="mb-6">
                  <div className="flex items-baseline gap-2">
                    <span className="font-serif text-4xl font-light text-[#1a1a1a]">$20</span>
                    <span className="text-sm text-stone-500 font-light">One-time</span>
                  </div>
                  <p className="text-xs text-[#B8860B] font-medium mt-1">60 Credits</p>
                </div>

                {/* Features List */}
                <ul className="space-y-4 mb-8">
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-[#0A2647] flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                    <span className="text-stone-600 font-light"><span className="font-medium">60 Credits</span> - Download or optimize 60 times</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-[#0A2647] flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                    <span className="text-stone-600 font-light">PDF & Docx Download</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-[#0A2647] flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                    <span className="text-stone-600 font-light">AI Optimization</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-[#0A2647] flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                    <span className="text-stone-600 font-light">ATS Score Check</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-[#0A2647] flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                    <span className="text-stone-600 font-light">Bulk Job Tailoring</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-[#0A2647] flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                    <span className="text-stone-600 font-light">Priority Support</span>
                  </li>
                </ul>
              </div>

              <div className="mt-auto">
                <PolarCheckoutButton plan="ultimate" planName="Ultimate" amount={20} variant="gold" />
              </div>
            </div>

          </div>

          {/* Coupon Redeem Section */}
          <div className="mt-16 max-w-2xl mx-auto">
            <CouponRedeem />
          </div>

          {/* Additional Info */}
          <div className="mt-12 text-center">
            <p className="text-sm text-stone-500 font-light">
              All plans include secure processing and instant results. No hidden fees.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full bg-[#0A2647] border-t border-white/10 text-white/60 py-10">
        <div className="max-w-7xl mx-auto px-8 lg:px-16">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <Logo variant="light" size="md" />
            </div>
            <div className="flex items-center gap-10 text-sm font-light tracking-wide">
              <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
              <Link href="/refund-policy" className="hover:text-white transition-colors">Refund Policy</Link>
              <Link href="/contact" className="hover:text-white transition-colors">
                Contact
              </Link>
            </div>
            <p className="text-sm font-light">© 2026 Hired. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
