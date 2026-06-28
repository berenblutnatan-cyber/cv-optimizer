"use client";

// Chat-first optimizer. A short, warm conversation collects the CV (upload or
// paste) and the target job, then runs the REAL analysis (/api/analyze — same
// scored, credited, persisted pipeline as the classic form) and presents the
// score conversationally, with a CTA into the full results page (the monetized
// optimized-CV + download deliverable). Glass + serif, matching the builder.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useUser, SignInButton } from "@clerk/nextjs";
import { ArrowLeft, ArrowRight, Check, Sparkles, TrendingUp, UploadCloud, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { ScoreRing } from "@/components/shell/ScoreRing";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { saveAnalysisToSession } from "@/lib/analysisSession";
import { track } from "@/lib/analytics";
import { useT } from "@/lib/i18n/LanguageProvider";

type Improvement = { text: string; scoreImpact: number; category: string };
type AnalysisResult = {
  overallScore: number;
  optimizedScore: number | null;
  summary: string;
  strengths: string[];
  improvements: Improvement[];
};

type OptMsg = {
  id: string;
  role: "user" | "assistant";
  content?: string;
  display?: string;
  kind?: "text" | "result" | "signin" | "paywall";
  result?: AnalysisResult;
};

type Phase = "cv" | "jd" | "analyzing" | "done";

const INTAKE_KEY = "optimizer_chat_intake_v1";
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
const SKIP_RE = /\b(just score|score it|skip|general|no jd|don'?t have|without)\b/i;

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? Math.round(v) : null;
}

export function OptimizerChatClient() {
  const { t } = useT();
  const router = useRouter();
  const { isSignedIn } = useUser();
  const [messages, setMessages] = useState<OptMsg[]>([]);
  const [phase, setPhase] = useState<Phase>("cv");
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stick = useRef(true);

  const cvRef = useRef("");
  const jobRef = useRef("");
  const phaseRef = useRef<Phase>("cv");
  phaseRef.current = phase;

  const push = (m: Omit<OptMsg, "id">) => {
    const id = uid();
    setMessages((list) => [...list, { ...m, id }]);
    return id;
  };
  const patch = (id: string, p: Partial<OptMsg>) =>
    setMessages((list) => list.map((m) => (m.id === id ? { ...m, ...p } : m)));

  // Greeting + restore any intake stashed before a sign-in round-trip.
  useEffect(() => {
    track("optimizer_chat_opened");
    let restored = false;
    try {
      const raw = sessionStorage.getItem(INTAKE_KEY);
      if (raw && isSignedIn) {
        const saved = JSON.parse(raw) as { cv?: string; job?: string };
        if (saved.cv) {
          cvRef.current = saved.cv;
          jobRef.current = saved.job ?? "";
          restored = true;
        }
      }
    } catch {
      /* ignore */
    }
    push({
      role: "assistant",
      content:
        t("Hi — I'll score your CV against the job you're after and show you exactly what to fix. Drop your CV to start: upload a PDF or Word file, or paste the text right here."),
    });
    if (restored) {
      sessionStorage.removeItem(INTAKE_KEY);
      push({ role: "user", display: t("📎 my CV"), content: "(restored)" });
      push({
        role: "assistant",
        content: jobRef.current
          ? t("Welcome back — picking up where we left off. Scoring now…")
          : t("Welcome back — scoring your CV now…"),
      });
      void runAnalysis();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  async function runAnalysis() {
    setPhase("analyzing");
    setBusy(true);
    const role = jobRef.current ? "that role" : "general best-practice";
    const thinkingId = push({ role: "assistant", content: "" });
    track("optimizer_chat_analyze", { quick: !jobRef.current });
    try {
      const fd = new FormData();
      fd.append("cvText", cvRef.current);
      fd.append("mode", jobRef.current ? "specific_role" : "quick");
      if (jobRef.current) fd.append("jobDescription", jobRef.current);
      const res = await fetch("/api/analyze", { method: "POST", body: fd });

      if (res.status === 401) {
        try {
          sessionStorage.setItem(INTAKE_KEY, JSON.stringify({ cv: cvRef.current, job: jobRef.current }));
        } catch {
          /* ignore */
        }
        patch(thinkingId, {
          kind: "signin",
          content: t("Almost there — sign in (free) and I'll run your analysis. Your CV is saved, so you won't lose anything."),
        });
        setPhase("done");
        return;
      }
      if (res.status === 402) {
        patch(thinkingId, {
          kind: "paywall",
          content: t("You're out of credits — grab more and I'll score this right away."),
        });
        setPhase("done");
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Analysis failed");

      const a = data.analysis ?? {};
      const result: AnalysisResult = {
        overallScore: num(a.overallScore) ?? num(a.scoreComparison?.original?.total) ?? 0,
        optimizedScore: num(a.scoreComparison?.optimized?.total),
        summary: typeof a.summary === "string" ? a.summary : "",
        strengths: Array.isArray(a.strengths) ? a.strengths.slice(0, 3).map(String) : [],
        improvements: Array.isArray(a.improvements)
          ? a.improvements
              .filter((x: unknown) => x && typeof x === "object")
              .slice(0, 3)
              .map((x: Record<string, unknown>) => ({
                text: String(x.text ?? ""),
                scoreImpact: num(x.scoreImpact) ?? 0,
                category: String(x.category ?? "impact"),
              }))
          : [],
      };

      // Persist for the full results page (the paid optimized-CV deliverable).
      saveAnalysisToSession({
        analysis: data.analysis,
        meta: data.meta,
        originalInputs: {
          cvFile: null,
          cvText: cvRef.current,
          jobTitle: data.meta?.jobTitle ?? "",
          jobDescription: jobRef.current,
          jobUrl: "",
        },
      });
      track("optimizer_chat_scored", { score: result.overallScore });
      patch(thinkingId, { kind: "result", result, content: result.summary });
      setPhase("done");
    } catch (err) {
      patch(thinkingId, {
        content: `⚠️ ${err instanceof Error ? err.message : t("Something broke")} — ${t("want to try again?")}`,
      });
      setPhase(jobRef.current || cvRef.current ? "done" : "jd");
      toast.error(err instanceof Error ? err.message : t("Analysis failed"));
    } finally {
      setBusy(false);
    }
    void role;
  }

  async function handleSend(text: string) {
    if (busy) return;
    push({ role: "user", content: text });
    const p = phaseRef.current;

    if (p === "cv") {
      if (text.trim().length < 120) {
        push({
          role: "assistant",
          content:
            t("I need a bit more to work with — paste your full CV text, or tap the 📎 to upload the file."),
        });
        return;
      }
      cvRef.current = text.trim();
      setPhase("jd");
      push({
        role: "assistant",
        content:
          t("Got it — that's in. Now paste the job post you're targeting (or its title) and I'll score your match. Or say \"just score it\" for a general review."),
      });
      return;
    }

    if (p === "jd") {
      if (SKIP_RE.test(text) && text.trim().length < 40) {
        jobRef.current = "";
      } else {
        jobRef.current = text.trim();
      }
      await runAnalysis();
      return;
    }

    if (p === "done") {
      // Treat further input as a new target job against the same CV.
      jobRef.current = text.trim();
      push({ role: "assistant", content: t("On it — re-scoring against that role…") });
      await runAnalysis();
    }
  }

  async function handleUpload(file: File) {
    if (uploading || busy) return;
    setUploading(true);
    track("optimizer_chat_uploaded", { size: file.size });
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/chat/parse-cv", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? t("Couldn't read that file"));
      cvRef.current = data.text;
      push({ role: "user", display: `📎 ${data.fileName}`, content: "(uploaded CV)" });
      if (phaseRef.current === "cv") {
        setPhase("jd");
        push({
          role: "assistant",
          content:
            t("Got your CV. Now paste the job post you're targeting (or its title) — or say \"just score it\" for a general review."),
        });
      } else {
        push({ role: "assistant", content: t("Swapped in the new CV. Re-scoring…") });
        await runAnalysis();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("Upload failed"));
    } finally {
      setUploading(false);
    }
  }

  const chips =
    phase === "cv"
      ? []
      : phase === "jd"
        ? [t("Just score it (general review)")]
        : [t("Score against another job")];

  return (
    <div className="flex flex-col h-[100dvh]">
      <header className="flex-shrink-0 px-4 md:px-6 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/dashboard"
            aria-label={t("Back to dashboard")}
            className="grid place-items-center h-9 w-9 rounded-xl bg-white/10 border border-glass-border text-white/75 hover:text-white hover:bg-white/15 transition-colors"
          >
            <ArrowLeft className="h-[18px] w-[18px]" strokeWidth={1.8} />
          </Link>
          <div className="min-w-0">
            <div className="font-serif italic text-lg md:text-xl text-white leading-none truncate">
              {t("Optimize your CV")}
            </div>
            <div className="text-[11px] text-white/55 mt-0.5 hidden sm:block">
              {t("Score against any job — chat your way to a stronger CV")}
            </div>
          </div>
        </div>
        <Link
          href="/build/chat"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/8 border border-glass-border text-xs text-white/75 hover:bg-white/15 hover:text-white transition-colors"
        >
          <Wand2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t("Build from scratch")}</span>
        </Link>
      </header>

      <div className="flex-1 flex min-h-0 justify-center px-4 md:px-6 pb-4 md:pb-6">
        <div className="flex flex-col min-h-0 flex-1 max-w-[680px] rounded-3xl bg-glass border border-glass-border backdrop-blur-glass shadow-glow overflow-hidden">
          <div
            ref={scrollRef}
            onScroll={() => {
              const el = scrollRef.current;
              if (el) stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
            }}
            className="flex-1 min-h-0 overflow-y-auto px-4 py-4"
          >
            {/* Mask transcript (resume PII) in Clarity replays; behavior still
                captured via optimizer_chat_* events + UI chrome. */}
            <div className="flex flex-col gap-4" data-clarity-mask="true">
              {messages.map((m) =>
                m.role === "user" ? (
                  <div key={m.id} className="flex justify-end">
                    <div dir="auto" className="max-w-[85%] rounded-2xl rounded-br-md bg-white text-[#1a1a1a] px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap">
                      {m.display ?? m.content}
                    </div>
                  </div>
                ) : (
                  <div key={m.id} className="flex justify-start">
                    <div className="max-w-[92%] w-full">
                      <div dir="auto" className="rounded-2xl rounded-bl-md bg-white/10 border border-glass-border text-white px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap">
                        {m.content ? (
                          m.content
                        ) : (
                          <span className="inline-flex gap-1 items-center py-1" aria-label={t("Thinking")}>
                            <span className="h-1.5 w-1.5 rounded-full bg-white/70 animate-bounce" />
                            <span className="h-1.5 w-1.5 rounded-full bg-white/70 animate-bounce [animation-delay:150ms]" />
                            <span className="h-1.5 w-1.5 rounded-full bg-white/70 animate-bounce [animation-delay:300ms]" />
                          </span>
                        )}
                      </div>
                      {m.kind === "result" && m.result ? <ResultCard r={m.result} /> : null}
                      {m.kind === "signin" ? (
                        <div className="mt-2">
                          <SignInButton mode="modal" forceRedirectUrl="/optimize">
                            <button className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-[#1a1a1a] text-sm font-semibold hover:bg-white/90 transition-colors">
                              {t("Sign in & score my CV")}
                              <ArrowRight className="h-4 w-4" />
                            </button>
                          </SignInButton>
                        </div>
                      ) : null}
                      {m.kind === "paywall" ? (
                        <Link
                          href="/pricing?reason=optimize"
                          className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-[#1a1a1a] text-sm font-semibold hover:bg-white/90 transition-colors"
                        >
                          {t("See plans")}
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      ) : null}
                    </div>
                  </div>
                )
              )}
            </div>
          </div>

          <div className="flex-shrink-0 px-3 pb-3 pt-1">
            <ChatComposer
              onSend={handleSend}
              onUpload={handleUpload}
              uploading={uploading}
              disabled={busy || uploading}
              chips={chips}
              placeholder={
                phase === "cv"
                  ? t("Paste your CV, or tap 📎 to upload…")
                  : phase === "jd"
                    ? t("Paste the job post…")
                    : t("Score against another job…")
              }
              uploadingLabel={t("Reading your CV…")}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ResultCard({ r }: { r: AnalysisResult }) {
  const { t } = useT();
  const router = useRouter();
  const catColor: Record<string, string> = {
    ats: "text-[#8fb3ff]",
    impact: "text-[#f5b8c8]",
    clarity: "text-[#c9b8ff]",
  };
  return (
    <div className="mt-2 rounded-2xl bg-white/10 border border-glass-border p-4 space-y-4">
      <div className="flex items-center gap-4">
        <ScoreRing value={r.overallScore} size={92} label="/ 100" />
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/55">{t("Match score")}</div>
          {r.optimizedScore && r.optimizedScore > r.overallScore ? (
            <div className="mt-1 inline-flex items-center gap-1.5 text-sm text-white/85">
              <TrendingUp className="h-4 w-4 text-[#9be7a0]" />
              {t("Up to")} <span className="font-semibold text-white">{r.optimizedScore}</span> {t("optimized")}
            </div>
          ) : null}
        </div>
      </div>

      {r.strengths.length > 0 ? (
        <div className="space-y-1.5">
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/55">{t("What's working")}</div>
          {r.strengths.map((s, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-white/85">
              <Check className="h-4 w-4 text-[#9be7a0] flex-shrink-0 mt-0.5" />
              <span>{s}</span>
            </div>
          ))}
        </div>
      ) : null}

      {r.improvements.length > 0 ? (
        <div className="space-y-1.5">
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/55">{t("Biggest wins")}</div>
          {r.improvements.map((imp, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-white/85">
              <Sparkles className={`h-4 w-4 flex-shrink-0 mt-0.5 ${catColor[imp.category] ?? "text-[#f5b8c8]"}`} />
              <span>
                {imp.text}
                {imp.scoreImpact > 0 ? (
                  <span className="text-white/55"> {t("· +{n} pts", { n: imp.scoreImpact })}</span>
                ) : null}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => {
          track("optimizer_chat_view_full");
          router.push("/results");
        }}
        className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white text-[#1a1a1a] text-sm font-semibold hover:bg-white/90 transition-colors"
      >
        {t("See the full breakdown & optimized CV")}
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}
