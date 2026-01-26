"use client";

import { useState } from "react";
import { Briefcase, Link as LinkIcon, FileSearch } from "lucide-react";

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
    <div className="bg-white rounded-sm shadow-[0_4px_40px_-12px_rgba(0,0,0,0.08)] p-8">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-11 h-11 rounded-full bg-[#0A2647]/5 flex items-center justify-center">
          <Briefcase className="w-5 h-5 text-[#0A2647]" strokeWidth={1.5} />
        </div>
        <h3 className="font-serif text-xl text-[#1a1a1a]">Target Role</h3>
      </div>

      {/* Job title */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-[#1a1a1a] mb-2 tracking-wide">
          {mode === "title_only" ? "Job Title" : "Job Title (optional)"}
        </label>
        <input
          type="text"
          value={jobTitle}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="e.g., Senior Product Manager"
          className="w-full px-0 py-3 border-b border-stone-200 text-[#1a1a1a] text-sm focus:outline-none focus:border-[#0A2647] transition-colors placeholder:text-stone-300 bg-transparent font-light"
        />
        <p className="mt-2 text-xs text-stone-400 font-light">
          {mode === "title_only"
            ? "General optimization based on role title."
            : "Optional — we can infer from the job description."}
        </p>
      </div>

      {mode === "specific_role" && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-[#1a1a1a] mb-2 tracking-wide">
            Company Name
          </label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => onCompanyNameChange(e.target.value)}
            placeholder="e.g., Stripe"
            className="w-full px-0 py-3 border-b border-stone-200 text-[#1a1a1a] text-sm focus:outline-none focus:border-[#0A2647] transition-colors placeholder:text-stone-300 bg-transparent font-light"
          />
        </div>
      )}

      {/* Toggle between URL and paste */}
      {mode === "specific_role" && (
        <>
          <label className="block text-sm font-medium text-[#1a1a1a] mb-3 tracking-wide">
            Job Details
          </label>
          <div className="flex border-b border-stone-200 mb-6">
            <button
              onClick={() => setInputMode("paste")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-all border-b-2 -mb-px ${
                inputMode === "paste"
                  ? "border-[#0A2647] text-[#0A2647]"
                  : "border-transparent text-stone-400 hover:text-stone-600"
              }`}
            >
              <FileSearch className="w-4 h-4" strokeWidth={1.5} />
              Paste Description
            </button>
            <button
              onClick={() => setInputMode("url")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-all border-b-2 -mb-px ${
                inputMode === "url"
                  ? "border-[#0A2647] text-[#0A2647]"
                  : "border-transparent text-stone-400 hover:text-stone-600"
              }`}
            >
              <LinkIcon className="w-4 h-4" strokeWidth={1.5} />
              LinkedIn URL
            </button>
          </div>
        </>
      )}

      {mode === "title_only" ? null : inputMode === "url" ? (
        <div>
          <input
            type="url"
            value={jobUrl}
            onChange={(e) => onUrlChange(e.target.value)}
            placeholder="https://linkedin.com/jobs/view/..."
            className="w-full px-0 py-3 border-b border-stone-200 text-[#1a1a1a] text-sm focus:outline-none focus:border-[#0A2647] transition-colors placeholder:text-stone-300 bg-transparent font-light"
          />
          <p className="mt-3 text-xs text-stone-400 font-light">
            We'll extract the job details automatically
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <textarea
            value={jobDescription}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="Please paste the complete job description here..."
            className="w-full h-40 p-0 border-b border-stone-200 text-[#1a1a1a] text-sm resize-none focus:outline-none focus:border-[#0A2647] transition-colors placeholder:text-stone-300 bg-transparent font-light leading-relaxed"
          />
          <div className="text-xs text-stone-400 font-light flex flex-wrap gap-x-4 gap-y-2">
            <span className="inline-flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-stone-300" />
              Title & company
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-stone-300" />
              Requirements
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-stone-300" />
              Responsibilities
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-stone-300" />
              Skills
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
