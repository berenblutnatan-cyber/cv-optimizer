"use client";

import * as React from "react";
import { Camera, Trash2, UserRound } from "lucide-react";
import { Button, toast, Tooltip } from "@/components/ui";
import { useT } from "@/lib/i18n/LanguageProvider";
import { photoFromFile } from "@/lib/resume/photo";

/**
 * The CV photo. Optional: many countries (US, UK, Ireland) expect none, so it
 * never nags. A picked image is cut to a square and shrunk in the browser
 * before it is saved, so the original never leaves the device.
 */
export function PhotoField({
  photo,
  shown,
  onChange,
  onOpenDesign,
}: {
  photo?: string;
  /** Whether the current design shows a photo. */
  shown: boolean;
  onChange: (photo: string) => void;
  onOpenDesign: () => void;
}) {
  const { t } = useT();
  const input = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      onChange(await photoFromFile(file));
    } catch (err) {
      toast.error((err as Error).message === "too_big" ? t("That image is over 10 MB.") : t("Couldn't read that image. Try another photo."));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div className="flex items-center gap-4">
      <Tooltip content={t("Optional. Common in Israel and Europe, usually left off in the US and UK.")}>
        <button
          type="button"
          onClick={() => input.current?.click()}
          aria-label={photo ? t("Change photo") : t("Add photo")}
          className="group relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-full border border-hairline-strong bg-surface-2 text-ink-3 transition-[border-color,transform] duration-micro ease-strong hover:border-control active:scale-[0.97]"
        >
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element -- an inline data URL, nothing for next/image to optimise
            <img src={photo} alt="" className="size-full object-cover" />
          ) : (
            <UserRound className="size-7" aria-hidden />
          )}
          <span className="absolute inset-0 grid place-items-center bg-black/45 text-white opacity-0 transition-opacity duration-micro group-hover:opacity-100 group-focus-visible:opacity-100">
            <Camera className="size-5" aria-hidden />
          </span>
        </button>
      </Tooltip>
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="secondary" loading={busy} onClick={() => input.current?.click()}>
            <Camera /> {photo ? t("Change photo") : t("Add photo")}
          </Button>
          {photo && (
            <Button size="sm" variant="ghost" onClick={() => onChange("")}>
              <Trash2 /> {t("Remove")}
            </Button>
          )}
        </div>
        {photo && !shown && (
          <p className="text-dense text-ink-2">
            {t("This design hides it.")}{" "}
            <button type="button" onClick={onOpenDesign} className="font-medium text-accent-ink underline-offset-4 hover:underline">
              {t("Change design")}
            </button>
          </p>
        )}
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/heic" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => void pick(e.target.files?.[0])} />
    </div>
  );
}
