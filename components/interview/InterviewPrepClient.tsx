"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useUser, useClerk } from "@clerk/nextjs";
import { Loader2, Sparkles, Lock, MessageSquareQuote } from "lucide-react";
import { useResumeStore } from "@/store/useResumeStore";
import { useFlashSaleStore } from "@/stores/flashSaleStore";
import { resumeToText } from "@/types/resume";
import { track } from "@/lib/analytics";
import { useT } from "@/lib/i18n/LanguageProvider";
import type { InterviewQuestion } from "@/lib/interviewPrep";

export function InterviewPrepClient() {
  const { t } = useT();
  const { isSignedIn } = useUser();
  const { openSignUp } = useClerk();
  const resumeData = useResumeStore((s) => s.resumeData);

  const [role, setRole] = useState(resumeData.personalInfo.title || "");
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [pitch, setPitch] = useState<string | undefined>();
  const [locked, setLocked] = useState(true);
  const [loading, setLoading] = useState(false);
  const [unlocking, setUnlocking] = useState(false);

  const cvText = resumeToText(resumeData);
  const hasCv = cvText.trim().length >= 40;

  async function generate() {
    if (loading) return;
    setLoading(true);
    setQuestions([]);
    setPitch(undefined);
    setLocked(true);
    try {
      const res = await fetch("/api/interview-prep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeData, role, unlock: false }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.message(data?.error ?? t("Couldn't generate — try again."));
        return;
      }
      setQuestions(data.questions ?? []);
      setLocked(true);
      track("interview_prep_generated", { signed_in: Boolean(isSignedIn) });
    } finally {
      setLoading(false);
    }
  }

  async function unlock() {
    if (unlocking) return;
    setUnlocking(true);
    try {
      const res = await fetch("/api/interview-prep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeData, role, unlock: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401 || data?.code === "AUTH_REQUIRED") {
        track("interview_prep_blocked", { reason: "signup" });
        useFlashSaleStore.getState().recordAction();
        toast.message(t("Create a free account to unlock full prep."));
        openSignUp?.();
        return;
      }
      if (res.status === 402 || data?.code === "INSUFFICIENT_CREDITS") {
        track("interview_prep_blocked", { reason: "no_credits" });
        useFlashSaleStore.getState().recordAction();
        toast.message(t("You're out of credits"), { description: t("Top up or grab the Pro offer to unlock.") });
        return;
      }
      if (!res.ok) {
        toast.error(data?.error ?? t("Couldn't unlock — try again."));
        return;
      }
      setQuestions(data.questions ?? []);
      setPitch(data.pitch);
      setLocked(false);
      track("interview_prep_unlocked");
    } finally {
      setUnlocking(false);
    }
  }

  return (
    <div>
      <header className="mb-6">
        <p className="text-[12px] uppercase tracking-[0.18em] text-[#B8860B] font-semibold">{t("Interview prep")}</p>
        <h1 className="mt-2 text-3xl font-bold text-[#0A2647]">{t("Walk in ready")}</h1>
        <p className="mt-2 text-stone-600 max-w-xl">
          {t("Get the questions you're most likely to face — then unlock STAR-format answers drawn from your own experience and a tight personal pitch.")}
        </p>
      </header>

      {!hasCv ? (
        <div className="rounded-2xl bg-white border border-stone-200 p-6 text-center">
          <p className="text-stone-600">{t("Build your CV first so we can tailor questions to your experience.")}</p>
          <Link
            href="/build/chat"
            className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#0A2647] text-white text-sm font-semibold hover:bg-[#0d3259] transition-colors"
          >
            {t("Build my CV")}
          </Link>
        </div>
      ) : (
        <>
          <div className="rounded-2xl bg-white border border-stone-200 p-4 flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="flex-1">
              <label className="block text-[11px] font-medium uppercase tracking-wide text-stone-500 mb-1">{t("Target role")}</label>
              <input
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder={t("e.g. Senior Product Manager")}
                className="w-full rounded-xl bg-white border border-stone-300 px-3 py-2 text-[14px] outline-none focus:border-[#0A2647]/50 focus:ring-2 focus:ring-[#0A2647]/10"
              />
            </div>
            <button
              type="button"
              onClick={generate}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#0A2647] text-white text-sm font-semibold hover:bg-[#0d3259] disabled:opacity-60 transition-colors"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {questions.length ? t("Regenerate") : t("Get my questions")}
            </button>
          </div>

          {questions.length > 0 ? (
            <div className="mt-6 space-y-3">
              {questions.map((q, i) => (
                <div key={i} className="rounded-2xl bg-white border border-stone-200 p-4">
                  <div className="flex items-start gap-2">
                    <MessageSquareQuote className="h-4 w-4 text-[#B8860B] flex-shrink-0 mt-1" />
                    <p className="text-[15px] font-medium text-[#1a1a1a]">{q.question}</p>
                  </div>
                  {!locked && q.starAnswer ? (
                    <p className="mt-2 ml-6 text-[13.5px] text-stone-600 leading-relaxed whitespace-pre-wrap">{q.starAnswer}</p>
                  ) : null}
                </div>
              ))}

              {!locked && pitch ? (
                <div className="rounded-2xl bg-[#0A2647]/[0.04] border border-[#0A2647]/15 p-4">
                  <div className="text-[11px] uppercase tracking-[0.14em] text-[#0A2647]/60 mb-1">{t("Your 30-second pitch")}</div>
                  <p className="text-[14px] text-[#1a1a1a] leading-relaxed whitespace-pre-wrap">{pitch}</p>
                </div>
              ) : null}

              {locked ? (
                <div className="rounded-2xl bg-[#0A2647] text-white p-5 text-center">
                  <Lock className="h-5 w-5 mx-auto text-[#E8C66B]" />
                  <h2 className="mt-2 text-lg font-bold">{t("Unlock STAR answers + your pitch")}</h2>
                  <p className="mt-1 text-white/75 text-sm max-w-md mx-auto">
                    {t("Get model answers for every likely question — built from your real experience — plus a 30-second personal pitch.")}
                  </p>
                  <button
                    type="button"
                    onClick={unlock}
                    disabled={unlocking}
                    className="mt-4 inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white text-[#0A2647] text-sm font-semibold hover:bg-stone-100 disabled:opacity-60 transition-colors"
                  >
                    {unlocking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    {t("Unlock full prep")}
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
