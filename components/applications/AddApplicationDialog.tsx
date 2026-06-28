"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, X, LinkIcon } from "lucide-react";
import type { ApplicationDTO } from "@/lib/applications";
import { useT } from "@/lib/i18n/LanguageProvider";

export function AddApplicationDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (a: ApplicationDTO) => void;
}) {
  const { t } = useT();
  const [url, setUrl] = useState("");
  const [company, setCompany] = useState("");
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [jdText, setJdText] = useState("");
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);

  // Reuse the existing SSRF-hardened job reader to autofill from a link.
  async function autofill() {
    const trimmed = url.trim();
    if (!trimmed || fetching) return;
    setFetching(true);
    try {
      const res = await fetch("/api/fetch-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        toast.message(data?.error ?? t("Couldn't read that link — fill the fields in manually."));
        return;
      }
      if (data.title && !title) setTitle(String(data.title).slice(0, 200));
      if (data.text) setJdText(String(data.text));
      toast.success(t("Pulled the posting — add the company and save."));
    } finally {
      setFetching(false);
    }
  }

  async function save() {
    if (!company.trim() || !title.trim()) {
      toast.message(t("Company and job title are required."));
      return;
    }
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: company.trim(),
          title: title.trim(),
          location: location.trim() || undefined,
          url: url.trim() || undefined,
          jdText: jdText || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error ?? t("Couldn't save."));
        return;
      }
      onCreated(data.application as ApplicationDTO);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const field =
    "w-full rounded-xl bg-white border border-stone-300 px-3 py-2 text-[14px] outline-none focus:border-[#0A2647]/50 focus:ring-2 focus:ring-[#0A2647]/10 transition-colors";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-[#0A2647]">{t("Track a new application")}</h2>
          <button onClick={onClose} aria-label={t("Close")} className="grid place-items-center h-8 w-8 rounded-lg text-stone-400 hover:bg-stone-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <label className="block text-[11px] font-medium uppercase tracking-wide text-stone-500 mb-1">{t("Job link (optional)")}</label>
        <div className="flex gap-2">
          <input className={field} value={url} onChange={(e) => setUrl(e.target.value)} placeholder={t("Paste a job URL to autofill")} />
          <button
            type="button"
            onClick={autofill}
            disabled={fetching || !url.trim()}
            className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 rounded-xl bg-[#0A2647]/[0.07] text-[#0A2647] text-[13px] font-medium hover:bg-[#0A2647]/[0.12] disabled:opacity-50 transition-colors"
          >
            {fetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <LinkIcon className="h-4 w-4" />}
            {t("Read")}
          </button>
        </div>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wide text-stone-500 mb-1">{t("Company")}</label>
            <input className={field} value={company} onChange={(e) => setCompany(e.target.value)} placeholder={t("Acme Inc")} />
          </div>
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wide text-stone-500 mb-1">{t("Job title")}</label>
            <input className={field} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("Product Manager")} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-medium uppercase tracking-wide text-stone-500 mb-1">{t("Location (optional)")}</label>
            <input className={field} value={location} onChange={(e) => setLocation(e.target.value)} placeholder={t("Remote · London")} />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-full text-[13px] text-stone-600 hover:bg-stone-100 transition-colors">
            {t("Cancel")}
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#0A2647] text-white text-[13px] font-semibold hover:bg-[#0d3259] disabled:opacity-60 transition-colors"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t("Save")}
          </button>
        </div>
      </div>
    </div>
  );
}
