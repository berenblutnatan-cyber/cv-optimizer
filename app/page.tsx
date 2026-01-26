import Link from "next/link";
import { Check, Star, Zap, Shield, ArrowRight, FileText, Target, Lock, Bot, BarChart3, Plus, Wand2, ArrowUp } from "lucide-react";
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

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#1a1a1a] snap-y snap-mandatory overflow-y-auto h-screen scroll-smooth">
      {/* Header - Premium Full Width Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 w-full bg-white/90 backdrop-blur-md border-b border-stone-200/60">
        <div className="w-full px-8 md:px-16 h-20 flex items-center justify-between">
          {/* Logo - Far Left */}
          <Logo variant="dark" size="md" />
          
          {/* Navigation Links - Center */}
          <ActiveNavLinks />
          
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

      {/* Hero Section */}
      <section id="hero" className="relative w-full min-h-screen flex flex-col pt-28 pb-8 snap-start snap-always">
        {/* Subtle background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#FAFAF8] via-white to-stone-50" />
        
        <div className="relative flex-1 flex items-center max-w-7xl mx-auto px-8 lg:px-16 w-full">
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-20 items-center w-full">
            {/* Left Content */}
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#0A2647]/5 text-[#0A2647] rounded-sm text-sm font-medium mb-8 tracking-wide">
                <Wand2 className="w-4 h-4" strokeWidth={1.5} />
                AI-Powered Resume Builder
              </div>

              <h1 className="font-serif text-5xl sm:text-6xl lg:text-[4rem] font-light tracking-tight text-[#1a1a1a] mb-8 leading-[1.1]">
                Elevate your resume.{" "}
                <span className="text-indigo-600">Maximize your potential.</span>
              </h1>
              
              <p className="text-lg text-stone-500 mb-12 leading-relaxed font-light">
                Create or optimize resumes with AI, tailored for every job you apply to. Don't just apply. <span className="text-[#0A2647] font-bold">Get Hired.</span>
              </p>
              
              {/* Power Duo Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-10">
                {/* Create New Resume Card */}
                <Link 
                  href="/builder"
                  className="group relative flex flex-col p-7 bg-white hover:bg-stone-50 border border-stone-200 hover:border-stone-300 rounded-sm transition-all duration-300 shadow-[0_2px_20px_-6px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.1)]"
                >
                  <div className="w-12 h-12 rounded-full bg-[#0A2647]/5 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                    <Plus className="w-5 h-5 text-[#0A2647]" strokeWidth={1.5} />
                  </div>
                  <h3 className="font-serif text-xl text-[#1a1a1a] mb-2">Create New Resume</h3>
                  <p className="text-sm text-stone-500 font-light mb-5">Start fresh with our guided builder</p>
                  <div className="flex items-center gap-2 text-[#0A2647] font-medium text-sm mt-auto tracking-wide">
                    Get Started
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" strokeWidth={1.5} />
                  </div>
                </Link>

                {/* Optimize Existing Card */}
                <Link 
                  href="/optimize"
                  className="group relative flex flex-col p-7 bg-white hover:bg-stone-50 border border-stone-200 hover:border-stone-300 rounded-sm transition-all duration-300 shadow-[0_2px_20px_-6px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.1)]"
                >
                  <div className="w-12 h-12 rounded-full bg-[#B8860B]/10 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                    <Wand2 className="w-5 h-5 text-[#B8860B]" strokeWidth={1.5} />
                  </div>
                  <h3 className="font-serif text-xl text-[#1a1a1a] mb-2">Optimize Existing</h3>
                  <p className="text-sm text-stone-500 font-light mb-5">Upload & enhance with AI magic</p>
                  <div className="flex items-center gap-2 text-[#0A2647] font-medium text-sm mt-auto tracking-wide">
                    Upload Resume
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" strokeWidth={1.5} />
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
        <div className="relative z-10 w-full mt-auto pt-8 border-t border-stone-200/60 px-8 lg:px-16">
          <div className="flex items-center justify-between max-w-5xl mx-auto">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#0A2647]/5 flex items-center justify-center">
                <Lock className="w-5 h-5 text-[#0A2647]" strokeWidth={1.5} />
              </div>
              <span className="text-sm text-[#1a1a1a] font-semibold">Privacy First</span>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#0A2647]/5 flex items-center justify-center">
                <Bot className="w-5 h-5 text-[#0A2647]" strokeWidth={1.5} />
              </div>
              <span className="text-sm text-[#1a1a1a] font-semibold">AI Powered</span>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#0A2647]/5 flex items-center justify-center">
                <Target className="w-5 h-5 text-[#0A2647]" strokeWidth={1.5} />
              </div>
              <span className="text-sm text-[#1a1a1a] font-semibold">ATS Optimized</span>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#0A2647]/5 flex items-center justify-center">
                <Zap className="w-5 h-5 text-[#0A2647]" strokeWidth={1.5} />
              </div>
              <span className="text-sm text-[#1a1a1a] font-semibold">Instant Feedback</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - ATS */}
      <section id="features" className="w-full min-h-screen flex items-center py-16 bg-[#FAFAF8] snap-start snap-always">
        <div className="max-w-7xl mx-auto px-8 lg:px-16">
          <div className="text-center mb-16">
            <h2 className="font-serif text-4xl sm:text-5xl font-light text-[#1a1a1a] mb-5">
              Everything you need to land the job
            </h2>
            <div className="w-16 h-px bg-[#0A2647] mx-auto mb-6" />
            <p className="text-lg text-stone-500 max-w-2xl mx-auto font-light">
              Our AI-powered tools give you an unfair advantage in the job market
            </p>
          </div>
              
          {/* Feature A: Text Left / Visual Right */}
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="max-w-lg">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#0A2647]/5 text-[#0A2647] rounded-sm text-sm font-medium mb-5 tracking-wide">
                <Shield className="w-4 h-4" strokeWidth={1.5} />
                ATS Optimization
              </div>
              <h3 className="font-serif text-3xl sm:text-4xl font-light text-[#1a1a1a] mb-5">
                Beat the ATS Robots
              </h3>
              <p className="text-base text-stone-500 mb-8 leading-relaxed font-light">
                Over 75% of resumes are rejected by Applicant Tracking Systems before a human ever sees them. 
                Our AI analyzes your resume against the job description and optimizes it to pass through ATS filters.
              </p>
              <ul className="space-y-4">
                <li className="flex items-center gap-4 text-stone-600 font-light">
                  <Check className="w-5 h-5 text-[#0A2647] flex-shrink-0" strokeWidth={1.5} />
                  Real-time ATS compatibility score
                </li>
                <li className="flex items-center gap-4 text-stone-600 font-light">
                  <Check className="w-5 h-5 text-[#0A2647] flex-shrink-0" strokeWidth={1.5} />
                  Keyword optimization suggestions
                </li>
                <li className="flex items-center gap-4 text-stone-600 font-light">
                  <Check className="w-5 h-5 text-[#0A2647] flex-shrink-0" strokeWidth={1.5} />
                  Format and structure analysis
                </li>
              </ul>
            </div>

            {/* ATS Score Visual */}
            <div className="relative lg:justify-self-end">
              <div className="bg-white rounded-sm p-8 border border-stone-200 shadow-[0_4px_40px_-12px_rgba(0,0,0,0.08)] max-w-md">
                {/* Score Header */}
                <div className="text-center mb-8 pb-6 border-b border-stone-100">
                  <p className="text-sm text-stone-400 font-light tracking-wide mb-2">Resume Score</p>
                  <p className="font-serif text-5xl text-[#0A2647]">98<span className="text-2xl text-stone-400">/100</span></p>
                </div>
                <div className="space-y-5">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-stone-500 font-light">Keywords Match</span>
                      <span className="font-medium text-[#0A2647]">92%</span>
                    </div>
                    <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: "92%" }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-stone-500 font-light">Format Score</span>
                      <span className="font-medium text-[#0A2647]">98%</span>
                    </div>
                    <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: "98%" }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-stone-500 font-light">Skills Coverage</span>
                      <span className="font-medium text-[#0A2647]">88%</span>
                    </div>
                    <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: "88%" }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - AI Writer */}
      <section className="w-full min-h-screen flex items-center py-16 bg-white snap-start snap-always">
        <div className="max-w-7xl mx-auto px-8 lg:px-16">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="max-w-lg">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#0A2647]/5 text-[#0A2647] rounded-sm text-sm font-medium mb-5 tracking-wide">
                <Zap className="w-4 h-4" strokeWidth={1.5} />
                AI Writer
              </div>
              <h3 className="font-serif text-3xl sm:text-4xl font-light text-[#1a1a1a] mb-5">
                Real-time AI Content Writer
              </h3>
              <p className="text-base text-stone-500 mb-8 leading-relaxed font-light">
                Stuck on what to write? Our AI generates compelling bullet points, summaries, 
                and cover letters tailored to your experience and the job you're applying for.
              </p>
              <ul className="space-y-4">
                <li className="flex items-center gap-4 text-stone-600 font-light">
                  <Check className="w-5 h-5 text-[#0A2647] flex-shrink-0" strokeWidth={1.5} />
                  Generate achievement-focused bullets
                </li>
                <li className="flex items-center gap-4 text-stone-600 font-light">
                  <Check className="w-5 h-5 text-[#0A2647] flex-shrink-0" strokeWidth={1.5} />
                  AI-crafted professional summaries
                </li>
                <li className="flex items-center gap-4 text-stone-600 font-light">
                  <Check className="w-5 h-5 text-[#0A2647] flex-shrink-0" strokeWidth={1.5} />
                  Matching cover letter generation
                </li>
              </ul>
            </div>
              
            {/* AI Writer Visual */}
            <div className="relative lg:justify-self-end">
              <div className="bg-[#0A2647] rounded-sm p-6 text-white max-w-md">
                <div className="flex items-center gap-2 mb-4">
                  <Wand2 className="w-4 h-4 text-[#B8860B]" strokeWidth={1.5} />
                  <span className="text-sm font-medium text-[#B8860B] tracking-wide">AI Writing...</span>
                </div>
                <div className="bg-white/10 rounded-sm p-5 border border-white/10">
                  <p className="text-sm text-white/60 mb-4 font-light">
                    <span className="text-[#B8860B]">Role:</span> Senior Software Engineer
                  </p>
                  <div className="space-y-3">
                    <p className="text-sm text-white leading-relaxed font-light">
                      • Led cross-functional team of 8 engineers to deliver real-time data pipeline, 
                      reducing latency by 40%
                    </p>
                    <p className="text-sm text-white leading-relaxed font-light">
                      • Architected microservices migration reducing costs by $500K annually
                    </p>
                    <div className="flex items-center gap-2 pt-3">
                      <div className="w-1.5 h-4 bg-[#B8860B] animate-pulse rounded-sm" />
                      <span className="text-white/50 text-sm font-light">Generating more...</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Templates Section */}
      <section id="templates" className="w-full min-h-screen flex items-center py-16 bg-white snap-start snap-always">
        <div className="max-w-7xl mx-auto px-8 lg:px-16">
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-20 items-center">
            {/* Template Grid Visual */}
            <div className="order-2 lg:order-1">
              <div className="grid grid-cols-2 gap-5 max-w-md mx-auto lg:mx-0">
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
                  <p className="text-xs text-stone-400 font-light">Classic & Professional</p>
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
                      <p className="text-xs text-stone-400 font-light">Bold & Contemporary</p>
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
                  <p className="text-xs text-stone-400 font-light">Senior Leadership</p>
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
                  <p className="text-xs text-stone-400 font-light">Design & Marketing</p>
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
      <section id="testimonials" className="w-full min-h-screen flex items-center py-16 bg-[#FAFAF8] snap-start snap-always">
        <div className="max-w-7xl mx-auto px-8 lg:px-16">
          <div className="text-center mb-16">
            <h2 className="font-serif text-4xl sm:text-5xl font-light text-[#1a1a1a] mb-5">
              Loved by job seekers worldwide
            </h2>
            <div className="w-16 h-px bg-[#0A2647] mx-auto mb-6" />
            <p className="text-lg text-stone-500 font-light">
              See what our users have to say
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
                "I was applying to jobs for months with no luck. After optimizing my resume with Hired, 
                I got 3 interviews in the first week. Now I'm working at my dream company!"
              </p>
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-full bg-[#0A2647] flex items-center justify-center text-white text-sm font-medium">
                  MG
                </div>
                <div>
                  <p className="font-medium text-[#1a1a1a] text-sm">Maya G.</p>
                  <p className="text-xs text-stone-400 font-light">Product Manager</p>
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
                "The AI suggestions were incredibly helpful. It highlighted skills I didn't even think 
                to include. My resume score went from 45% to 98%!"
              </p>
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-full bg-[#0A2647] flex items-center justify-center text-white text-sm font-medium">
                  AR
                </div>
                <div>
                  <p className="font-medium text-[#1a1a1a] text-sm">Amit R.</p>
                  <p className="text-xs text-stone-400 font-light">Software Engineer</p>
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
                "As a career changer, I struggled to present my transferable skills. 
                Hired's AI helped me reframe my experience perfectly. Got hired within 3 weeks!"
              </p>
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-full bg-[#0A2647] flex items-center justify-center text-white text-sm font-medium">
                  SA
                </div>
                <div>
                  <p className="font-medium text-[#1a1a1a] text-sm">Shaked A.</p>
                  <p className="text-xs text-stone-400 font-light">Data Analyst</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="w-full min-h-screen flex items-center py-16 bg-[#0A2647] snap-start snap-always">
        <div className="max-w-3xl mx-auto px-8 lg:px-16 text-center">
          <h2 className="font-serif text-4xl sm:text-5xl font-light text-white mb-6">
            Ready to get Hired?
          </h2>
          <div className="w-16 h-px bg-[#B8860B] mx-auto mb-6" />
          <p className="text-lg text-white/70 mb-10 font-light">
            Transform your job search with AI-powered resume optimization. Start for free today.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
            <Link 
              href="/builder"
              className="group inline-flex items-center justify-center gap-3 px-10 py-5 bg-white text-[#0A2647] font-medium rounded-sm hover:bg-stone-50 transition-all tracking-wide"
            >
              Start for Free
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" strokeWidth={1.5} />
            </Link>
            <p className="text-white/50 text-sm font-light">No credit card required</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full bg-[#0A2647] border-t border-white/10 text-white/60 py-10 snap-start">
        <div className="max-w-7xl mx-auto px-8 lg:px-16">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <Logo variant="light" size="md" />
            </div>
            <div className="flex items-center gap-10 text-sm font-light tracking-wide">
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
              <a href="#" className="hover:text-white transition-colors">Contact</a>
            </div>
            <p className="text-sm font-light">© 2024 Hired. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
