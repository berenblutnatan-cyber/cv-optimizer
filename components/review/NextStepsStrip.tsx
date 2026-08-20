"use client";

// "What now" chips after the review — cover letter, interview prep, and the
// apply-moment toolkit tools, prefilled from this analysis.

import Link from "next/link";
import { FileText, Linkedin, Mail, MessageSquare, MicVocal } from "lucide-react";
import { useT } from "@/lib/i18n/LanguageProvider";
import { track } from "@/lib/analytics";
import type { ToolId } from "@/lib/toolkit/tools";

export function NextStepsStrip({
  jobTitle,
  onCoverLetter,
  onOpenTool,
}: {
  jobTitle: string;
  onCoverLetter: () => void;
  onOpenTool: (tool: ToolId) => void;
}) {
  const { t } = useT();
  const chip =
    "inline-flex items-center gap-1.5 px-3 py-2 rounded-full border border-stone-200 bg-white text-sm font-medium text-stone-700 hover:border-brand-navy/40 hover:text-brand-navy transition-colors whitespace-nowrap";

  return (
    <div className="pt-1">
      <div className="text-sm font-semibold text-brand-navy mb-2 px-0.5">{t("Next steps")}</div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={chip}
          onClick={() => {
            track("next_steps_clicked", { tool: "cover-letter" });
            onCoverLetter();
          }}
        >
          <FileText className="w-4 h-4" /> {t("Cover letter")}
        </button>
        <Link
          href={`/interview-prep?role=${encodeURIComponent(jobTitle)}`}
          className={chip}
          onClick={() => track("next_steps_clicked", { tool: "interview-prep" })}
        >
          <MicVocal className="w-4 h-4" /> {t("Interview prep")}
        </Link>
        <button
          type="button"
          className={chip}
          onClick={() => {
            track("next_steps_clicked", { tool: "cold-email" });
            onOpenTool("cold-email");
          }}
        >
          <Mail className="w-4 h-4" /> {t("Cold email")}
        </button>
        <button
          type="button"
          className={chip}
          onClick={() => {
            track("next_steps_clicked", { tool: "application-answers" });
            onOpenTool("application-answers");
          }}
        >
          <MessageSquare className="w-4 h-4" /> {t("Application answers")}
        </button>
        <button
          type="button"
          className={chip}
          onClick={() => {
            track("next_steps_clicked", { tool: "linkedin" });
            onOpenTool("linkedin");
          }}
        >
          <Linkedin className="w-4 h-4" /> {t("LinkedIn")}
        </button>
      </div>
    </div>
  );
}
