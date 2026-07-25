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
 * Shape of the funnel (each thing is asked exactly ONCE):
 *  - start:    "How would you like to build it?" — upload / chat / voice /
 *              blank template. Upload skips the questions (the CV has the
 *              answers); the other three remember the choice and continue.
 *  - questions: role (optional, with a dropdown) → goal → experience →
 *              template, then hand off straight to the method chosen up front.
 *
 * Handoffs are real, not decorative — and every completed funnel run starts a
 * FRESH draft (clears the persisted chat transcript + CV + active session), so
 * "I started a new process" never resurrects the previous one. People who DO
 * want their old draft get an explicit "Continue where you left off" link on
 * the intro instead.
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  ChevronDown,
  FileUp,
  Loader2,
  MessageSquareText,
  Mic,
  PencilLine,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/LanguageProvider";
import { Logo } from "@/components/Logo";
import { useResumeStore } from "@/store/useResumeStore";
import { useOnboardingStore } from "@/stores/onboardingStore";
import { useChatBuilderStore, CHAT_ACTIVE_SESSION_KEY } from "@/stores/chatBuilderStore";
import { track } from "@/lib/analytics";
import type { BuilderTemplateId } from "@/context/BuilderContext";
import type { TemplateRegistryId } from "@/lib/templates/registry";

type Step = "intro" | "start" | "upload" | "role" | "goal" | "reassurance" | "experience" | "template" | "handoff";
type GoalId = "ats" | "recruiter" | "both";
type Method = "chat" | "voice" | "manual";

