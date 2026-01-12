import Link from "next/link";
import { Check, Star, Zap, Shield, Sparkles, ArrowRight, FileText, Target, Lock, Bot, BarChart3 } from "lucide-react";
import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import { Logo } from "@/components/Logo";
import { HeroResumeVisual } from "@/components/landing/HeroResumeVisual";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Header - Premium Full Width Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="w-full px-6 md:px-10 h-20 flex items-center justify-between">
          {/* Logo - Far Left */}
          <Logo variant="dark" size="md" />
          
          {/* Navigation Links - Center */}
          <nav className="hidden md:flex items-center gap-10 absolute left-1/2 -translate-x-1/2">
            <a href="#features" className="text-sm font-medium text-slate-600 hover:text-emerald-600 transition-colors">Features</a>
            <a href="#testimonials" className="text-sm font-medium text-slate-600 hover:text-emerald-600 transition-colors">Testimonials</a>
            <a href="#templates" className="text-sm font-medium text-slate-600 hover:text-emerald-600 transition-colors">Templates</a>
          </nav>
          
          {/* Score Button + Auth Buttons - Far Right */}
          <div className="flex items-center gap-4">
            {/* Lead Magnet: Check Score */}
            <Link 
              href="/score"
              className="hidden md:inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-emerald-600 transition-colors"
            >
              <BarChart3 className="w-4 h-4" />
              Check My Score
            </Link>
            
            <SignedOut>
              <SignInButton mode="modal">
                <button className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
                  Sign In
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="px-5 py-2.5 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors shadow-sm">
                  Get Started Free
                </button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <Link 
                href="/optimize"
                className="px-5 py-2.5 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors shadow-sm"
              >
                Dashboard
              </Link>
              <UserButton 
                appearance={{
                  elements: {
                    avatarBox: "w-10 h-10"
                  }
                }}
              />
            </SignedIn>
          </div>
        </div>
      </header>

      {/* Hero Section - Full Width Background, Centered Content */}
      <section className="relative w-full pt-32 pb-16 lg:pt-40 lg:pb-24 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 via-white to-slate-50/50" />
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-emerald-50/30 to-transparent" />
        
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left Content - Limited Max Width for Readability */}
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium mb-6">
                <Sparkles className="w-4 h-4" />
                AI-Powered Resume Builder
        </div>

              <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-bold tracking-tight text-slate-900 mb-6 leading-[1.1]">
                Elevate your resume.{" "}
                <span className="text-emerald-600">Maximize your potential.</span>
              </h1>
              
              <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                Craft professional, ATS-friendly resumes in minutes with the power of AI. 
                Don't just apply. <em>Get Hired.</em>
              </p>
              
              <div className="flex flex-col sm:flex-row flex-wrap gap-4 mb-8">
                <Link 
                  href="/builder"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/30"
                >
                  Create New Resume
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link 
                  href="/optimize"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 border-2 border-slate-200 hover:border-emerald-600 text-slate-700 hover:text-emerald-600 font-semibold rounded-xl transition-all"
                >
                  Optimize Existing
                </Link>
                
                {/* Lead Magnet: Get Resume Score */}
                <Link 
                  href="/score"
                  className="relative inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white border-2 border-emerald-600 text-emerald-600 hover:bg-emerald-50 font-bold rounded-full transition-all"
                >
                  {/* FREE Badge */}
                  <span className="absolute -top-2 -right-2 px-2 py-0.5 bg-amber-400 text-amber-900 text-[10px] font-bold uppercase rounded-full shadow-sm">
                    Free
                  </span>
                  <BarChart3 className="w-4 h-4" />
                  Get My Resume Score
                </Link>
              </div>
              
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Free to start</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>ATS-optimized</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>AI-powered</span>
                </div>
              </div>
            </div>
            
            {/* Right Visual - 3D Floating Resume */}
            <div className="hidden md:block relative">
              <HeroResumeVisual />
            </div>
          </div>
        </div>
      </section>

      {/* Trust Bar - Premium Design Element */}
      <section className="w-full bg-white border-y border-slate-100">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {/* Privacy First */}
            <div className="flex flex-col items-center text-center">
              <div className="bg-emerald-100 p-3 rounded-full mb-3">
                <Lock className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="font-bold text-slate-900 text-lg mb-1">Privacy First</h3>
              <p className="text-sm text-slate-500">Your data stays secure</p>
            </div>
            
            {/* AI Powered */}
            <div className="flex flex-col items-center text-center">
              <div className="bg-emerald-100 p-3 rounded-full mb-3">
                <Bot className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="font-bold text-slate-900 text-lg mb-1">AI Powered</h3>
              <p className="text-sm text-slate-500">Smart optimization engine</p>
            </div>
            
            {/* ATS Optimized */}
            <div className="flex flex-col items-center text-center">
              <div className="bg-emerald-100 p-3 rounded-full mb-3">
                <Target className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="font-bold text-slate-900 text-lg mb-1">ATS Optimized</h3>
              <p className="text-sm text-slate-500">Pass the screening filters</p>
              </div>
              
            {/* Instant Feedback */}
            <div className="flex flex-col items-center text-center">
              <div className="bg-emerald-100 p-3 rounded-full mb-3">
                <Zap className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="font-bold text-slate-900 text-lg mb-1">Instant Feedback</h3>
              <p className="text-sm text-slate-500">Real-time analysis results</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Centered Content */}
      <section id="features" className="w-full py-20 lg:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Everything you need to land the job
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Our AI-powered tools give you an unfair advantage in the job market
            </p>
              </div>
              
          {/* Feature A: Text Left / Visual Right */}
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center mb-20 lg:mb-28">
            <div className="max-w-lg">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium mb-4">
                <Shield className="w-4 h-4" />
                ATS Optimization
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">
                Beat the ATS Robots
              </h3>
              <p className="text-base text-slate-600 mb-6 leading-relaxed">
                Over 75% of resumes are rejected by Applicant Tracking Systems before a human ever sees them. 
                Our AI analyzes your resume against the job description and optimizes it to pass through ATS filters.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-slate-700">
                  <Check className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  Real-time ATS compatibility score
                </li>
                <li className="flex items-center gap-3 text-slate-700">
                  <Check className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  Keyword optimization suggestions
                </li>
                <li className="flex items-center gap-3 text-slate-700">
                  <Check className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  Format and structure analysis
                </li>
              </ul>
              </div>

            {/* ATS Score Visual */}
            <div className="relative lg:justify-self-end">
              <div className="bg-gradient-to-br from-slate-50 to-emerald-50 rounded-2xl p-6 border border-slate-200 max-w-md">
                <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
                  <div className="flex items-center justify-between mb-5">
                    <span className="text-sm font-medium text-slate-600">Resume Score</span>
                    <span className="text-xl font-bold text-emerald-600">98/100</span>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-600">Keywords Match</span>
                        <span className="font-medium text-emerald-600">92%</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: "92%" }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-600">Format Score</span>
                        <span className="font-medium text-emerald-600">98%</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: "98%" }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-600">Skills Coverage</span>
                        <span className="font-medium text-emerald-600">88%</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: "88%" }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            </div>

          {/* Feature B: Text Left / Visual Right */}
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="max-w-lg">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium mb-4">
                <Zap className="w-4 h-4" />
                AI Writer
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">
                Real-time AI Content Writer
              </h3>
              <p className="text-base text-slate-600 mb-6 leading-relaxed">
                Stuck on what to write? Our AI generates compelling bullet points, summaries, 
                and cover letters tailored to your experience and the job you're applying for.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-slate-700">
                  <Check className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  Generate achievement-focused bullets
                </li>
                <li className="flex items-center gap-3 text-slate-700">
                  <Check className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  AI-crafted professional summaries
                </li>
                <li className="flex items-center gap-3 text-slate-700">
                  <Check className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  Matching cover letter generation
                </li>
              </ul>
              </div>
              
            {/* AI Writer Visual */}
            <div className="relative lg:justify-self-end">
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-5 text-white max-w-md">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-medium text-emerald-400">AI Writing...</span>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                  <p className="text-sm text-slate-300 mb-3">
                    <span className="text-emerald-400">Role:</span> Senior Software Engineer
                  </p>
                  <div className="space-y-2">
                    <p className="text-sm text-white leading-relaxed">
                      • Led cross-functional team of 8 engineers to deliver real-time data pipeline, 
                      reducing latency by 40%
                    </p>
                    <p className="text-sm text-white leading-relaxed">
                      • Architected microservices migration reducing costs by $500K annually
                    </p>
                    <div className="flex items-center gap-2 pt-2">
                      <div className="w-2 h-4 bg-emerald-400 animate-pulse rounded" />
                      <span className="text-slate-400 text-sm">Generating more...</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section - Centered Content */}
      <section id="testimonials" className="w-full py-20 lg:py-28 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Loved by job seekers worldwide
            </h2>
            <p className="text-lg text-slate-600">
              See what our users have to say
            </p>
              </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Testimonial 1 */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-slate-700 mb-5 leading-relaxed text-sm">
                "I was applying to jobs for months with no luck. After optimizing my resume with Hired, 
                I got 3 interviews in the first week. Now I'm working at my dream company!"
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-sm font-bold">
                  MG
                </div>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">Maya G.</p>
                  <p className="text-xs text-slate-500">Product Manager</p>
                </div>
              </div>
              </div>

            {/* Testimonial 2 */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-slate-700 mb-5 leading-relaxed text-sm">
                "The AI suggestions were incredibly helpful. It highlighted skills I didn't even think 
                to include. My resume score went from 45% to 98%!"
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-bold">
                  AR
                </div>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">Amit R.</p>
                  <p className="text-xs text-slate-500">Software Engineer</p>
                </div>
            </div>
        </div>

            {/* Testimonial 3 */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-slate-700 mb-5 leading-relaxed text-sm">
                "As a career changer, I struggled to present my transferable skills. 
                Hired's AI helped me reframe my experience perfectly. Got hired within 3 weeks!"
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                  SA
                </div>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">Shaked A.</p>
                  <p className="text-xs text-slate-500">Data Analyst</p>
            </div>
            </div>
            </div>
          </div>
        </div>
      </section>

      {/* Templates Section - After Testimonials */}
      <section id="templates" className="w-full py-20 lg:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Template Grid Visual */}
            <div className="order-2 lg:order-1">
              <div className="grid grid-cols-2 gap-4 max-w-md mx-auto lg:mx-0">
                {/* Template 1: The Ivy */}
                <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm hover:shadow-md transition-shadow">
                  <div className="aspect-[3/4] bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg mb-2 flex items-center justify-center">
                    <div className="w-3/4 space-y-1.5">
                      <div className="h-2.5 w-full bg-slate-300 rounded" />
                      <div className="h-1.5 w-2/3 bg-slate-200 rounded" />
                      <div className="h-1.5 w-3/4 bg-slate-200 rounded" />
                    </div>
                  </div>
                  <p className="text-sm font-medium text-slate-900">The Ivy</p>
                  <p className="text-xs text-slate-500">Classic & Professional</p>
                </div>
                {/* Template 2: The Modern (Popular) */}
                <div className="bg-white rounded-xl border border-emerald-200 p-3 shadow-sm hover:shadow-md transition-shadow ring-2 ring-emerald-500">
                  <div className="aspect-[3/4] bg-gradient-to-br from-emerald-50 to-slate-50 rounded-lg mb-2 flex items-center justify-center">
                    <div className="w-3/4 space-y-1.5">
                      <div className="h-2.5 w-full bg-emerald-300 rounded" />
                      <div className="h-1.5 w-2/3 bg-slate-200 rounded" />
                      <div className="h-1.5 w-3/4 bg-slate-200 rounded" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900">The Modern</p>
                      <p className="text-xs text-slate-500">Bold & Contemporary</p>
                    </div>
                    <span className="text-[10px] font-medium text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded">Popular</span>
                  </div>
                </div>
                {/* Template 3: Executive */}
                <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm hover:shadow-md transition-shadow">
                  <div className="aspect-[3/4] bg-gradient-to-br from-amber-50 to-slate-50 rounded-lg mb-2 flex items-center justify-center">
                    <div className="w-3/4 space-y-1.5">
                      <div className="h-2.5 w-full bg-amber-300 rounded" />
                      <div className="h-1.5 w-2/3 bg-slate-200 rounded" />
                      <div className="h-1.5 w-3/4 bg-slate-200 rounded" />
                    </div>
                  </div>
                  <p className="text-sm font-medium text-slate-900">Executive</p>
                  <p className="text-xs text-slate-500">Senior Leadership</p>
                </div>
                {/* Template 4: Creative */}
                <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm hover:shadow-md transition-shadow">
                  <div className="aspect-[3/4] bg-gradient-to-br from-blue-50 to-slate-50 rounded-lg mb-2 flex items-center justify-center">
                    <div className="w-3/4 space-y-1.5">
                      <div className="h-2.5 w-full bg-blue-300 rounded" />
                      <div className="h-1.5 w-2/3 bg-slate-200 rounded" />
                      <div className="h-1.5 w-3/4 bg-slate-200 rounded" />
                    </div>
                  </div>
                  <p className="text-sm font-medium text-slate-900">Creative</p>
                  <p className="text-xs text-slate-500">Design & Marketing</p>
                </div>
              </div>
            </div>

            {/* Text Content */}
            <div className="order-1 lg:order-2 max-w-lg lg:justify-self-end">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium mb-4">
                <FileText className="w-4 h-4" />
                Premium Templates
            </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">
                Ivy League Approved Designs
              </h3>
              <p className="text-base text-slate-600 mb-6 leading-relaxed">
                Our templates are designed by hiring experts from top companies. 
                Each template is optimized for both human recruiters and ATS systems.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-slate-700">
                  <Check className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  Designed by HR professionals
                </li>
                <li className="flex items-center gap-3 text-slate-700">
                  <Check className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  ATS-friendly formatting
                </li>
                <li className="flex items-center gap-3 text-slate-700">
                  <Check className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  Multiple industry styles
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="w-full py-20 lg:py-24 bg-gradient-to-br from-emerald-600 to-emerald-700">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-5">
            Ready to get Hired?
          </h2>
          <p className="text-lg text-emerald-100 mb-8">
            Transform your job search with AI-powered resume optimization. Start for free today.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              href="/builder"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-emerald-700 font-bold rounded-xl hover:bg-emerald-50 transition-all shadow-lg"
            >
              Start for Free
              <ArrowRight className="w-5 h-5" />
            </Link>
            <p className="text-emerald-200 text-sm">No credit card required</p>
          </div>
        </div>
      </section>

      {/* Footer - Centered Content */}
      <footer className="w-full bg-slate-900 text-slate-400 py-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <Logo variant="light" size="md" />
              <span className="text-sm">— Don't just apply. Get Hired.</span>
            </div>
            <div className="flex items-center gap-8 text-sm">
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
              <a href="#" className="hover:text-white transition-colors">Contact</a>
            </div>
            <p className="text-sm">© 2024 Hired. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
