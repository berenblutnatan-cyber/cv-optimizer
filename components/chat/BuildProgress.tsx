"use client";

import { Check } from "lucide-react";
import type { ResumeData } from "@/types/resume";
import { isPlaceholderSummary } from "@/lib/chat/prompts";

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
  const items = computeProgress(data);
  const done = items.filter((i) => i.done).length;
  const pct = Math.round((done / items.length) * 100);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] uppercase tracking-[0.18em] text-white/55">
          Your CV
        </span>
        <span className="text-[11px] text-white/65 tabular-nums">{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#f5b8c8] to-[#8fb3ff] transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1">
        {items.map((item) => (
          <span
            key={item.key}
            className={`inline-flex items-center gap-1 text-[11px] transition-colors ${
              item.done ? "text-white/85" : "text-white/40"
            }`}
          >
            <Check className={`h-3 w-3 ${item.done ? "text-[#8fffc1]" : "text-white/25"}`} />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}