// Dropdown options for the role question. Free text is always allowed — this
// list just saves typing for the most common titles.
const ROLE_OPTIONS = [
  "Software Engineer",
  "Frontend Developer",
  "Backend Developer",
  "Full-Stack Developer",
  "Mobile Developer",
  "DevOps Engineer",
  "QA Engineer",
  "Data Analyst",
  "Data Scientist",
  "Data Engineer",
  "Machine Learning Engineer",
  "Product Manager",
  "Project Manager",
  "Program Manager",
  "Business Analyst",
  "UX/UI Designer",
  "Graphic Designer",
  "Marketing Manager",
  "Digital Marketing Specialist",
  "Content Writer",
  "Sales Manager",
  "Account Executive",
  "Customer Success Manager",
  "HR Manager",
  "Recruiter",
  "Financial Analyst",
  "Accountant",
  "Operations Manager",
  "Office Manager",
  "Executive Assistant",
  "Customer Support Representative",
  "Teacher",
  "Nurse",
  "Lawyer",
  "Civil Engineer",
  "Mechanical Engineer",
  "Electrical Engineer",
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

// Deliberately curated funnel subset (marketing names differ from the product
// names on purpose). Ids must exist in lib/templates/registry — the satisfies
// check turns a renamed/removed template into a build error instead of drift.
const TEMPLATE_OPTIONS = [
  { id: "ivy-league", name: "The Ivy", tag: "Classic" },
  { id: "modern-sidebar", name: "The Modern", tag: "Popular" },
  { id: "executive", name: "Executive", tag: "Senior" },
  { id: "creative", name: "Creative", tag: "Design" },
] satisfies { id: BuilderTemplateId & TemplateRegistryId; name: string; tag: string }[];

// Where each start-choice lands, and what the handoff beat says while we go.
const METHODS: Record<Method, { destination: string; label: string }> = {
  chat: { destination: "/build/chat", label: "Putting your first draft together…" },
  voice: { destination: "/build/voice", label: "Getting your voice coach ready…" },
  manual: { destination: "/builder", label: "Opening your builder…" },
};

// Order matters: drives the slim progress bar (intro/start/reassurance/handoff are beats).
const QUESTION_STEPS: Step[] = ["role", "goal", "experience", "template"];

// Funnel answers survive a page reload. Most of our traffic arrives in Meta /
// Instagram / TikTok in-app browsers, which reload the page routinely (memory
// pressure, app switches) — without this, every answer was lost mid-funnel.
// Per-tab (sessionStorage), restored on mount, cleared on completion.
const FUNNEL_STATE_KEY = "build-onboarding-state";
const RESTORABLE_STEPS: Step[] = ["start", "upload", "role", "goal", "reassurance", "experience", "template"];

// Client-side cap matching /api/chat/parse-cv's MAX_FILE_BYTES — the UI
// promises "up to 5 MB", so we enforce it before starting a doomed upload.
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export function BuildOnboarding({ embedded = false }: { embedded?: boolean } = {}) {
  const router = useRouter();
  const { t: translate } = useT();
  const reduce = useReducedMotion();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("intro");
  // How they chose to build at the start — decides the final handoff, so the
  // funnel never has to ask "how would you like to start?" a second time.
  const [method, setMethod] = useState<Method>("chat");
  // Target roles — plural: people often apply for more than one title, and the
  // step is optional, so this can also be empty.
  const [roles, setRoles] = useState<string[]>([]);
  const [roleInput, setRoleInput] = useState("");
  const [roleOpen, setRoleOpen] = useState(false);
  const [roleHighlight, setRoleHighlight] = useState(-1);
  const [goal, setGoal] = useState<GoalId | null>(null);
  const [experience, setExperience] = useState<string | null>(null);
  const [template, setTemplate] = useState<BuilderTemplateId>("ivy-league");
  const [handoffLabel, setHandoffLabel] = useState(translate("Putting your first draft together…"));
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  // True when a previous (persisted) draft exists on this device — shows the
  // "Continue where you left off" escape hatch, since finishing the funnel
  // deliberately starts fresh.
  const [hasDraft, setHasDraft] = useState(false);

  useEffect(() => {
    track("build_onboarding_viewed");
    // Read AFTER mount: the stores rehydrate from localStorage on the client,
    // and reading them during render would mismatch the SSR markup.
    try {
      const msgs = useChatBuilderStore.getState().messages;
      const cv = useResumeStore.getState().resumeData;
      setHasDraft(
        msgs.some((m) => m.role === "user") ||
          Boolean(cv.personalInfo.name.trim()) ||
          cv.experience.length > 0,
      );
    } catch {
      /* ignore — the link just doesn't show */
    }
  }, []);

  // Restore a reload-interrupted funnel run (see FUNNEL_STATE_KEY). Runs after
  // mount so the first client render still matches the SSR markup.
  const funnelRestoredRef = useRef(false);
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(FUNNEL_STATE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<{
          step: Step;
          method: Method;
          roles: string[];
          goal: GoalId | null;
          experience: string | null;
          template: BuilderTemplateId;
        }>;
        if (saved.step && RESTORABLE_STEPS.includes(saved.step)) setStep(saved.step);
        if (saved.method && saved.method in METHODS) setMethod(saved.method);
        if (Array.isArray(saved.roles)) {
          setRoles(saved.roles.filter((r): r is string => typeof r === "string" && !!r.trim()).slice(0, 5));
        }
        if (saved.goal === "ats" || saved.goal === "recruiter" || saved.goal === "both") setGoal(saved.goal);
        if (typeof saved.experience === "string") setExperience(saved.experience);
        if (saved.template && TEMPLATE_OPTIONS.some((o) => o.id === saved.template)) setTemplate(saved.template);
      }
    } catch {
      /* ignore — worst case the funnel starts over */
    } finally {
      funnelRestoredRef.current = true;
    }
  }, []);

  // Persist every answer as it changes (skipping the handoff beat — that run
  // is complete and its state already cleared).
  useEffect(() => {
    if (!funnelRestoredRef.current || step === "handoff") return;
    try {
      sessionStorage.setItem(
        FUNNEL_STATE_KEY,
        JSON.stringify({ step, method, roles, goal, experience, template }),
      );
    } catch {
      /* ignore — private-mode storage can be unavailable */
    }
  }, [step, method, roles, goal, experience, template]);

  function clearFunnelState() {
    try {
      sessionStorage.removeItem(FUNNEL_STATE_KEY);
    } catch {
      /* ignore */
    }
  }

  // The reassurance beat is a message, not a decision — auto-advance after a
  // short readable pause instead of demanding a tap. Tapping "Makes sense"
  // still skips ahead, and going Back to re-read it never auto-forwards again.
  const reassuranceSeenRef = useRef(false);
  useEffect(() => {
    if (step !== "reassurance" || reassuranceSeenRef.current) return;
    const id = window.setTimeout(() => {
      reassuranceSeenRef.current = true;
      go("experience");
    }, 2200);
    return () => window.clearTimeout(id);
  }, [step]);

  const progress =
    step === "handoff" ? 1 : Math.max(0, QUESTION_STEPS.indexOf(step)) / QUESTION_STEPS.length;

  function go(next: Step) {
    setStep(next);
    if (QUESTION_STEPS.includes(next)) {
      track("build_onboarding_step", { step: next });
    }
  }

  const primaryRole = roles[0] ?? "";
  const rolesLabel = roles.join(", ");

  // Dropdown list for the role combobox: filter by what's typed, hide what's
  // already added.
  const roleQuery = roleInput.trim().toLowerCase();
  const roleMatches = ROLE_OPTIONS.filter(
    (o) =>
      !roles.some((r) => r.toLowerCase() === o.toLowerCase()) &&
      (!roleQuery || o.toLowerCase().includes(roleQuery)),
  );

  /** Add a typed/selected role (deduped, capped) without leaving the step. */
  function addRole(value: string) {
    const v = value.trim();
    if (!v) return;
    setRoles((prev) =>
      prev.some((r) => r.toLowerCase() === v.toLowerCase()) || prev.length >= 5
        ? prev
        : [...prev, v],
    );
    setRoleInput("");
    setRoleHighlight(-1);
  }

  function removeRole(value: string) {
    setRoles((prev) => prev.filter((r) => r !== value));
  }

  /** Continue from the role step — commit whatever's typed but not yet added.
   * Always proceeds: the role question is optional, never a gate. */
  function commitRolesAndContinue() {
    const pending = roleInput.trim();
    if (pending && !roles.some((r) => r.toLowerCase() === pending.toLowerCase()) && roles.length < 5) {
      setRoles((prev) => [...prev, pending]);
      setRoleInput("");
    }
    setRoleOpen(false);
    go("goal");
  }

  /** Seed the real stores so the next surface opens already personalised. */
  function seedRole() {
    if (!roles.length) return;
    useResumeStore.getState().updatePersonalInfo({ title: roles[0] });
    useOnboardingStore.getState().setRoles(roles);
  }

  /**
   * Completing the funnel means "I'm starting a new CV" — drop the persisted
   * previous process (chat transcript, CV draft, active chat session) so the
   * builder opens fresh instead of resurrecting the old one. The old session
   * stays reachable from chat History for signed-in users; anyone who wanted
   * the old draft has the explicit "Continue where you left off" link instead.
   */
  function startFreshDraft() {
    useChatBuilderStore.getState().clear();
    useResumeStore.getState().resetResume();
    useOnboardingStore.getState().clear();
    try {
      localStorage.removeItem(CHAT_ACTIVE_SESSION_KEY);
    } catch {
      /* ignore */
    }
  }

  /** Stash the funnel result so the (anonymous) builder drafts the CV at once. */
  function stashKickoff(cvText: string | null) {
    try {
      sessionStorage.setItem(
        "builder-kickoff",
        JSON.stringify({ role: primaryRole, roles, goal, template, experience, cvText }),
      );
    } catch {
      /* ignore — builder falls back to its greeting */
    }
  }

  /** Hand off to the method chosen at the start — fresh draft, seeded stores. */
  function finish(m: Method = method) {
    clearFunnelState();
    startFreshDraft();
    seedRole();
    track("build_onboarding_completed", { method: m, role: primaryRole || null, roles: rolesLabel || null, goal, experience, template });
    // Build-first, sign up to save: the builder is anonymous now, so we hand
    // off straight in and let it draft from what we learned.
    stashKickoff(null);
    const { destination, label } = METHODS[m];
    setHandoffLabel(translate(label));
    go("handoff");
    const delay = reduce ? 150 : 1100;
    window.setTimeout(() => router.push(destination), delay);
  }

  /** Client-side gate mirroring /api/chat/parse-cv (5 MB cap, PDF/DOCX/text
   * only, legacy .doc rejected) — a friendly error beats a doomed upload,
   * especially on the mobile connections most of our traffic arrives on. */
  function validateCvFile(file: File): string | null {
    const name = (file.name || "").toLowerCase();
    if (name.endsWith(".doc") && !name.endsWith(".docx")) {
      return translate("Old-style .doc files aren’t supported — save it as .docx or PDF and try again.");
    }
    const isPdf = file.type === "application/pdf" || name.endsWith(".pdf");
    const isDocx =
      file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      name.endsWith(".docx");
    const isText = file.type.startsWith("text/") || /\.(txt|md|rtf)$/.test(name) || file.type === "";
    if (!isPdf && !isDocx && !isText) {
      return translate("That format isn’t supported — upload a PDF or DOCX file.");
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return translate("That file is over 5 MB — export a smaller PDF and try again.");
    }
    return null;
  }

  async function handleFile(file: File) {
    if (uploading) return;
    const problem = validateCvFile(file);
    if (problem) {
      toast.error(problem);
      return;
    }
    setUploading(true);
    try {
      // Parse via the same endpoint the in-chat upload uses (unpdf / mammoth) so a
      // PDF/DOCX becomes real text — not the binary garbage file.text() returns.
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/chat/parse-cv", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.text) {
        throw new Error(data?.error ?? translate("Couldn't read that file — try a PDF or DOCX."));
      }
      clearFunnelState();
      startFreshDraft();
      seedRole();
      useOnboardingStore.getState().setCv(data.fileName, data.text);
      stashKickoff(null);
      // Hand the parsed CV to the builder so it drafts from it the instant it opens.
      try {
        sessionStorage.setItem(
          "builder-cv-intake",
          JSON.stringify({ fileName: data.fileName, text: data.text }),
        );
      } catch {
        /* ignore — the builder still opens, just without the auto-draft */
      }
      track("build_onboarding_completed", { method: "upload", role: primaryRole || null, roles: rolesLabel || null, goal, experience, template });
      setHandoffLabel(translate("Optimizing your CV…"));
      go("handoff");
      // The uploaded CV drafts live in the (anonymous) builder — not the old
      // optimizer — so the experience matches "upload it, watch it optimize".
      window.setTimeout(() => router.push("/build/chat"), reduce ? 150 : 900);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : translate("Couldn't read that file — try a PDF or DOCX."));
      setUploading(false);
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
      className={`relative w-full overflow-hidden bg-white text-brand-navy ${
        embedded ? "flex h-full flex-col" : "min-h-dvh"
      }`}
    >
      {/* Clean & airy (Enhancv-like): white canvas, no aurora wash — a single
          faint warm halo behind the stage keeps it from feeling sterile. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-[34rem] w-[44rem] -translate-x-1/2 rounded-full bg-brand-gold opacity-[0.05] blur-[120px]"
      />

      {/* Minimal chrome — only when standalone (/build). On the home the site
          header is already present, so we skip our own to avoid a double bar. */}
      {!embedded && (
        <header className="relative z-10 flex items-center justify-between px-5 py-5 sm:px-8">
          <Logo variant="dark" size="md" />
          <div className="flex items-center gap-3">
            <SignedOut>
              <SignInButton mode="modal">
                <button className="rounded-full border border-brand-navy/15 px-4 py-2 text-sm font-medium text-brand-navy transition-colors hover:bg-brand-navy/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/60 focus-visible:ring-offset-2">
                  {translate("Log in")}
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
          <div className="h-1 w-full overflow-hidden rounded-full bg-brand-navy/10">
            <motion.div
              className="h-full rounded-full bg-brand-gold"
              initial={false}
              animate={{ width: `${Math.max(progress, 0.08) * 100}%` }}
              transition={{ duration: reduce ? 0.001 : 0.5, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
        </div>
      )}

      {/* Stage — scrolls on its own when a step is taller than the viewport
          (e.g. short mobile screens). The funnel is embedded on the home page
          inside a fixed-height (100dvh) box, so without an explicit scroll the
          centered content overflows and the Back / Continue buttons get clipped
          off the bottom — leaving mobile users with "no way back". */}
      <main
        className={`relative z-10 flex flex-col px-5 ${
          embedded ? "min-h-0 flex-1 overflow-y-auto" : "min-h-[calc(100dvh-9rem)]"
        }`}
      >
        <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col items-center justify-center py-8 text-center">
        {/* Steps mount/unmount directly — enter animation only, so transitions
            never depend on framer-motion's exit-complete callback (which can
            stall under Strict Mode and freeze the funnel). */}
        {/* Shared upload input — used by the "optimize existing" upload step. */}
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
        {/* ---------- INTRO ---------- */}
          {step === "intro" && (
            <motion.div key="intro" {...fade} className="flex flex-col items-center">
              <Orb reduce={!!reduce} />
              <p className="mt-8 font-mono text-xs uppercase tracking-[0.28em] text-brand-gold">
                {translate("Your CV coach")}
              </p>
              <h1 className="mt-4 max-w-xl text-balance font-serif text-4xl leading-[1.05] text-brand-navy sm:text-5xl md:text-6xl">
                {translate("Let’s build a CV that gets you")}{" "}
                <span className="italic text-brand-gold">{translate("hired.")}</span>
              </h1>
              <p className="mt-5 max-w-md text-pretty text-lg leading-relaxed text-brand-navy/65">
                {translate("A few quick questions, and we’ll have your first draft together in about two minutes.")}
              </p>
              <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
                <button
                  onClick={() => go("start")}
                  className="group inline-flex items-center gap-2.5 rounded-full bg-brand-gold-soft px-8 py-4 text-base font-semibold text-brand-navy shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/60 focus-visible:ring-offset-2"
                >
                  {translate("Build / Optimize my CV")}
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" strokeWidth={1.75} />
                </button>
                <button
                  onClick={() => {
                    track("build_onboarding_score_click");
                    router.push("/score");
                  }}
                  className="group inline-flex items-center gap-2.5 rounded-full border border-brand-navy/15 bg-white/70 px-8 py-4 text-base font-medium text-brand-navy shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:border-brand-navy/30 hover:bg-white hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/60 focus-visible:ring-offset-2"
                >
                  <BarChart3 className="h-5 w-5 text-brand-gold" strokeWidth={1.75} />
                  {translate("Check my CV score")}
                </button>
              </div>
              {/* Escape hatch: finishing the funnel starts a FRESH draft, so a
                  previous one on this device gets an explicit way back in. */}
              {hasDraft && (
                <button
                  onClick={() => {
                    track("build_onboarding_resume_draft");
                    router.push("/build/chat");
                  }}
                  className="group mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-brand-navy/55 underline-offset-4 transition-colors hover:text-brand-navy hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/60 focus-visible:ring-offset-2"
                >
                  {translate("Continue where you left off")}
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" strokeWidth={1.75} />
                </button>
              )}
            </motion.div>
          )}

          {/* ---------- START: THE ONE "HOW" QUESTION ---------- */}
          {step === "start" && (
            <motion.div key="start" {...fade} className="w-full">
              <h2 className="mt-4 text-balance font-serif text-3xl text-brand-navy sm:text-4xl md:text-5xl">
                {translate("How would you like to build it?")}
              </h2>
              <p className="mx-auto mt-3 max-w-md text-brand-navy/55">
                {translate("Already have a CV? Upload it and skip the questions — otherwise pick how we work together.")}
              </p>
              <div className="mx-auto mt-8 grid w-full max-w-md gap-3">
                <MethodCard
                  icon={<FileUp className="h-5 w-5" strokeWidth={1.75} />}
                  title={translate("I have an existing CV")}
                  desc={translate("Upload it and we’ll optimize it for the role you want — no questions first.")}
                  onClick={() => {
                    track("build_onboarding_path", { path: "existing" });
                    // Already have a CV? Skip the questions — the CV has the
                    // answers. Go straight to upload and optimize.
                    go("upload");
                  }}
                />
                <MethodCard
                  icon={<MessageSquareText className="h-5 w-5" strokeWidth={1.75} />}
                  title={translate("Chat with your coach")}
                  desc={translate("Answer a few quick questions — it writes each section as you talk.")}
                  badge={translate("Recommended")}
                  onClick={() => {
                    track("build_onboarding_path", { path: "chat" });
                    setMethod("chat");
                    go("role");
                  }}
                />
                <MethodCard
                  icon={<Mic className="h-5 w-5" strokeWidth={1.75} />}
                  title={translate("Talk it out")}
                  desc={translate("Have a real voice conversation — it builds your CV as you speak.")}
                  badge={translate("New")}
                  note={
                    // Honesty up front: the voice coach needs an account, and
                    // anonymous users would otherwise hit a surprise sign-in
                    // redirect after picking this card.
                    <SignedOut>
                      <span className="mt-1 block text-[11px] font-medium text-brand-navy/45">
                        {translate("Sign-in required for voice")}
                      </span>
                    </SignedOut>
                  }
                  onClick={() => {
                    track("build_onboarding_path", { path: "voice" });
                    setMethod("voice");
                    go("role");
                  }}
                />
                <MethodCard
                  icon={<PencilLine className="h-5 w-5" strokeWidth={1.75} />}
                  title={translate("Start from a blank template")}
                  desc={translate("Fill it in yourself, step by step.")}
                  onClick={() => {
                    track("build_onboarding_path", { path: "manual" });
                    setMethod("manual");
                    go("role");
                  }}
                />
              </div>
              <div className="mt-8 flex justify-center">
                <BackButton onClick={() => go("intro")} />
              </div>
            </motion.div>
          )}

          {/* ---------- OPTIMIZE EXISTING: UPLOAD (skips the questions) ---------- */}
          {step === "upload" && (
            <motion.div key="upload" {...fade} className="w-full">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand-navy/5 text-brand-gold">
                <FileUp className="h-7 w-7" strokeWidth={1.6} />
              </span>
              <h2 className="mt-6 text-balance font-serif text-3xl text-brand-navy sm:text-4xl md:text-5xl">
                {translate("Upload your CV — we’ll take it from here")}
              </h2>
              <p className="mx-auto mt-3 max-w-md text-pretty text-brand-navy/55">
                {translate("No questions to answer. Drop your current CV in and we’ll read it, score it, and start optimizing right away.")}
              </p>
              <div
                role="button"
                tabIndex={uploading ? -1 : 0}
                aria-disabled={uploading}
                onClick={() => {
                  if (!uploading) fileRef.current?.click();
                }}
                onKeyDown={(e) => {
                  if (uploading) return;
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    fileRef.current?.click();
                  }
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (!uploading) setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  if (uploading) return;
                  const f = e.dataTransfer.files?.[0];
                  if (f) handleFile(f);
                }}
                className={`mx-auto mt-8 flex w-full max-w-md flex-col items-center gap-3 rounded-3xl border-2 border-dashed px-6 py-12 text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/60 focus-visible:ring-offset-2 ${
                  uploading
                    ? "cursor-wait border-brand-navy/15 bg-white/60"
                    : dragging
                      ? "border-brand-gold bg-brand-gold/5"
                      : "cursor-pointer border-brand-navy/20 bg-white/60 hover:border-brand-navy/40 hover:bg-white"
                }`}
              >
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-gold/10 text-brand-gold">
                  {uploading ? (
                    <Loader2 className="h-6 w-6 animate-spin" strokeWidth={1.75} />
                  ) : (
                    <FileUp className="h-6 w-6" strokeWidth={1.75} />
                  )}
                </span>
                <span className="text-base font-medium text-brand-navy">
                  {uploading ? translate("Reading your CV…") : translate("Drop your CV here, or click to browse")}
                </span>
                <span className="text-xs text-brand-navy/45">{translate("PDF or DOCX, up to 5 MB")}</span>
              </div>
              <div className="mt-6">
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => finish("chat")}
                  className="text-sm font-medium text-brand-navy/55 underline-offset-4 transition-colors hover:text-brand-navy hover:underline disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/60 focus-visible:ring-offset-2"
                >
                  {translate("I don’t have it handy — build with the coach instead")}
                </button>
              </div>
              <div className="mt-6 flex justify-center">
                <BackButton onClick={() => go("start")} />
              </div>
            </motion.div>
          )}

          {/* ---------- Q1: ROLE (optional, multi, dropdown) ---------- */}
          {step === "role" && (
            <motion.div key="role" {...fade} className="w-full">
              <StepLabel step="role" />
              <h2 className="mt-4 text-balance font-serif text-3xl text-brand-navy sm:text-4xl md:text-5xl">
                {translate("What role are you going after?")}
              </h2>
              <p className="mx-auto mt-3 max-w-md text-brand-navy/55">
                {translate("Pick from the list or type your own — add more than one if you’re weighing options. Not sure yet? Just continue.")}
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  commitRolesAndContinue();
                }}
                className="mx-auto mt-8 w-full max-w-md"
              >
                <div className="relative">
                  <div className="flex items-stretch gap-2">
                    <div className="relative w-full">
                      <input
                        autoFocus
                        value={roleInput}
                        role="combobox"
                        aria-expanded={roleOpen && roleMatches.length > 0}
                        aria-controls="role-options"
                        aria-autocomplete="list"
                        aria-activedescendant={
                          roleHighlight >= 0 && roleHighlight < roleMatches.length
                            ? `role-option-${roleHighlight}`
                            : undefined
                        }
                        onChange={(e) => {
                          setRoleInput(e.target.value);
                          setRoleOpen(true);
                          setRoleHighlight(-1);
                        }}
                        onFocus={() => setRoleOpen(true)}
                        onBlur={() => {
                          // Delay so a mousedown on an option still lands.
                          window.setTimeout(() => setRoleOpen(false), 120);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "ArrowDown") {
                            e.preventDefault();
                            setRoleOpen(true);
                            setRoleHighlight((h) => Math.min(h + 1, roleMatches.length - 1));
                          } else if (e.key === "ArrowUp") {
                            e.preventDefault();
                            setRoleHighlight((h) => Math.max(h - 1, -1));
                          } else if (e.key === "Escape") {
                            setRoleOpen(false);
                            setRoleHighlight(-1);
                          } else if (e.key === "Enter" || e.key === ",") {
                            // Enter adds the highlighted option or the typed text as a
                            // chip; with nothing typed, Enter falls through to the form
                            // submit and just continues (the question is optional).
                            if (roleOpen && roleHighlight >= 0 && roleHighlight < roleMatches.length) {
                              e.preventDefault();
                              addRole(roleMatches[roleHighlight]);
                            } else if (roleInput.trim()) {
                              e.preventDefault();
                              addRole(roleInput);
                            } else if (e.key === ",") {
                              e.preventDefault();
                            }
                          }
                        }}
                        placeholder={translate("e.g. Product Manager")}
                        aria-label={translate("Target role")}
                        className="w-full rounded-2xl border border-brand-navy/15 bg-white/80 py-4 pe-11 ps-5 text-center text-xl text-brand-navy shadow-sm outline-none backdrop-blur transition-shadow placeholder:text-brand-navy/35 focus:border-brand-navy/40 focus:shadow-md"
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        aria-label={translate("Show role suggestions")}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setRoleOpen((o) => !o);
                        }}
                        className="absolute end-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-brand-navy/40 transition-colors hover:bg-brand-navy/5 hover:text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/60 focus-visible:ring-offset-2"
                      >
                        <ChevronDown
                          className={`h-5 w-5 transition-transform ${roleOpen ? "rotate-180" : ""}`}
                          strokeWidth={1.75}
                        />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => addRole(roleInput)}
                      disabled={!roleInput.trim()}
                      className="shrink-0 rounded-2xl border border-brand-navy/15 bg-white/70 px-4 text-sm font-semibold text-brand-navy transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/60 focus-visible:ring-offset-2"
                    >
                      {translate("Add")}
                    </button>
                  </div>

                  {/* Dropdown of common roles — filtered as you type, free text still wins. */}
                  {roleOpen && roleMatches.length > 0 && (
                    <ul
                      id="role-options"
                      role="listbox"
                      aria-label={translate("Common roles")}
                      className="absolute inset-x-0 top-full z-20 mt-2 max-h-60 overflow-y-auto rounded-2xl border border-brand-navy/10 bg-white py-1.5 text-start shadow-xl"
                    >
                      {roleMatches.map((o, i) => (
                        <li
                          key={o}
                          id={`role-option-${i}`}
                          role="option"
                          aria-selected={i === roleHighlight}
                          onMouseDown={(e) => {
                            // mousedown (not click) so the input's blur doesn't close
                            // the list before the selection registers.
                            e.preventDefault();
                            addRole(o);
                          }}
                          onMouseEnter={() => setRoleHighlight(i)}
                          className={`cursor-pointer px-4 py-2.5 text-sm transition-colors ${
                            i === roleHighlight ? "bg-brand-gold/10 text-brand-navy" : "text-brand-navy/75"
                          }`}
                        >
                          {translate(o)}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {roles.length > 0 && (
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {roles.map((r) => (
                      <span
                        key={r}
                        className="inline-flex items-center gap-1.5 rounded-full bg-brand-gold/12 py-1.5 pe-1.5 ps-3.5 text-sm font-medium text-[#9a6b08]"
                      >
                        {r}
                        <button
                          type="button"
                          onClick={() => removeRole(r)}
                          aria-label={translate("Remove {role}", { role: r })}
                          className="relative grid h-6 w-6 place-items-center rounded-full text-[#9a6b08]/70 transition-colors before:absolute before:-inset-2.5 before:content-[''] hover:bg-brand-gold/20 hover:text-[#9a6b08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/60 focus-visible:ring-offset-2"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <p className="mt-3 text-xs text-brand-navy/45">
                  {translate("These are just examples — type any role. You can change these anytime.")}
                </p>
                <div className="mt-8 flex items-center justify-center gap-3">
                  <BackButton onClick={() => go("start")} />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-full bg-brand-gold-soft px-7 py-3.5 text-sm font-semibold text-brand-navy transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/60 focus-visible:ring-offset-2"
                  >
                    {roles.length || roleInput.trim() ? translate("Continue") : translate("Skip for now")}
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
              <h2 className="mt-4 text-balance font-serif text-3xl text-brand-navy sm:text-4xl md:text-5xl">
                {translate("What should your CV do first?")}
              </h2>
              <p className="mx-auto mt-3 max-w-md text-brand-navy/55">
                {translate("Most resumes are read by software before a person ever sees them — tell us where to aim.")}
              </p>
              <div className="mx-auto mt-8 grid w-full max-w-md gap-3">
                {GOAL_OPTIONS.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => {
                      setGoal(o.id);
                      // A fresh goal pick earns a fresh reassurance beat.
                      reassuranceSeenRef.current = false;
                      go("reassurance");
                    }}
                    className="group flex items-center justify-between rounded-2xl border border-brand-navy/12 bg-white/70 px-5 py-4 text-start backdrop-blur transition-all hover:-translate-y-0.5 hover:border-brand-navy/30 hover:bg-white hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/60 focus-visible:ring-offset-2"
                  >
                    <span className="min-w-0">
                      <span className="flex items-center gap-2">
                        <span className="text-base font-medium text-brand-navy">{translate(o.title)}</span>
                        {o.badge && (
                          <span className="rounded-full bg-brand-gold/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-gold">
                            {translate(o.badge)}
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 block text-sm text-brand-navy/55">{translate(o.desc)}</span>
                    </span>
                    <ArrowRight className="ms-3 h-4 w-4 shrink-0 text-brand-navy/30 transition-all group-hover:translate-x-0.5 group-hover:text-brand-gold" strokeWidth={1.75} />
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
              <span className="grid h-14 w-14 place-items-center rounded-full bg-brand-navy/5 text-brand-gold">
                <Sparkles className="h-7 w-7" strokeWidth={1.6} />
              </span>
              <h2 className="mt-6 max-w-xl text-balance font-serif text-3xl text-brand-navy sm:text-4xl">
                {goal === "recruiter"
                  ? translate("Smart — people hire people.")
                  : translate("Good call — that's how hiring really works.")}
              </h2>
              <p className="mx-auto mt-5 max-w-md text-pretty text-lg leading-relaxed text-brand-navy/65">
                {goal === "recruiter"
                  ? translate("We'll make every line earn its place — specific, results-first, and easy for a busy recruiter to skim in seconds.")
                  : translate("We'll make sure the screening software can read every section, and still write it so a human wants to keep reading.")}
                {rolesLabel && (
                  <>
                    {" "}
                    {translate("Everything stays tuned for")}{" "}
                    <span className="font-medium text-brand-gold">{rolesLabel}</span>.
                  </>
                )}
              </p>
              <div className="mt-9 flex items-center justify-center gap-3">
                <BackButton onClick={() => go("goal")} />
                <button
                  onClick={() => {
                    reassuranceSeenRef.current = true;
                    go("experience");
                  }}
                  className="group inline-flex items-center gap-2 rounded-full bg-brand-gold-soft px-7 py-3.5 text-sm font-semibold text-brand-navy transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/60 focus-visible:ring-offset-2"
                >
                  {translate("Makes sense")}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" strokeWidth={1.75} />
                </button>
              </div>
            </motion.div>
          )}

          {/* ---------- Q3: EXPERIENCE ---------- */}
          {step === "experience" && (
            <motion.div key="experience" {...fade} className="w-full">
              <StepLabel step="experience" />
              <h2 className="mt-4 text-balance font-serif text-3xl text-brand-navy sm:text-4xl md:text-5xl">
                {translate("How much experience do you have?")}
              </h2>
              <div className="mx-auto mt-8 grid w-full max-w-md grid-cols-1 gap-3 sm:grid-cols-2">
                {EXPERIENCE_OPTIONS.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => {
                      setExperience(o.id);
                      go("template");
                    }}
                    className="group flex items-center justify-between rounded-2xl border border-brand-navy/12 bg-white/70 px-5 py-4 text-start backdrop-blur transition-all hover:-translate-y-0.5 hover:border-brand-navy/30 hover:bg-white hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/60 focus-visible:ring-offset-2"
                  >
                    <span>
                      <span className="block text-base font-medium text-brand-navy">{translate(o.label)}</span>
                      <span className="block text-xs text-brand-navy/50">{translate(o.hint)}</span>
                    </span>
                    <ArrowRight className="h-4 w-4 text-brand-navy/30 transition-all group-hover:translate-x-0.5 group-hover:text-brand-gold" strokeWidth={1.75} />
                  </button>
                ))}
              </div>
              <div className="mt-8 flex justify-center">
                <BackButton onClick={() => go("reassurance")} />
              </div>
            </motion.div>
          )}

          {/* ---------- Q4: TEMPLATE (last question — hands off directly) ---------- */}
          {step === "template" && (
            <motion.div key="template" {...fade} className="w-full">
              <StepLabel step="template" />
              <h2 className="mt-4 text-balance font-serif text-3xl text-brand-navy sm:text-4xl md:text-5xl">
                {translate("Pick a look to start with")}
              </h2>
              <p className="mx-auto mt-3 max-w-md text-brand-navy/55">
                {translate("You can change it anytime — nothing’s locked in.")}
              </p>
              <div className="mx-auto mt-8 grid w-full max-w-md grid-cols-2 gap-4 sm:grid-cols-4">
                {TEMPLATE_OPTIONS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTemplate(t.id)}
                    aria-pressed={template === t.id}
                    className={`group flex flex-col items-stretch rounded-xl border bg-white/80 p-2 text-start backdrop-blur transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/60 focus-visible:ring-offset-2 ${
                      template === t.id
                        ? "border-brand-gold ring-2 ring-brand-gold/40"
                        : "border-brand-navy/12 hover:border-brand-navy/30"
                    }`}
                  >
                    <TemplateMock id={t.id} />
                    <span className="mt-2 px-0.5">
                      <span className="block text-xs font-medium text-brand-navy">{translate(t.name)}</span>
                      <span className="block text-[10px] text-brand-navy/50">{translate(t.tag)}</span>
                    </span>
                  </button>
                ))}
              </div>
              <div className="mt-8 flex items-center justify-center gap-3">
                <BackButton onClick={() => go("experience")} />
                <button
                  onClick={() => finish()}
                  className="group inline-flex items-center gap-2 rounded-full bg-brand-gold-soft px-7 py-3.5 text-sm font-semibold text-brand-navy transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/60 focus-visible:ring-offset-2"
                >
                  {translate("Create my first draft")}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" strokeWidth={1.75} />
                </button>
              </div>
            </motion.div>
          )}

          {/* ---------- HANDOFF ---------- */}
          {step === "handoff" && (
            <motion.div key="handoff" {...fade} className="flex flex-col items-center">
              <Orb reduce={!!reduce} busy />
              <p className="mt-8 font-serif text-2xl text-brand-navy sm:text-3xl">{handoffLabel}</p>
              {rolesLabel && (
                <p className="mt-3 text-sm text-brand-navy/55">
                  {translate("Tailoring for")} <span className="font-medium text-brand-gold">{rolesLabel}</span>
                </p>
              )}
            </motion.div>
          )}
        </div>
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
          className="absolute inset-0 rounded-full bg-brand-gold/30"
          style={{ animation: busy ? "pulse 1.1s ease-in-out infinite" : "pulse 2.6s ease-in-out infinite" }}
        />
      )}
      <span className="relative grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-brand-gold to-brand-gold-soft shadow-[0_12px_30px_-8px_rgba(184,134,11,0.45)]">
        <Sparkles className="h-7 w-7 text-white" strokeWidth={1.6} />
      </span>
    </div>
  );
}

