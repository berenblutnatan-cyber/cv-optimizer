"use client";

import { useState } from "react";

interface JobInputProps {
  mode: "title_only" | "specific_role";
  jobTitle: string;
  jobUrl: string;
  jobDescription: string;
  companyName: string;
  onTitleChange: (title: string) => void;
  onUrlChange: (url: string) => void;
  onDescriptionChange: (description: string) => void;
  onCompanyNameChange: (name: string) => void;
}

export function JobInput({
  mode,
  jobTitle,
  jobUrl,
  jobDescription,
  companyName,
  onTitleChange,
  onUrlChange,
  onDescriptionChange,
  onCompanyNameChange,
}: JobInputProps) {
  const [inputMode, setInputMode] = useState<"url" | "paste">("paste");

  return (
    <div className="bg-white/4 rounded-2xl border border-white/10 p-6 backdrop-blur-md">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/10">
          <svg className="w-6 h-6 text-white/85" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-white">Job</h3>
      </div>

      {/* Job title */}
      <div className="mb-3">
        <label className="block text-base font-medium text-white/80 mb-2">
          {mode === "title_only" ? "Job Title (required)" : "Job Title (optional)"}
        </label>
        <input
          type="text"
          value={jobTitle}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="e.g., Senior Product Manager"
          className="w-full px-5 py-4 bg-white/5 text-white border border-white/10 rounded-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent outline-none placeholder-white/40 text-base"
        />
        <p className="mt-2 text-base text-white/60">
          {mode === "title_only"
            ? "General optimization based on role title only."
            : "Optional — we can infer the role title from the job description/LinkedIn post."}
        </p>
      </div>

      {mode === "specific_role" && (
        <div className="mb-3">
          <label className="block text-base font-medium text-white/80 mb-2">Company Name</label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => onCompanyNameChange(e.target.value)}
            placeholder="e.g., Stripe"
            className="w-full px-5 py-4 bg-white/5 text-white border border-white/10 rounded-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent outline-none placeholder-white/40 text-base"
          />
        </div>
      )}

      {/* Toggle between URL and paste */}
      {mode === "specific_role" && (
        <div className="flex gap-2 mb-4 bg-white/5 p-1 rounded-xl border border-white/10">
          <button
            onClick={() => setInputMode("paste")}
            className={`flex-1 py-3 px-5 rounded-lg text-base font-medium transition-colors ${
              inputMode === "paste"
                ? "bg-indigo-500 text-white shadow-sm"
                : "text-white/70 hover:bg-white/5"
            }`}
          >
            Paste Description
          </button>
          <button
            onClick={() => setInputMode("url")}
            className={`flex-1 py-3 px-5 rounded-lg text-base font-medium transition-colors ${
              inputMode === "url"
                ? "bg-indigo-500 text-white shadow-sm"
                : "text-white/70 hover:bg-white/5"
            }`}
          >
            LinkedIn URL
          </button>
        </div>
      )}

      {mode === "title_only" ? null : inputMode === "url" ? (
        <div>
          <input
            type="url"
            value={jobUrl}
            onChange={(e) => {
              onUrlChange(e.target.value);
            }}
            placeholder="https://www.linkedin.com/jobs/view/..."
            className="w-full px-5 py-4 bg-white/5 text-white border border-white/10 rounded-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent outline-none placeholder-white/40 text-base"
          />
          <p className="mt-2 text-base text-white/60">
            Paste the LinkedIn job posting link.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <textarea
            value={jobDescription}
            onChange={(e) => {
              onDescriptionChange(e.target.value);
            }}
            placeholder="Paste the job description…"
            className="w-full h-56 px-5 py-4 bg-white/5 text-white border border-white/10 rounded-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent outline-none resize-none placeholder:text-white/35 leading-relaxed text-base"
          />
          <div className="text-sm text-white/55 flex flex-wrap gap-x-4 gap-y-2">
            <span className="inline-flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-white/40" />
              Title + company
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-white/40" />
              Requirements
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-white/40" />
              Responsibilities
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-white/40" />
              Skills/tools
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
