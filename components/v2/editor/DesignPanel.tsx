"use client";

import * as React from "react";
import { Check, Undo2 } from "lucide-react";
import { isAccentHex, THEME_COLOR_VALUES, type ThemeColor } from "@/lib/design/accents";
import { DESIGN_COLORS } from "@/lib/chat/cvTools";
import { TEMPLATE_LIST } from "@/lib/templates/registry";
import type { DesignTemplate, ResumeDocument } from "@/lib/resume/document";
import { toTemplateData } from "@/lib/resume/view";
import { Badge, Button, cn, Segmented, Tooltip } from "@/components/ui";
import { CvThumbnail, type ThumbFit } from "@/components/v2/cv/CvThumbnail";
import { msg } from "@/lib/i18n/config";
import { useT } from "@/lib/i18n/LanguageProvider";
import { PanelHeader } from "./PanelHeader";

const COLOR_NAMES: Record<(typeof DESIGN_COLORS)[number], string> = {
  indigo: msg("Indigo"),
  blue: msg("Blue"),
  purple: msg("Purple"),
  rose: msg("Rose"),
  amber: msg("Amber"),
  slate: msg("Slate"),
  navy: msg("Navy"),
  violet: msg("Violet"),
  orange: msg("Orange"),
  black: msg("Black"),
};

type Apply = (name: string, input: Record<string, unknown>, key?: string) => boolean;

/** Accent, page length and every template, each drawn with this CV's content. */
export function DesignPanel({ doc, apply, onClose }: { doc: ResumeDocument; apply: Apply; onClose: () => void }) {
  const { t, dir } = useT();
  const placeholderName = t("Your Name");
  const data = React.useMemo(() => toTemplateData(doc.content, { placeholderName }), [doc.content, placeholderName]);
  const [fits, setFits] = React.useState<Record<string, ThumbFit>>({});
  const { design } = doc;
  const oneP = design.pageMode === "one";
  // An imported CV keeps its own colour as the first swatch, and a way back to the design it came with.
  const original = doc.original;
  const ownColor = [design.accentColor, original?.design.accentColor].find(isAccentHex);
  const swatches: { id: string; name: string; hex: string }[] = [
    ...(ownColor ? [{ id: ownColor, name: t("Your colour"), hex: ownColor }] : []),
    ...DESIGN_COLORS.map((c) => ({ id: c, name: t(COLOR_NAMES[c]), hex: THEME_COLOR_VALUES[c as ThemeColor].primary })),
  ];
  const changed = !!original && (original.design.template !== design.template || original.design.accentColor !== design.accentColor);

  return (
    <div dir={dir} className="flex h-full min-h-0 flex-col">
      <PanelHeader title={t("Design")} onClose={onClose} />
      <div className="min-h-0 flex-1 relative overflow-y-auto">
        {changed && (
          <div className="border-b border-hairline px-4 py-3">
            <Button size="sm" onClick={() => apply("set_design", { ...original!.design })}>
              <Undo2 /> {t("Back to your original")}
            </Button>
          </div>
        )}
        <section className="border-b border-hairline px-4 py-4" aria-labelledby="design-accent">
          <h3 id="design-accent" className="mb-3 text-dense font-medium text-ink-2">
            {t("Accent")}
          </h3>
          <div className="flex flex-wrap gap-3" role="radiogroup" aria-labelledby="design-accent">
            {swatches.map(({ id: c, name, hex }) => {
              const on = design.accentColor === c;
              return (
                <Tooltip key={c} content={name}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={on}
                    aria-label={name}
                    onClick={() => apply("set_design", { accentColor: c })}
                    className={cn(
                      // 32px swatch, 44px tap target (the ::after extends the hit area).
                      "relative grid size-8 place-items-center rounded-full text-white shadow-[inset_0_0_0_1px_rgb(var(--c-hairline-strong))] ring-offset-2 ring-offset-surface transition-shadow duration-micro after:absolute after:-inset-1.5 after:content-['']",
                      on ? "ring-2 ring-ink" : "hover:ring-2 hover:ring-hairline-strong",
                    )}
                    style={{ background: hex }}
                  >
                    {on && <Check className="size-4" aria-hidden />}
                  </button>
                </Tooltip>
              );
            })}
          </div>
        </section>

        <section className="border-b border-hairline px-4 py-4" aria-labelledby="design-length">
          <h3 id="design-length" className="mb-3 text-dense font-medium text-ink-2">
            {t("Length")}
          </h3>
          <Segmented
            aria-label={t("Page length")}
            size="sm"
            value={design.pageMode}
            onChange={(v) => apply("set_design", { pageMode: v, ...(v === "one" ? { autoFit: true } : {}) })}
            options={[
              { value: "one", label: t("One page") },
              { value: "multi", label: t("Multi-page") },
            ]}
          />
        </section>

        <section className="px-4 pb-6 pt-4" aria-labelledby="design-template">
          <h3 id="design-template" className="mb-3 text-dense font-medium text-ink-2">
            {t("Template")}
          </h3>
          <ul className="grid grid-cols-2 gap-x-3 gap-y-4" role="radiogroup" aria-labelledby="design-template">
            {TEMPLATE_LIST.map((tpl, i) => {
              const on = design.template === tpl.id;
              const tooLong = oneP && fits[tpl.id]?.atMinimum;
              return (
                <li key={tpl.id}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={on}
                    aria-label={tooLong ? t("{name}, longer than one page", { name: t(tpl.name) }) : t(tpl.name)}
                    onClick={() => apply("set_design", { template: tpl.id as DesignTemplate })}
                    className="group flex w-full flex-col gap-2 rounded-card text-start"
                  >
                    <span
                      className={cn(
                        "block overflow-hidden rounded-control border transition-[border-color,box-shadow] duration-micro",
                        on ? "border-accent ring-2 ring-accent" : "border-hairline group-hover:border-hairline-strong",
                      )}
                    >
                      {/* The thumbnail is the user's document: it keeps its own direction. */}
                      <span dir="ltr" className="block">
                        <CvThumbnail
                          data={data}
                          eager={i < 4}
                          design={{ ...design, template: tpl.id, autoFit: oneP ? true : design.autoFit }}
                          onFit={(f) => setFits((m) => (m[tpl.id]?.atMinimum === f.atMinimum && m[tpl.id]?.fits === f.fits ? m : { ...m, [tpl.id]: f }))}
                        />
                      </span>
                    </span>
                    <span className="flex min-h-6 items-center gap-1.5">
                      <span className={cn("min-w-0 flex-1 truncate text-dense", on ? "font-semibold text-ink" : "font-medium text-ink-2 group-hover:text-ink")}>{t(tpl.name)}</span>
                      {tooLong && (
                        <Tooltip content={t("Too long for one page in this design")}>
                          <span tabIndex={-1}>
                            <Badge tone="warn">{t("2 pages")}</Badge>
                          </span>
                        </Tooltip>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