function StepLabel({ step }: { step: Step }) {
  const { t } = useT();
  const i = QUESTION_STEPS.indexOf(step);
  if (i < 0) return null;
  return (
    <p className="font-mono text-xs uppercase tracking-[0.28em] text-brand-gold">
      {t("Question {n} of {total}", { n: i + 1, total: QUESTION_STEPS.length })}
    </p>
  );
}

/** Tiny abstract preview of each template — enough to tell them apart. */
function TemplateMock({ id }: { id: BuilderTemplateId }) {
  if (id === "modern-sidebar") {
    return (
      <div className="flex aspect-[3/4] overflow-hidden rounded-md border border-brand-navy/10 bg-white">
        <div className="w-1/3 bg-brand-navy p-1.5">
          <div className="mx-auto mb-1.5 h-4 w-4 rounded-full bg-white/30" />
          <div className="space-y-1">
            <div className="h-0.5 w-full rounded bg-white/40" />
            <div className="h-0.5 w-4/5 rounded bg-white/25" />
          </div>
        </div>
        <div className="flex-1 space-y-1 p-1.5">
          <div className="h-1 w-2/3 rounded bg-brand-navy/70" />
          <div className="h-0.5 w-full rounded bg-brand-navy/15" />
          <div className="h-0.5 w-5/6 rounded bg-brand-navy/15" />
          <div className="mt-1.5 h-0.5 w-full rounded bg-brand-navy/15" />
        </div>
      </div>
    );
  }
  if (id === "executive") {
    return (
      <div className="aspect-[3/4] overflow-hidden rounded-md border border-brand-navy/10 bg-white p-2">
        <div className="mb-1.5 border-b-2 border-brand-gold pb-1.5">
          <div className="h-1.5 w-3/4 rounded bg-brand-navy/80" />
          <div className="mt-1 h-0.5 w-full rounded bg-brand-navy/20" />
        </div>
        <div className="space-y-1">
          <div className="h-0.5 w-8 rounded bg-brand-gold" />
          <div className="h-0.5 w-full rounded bg-brand-navy/15" />
          <div className="h-0.5 w-5/6 rounded bg-brand-navy/15" />
        </div>
      </div>
    );
  }
  if (id === "creative") {
    return (
      <div className="aspect-[3/4] overflow-hidden rounded-md border border-brand-navy/10 bg-white">
        <div className="h-5 bg-gradient-to-r from-violet-500 to-brand-gold" />
        <div className="space-y-1 p-2">
          <div className="h-1 w-2/3 rounded bg-brand-navy/70" />
          <div className="h-0.5 w-full rounded bg-brand-navy/15" />
          <div className="mt-1 flex gap-1">
            <div className="h-2 w-5 rounded bg-violet-200" />
            <div className="h-2 w-4 rounded bg-brand-gold/30" />
          </div>
        </div>
      </div>
    );
  }
  // ivy-league — classic centered serif
  return (
    <div className="aspect-[3/4] overflow-hidden rounded-md border border-brand-navy/10 bg-white p-2">
      <div className="mb-1.5 border-b border-brand-navy/15 pb-1.5 text-center">
        <div className="mx-auto h-1.5 w-1/2 rounded bg-brand-navy/80" />
        <div className="mx-auto mt-1 h-0.5 w-2/3 rounded bg-brand-navy/20" />
      </div>
      <div className="space-y-1">
        <div className="h-0.5 w-6 rounded bg-brand-navy/40" />
        <div className="h-0.5 w-full rounded bg-brand-navy/15" />
        <div className="h-0.5 w-5/6 rounded bg-brand-navy/15" />
      </div>
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  const { t } = useT();
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full px-4 py-3.5 text-sm font-medium text-brand-navy/55 transition-colors hover:text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/60 focus-visible:ring-offset-2"
    >
      <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
      {t("Back")}
    </button>
  );
}

function MethodCard({
  icon,
  title,
  desc,
  badge,
  note,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  badge?: string;
  /** Small honesty line under the description (e.g. "Sign-in required"). */
  note?: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-4 rounded-2xl border border-brand-navy/12 bg-white/70 px-5 py-4 text-start backdrop-blur transition-all hover:-translate-y-0.5 hover:border-brand-navy/30 hover:bg-white hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/60 focus-visible:ring-offset-2"
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-gold/10 text-brand-gold transition-colors group-hover:bg-brand-gold group-hover:text-white">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="text-base font-medium text-brand-navy">{title}</span>
          {badge && (
            <span className="rounded-full bg-brand-gold/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-gold">
              {badge}
            </span>
          )}
        </span>
        <span className="mt-0.5 block text-sm text-brand-navy/55">{desc}</span>
        {note}
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-brand-navy/25 transition-all group-hover:translate-x-0.5 group-hover:text-brand-gold" strokeWidth={1.75} />
    </button>
  );
}

export default BuildOnboarding;
