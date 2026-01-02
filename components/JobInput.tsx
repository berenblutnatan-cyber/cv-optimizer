"use client";

import { useState } from "react";

interface JobInputProps {
  jobTitle: string;
  jobUrl: string;
  jobDescription: string;
  onTitleChange: (title: string) => void;
  onUrlChange: (url: string) => void;
  onDescriptionChange: (description: string) => void;
}

export function JobInput({
  jobTitle,
  jobUrl,
  jobDescription,
  onTitleChange,
  onUrlChange,
  onDescriptionChange,
}: JobInputProps) {
  const [inputMode, setInputMode] = useState<"url" | "paste">("paste");

  return (
    <div className="bg-white/5 rounded-3xl border border-white/10 p-6 backdrop-blur">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center border border-white/10">
          <svg className="w-5 h-5 text-white/85" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-white">Job Description</h3>
      </div>

      {/* Job title */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-white/80 mb-2">Job Title</label>
        <input
          type="text"
          value={jobTitle}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="e.g., Senior Product Manager"
          className="w-full px-4 py-3 bg-white/5 text-white border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:border-transparent outline-none placeholder-white/40"
        />
        <p className="mt-2 text-sm text-white/60">
          You can analyze using just the job title, or add a LinkedIn URL / paste a description for a specific posting.
        </p>
      </div>

      {/* Toggle between URL and paste */}
      <div className="flex gap-2 mb-4 bg-white/5 p-1 rounded-xl border border-white/10">
        <button
          onClick={() => setInputMode("paste")}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
            inputMode === "paste"
              ? "bg-indigo-500 text-white shadow-sm"
              : "text-white/70 hover:bg-white/5"
          }`}
        >
          Paste Description
        </button>
        <button
          onClick={() => setInputMode("url")}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
            inputMode === "url"
              ? "bg-indigo-500 text-white shadow-sm"
              : "text-white/70 hover:bg-white/5"
          }`}
        >
          LinkedIn URL
        </button>
      </div>

      {inputMode === "url" ? (
        <div>
          <input
            type="url"
            value={jobUrl}
            onChange={(e) => {
              onUrlChange(e.target.value);
            }}
            placeholder="https://www.linkedin.com/jobs/view/..."
            className="w-full px-4 py-3 bg-white/5 text-white border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:border-transparent outline-none placeholder-white/40"
          />
          <p className="mt-2 text-sm text-white/60">
            Paste the LinkedIn job posting link.
          </p>
        </div>
      ) : (
        <textarea
          value={jobDescription}
          onChange={(e) => {
            onDescriptionChange(e.target.value);
          }}
          placeholder="Paste the job description here...

Include:
• Job title and company
• Required qualifications
• Responsibilities
• Skills and requirements"
          className="w-full h-52 px-4 py-3 bg-white/5 text-white border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:border-transparent outline-none resize-none placeholder-white/40"
        />
      )}
    </div>
  );
}
