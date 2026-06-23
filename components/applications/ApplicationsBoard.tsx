"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, ExternalLink, WandSparkles, Loader2, FileText, Copy, X } from "lucide-react";
import { useResumeStore } from "@/store/useResumeStore";
import { useFlashSaleStore } from "@/stores/flashSaleStore";
import { resumeToText } from "@/types/resume";
import { track } from "@/lib/analytics";
import {
  APPLICATION_STATUSES,
  STATUS_LABEL,
  type ApplicationDTO,
  type JobApplicationStatus,
} from "@/lib/applications";
import { AddApplicationDialog } from "@/components/applications/AddApplicationDialog";

export function ApplicationsBoard() {
  const router = useRouter();
  const [apps, setApps] = useState<ApplicationDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [clBusyId, setClBusyId] = useState<string | null>(null);
  const [coverLetter, setCoverLetter] = useState<{ app: ApplicationDTO; text: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/applications");
        const data = await res.json().catch(() => ({}));
        if (res.ok && Array.isArray(data.applications)) setApps(data.applications as ApplicationDTO[]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function changeStatus(app: ApplicationDTO, status: JobApplicationStatus) {
    setApps((prev) => prev.map((a) => (a.id === app.id ? { ...a, status } : a)));
    track("application_status_changed", { stage: status });
    try {
      await fetch(`/api/applications/${app.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
    } catch {
      toast.error("Couldn't save that move.");
    }
  }

  async function remove(app: ApplicationDTO) {
    setApps((prev) => prev.filter((a) => a.id !== app.id));
    try {
      await fetch(`/api/applications/${app.id}`, { method: "DELETE" });
    } catch {
      /* ignore */
    }
  }

  // Paid payoff: deep-link into the optimizer pre-loaded with this job + the
  // user's current CV. /optimize handles the credit gate on analyze.
  function tailor(app: ApplicationDTO) {
    const cvText = resumeToText(useResumeStore.getState().resumeData);
    if (!cvText.trim()) {
      toast.message("Build your CV first, then tailor it to this job.");
      router.push("/build/chat");
      return;
    }
    try {
      localStorage.setItem(
        "optimizer_draft",
        JSON.stringify({ cvText, jobTitle: app.title, jobDescription: app.jdText ?? "", jobUrl: app.url ?? "" })
      );
    } catch {
      /* ignore quota */
    }
    track("application_tailor_clicked");
    router.push("/optimize");
  }

  // Paid payoff #2: generate a cover letter for this saved job (1 credit;
  // subscribers bypass). Board is auth-gated, so the user is signed in.
  async function genCoverLetter(app: ApplicationDTO) {
    if (clBusyId) return;
    const cvText = resumeToText(useResumeStore.getState().resumeData);
    if (!cvText.trim()) {
      toast.message("Build your CV first, then generate a cover letter.");
      router.push("/build/chat");
      return;
    }
    setClBusyId(app.id);
    try {
      const res = await fetch(`/api/applications/${app.id}/cover-letter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cvText }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 402 || data?.code === "INSUFFICIENT_CREDITS") {
        track("application_cover_letter_blocked", { reason: "no_credits" });
        useFlashSaleStore.getState().recordAction();
        toast.message("You're out of credits", { description: "Top up or grab the Pro offer to generate." });
        return;
      }
      if (!res.ok) {
        toast.error(data?.error ?? "Couldn't generate — try again.");
        return;
      }
      setCoverLetter({ app, text: data.coverLetter as string });
      track("application_cover_letter_generated");
    } finally {
      setClBusyId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-stone-400">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-[#0A2647]">Job tracker</h1>
          <p className="text-sm text-stone-500 mt-0.5">Every role you&apos;re chasing, in one board.</p>
        </div>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#0A2647] text-white text-sm font-semibold hover:bg-[#0d3259] transition-colors"
        >
          <Plus className="h-4 w-4" /> Add application
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {APPLICATION_STATUSES.map((status) => {
          const col = apps.filter((a) => a.status === status);
          return (
            <div key={status} className="rounded-2xl bg-stone-50 border border-stone-200 p-2.5 min-h-[120px]">
              <div className="flex items-center justify-between px-1 pb-2">
                <span className="text-[12px] font-semibold text-[#0A2647]">{STATUS_LABEL[status]}</span>
                <span className="text-[11px] text-stone-400 tabular-nums">{col.length}</span>
              </div>
              <div className="space-y-2">
                {col.map((app) => (
                  <div key={app.id} className="rounded-xl bg-white border border-stone-200 p-3">
                    <div className="text-[13px] font-semibold text-[#1a1a1a] leading-snug">{app.title}</div>
                    <div className="text-[12px] text-stone-500">{app.company}</div>
                    {app.location ? <div className="text-[11px] text-stone-400 mt-0.5">{app.location}</div> : null}

                    <select
                      value={app.status}
                      onChange={(e) => changeStatus(app, e.target.value as JobApplicationStatus)}
                      className="mt-2 w-full rounded-lg border border-stone-200 bg-stone-50 px-2 py-1 text-[12px] text-[#0A2647] outline-none focus:border-[#0A2647]/40"
                    >
                      {APPLICATION_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABEL[s]}
                        </option>
                      ))}
                    </select>

                    <div className="mt-2 space-y-1">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => tailor(app)}
                          className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 rounded-lg bg-[#B8860B]/10 text-[#8a6608] text-[11px] font-semibold hover:bg-[#B8860B]/20 transition-colors"
                        >
                          <WandSparkles className="h-3 w-3" /> Tailor CV
                        </button>
                        {app.url ? (
                          <a
                            href={app.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Open job posting"
                            className="grid place-items-center h-7 w-7 rounded-lg text-stone-400 hover:bg-stone-100 hover:text-[#0A2647] transition-colors"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => remove(app)}
                          aria-label="Delete application"
                          className="grid place-items-center h-7 w-7 rounded-lg text-stone-400 hover:bg-stone-100 hover:text-rose-500 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => genCoverLetter(app)}
                        disabled={clBusyId === app.id}
                        className="w-full inline-flex items-center justify-center gap-1 px-2 py-1 rounded-lg bg-[#0A2647]/[0.06] text-[#0A2647] text-[11px] font-semibold hover:bg-[#0A2647]/[0.12] disabled:opacity-50 transition-colors"
                      >
                        {clBusyId === app.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />}
                        Cover letter
                      </button>
                    </div>
                  </div>
                ))}
                {col.length === 0 ? <p className="px-1 py-3 text-[11px] text-stone-400">Nothing here yet.</p> : null}
              </div>
            </div>
          );
        })}
      </div>

      {adding ? (
        <AddApplicationDialog
          onClose={() => setAdding(false)}
          onCreated={(a) => {
            setApps((prev) => [a, ...prev]);
            track("application_created");
          }}
        />
      ) : null}

      {coverLetter ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setCoverLetter(null)} aria-hidden="true" />
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl p-5 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-[#0A2647]">Cover letter</h2>
                <p className="text-[12px] text-stone-500 truncate">
                  {coverLetter.app.title} · {coverLetter.app.company}
                </p>
              </div>
              <button
                onClick={() => setCoverLetter(null)}
                aria-label="Close"
                className="grid place-items-center h-8 w-8 rounded-lg text-stone-400 hover:bg-stone-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <textarea
              readOnly
              value={coverLetter.text}
              className="flex-1 min-h-[300px] w-full rounded-xl border border-stone-200 bg-stone-50 p-3 text-[13px] leading-relaxed text-[#1a1a1a] resize-none outline-none"
            />
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(coverLetter.text);
                  toast.success("Copied to clipboard");
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#0A2647] text-white text-[13px] font-semibold hover:bg-[#0d3259] transition-colors"
              >
                <Copy className="h-3.5 w-3.5" /> Copy
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
