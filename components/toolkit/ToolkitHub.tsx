"use client";

// The /toolkit hub — 9 cards: 7 free generators (in-page drawer) +
// Interview prep (existing page) + Cover letter (existing API via a
// dedicated mini-drawer is overkill — link users into an analysis flow;
// the cover letter lives where the context lives). Deep-linkable ?tool=.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  BookOpen,
  FileText,
  HandCoins,
  Linkedin,
  Mail,
  MessageSquare,
  MicVocal,
  Scale,
  Users,
} from "lucide-react";
import { useT } from "@/lib/i18n/LanguageProvider";
import { track } from "@/lib/analytics";
import { TOOLS, TOOL_IDS, isToolId, type ToolId, type ToolSpec } from "@/lib/toolkit/tools";
import { resumeToText } from "@/types/resume";
import { useResumeStore } from "@/store/useResumeStore";
import { ToolDrawer } from "./ToolDrawer";

const ICONS: Record<ToolSpec["icon"], typeof Mail> = {
  Mail,
  MessageSquare,
  Linkedin,
  Users,
  HandCoins,
  Scale,
  BookOpen,
};

export function ToolkitHub() {
  const { t } = useT();
  const searchParams = useSearchParams();
  const [openTool, setOpenTool] = useState<ToolId | null>(null);
  const resumeData = useResumeStore((s) => s.resumeData);
  const builderCvText = useMemo(() => {
    const text = resumeToText(resumeData);
    return text.trim().length >= 40 ? text : "";
  }, [resumeData]);

  useEffect(() => {
    track("toolkit_viewed", {});
    const deepLink = searchParams.get("tool");
    if (deepLink && isToolId(deepLink)) setOpenTool(deepLink);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const open = (id: ToolId) => {
    setOpenTool(id);
    track("toolkit_tool_opened", { tool: id });
  };

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {TOOL_IDS.map((id) => {
          const spec = TOOLS[id];
          const Icon = ICONS[spec.icon];
          return (
            <button
              key={id}
              type="button"
              onClick={() => open(id)}
              className="text-left bg-white rounded-sm border border-stone-200 px-5 py-4 hover:border-brand-navy/40 hover:shadow-sm transition-all"
            >
              <Icon className="w-5 h-5 text-brand-navy mb-2.5" strokeWidth={1.75} />
              <div className="text-sm font-semibold text-brand-ink">{t(spec.title)}</div>
              <div className="text-sm text-stone-500 mt-0.5">{t(spec.tagline)}</div>
            </button>
          );
        })}

        <Link
          href="/interview-prep"
          className="bg-white rounded-sm border border-stone-200 px-5 py-4 hover:border-brand-navy/40 hover:shadow-sm transition-all"
        >
          <MicVocal className="w-5 h-5 text-brand-navy mb-2.5" strokeWidth={1.75} />
          <div className="text-sm font-semibold text-brand-ink">{t("Interview prep")}</div>
          <div className="text-sm text-stone-500 mt-0.5">{t("STAR answers + your 30-second pitch")}</div>
        </Link>

        <Link
          href="/optimize"
          className="bg-white rounded-sm border border-stone-200 px-5 py-4 hover:border-brand-navy/40 hover:shadow-sm transition-all"
        >
          <FileText className="w-5 h-5 text-brand-navy mb-2.5" strokeWidth={1.75} />
          <div className="text-sm font-semibold text-brand-ink">{t("Cover letter")}</div>
          <div className="text-sm text-stone-500 mt-0.5">{t("Generated with your CV analysis")}</div>
        </Link>
      </div>

      <ToolDrawer toolId={openTool} builderCvText={builderCvText} onClose={() => setOpenTool(null)} />
    </>
  );
}
