"use client";

/**
 * BuildOnboarding — the "Build your CV" front door.
 *
 * A calm, full-screen, assistant-led warm-up: a friendly greeting, then a few
 * quick questions, then a short "putting your first draft together" beat before
 * we hand off to the real builder. The point is to never drop someone into an
 * empty form — we greet them, learn the role + experience, and seed a first
 * draft so the builder opens already pointed at the job they want.
 *
 * Handoffs are real, not decorative:
 *  - "Answer a few questions" seeds personalInfo.title with the target role in
 *    the persisted resume store, then opens /build/chat.
 *  - "I have a CV"            stashes the file on the onboarding store, then
 *    opens the optimizer.
 *  - "Blank template"         seeds the role and opens the step-by-step builder.
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  FileUp,
  MessageSquareText,
  PencilLine,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { useResumeStore } from "@/store/useResumeStore";
import { useOnboardingStore } from "@/stores/onboardingStore";
import { track } from "@/lib/analytics";
import type { BuilderTemplateId } from "@/context/BuilderContext";

type Step = "intro" | "role" | "goal" | "reassurance" | "experience" | "template" | "method" | "handoff";
type GoalId = "ats" | "recruiter" | "both";

const ROLE_SUGGESTIONS = [
  "Software Engineer",
  "Product Manager",
  "Data Analyst",
  "Marketing Manager",
  "Designer",
  "Project Manager",
];

const GOAL_OPTIONS: { id: GoalId; title: string; desc: string; badge?: string }[] = [
  { id: "ats", title: "Get past the ATS", desc: "Clear the resume-screening software that reads it first." },
  { id: "recruiter", title: "Impress the recruiter", desc: "Stand out to the human who decides on the interview." },
  { id: "both", title: "Both", desc: "Beat the filter and win the person.", badge: "Most pick this" },
];

const EXPERIENCE_OPTIONS = [
  { id: "student", label: "Just starting out", hint: "Student or new grad" },
  { id: "1-3", label: "1–3 years", hint: "Early career" },
  { id: "3-5", label: "3–5 years", hint: "Building momentum" },
  { id: "5-10", label: "5–10 years", hint: "Senior" },
  { id: "10+", label: "10+ years", hint: "Lead / executive" },
];

const TEMPLATE_OPTIONS: { id: BuilderTemplateId; name: string; tag: string }[] = [
  { id: "ivy-league", name: "The Ivy", tag: "Classic" },
  { id: "modern-sidebar", name: "The Modern", tag: "Popular" },
  { id: "executive", name: "Executive", tag: "Senior" },
  { id: "creative", name: "Creative", tag: "Design" },
];

// Order matters: drives the slim progress bar (intro/reassurance/handoff are beats).
const QUESTION_STEPS: Step[] = ["role", "goal", "experience", "template", "method"];

export function BuildOnboarding({ embedded = false }: { embedded?: boolean } = {}) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("intro");
  const [role, setRole] = useState("");
  const [goal, setGoal] = useState<GoalId | null>(null);
  const [experience, setExperience] = useState<string | null>(null);
  const [template, setTemplate] = useState<BuilderTemplateId>("ivy-league");
  const [handoffLabel, setHandoffLabel] = useState("Putting your first draft together…");

  useEffect(() => {
    track("build_onboarding_viewed");
  }, []);

  const progress =
    step === "handoff" ? 1 : Math.max(0, QUESTION_STEPS.indexOf(step)) / QUESTION_STEPS.length;

  function go(next: Step) {
    setStep(next);
    if (QUESTION_STEPS.includes(next)) {
      track("build_onboarding_step", { step: next });
    }
  }

  /** Seed the real stores so the next surface opens already personalised. */
  function seedRole() {
    const r = role.trim();
    if (!r) return;
    useResumeStore.getState().updatePersonalInfo({ title: r });
    useOnboardingStore.getState().setRoles([r]);
  }

  /** Stash the funnel result so the (anonymous) builder drafts the CV at once. */
  function stashKickoff(cvText: string | null) {
    try {
      sessionStorage.setItem(
        "builder-kickoff",
        JSON.stringify({ role: role.trim(), goal, template, experience, cvText }),
      );
    } catch {
      /* ignore — builder falls back to its greeting */
    }
  }

  function finish(method: "chat" | "manual", destination: string, label: string) {
    seedRole();
    track("build_onboarding_completed", { method, role: role.trim() || null, goal, experience, template });
    // Build-first, sign up to save: the chat builder is anonymous now, so we
    // hand off straight in and let it draft from what we learned.
    if (method === "chat") stashKickoff(null);
    setHandoffLabel(label);
    go("handoff");
    const delay = reduce ? 150 : 1100;
    window.setTimeout(() => router.push(destination), delay);
  }

  async function handleFile(file: File) {
    try {
      const text = await file.text().catch(() => "");
      useOnboardingStore.getState().setCv(file.name, text);
      seedRole();
      stashKickoff(text || null);
      track("build_onboarding_completed", { method: "upload", role: role.trim() || null, goal, experience, template });
      setHandoffLabel(`Reading ${file.name}…`);
      go("handoff");
      // The uploaded CV drafts live in the (anonymous) builder — not the old
      // optimizer — so the experience matches "answer a few questions, watch it build".
      window.setTimeout(() => router.push("/build/chat"), reduce ? 150 : 900);
    } catch {
      toast.error("Couldn't read that file — try a PDF or DOCX.");
    }
  }

  const fade = {
    initial: { opacity: 0, y: reduce ? 0 : 14 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: reduce ? 0 : -10 },
    transition: { duration: reduce ? 0.001 : 0.4, ease: [0.22, 1, 0.36, 1] as const },
  };

  return (
    <div
      className={`relative w-full overflow-hidden bg-[#FBF9F4] text-[#0A2647] ${
        embedded ? "flex h-full flex-col" : "min-h-dvh"
      }`}
    >
      {/* Aurora — calm, light, on-brand. Three soft blobs + grain. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-24 h-[42rem] w-[42rem] rounded-full bg-[#C9B8FF] opacity-40 blur-[120px]" />
        <div className="absolute -right-40 top-10 h-[38rem] w-[38rem] rounded-full bg-[#8FB3FF] opacity-30 blur-[130px]" />
        <div className="absolute bottom-[-12rem] left-1/3 h-[40rem] w-[40rem] rounded-full bg-[#F5C4D4] opacity-30 blur-[130px]" />
      </div>
      <div aria-hidden className="grain-overlay absolute inset-0" />

      {/* Minimal chrome — only when standalone (/build). On the home the site
          header is already present, so we skip our own to avoid a double bar. */}
      {!embedded && (
        <header className="relative z-10 flex items-center justify-between px-5 py-5 sm:px-8">
          <Logo variant="dark" size="md" />
          <div className="flex items-center gap-3">
            <SignedOut>
              <SignInButton mode="modal">
                <button className="rounded-full border border-[#0A2647]/15 px-4 py-2 text-sm font-medium text-[#0A2647] transition-colors hover:bg-[#0A2647]/5 focus-visible:outline-none">
                  Log in
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <UserButton appearance={{ elements: { avatarBox: "w-9 h-9 ring-2 ring-white/70" } }} />
            </SignedIn>
          </div>
        </header>
      )}

      {/* Progress — hidden on the cinematic intro + handoff */}
      {QUESTION_STEPS.includes(step) && (
        <div className="relative z-10 mx-auto max-w-xl px-5">
          <div className="h-1 w-full overflow-hidden rounded-full bg-[#0A2647]/10">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-[#0A2647] to-[#B8860B]"
              initial={false}
              animate={{ width: `${Math.max(progress, 0.08) * 100}%` }}
              transition={{ duration: reduce ? 0.001 : 0.5, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
        </div>
      )}

      {/* Stage */}
      <main
        className={`relative z-10 mx-auto flex max-w-2xl flex-col items-center justify-center px-5 text-center ${
          embedded ? "min-h-0 flex-1 pb-8 pt-4" : "min-h-[calc(100dvh-9rem)] pb-16"
        }`}
      >
        {/* Steps mount/unmount directly — enter animation only, so transitions
            never depend on framer-motion's exit-complete callback (which can
            stall under Strict Mode and freeze the funnel). */}
        {/* ---------- INTRO ---------- */}
          {step === "intro" && (
            <motion.div key="intro" {...fade} className="flex flex-col items-center">
              <Orb reduce={!!reduce} />
              <p className="mt-8 font-mono text-xs uppercase tracking-[0.28em] text-[#B8860B]">
                Your CV coach
              </p>
              <h1 className="mt-4 max-w-xl text-balance font-serif text-4xl leading-[1.05] text-[#0A2647] sm:text-5xl md:text-6xl">
                Let&rsquo;s build a CV that gets you{" "}
                <span className="italic text-[#B8860B]">hired.</span>
              </h1>
              <p className="mt-5 max-w-md text-pretty text-lg leading-relaxed text-[#0A2647]/65">
                A few quick questions, and we&rsquo;ll have your first draft together
                in about two minutes.
              </p>
              <div className="mt-9 flex flex-col items-center gap-4 sm:flex-row">
                <button
                  onClick={() => go("role")}
                  className="group inline-flex items-center gap-2.5 rounded-full bg-[#0A2647] px-8 py-4 text-base font-medium text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none"
                >
                  Let&rsquo;s begin
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" strokeWidth={1.75} />
                </button>
                <button
                  onClick={() => go("method")}
                  className="text-sm font-medium text-[#0A2647]/60 underline-offset-4 transition-colors hover:text-[#0A2647] hover:underline focus-visible:outline-none"
                >
                  I already have a CV
                </button>
              </div>
            </motion.div>
          )}

          {/* ---------- Q1: ROLE ---------- */}
          {step === "role" && (
            <motion.div key="role" {...fade} className="w-full">
              <StepLabel step="role" />
              <h2 className="mt-4 text-balance font-serif text-3xl text-[#0A2647] sm:text-4xl md:text-5xl">
                What role are you going after?
              </h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (role.trim()) go("goal");
                }}
                className="mx-auto mt-8 w-full max-w-md"
              >
                <input
                  autoFocus
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="e.g. Product Manager"
                  aria-label="Target role"
                  className="w-full rounded-2xl border border-[#0A2647]/15 bg-white/80 px-5 py-4 text-center text-xl text-[#0A2647] shadow-sm outline-none backdrop-blur transition-shadow placeholder:text-[#0A2647]/35 focus:border-[#0A2647]/40 focus:shadow-md"
                />
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  {ROLE_SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        setRole(s);
                        go("goal");
                      }}
                      className="rounded-full border border-[#0A2647]/12 bg-white/60 px-3.5 py-1.5 text-sm text-[#0A2647]/75 transition-colors hover:border-[#0A2647]/30 hover:bg-white focus-visible:outline-none"
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <div className="mt-8 flex items-center justify-center gap-3">
                  <BackButton onClick={() => go("intro")} />
                  <button
                    type="submit"
                    disabled={!role.trim()}
                    className="inline-flex items-center gap-2 rounded-full bg-[#0A2647] px-7 py-3.5 text-sm font-medium text-white transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 focus-visible:outline-none"
                  >
                    Continue
                    <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* ---------- Q2: GOAL ---------- */}
          {step === "goal" && (
            <motion.div key="goal" {...fade} className="w-full">
              <StepLabel step="goal" />
              <h2 className="mt-4 text-balance font-serif text-3xl text-[#0A2647] sm:text-4xl md:text-5xl">
                What should your CV do first?
              </h2>
              <p className="mx-auto mt-3 max-w-md text-[#0A2647]/55">
                Most resumes are read by software before a person ever sees them — tell us where to aim.
              </p>
              <div className="mx-auto mt-8 grid w-full max-w-md gap-3">
                {GOAL_OPTIONS.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => {
                      setGoal(o.id);
                      go("reassurance");
                    }}
                    className="group flex items-center justify-between rounded-2xl border border-[#0A2647]/12 bg-white/70 px-5 py-4 text-left backdrop-blur transition-all hover:-translate-y-0.5 hover:border-[#0A2647]/30 hover:bg-white hover:shadow-md focus-visible:outline-none"
                  >
                    <span className="min-w-0">
                      <span className="flex items-center gap-2">
                        <span className="text-base font-medium text-[#0A2647]">{o.title}</span>
                        {o.badge && (
                          <span className="rounded-full bg-[#B8860B]/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#B8860B]">
                            {o.badge}
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 block text-sm text-[#0A2647]/55">{o.desc}</span>
                    </span>
                    <ArrowRight className="ml-3 h-4 w-4 shrink-0 text-[#0A2647]/30 transition-all group-hover:translate-x-0.5 group-hover:text-[#B8860B]" strokeWidth={1.75} />
                  </button>
                ))}
              </div>
              <div className="mt-8 flex justify-center">
                <BackButton onClick={() => go("role")} />
              </div>
            </motion.div>
          )}

          {/* ---------- BEAT: REASSURANCE ---------- */}
          {step === "reassurance" && (
            <motion.div key="reassurance" {...fade} className="flex w-full flex-col items-center">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-[#0A2647]/5 text-[#B8860B]">
                <Sparkles className="h-7 w-7" strokeWidth={1.6} />
              </span>
              <h2 className="mt-6 max-w-xl text-balance font-serif text-3xl text-[#0A2647] sm:text-4xl">
                {goal === "recruiter"
                  ? "Smart — people hire people."
                  : "Good call — that's how hiring really works."}
              </h2>
              <p className="mx-auto mt-5 max-w-md text-pretty text-lg leading-relaxed text-[#0A2647]/65">
                {goal === "recruiter"
                  ? "We'll make every line earn its place — specific, results-first, and easy for a busy recruiter to skim in seconds."
                  : "We'll make sure the screening software can read every section, and still write it so a human wants to keep reading."}
                {role.trim() && (
                  <>
                    {" "}
                    Everything stays tuned for{" "}
                    <span className="font-medium text-[#B8860B]">{role.trim()}</span>.
                  </>
                )}
              </p>
              <div className="mt-9 flex items-center justify-center gap-3">
                <BackButton onClick={() => go("goal")} />
                <button
                  onClick={() => go("experience")}
                  className="group inline-flex items-center gap-2 rounded-full bg-[#0A2647] px-7 py-3.5 text-sm font-medium text-white transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none"
                >
                  Makes sense
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" strokeWidth={1.75} />
                </button>
              </div>
            </motion.div>
          )}

          {/* ---------- Q3: EXPERIENCE ---------- */}
          {step === "experience" && (
            <motion.div key="experience" {...fade} className="w-full">
              <StepLabel step="experience" />
              <h2 className="mt-4 text-balance font-serif text-3xl text-[#0A2647] sm:text-4xl md:text-5xl">
                How much experience do you have?
              </h2>
              <div className="mx-auto mt-8 grid w-full max-w-md grid-cols-1 gap-3 sm:grid-cols-2">
                {EXPERIENCE_OPTIONS.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => {
                      setExperience(o.id);
                      go("template");
                    }}
                    className="group flex items-center justify-between rounded-2xl border border-[#0A2647]/12 bg-white/70 px-5 py-4 text-left backdrop-blur transition-all hover:-translate-y-0.5 hover:border-[#0A2647]/30 hover:bg-white hover:shadow-md focus-visible:outline-none"
                  >
                    <span>
                      <span className="block text-base font-medium text-[#0A2647]">{o.label}</span>
                      <span className="block text-xs text-[#0A2647]/50">{o.hint}</span>
                    </span>
                    <ArrowRight className="h-4 w-4 text-[#0A2647]/30 transition-all group-hover:translate-x-0.5 group-hover:text-[#B8860B]" strokeWidth={1.75} />
                  </button>
                ))}
              </div>
              <div className="mt-8 flex justify-center">
                <BackButton onClick={() => go("reassurance")} />
              </div>
            </motion.div>
          )}

          {/* ---------- Q4: TEMPLATE ---------- */}
          {step === "template" && (
            <motion.div key="template" {...fade} className="w-full">
              <StepLabel step="template" />
              <h2 className="mt-4 text-balance font-serif text-3xl text-[#0A2647] sm:text-4xl md:text-5xl">
                Pick a look to start with
              </h2>
              <p className="mx-auto mt-3 max-w-md text-[#0A2647]/55">
                You can change it anytime — nothing&rsquo;s locked in.
              </p>
              <div className="mx-auto mt-8 grid w-full max-w-md grid-cols-2 gap-4 sm:grid-cols-4">
                {TEMPLATE_OPTIONS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTemplate(t.id)}
                    aria-pressed={template === t.id}
                    className={`group flex flex-col items-stretch rounded-xl border bg-white/80 p-2 text-left backdrop-blur transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none ${
                      template === t.id
                        ? "border-[#B8860B] ring-2 ring-[#B8860B]/40"
                        : "border-[#0A2647]/12 hover:border-[#0A2647]/30"
                    }`}
                  >
                    <TemplateMock id={t.id} />
                    <span className="mt-2 px-0.5">
                      <span className="block text-xs font-medium text-[#0A2647]">{t.name}</span>
                      <span className="block text-[10px] text-[#0A2647]/50">{t.tag}</span>
                    </span>
                  </button>
                ))}
              </div>
              <div className="mt-8 flex items-center justify-center gap-3">
                <BackButton onClick={() => go("experience")} />
                <button
                  onClick={() => go("method")}
                  className="group inline-flex items-center gap-2 rounded-full bg-[#0A2647] px-7 py-3.5 text-sm font-medium text-white transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none"
                >
                  Continue
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" strokeWidth={1.75} />
                </button>
              </div>
            </motion.div>
          )}

          {/* ---------- Q5: METHOD ---------- */}
          {step === "method" && (
            <motion.div key="method" {...fade} className="w-full">
              <StepLabel step="method" />
              <h2 className="mt-4 text-balance font-serif text-3xl text-[#0A2647] sm:text-4xl md:text-5xl">
                How would you like to start?
              </h2>
              <div className="mx-auto mt-8 grid w-full max-w-md gap-3">
                <MethodCard
                  icon={<MessageSquareText className="h-5 w-5" strokeWidth={1.75} />}
                  title="Answer a few questions"
                  desc="Chat with your coach — it writes each section as you talk."
                  badge="Recommended"
                  onClick={() => finish("chat", "/build/chat", "Putting your first draft together…")}
                />
                <MethodCard
                  icon={<FileUp className="h-5 w-5" strokeWidth={1.75} />}
                  title="I have a CV to improve"
                  desc="Upload a PDF or DOCX and we&rsquo;ll tailor it to your role."
                  onClick={() => fileRef.current?.click()}
                />
                <MethodCard
                  icon={<PencilLine className="h-5 w-5" strokeWidth={1.75} />}
                  title="Start from a blank template"
                  desc="Fill it in yourself, step by step."
                  onClick={() => finish("manual", "/builder", "Opening your builder…")}
                />
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
              <div className="mt-8 flex justify-center">
                <BackButton onClick={() => go("template")} />
              </div>
            </motion.div>
          )}

          {/* ---------- HANDOFF ---------- */}
          {step === "handoff" && (
            <motion.div key="handoff" {...fade} className="flex flex-col items-center">
              <Orb reduce={!!reduce} busy />
              <p className="mt-8 font-serif text-2xl text-[#0A2647] sm:text-3xl">{handoffLabel}</p>
              {role.trim() && (
                <p className="mt-3 text-sm text-[#0A2647]/55">
                  Tailoring for <span className="font-medium text-[#B8860B]">{role.trim()}</span>
                </p>
              )}
            </motion.div>
          )}
      </main>
    </div>
  );
}

