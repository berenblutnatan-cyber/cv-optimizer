"use client";

// Full-screen, one-question-at-a-time onboarding funnel — Hired's own take on
// the Enhancv-style warm-up. It collects target role, goal, template, and
// (optionally) an uploaded CV, then hands off to the builder, which drafts the
// CV live while the AI assistant talks the user through it.
//
// On-brand: cream canvas, navy + gold, Playfair serif for the big questions.
// Original copy — no borrowed stats or wording.

import { useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileText,
  Loader2,
  PenLine,
  ShieldCheck,
  Sparkles,
  Target,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";
import { track } from "@/lib/analytics";
import type { BuilderTemplateId } from "@/context/BuilderContext";

export type FunnelResult = {
  role: string;
  goal: "ats" | "recruiter" | "both" | null;
  template: BuilderTemplateId;
  cvText?: string;
  cvFileName?: string;
};

const TEMPLATES: { id: BuilderTemplateId; name: string; blurb: string; render: () => React.ReactNode }[] = [
  {
    id: "ivy-league",
    name: "Ivy League",
    blurb: "Classic & timeless",
    render: () => (
      <div className="p-2.5 space-y-1.5">
        <div className="text-center space-y-1 border-b border-stone-200 pb-1.5">
          <div className="h-1.5 w-12 bg-stone-800 rounded-sm mx-auto" />
          <div className="h-1 w-16 bg-stone-300 rounded-sm mx-auto" />
        </div>
        {[0, 1].map((i) => (
          <div key={i} className="space-y-1">
            <div className="h-1 w-7 bg-stone-400 rounded-sm" />
            <div className="h-0.5 w-full bg-stone-200 rounded-sm" />
            <div className="h-0.5 w-5/6 bg-stone-200 rounded-sm" />
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "modern-sidebar",
    name: "Modern",
    blurb: "Two-column, bold",
    render: () => (
      <div className="flex h-full">
        <div className="w-1/3 bg-[#0A2647] p-2 space-y-1.5">
          <div className="w-5 h-5 rounded-full bg-white/30 mx-auto" />
          <div className="h-0.5 w-full bg-white/40 rounded-sm" />
          <div className="h-0.5 w-4/5 bg-white/30 rounded-sm" />
        </div>
        <div className="flex-1 p-2 space-y-1.5">
          <div className="h-1.5 w-10 bg-stone-700 rounded-sm" />
          <div className="h-0.5 w-full bg-stone-200 rounded-sm" />
          <div className="h-0.5 w-5/6 bg-stone-200 rounded-sm" />
          <div className="h-1 w-6 bg-stone-400 rounded-sm mt-1" />
          <div className="h-0.5 w-full bg-stone-200 rounded-sm" />
        </div>
      </div>
    ),
  },
  {
    id: "executive",
    name: "Executive",
    blurb: "Senior leadership",
    render: () => (
      <div className="p-2.5 space-y-1.5">
        <div className="border-b-2 border-[#B8860B] pb-1.5">
          <div className="h-1.5 w-14 bg-stone-800 rounded-sm" />
          <div className="h-1 w-20 bg-stone-300 rounded-sm mt-1" />
        </div>
        {[0, 1].map((i) => (
          <div key={i} className="space-y-1">
            <div className="h-1 w-8 bg-[#B8860B] rounded-sm" />
            <div className="h-0.5 w-full bg-stone-200 rounded-sm" />
            <div className="h-0.5 w-4/5 bg-stone-200 rounded-sm" />
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "creative",
    name: "Creative",
    blurb: "Design & marketing",
    render: () => (
      <div className="h-full">
        <div className="h-6 bg-gradient-to-r from-violet-500 to-indigo-600" />
        <div className="p-2.5 space-y-1.5">
          <div className="h-1.5 w-12 bg-stone-700 rounded-sm" />
          <div className="h-0.5 w-full bg-stone-200 rounded-sm" />
          <div className="flex gap-1 mt-1">
            <div className="h-2.5 w-6 bg-violet-100 rounded-sm" />
            <div className="h-2.5 w-5 bg-indigo-100 rounded-sm" />
            <div className="h-2.5 w-6 bg-violet-100 rounded-sm" />
          </div>
        </div>
      </div>
    ),
  },
];

const GOALS: { id: "ats" | "recruiter" | "both"; label: string; sub: string; Icon: typeof Target }[] = [
  { id: "ats", label: "Beat the ATS", sub: "Get past the screening bots", Icon: ShieldCheck },
  { id: "recruiter", label: "Impress the recruiter", sub: "Stand out to a human", Icon: Target },
  { id: "both", label: "Both", sub: "Pass the bots and win the human", Icon: Sparkles },
];

const STEP_COUNT = 5;

export function OnboardingFunnel({ onComplete }: { onComplete: (r: FunnelResult) => void }) {
  const [step, setStep] = useState(0);
  const [role, setRole] = useState("");
  const [goal, setGoal] = useState<FunnelResult["goal"]>(null);
  const [template, setTemplate] = useState<BuilderTemplateId>("ivy-league");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const next = () => setStep((s) => Math.min(STEP_COUNT - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  function finish(extra?: Partial<FunnelResult>) {
    track("funnel_completed", { goal: goal ?? "skip" });
    onComplete({ role: role.trim(), goal, template, ...extra });
  }

  async function handleUpload(file: File) {
    if (uploading) return;
    setUploading(true);
    track("funnel_cv_uploaded", { size: file.size });
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/chat/parse-cv", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Couldn't read that file");
      finish({ cvText: data.text, cvFileName: data.fileName });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
      setUploading(false);
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Progress + back */}
      <div className="flex-shrink-0 flex items-center gap-3 px-1">
        {step > 0 ? (
          <button
            type="button"
            onClick={back}
            aria-label="Back"
            className="grid place-items-center h-8 w-8 rounded-full text-stone-400 hover:text-[#0A2647] hover:bg-stone-100 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        ) : (
          <span className="h-8 w-8" />
        )}
        <div className="flex-1 h-1 rounded-full bg-stone-200 overflow-hidden">
          <div
            className="h-full bg-[#0A2647] rounded-full transition-all duration-500 ease-out"
            style={{ width: `${((step + 1) / STEP_COUNT) * 100}%` }}
          />
        </div>
        <span className="text-xs text-stone-400 tabular-nums w-10 text-right">
          {step + 1}/{STEP_COUNT}
        </span>
      </div>

      {/* Step body */}
      <div className="flex-1 min-h-0 flex items-center justify-center px-4">
        <div key={step} className="w-full max-w-2xl mx-auto text-center animate-in fade-in slide-in-from-bottom-3 duration-300">
          {/* 0 — Role */}
          {step === 0 ? (
            <>
              <p className="text-sm font-medium tracking-[0.16em] uppercase text-[#B8860B] mb-4">Let&apos;s begin</p>
              <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-[#1a1a1a] leading-tight">
                What role are you going after?
              </h1>
              <p className="text-stone-500 mt-3 font-light">We&apos;ll tailor everything to it — wording, skills, emphasis.</p>
              <input
                autoFocus
                value={role}
                onChange={(e) => setRole(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && role.trim() && next()}
                placeholder="e.g. Senior Product Manager"
                className="mt-7 w-full max-w-md mx-auto block px-5 py-4 text-center text-lg bg-white border border-stone-300 rounded-sm text-[#1a1a1a] placeholder:text-stone-400 focus:outline-none focus:border-[#0A2647] shadow-sm transition-colors"
              />
              <div className="mt-6 flex flex-col items-center gap-3">
                <button
                  type="button"
                  disabled={!role.trim()}
                  onClick={next}
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-sm bg-[#0A2647] text-white font-medium hover:bg-[#0d3259] disabled:opacity-40 transition-all shadow-sm tracking-wide"
                >
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button type="button" onClick={next} className="text-sm text-stone-400 hover:text-stone-600 transition-colors">
                  Not sure yet — skip
                </button>
              </div>
            </>
          ) : null}

          {/* 1 — Goal */}
          {step === 1 ? (
            <>
              <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-[#1a1a1a] leading-tight">
                What matters most right now?
              </h1>
              <p className="text-stone-500 mt-3 font-light">We&apos;ll weight the rewrite accordingly.</p>
              <div className="mt-8 grid sm:grid-cols-3 gap-3">
                {GOALS.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => {
                      setGoal(g.id);
                      next();
                    }}
                    className={`group flex flex-col items-center text-center gap-2 p-5 rounded-sm bg-white border transition-all hover:-translate-y-0.5 ${
                      goal === g.id ? "border-[#B8860B] shadow-md" : "border-stone-200 hover:border-[#0A2647]/40 shadow-sm hover:shadow-md"
                    }`}
                  >
                    <span className="grid place-items-center h-11 w-11 rounded-full bg-[#0A2647]/5 text-[#0A2647] group-hover:bg-[#0A2647]/10 transition-colors">
                      <g.Icon className="h-5 w-5" strokeWidth={1.6} />
                    </span>
                    <span className="font-medium text-[#1a1a1a]">{g.label}</span>
                    <span className="text-xs text-stone-500 font-light">{g.sub}</span>
                  </button>
                ))}
              </div>
            </>
          ) : null}

          {/* 2 — Reassurance */}
          {step === 2 ? (
            <>
              <span className="inline-grid place-items-center h-14 w-14 rounded-full bg-[#B8860B]/10 text-[#B8860B] mb-5">
                <ShieldCheck className="h-7 w-7" strokeWidth={1.5} />
              </span>
              <h1 className="font-serif text-3xl sm:text-4xl text-[#1a1a1a] leading-tight">
                Good — you&apos;re thinking like a recruiter.
              </h1>
              <p className="text-stone-500 mt-4 font-light text-lg max-w-xl mx-auto leading-relaxed">
                Most resumes get filtered by software before a person ever reads them. We build yours to clear the
                screen <span className="text-[#0A2647] font-medium">and</span> hold a recruiter&apos;s attention in the
                six seconds they actually spend.
              </p>
              <button
                type="button"
                onClick={next}
                className="mt-8 inline-flex items-center gap-2 px-7 py-3.5 rounded-sm bg-[#0A2647] text-white font-medium hover:bg-[#0d3259] transition-colors shadow-sm tracking-wide"
              >
                Show me how
                <ArrowRight className="h-4 w-4" />
              </button>
            </>
          ) : null}

          {/* 3 — Template */}
          {step === 3 ? (
            <>
              <h1 className="font-serif text-3xl sm:text-4xl text-[#1a1a1a] leading-tight">Pick a look</h1>
              <p className="text-stone-500 mt-3 font-light">You can change it any time while we build.</p>
              <div className="mt-7 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTemplate(t.id)}
                    className={`group relative rounded-sm bg-white border overflow-hidden transition-all hover:-translate-y-0.5 ${
                      template === t.id ? "border-[#B8860B] ring-2 ring-[#B8860B]/30 shadow-md" : "border-stone-200 hover:border-stone-300 shadow-sm"
                    }`}
                  >
                    {template === t.id ? (
                      <span className="absolute top-1.5 right-1.5 z-10 grid place-items-center h-5 w-5 rounded-full bg-[#B8860B] text-white">
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </span>
                    ) : null}
                    <div className="aspect-[3/4] bg-white border-b border-stone-100 overflow-hidden">{t.render()}</div>
                    <div className="px-2 py-1.5 text-left">
                      <div className="text-xs font-medium text-[#1a1a1a]">{t.name}</div>
                      <div className="text-[10px] text-stone-400 font-light">{t.blurb}</div>
                    </div>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={next}
                className="mt-7 inline-flex items-center gap-2 px-7 py-3.5 rounded-sm bg-[#0A2647] text-white font-medium hover:bg-[#0d3259] transition-colors shadow-sm tracking-wide"
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </button>
            </>
          ) : null}

          {/* 4 — Import */}
          {step === 4 ? (
            <>
              <h1 className="font-serif text-3xl sm:text-4xl text-[#1a1a1a] leading-tight">
                Last thing — bring what you&apos;ve got
              </h1>
              <p className="text-stone-500 mt-3 font-light">
                Upload your current CV and we&apos;ll pull everything in, or start from a blank page.
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUpload(f);
                  e.target.value = "";
                }}
              />
              <div className="mt-8 grid sm:grid-cols-2 gap-3 max-w-lg mx-auto">
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                  className="group flex flex-col items-center text-center gap-2 p-6 rounded-sm bg-[#0A2647] text-white hover:bg-[#0d3259] transition-colors shadow-sm disabled:opacity-60"
                >
                  <span className="grid place-items-center h-11 w-11 rounded-full bg-white/10">
                    {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <UploadCloud className="h-5 w-5" />}
                  </span>
                  <span className="font-medium">{uploading ? "Reading your CV…" : "Upload my CV"}</span>
                  <span className="text-xs text-white/60 font-light">PDF or Word</span>
                </button>
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => finish()}
                  className="group flex flex-col items-center text-center gap-2 p-6 rounded-sm bg-white border border-stone-200 hover:border-[#0A2647]/40 hover:shadow-md transition-all shadow-sm disabled:opacity-60"
                >
                  <span className="grid place-items-center h-11 w-11 rounded-full bg-[#0A2647]/5 text-[#0A2647]">
                    <PenLine className="h-5 w-5" />
                  </span>
                  <span className="font-medium text-[#1a1a1a]">Start from scratch</span>
                  <span className="text-xs text-stone-500 font-light">We&apos;ll interview you</span>
                </button>
              </div>
              <div className="mt-5 inline-flex items-center gap-1.5 text-xs text-stone-400">
                <FileText className="h-3.5 w-3.5" />
                Your file is read once, never shared.
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
