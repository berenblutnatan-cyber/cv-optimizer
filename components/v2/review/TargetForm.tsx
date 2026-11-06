"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { Button, Input, Textarea } from "@/components/ui";
import { useT } from "@/lib/i18n/LanguageProvider";
import { TARGET_DESCRIPTION_MAX, TARGET_TITLE_MAX, type CvTarget } from "@/lib/resume/document";

/**
 * The one question before the read: which job is this CV for. A title is
 * enough; the job ad is optional and opens on demand. Used at upload and on
 * the review page ("Change").
 */
export function TargetForm({
  initial,
  submitLabel,
  onSubmit,
  onSkip,
  busy,
  autoFocus = true,
  idPrefix = "target",
}: {
  initial?: CvTarget;
  submitLabel: string;
  onSubmit: (target: CvTarget | undefined) => void;
  onSkip?: () => void;
  busy?: boolean;
  autoFocus?: boolean;
  idPrefix?: string;
}) {
  const { t } = useT();
  const [title, setTitle] = React.useState(initial?.title ?? "");
  const [description, setDescription] = React.useState(initial?.description ?? "");
  const [withAd, setWithAd] = React.useState(!!initial?.description);
  const adRef = React.useRef<HTMLTextAreaElement>(null);
  const empty = !title.trim() && !description.trim();

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (empty) return onSkip ? onSkip() : onSubmit(undefined);
        onSubmit({ title: title.trim(), ...(withAd && description.trim() ? { description: description.trim() } : {}) });
      }}
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${idPrefix}-title`} className="text-body font-medium text-ink">
          {t("Job title")}
        </label>
        <Input
          id={`${idPrefix}-title`}
          autoFocus={autoFocus}
          dir="auto"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={TARGET_TITLE_MAX}
          placeholder={t("Product manager")}
          autoComplete="off"
          enterKeyHint="go"
          className="h-11"
        />
      </div>
      {withAd ? (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${idPrefix}-ad`} className="text-body font-medium text-ink">
            {t("Job ad")}
          </label>
          <Textarea
            id={`${idPrefix}-ad`}
            ref={adRef}
            dir="auto"
            rows={6}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={TARGET_DESCRIPTION_MAX}
            className="min-h-36"
          />
        </div>
      ) : (
        <Button
          type="button"
          variant="ghost"
          className="-ms-2 w-fit"
          onClick={() => {
            setWithAd(true);
            requestAnimationFrame(() => adRef.current?.focus());
          }}
        >
          <Plus /> {t("Add the job ad")}
        </Button>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" variant="primary" size="lg" loading={busy} disabled={busy}>
          {submitLabel}
        </Button>
        {onSkip && (
          <Button type="button" variant="ghost" size="lg" onClick={onSkip} disabled={busy}>
            {t("Skip")}
          </Button>
        )}
      </div>
    </form>
  );
}