/* ----------------------------- pieces ----------------------------- */

function Orb({ reduce, busy = false }: { reduce: boolean; busy?: boolean }) {
  return (
    <div className="relative grid h-20 w-20 place-items-center">
      {!reduce && (
        <span
          className="absolute inset-0 rounded-full bg-[#B8860B]/30"
          style={{ animation: busy ? "pulse 1.1s ease-in-out infinite" : "pulse 2.6s ease-in-out infinite" }}
        />
      )}
      <span className="relative grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-[#0A2647] to-[#143a63] shadow-[0_12px_30px_-8px_rgba(10,38,71,0.6)]">
        <Sparkles className="h-7 w-7 text-[#F4D58D]" strokeWidth={1.6} />
      </span>
    </div>
  );
}

function StepLabel({ step }: { step: Step }) {
  const i = QUESTION_STEPS.indexOf(step);
  if (i < 0) return null;
  return (
    <p className="font-mono text-xs uppercase tracking-[0.28em] text-[#B8860B]">
      Question {i + 1} of {QUESTION_STEPS.length}
    </p>
  );
}

/** Tiny abstract preview of each template — enough to tell them apart. */
function TemplateMock({ id }: { id: BuilderTemplateId }) {
  if (id === "modern-sidebar") {
    return (
      <div className="flex aspect-[3/4] overflow-hidden rounded-md border border-[#0A2647]/10 bg-white">
        <div className="w-1/3 bg-[#0A2647] p-1.5">
          <div className="mx-auto mb-1.5 h-4 w-4 rounded-full bg-white/30" />
          <div className="space-y-1">
            <div className="h-0.5 w-full rounded bg-white/40" />
            <div className="h-0.5 w-4/5 rounded bg-white/25" />
          </div>
        </div>
        <div className="flex-1 space-y-1 p-1.5">
          <div className="h-1 w-2/3 rounded bg-[#0A2647]/70" />
          <div className="h-0.5 w-full rounded bg-[#0A2647]/15" />
          <div className="h-0.5 w-5/6 rounded bg-[#0A2647]/15" />
          <div className="mt-1.5 h-0.5 w-full rounded bg-[#0A2647]/15" />
        </div>
      </div>
    );
  }
  if (id === "executive") {
    return (
      <div className="aspect-[3/4] overflow-hidden rounded-md border border-[#0A2647]/10 bg-white p-2">
        <div className="mb-1.5 border-b-2 border-[#B8860B] pb-1.5">
          <div className="h-1.5 w-3/4 rounded bg-[#0A2647]/80" />
          <div className="mt-1 h-0.5 w-full rounded bg-[#0A2647]/20" />
        </div>
        <div className="space-y-1">
          <div className="h-0.5 w-8 rounded bg-[#B8860B]" />
          <div className="h-0.5 w-full rounded bg-[#0A2647]/15" />
          <div className="h-0.5 w-5/6 rounded bg-[#0A2647]/15" />
        </div>
      </div>
    );
  }
  if (id === "creative") {
    return (
      <div className="aspect-[3/4] overflow-hidden rounded-md border border-[#0A2647]/10 bg-white">
        <div className="h-5 bg-gradient-to-r from-violet-500 to-[#B8860B]" />
        <div className="space-y-1 p-2">
          <div className="h-1 w-2/3 rounded bg-[#0A2647]/70" />
          <div className="h-0.5 w-full rounded bg-[#0A2647]/15" />
          <div className="mt-1 flex gap-1">
            <div className="h-2 w-5 rounded bg-violet-200" />
            <div className="h-2 w-4 rounded bg-[#B8860B]/30" />
          </div>
        </div>
      </div>
    );
  }
  // ivy-league — classic centered serif
  return (
    <div className="aspect-[3/4] overflow-hidden rounded-md border border-[#0A2647]/10 bg-white p-2">
      <div className="mb-1.5 border-b border-[#0A2647]/15 pb-1.5 text-center">
        <div className="mx-auto h-1.5 w-1/2 rounded bg-[#0A2647]/80" />
        <div className="mx-auto mt-1 h-0.5 w-2/3 rounded bg-[#0A2647]/20" />
      </div>
      <div className="space-y-1">
        <div className="h-0.5 w-6 rounded bg-[#0A2647]/40" />
        <div className="h-0.5 w-full rounded bg-[#0A2647]/15" />
        <div className="h-0.5 w-5/6 rounded bg-[#0A2647]/15" />
      </div>
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full px-4 py-3.5 text-sm font-medium text-[#0A2647]/55 transition-colors hover:text-[#0A2647] focus-visible:outline-none"
    >
      <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
      Back
    </button>
  );
}

function MethodCard({
  icon,
  title,
  desc,
  badge,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  badge?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-4 rounded-2xl border border-[#0A2647]/12 bg-white/70 px-5 py-4 text-left backdrop-blur transition-all hover:-translate-y-0.5 hover:border-[#0A2647]/30 hover:bg-white hover:shadow-lg focus-visible:outline-none"
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#0A2647]/5 text-[#0A2647] transition-colors group-hover:bg-[#0A2647] group-hover:text-white">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="text-base font-medium text-[#0A2647]">{title}</span>
          {badge && (
            <span className="rounded-full bg-[#B8860B]/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#B8860B]">
              {badge}
            </span>
          )}
        </span>
        <span className="mt-0.5 block text-sm text-[#0A2647]/55">{desc}</span>
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-[#0A2647]/25 transition-all group-hover:translate-x-0.5 group-hover:text-[#B8860B]" strokeWidth={1.75} />
    </button>
  );
}

export default BuildOnboarding;
