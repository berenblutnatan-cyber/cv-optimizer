import Link from "next/link";
import { FileUp, Hammer, Sparkles, ArrowRight } from "lucide-react";
import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col overflow-hidden">
      {/* Background Effects */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[600px] w-[1000px] -translate-x-1/2 rounded-full bg-gradient-to-r from-purple-600/20 via-indigo-500/15 to-teal-500/10 blur-3xl" />
        <div className="absolute -bottom-40 right-[-120px] h-[500px] w-[500px] rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute top-1/2 left-[-200px] h-[400px] w-[400px] rounded-full bg-purple-600/10 blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-20 w-full px-6 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">CV Studio</span>
          </div>
          <div className="flex items-center gap-3">
            <SignedOut>
              <SignInButton mode="modal">
                <button className="px-4 py-2 text-sm font-medium text-white/80 hover:text-white transition-colors">
                  Sign In
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="px-4 py-2 text-sm font-medium bg-purple-500 hover:bg-purple-400 text-white rounded-lg transition-colors">
                  Sign Up
                </button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <UserButton 
                appearance={{
                  elements: {
                    avatarBox: "w-9 h-9"
                  }
                }}
              />
            </SignedIn>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Hero */}
        <div className="text-center mb-16 max-w-3xl">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            Build Your Professional Resume{" "}
            <span className="bg-gradient-to-r from-purple-400 via-indigo-400 to-teal-400 bg-clip-text text-transparent">
              in Minutes with AI
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-white/60 max-w-2xl mx-auto">
            Whether you're starting fresh or improving your existing CV, our AI-powered tools help you stand out to employers.
          </p>
        </div>

        {/* Two Big Cards */}
        <div className="grid md:grid-cols-2 gap-6 lg:gap-8 w-full max-w-4xl">
          {/* Card 1: Optimizer */}
          <Link 
            href="/optimize"
            className="group relative rounded-2xl p-[2px] bg-gradient-to-br from-purple-500/50 via-purple-500/20 to-transparent hover:from-purple-500 hover:via-purple-400/50 hover:to-purple-500/20 transition-all duration-300"
          >
            <div className="relative h-full rounded-2xl bg-black/80 backdrop-blur-sm p-8 flex flex-col">
              {/* Icon */}
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center mb-6 shadow-lg shadow-purple-500/25 group-hover:shadow-purple-500/40 transition-shadow">
                <FileUp className="w-8 h-8 text-white" />
              </div>
              
              {/* Content */}
              <h2 className="text-2xl font-bold mb-3">I Have a CV</h2>
              <p className="text-white/60 mb-6 flex-1">
                Upload your existing CV and let AI rewrite it for a specific job. Get a tailored resume and cover letter in seconds.
              </p>
              
              {/* CTA */}
              <div className="flex items-center gap-2 text-purple-400 group-hover:text-purple-300 font-medium transition-colors">
                <span>Optimize My CV</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>

              {/* Hover glow */}
              <div className="absolute inset-0 rounded-2xl bg-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </div>
          </Link>

          {/* Card 2: Builder */}
          <Link 
            href="/builder"
            className="group relative rounded-2xl p-[2px] bg-gradient-to-br from-teal-500/50 via-teal-500/20 to-transparent hover:from-teal-500 hover:via-teal-400/50 hover:to-teal-500/20 transition-all duration-300"
          >
            <div className="relative h-full rounded-2xl bg-black/80 backdrop-blur-sm p-8 flex flex-col">
              {/* Icon */}
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center mb-6 shadow-lg shadow-teal-500/25 group-hover:shadow-teal-500/40 transition-shadow">
                <Hammer className="w-8 h-8 text-white" />
              </div>
              
              {/* Content */}
              <h2 className="text-2xl font-bold mb-3">I Need a CV</h2>
              <p className="text-white/60 mb-6 flex-1">
                Build a professional CV from scratch with our step-by-step wizard. No experience needed – we'll guide you through it.
              </p>
              
              {/* CTA */}
              <div className="flex items-center gap-2 text-teal-400 group-hover:text-teal-300 font-medium transition-colors">
                <span>Build My CV</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>

              {/* Hover glow */}
              <div className="absolute inset-0 rounded-2xl bg-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </div>
          </Link>
        </div>

        {/* Features Preview */}
        <div className="mt-20 text-center">
          <p className="text-white/40 text-sm mb-6">Trusted by professionals worldwide</p>
          <div className="flex items-center justify-center gap-8 text-white/30">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span>AI-Powered</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>ATS-Optimized</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
              </svg>
              <span>Instant Results</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 py-6 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-sm text-white/40">
          <span>© 2024 CV Studio. All rights reserved.</span>
          <span>Powered by OpenAI</span>
        </div>
      </footer>
    </div>
  );
}
