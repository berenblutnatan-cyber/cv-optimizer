"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { THEME_COLOR_VALUES, type ThemeColor } from "@/lib/design/accents";
import { DESIGN_COLORS } from "@/lib/chat/cvTools";
import { TEMPLATE_LIST } from "@/lib/templates/registry";
import type { DesignTemplate, ResumeDocument } from "@/lib/resume/document";
import { toTemplateData } from "@/lib/resume/view";
import { Badge, cn, Segmented, Tooltip } from "@/components/ui";
import { CvThumbnail, type ThumbFit } from "@/components/v2/cv/CvThumbnail";
import { PanelHeader } from "./PanelHeader";

type Apply = (name: string, input: Record<string, unknown>, key?: string) => boolean;

/** Accent, page length and all 18 templates, each drawn with this CV's content. */
export function DesignPanel({ doc, apply, onClose }: { doc: ResumeDocument; apply: Apply; onClose: () => void }) {
  const data = React.useMemo(() => toTemplateData(doc.content), [doc.content]);
  const [fits, setFits] = React.useState<Record<string, ThumbFit>>({});
  const { design } = doc;
  const oneP = design.pageMode === "one";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PanelHeader title="Design" onClose={onClose} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <section className="border-b border-hairline px-4 py-4" aria-labelledby="design-accent">
          <h3 id="design-accent" className="mb-3 text-dense font-medium text-ink-2">
            Accent
          </h3>
          <div className="flex flex-wrap gap-3" role="radiogroup" aria-labelledby="design-accent">
            {DESIGN_COLORS.map((c) => {
              const on = design.accentColor === c;
              return (
                <Tooltip key={c} content={c[0].toUpperCase() + c.slice(1)}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={on}
                    aria-label={c}
                    onClick={() => apply("set_design", { accentColor: c })}
                    className={cn(
                      // 32px swatch, 44px tap target (the ::after extends the hit area).
                      "relative grid size-8 place-items-center rounded-full text-white shadow-[inset_0_0_0_1px_rgb(var(--c-hairline-strong))] ring-offset-2 ring-offset-surface transition-shadow duration-micro after:absolute after:-inset-1.5 after:content-['']",
                      on ? "ring-2 ring-ink" : "hover:ring-2 hover:ring-hairline-strong",
                    )}
                    style={{ background: THEME_COLOR_VALUES[c as ThemeColor].primary }}
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
            Length
          </h3>
          <Segmented
            aria-label="Page length"
            size="sm"
            value={design.pageMode}
            onChange={(v) => apply("set_design", { pageMode: v, ...(v === "one" ? { autoFit: true } : {}) })}
            options={[
              { value: "one", label: "One page" },
              { value: "multi", label: "Multi-page" },
            ]}
          />
        </section>

        <section className="px-4 pb-6 pt-4" aria-labelledby="design-template">
          <h3 id="design-template" className="mb-3 text-dense font-medium text-ink-2">
            Template
          </h3>
          <ul className="grid grid-cols-2 gap-x-3 gap-y-4" role="radiogroup" aria-labelledby="design-template">
            {TEMPLATE_LIST.map((t, i) => {
              const on = design.template === t.id;
              const tooLong = oneP && fits[t.id]?.atMinimum;
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={on}
                    aria-label={`${t.name}${tooLong ? ", longer than one page" : ""}`}
                    onClick={() => apply("set_design", { template: t.id as DesignTemplate })}
                    className="group flex w-full flex-col gap-2 rounded-card text-start"
                  >
                    <span
                      className={cn(
                        "block overflow-hidden rounded-control border transition-[border-color,box-shadow] duration-micro",
                        on ? "border-accent ring-2 ring-accent" : "border-hairline group-hover:border-hairline-strong",
                      )}
                    >
                      <CvThumbnail
                        data={data}
                        eager={i < 4}
                        design={{ ...design, template: t.id, autoFit: oneP ? true : design.autoFit }}
                        onFit={(f) => setFits((m) => (m[t.id]?.atMinimum === f.atMinimum && m[t.id]?.fits === f.fits ? m : { ...m, [t.id]: f }))}
                      />
                    </span>
                    <span className="flex min-h-6 items-center gap-1.5">
                      <span className={cn("min-w-0 flex-1 truncate text-dense", on ? "font-semibold text-ink" : "font-medium text-ink-2 group-hover:text-ink")}>{t.name}</span>
                      {tooLong && (
                        <Tooltip content="Too long for one page in this design">
                          <span tabIndex={-1}>
                            <Badge tone="warn">2 pages</Badge>
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
