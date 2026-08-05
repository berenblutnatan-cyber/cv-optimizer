"use client";

import { Check } from "lucide-react";
import type { ResumeData } from "@/types/resume";
import { isPlaceholderSummary } from "@/lib/chat/prompts";
import { useT } from "@/lib/i18n/LanguageProvider";

export type ProgressItem = { key: string; label: string; done: boolean };

export function computeProgress(data: ResumeData): ProgressItem[] {
  const bulletCount = data.experience.reduce(
    (n, e) => n + e.description.filter((b) => b.trim()).length,
    0
  );
  return [
    { key: "name", label: "Name", done: Boolean(data.personalInfo.name.trim()) },
    { key: "role", label: "Target role", done: Boolean(data.personalInfo.title.trim()) },
    {
      key: "experience",
      label: "Experience",
      done: data.experience.length > 0 && bulletCount >= 2,
    },
    { key: "education", label: "Education", done: data.education.length > 0 },
    { key: "skills", label: "Skills", done: data.skills.length >= 5 },
    { key: "summary", label: "Summary", done: !isPlaceholderSummary(data.summary) },
    { key: "contact", label: "Contact", done: Boolean(data.personalInfo.email.trim()) },
  ];
}

export function BuildProgress({ data }: { data: ResumeData }) {
  const { t } = useT();
  const items = computeProgress(data);
  const done = items.filter((i) => i.done).length;
  const pct = Math.round((done / items.length) * 100);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[13px] text-brand-navy/60">{t("CV completeness")}</span>
        <span className="text-[13px] text-brand-navy/70 tabular-nums" aria-hidden>
          {pct}%
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={t("CV completeness")}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-valuetext={t("{pct}% — {done} of {total} sections done", {
          pct,
          done,
          total: items.length,
        })}
        className="h-1.5 rounded-full bg-brand-navy/[0.05] overflow-hidden"
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-navy to-brand-gold transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <ul className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1">
        {items.map((item) => (
          <li
            key={item.key}
            className={`inline-flex items-center gap-1 text-[13px] transition-colors ${
              item.done ? "text-brand-navy/85" : "text-brand-navy/40"
            }`}
          >
            <Check
              aria-hidden
              className={`h-3 w-3 ${item.done ? "text-emerald-600" : "text-brand-navy/25"}`}
            />
            {t(item.label)}
            <span className="sr-only">{item.done ? t("done") : t("still to do")}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
