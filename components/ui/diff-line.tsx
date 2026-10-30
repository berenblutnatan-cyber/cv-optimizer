"use client";

import * as React from "react";
import { Quote, ShieldCheck, Lightbulb } from "lucide-react";
import { useT } from "@/lib/i18n/LanguageProvider";
import { cn } from "./cn";
import { Tooltip } from "./tooltip";

/**
 * Evidence-linked rewrite: before → after, the job requirement it serves, and
 * the verbatim source quote that proves it. Ungrounded = advice only, no apply.
 */
export function DiffLine({
  before,
  after,
  requirement,
  evidence,
  grounded,
  actions,
  applied,
}: {
  before?: string;
  after: string;
  requirement?: string;
  evidence?: string;
  grounded: boolean;
  actions?: React.ReactNode;
  applied?: boolean;
}) {
  const { t } = useT();
  return (
    <div className={cn("rounded-card border bg-surface p-4 transition-colors", applied ? "border-success/30 bg-success-wash/40" : "border-hairline")}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {grounded ? (
          <Tooltip content={t("Every fact in this rewrite is already in your CV.")}>
            <span className="inline-flex h-6 items-center gap-1 rounded-full bg-success-wash px-2.5 text-dense font-medium text-success" tabIndex={0}>
              <ShieldCheck className="size-3.5" aria-hidden /> {t("Grounded")}
            </span>
          </Tooltip>
        ) : (
          <Tooltip content={t("Needs a fact only you can confirm. We never add it for you.")}>
            <span className="inline-flex h-6 items-center gap-1 rounded-full bg-warn-wash px-2.5 text-dense font-medium text-warn" tabIndex={0}>
              <Lightbulb className="size-3.5" aria-hidden /> {t("Advice")}
            </span>
          </Tooltip>
        )}
        {requirement && <span className="truncate text-dense text-ink-2">{requirement}</span>}
      </div>
      {before && (
        <p className="mb-1.5 border-s-2 border-danger/40 ps-3 text-body text-ink-3 line-through decoration-danger/40">
          <span className="sr-only">{t("Before:")} </span>
          {before}
        </p>
      )}
      <p className="border-s-2 border-success ps-3 text-body text-ink">
        <span className="sr-only">{t("After:")} </span>
        {after}
      </p>
      {(evidence || actions) && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          {evidence ? (
            <span className="inline-flex min-w-0 items-center gap-1.5 text-dense text-ink-2">
              <Quote className="size-3.5 shrink-0 text-ink-3" aria-hidden />
              <span className="truncate">“{evidence}”</span>
            </span>
          ) : (
            <span />
          )}
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      )}
    </div>
  );
}
