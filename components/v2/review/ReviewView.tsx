"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Briefcase, Check, CircleAlert, CircleCheck, CircleDot, Palette, RotateCw } from "lucide-react";
import { Badge, Button, buttonVariants, cn, ErrorState, ScoreBar, ScoreGauge, Segmented, Skeleton, Tooltip } from "@/components/ui";
import { CvThumbnail } from "@/components/v2/cv/CvThumbnail";
import { PageTitle } from "@/components/ui/page-title";
import { useT } from "@/lib/i18n/LanguageProvider";
import { msg } from "@/lib/i18n/config";
import { originalUrl } from "@/lib/import/originalFile";
import type { ApplyVerdict } from "@/lib/knowledge/verdict";
import type { CoverageStatus } from "@/lib/optimizer/types";
import type { CvTarget, ResumeDocument } from "@/lib/resume/document";
import { toTemplateData } from "@/lib/resume/view";
import { fetchReview, runReview, saveTarget } from "@/lib/review/client";
import type { CvReadout, ReadoutSection } from "@/lib/review/view";
import { TargetForm } from "./TargetForm";

// The first screen after an upload: how this CV reads for the job it's aimed
// at, before anything is changed. The design it came with sits beside it,
// kept; switching is offered, never done for them.

const VERDICT: Record<ApplyVerdict, string> = {
  strong_apply: msg("Strong match. Apply now."),
  apply: msg("Good match. Apply."),
  apply_with_cover_letter: msg("Worth applying, with a strong cover letter."),
  stretch: msg("A stretch. Tailor hard first."),
  skip: msg("Not a fit as it stands."),
};

const SECTION_LABEL: Record<ReadoutSection["key"], string> = {
  overall: msg("Overall"),
  summary: msg("Summary"),
  experience: msg("Experience"),
  projects: msg("Projects"),
  education: msg("Education"),
  skills: msg("Skills"),
};

const STATUS: Record<CoverageStatus, { icon: React.ReactNode; label: string }> = {
  strong: { icon: <CircleCheck className="size-5 text-success" aria-hidden />, label: msg("Covered") },
  partial: { icon: <CircleDot className="size-5 text-warn" aria-hidden />, label: msg("Partly covered") },
  missing: { icon: <CircleAlert className="size-5 text-danger" aria-hidden />, label: msg("Missing") },
};

const LAYOUT_LABEL: Record<string, string> = {
  "sidebar-left-dark": msg("Coloured sidebar"),
  "sidebar-left-light": msg("Sidebar"),
  "sidebar-right": msg("Sidebar"),
  band: msg("Coloured header"),
  columns: msg("Two columns"),
  "single-serif": msg("Classic serif"),
  "single-mono": msg("Monospace"),
  "single-sans": msg("Single column"),
};

type State =
  | { kind: "loading" }
  | { kind: "reading"; stale: CvReadout | null }
  | { kind: "ready"; readout: CvReadout }
  | { kind: "error"; message: string };

function Section({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("flex flex-col gap-4", className)}>
      <h2 className="text-h3 font-semibold text-ink">{title}</h2>
      {children}
    </section>
  );
}

function ReadingSkeleton() {
  return (
    <div className="flex flex-col gap-10" aria-hidden>
      <div className="flex flex-wrap items-center gap-8 rounded-panel border border-hairline bg-surface p-6 shadow-card">
        <Skeleton className="size-28 !rounded-full" />
        <div className="flex min-w-[220px] flex-1 flex-col gap-3">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
      {[0, 1].map((i) => (
        <div key={i} className="flex flex-col gap-3">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      ))}
    </div>
  );
}

export function ReviewView({ id, doc }: { id: string; doc: ResumeDocument }) {
  const { t, dir } = useT();
  const [target, setTarget] = React.useState<CvTarget | undefined>(doc.target);
  const [state, setState] = React.useState<State>({ kind: "loading" });
  const [editing, setEditing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [showAll, setShowAll] = React.useState(false);
  const [view, setView] = React.useState<"hired" | "original">("hired");
  const [original, setOriginal] = React.useState<string | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);
  const data = React.useMemo(() => toTemplateData(doc.content, { placeholderName: t("Your Name") }), [doc.content, t]);

  const read = React.useCallback(
    async (stale: CvReadout | null) => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setState({ kind: "reading", stale });
      try {
        setState({ kind: "ready", readout: await runReview(id, ctrl.signal) });
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setState({ kind: "error", message: (err as Error).message });
      }
    },
    [id],
  );

  React.useEffect(() => {
    setOriginal(originalUrl(id));
    let live = true;
    fetchReview(id)
      .then(({ readout, current }) => {
        if (!live) return;
        if (readout && current) setState({ kind: "ready", readout });
        else void read(readout);
      })
      .catch(() => live && void read(null));
    return () => {
      live = false;
      abortRef.current?.abort();
    };
  }, [id, read]);

  const changeTarget = async (next: CvTarget | undefined) => {
    setSaving(true);
    try {
      await saveTarget(id, next);
      setTarget(next);
      setEditing(false);
      void read(state.kind === "ready" ? state.readout : null);
    } catch (err) {
      setState({ kind: "error", message: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const readout = state.kind === "ready" ? state.readout : null;
  const requirements = readout?.requirements ?? [];
  const shown = showAll ? requirements : requirements.slice(0, 6);
  const kept = doc.original;

  return (
    <div dir={dir} className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 gap-10 px-4 py-8 md:px-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:py-12">
      <main className="flex min-w-0 flex-col gap-10">
        <header className="flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <PageTitle>{t("Your CV, read")}</PageTitle>
            <Link href={`/cv/${id}?panel=tailor`} className={buttonVariants({ variant: "primary", size: "lg" })}>
              {t("Fix it in the editor")} <ArrowRight className="rtl:rotate-180" />
            </Link>
          </div>
          {editing ? (
            <div className="max-w-xl rounded-panel border border-hairline bg-surface p-5 shadow-card">
              <TargetForm initial={target} submitLabel={t("Read again")} onSubmit={(next) => void changeTarget(next)} busy={saving} idPrefix="review-target" />
              <Button variant="ghost" className="mt-2" onClick={() => setEditing(false)} disabled={saving}>
                {t("Cancel")}
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2 text-emph text-ink-2">
              <Briefcase className="size-5 shrink-0" aria-hidden />
              {target?.title ? (
                <span>
                  {t("For")} <span dir="auto" className="font-medium text-ink">{target.title}</span>
                  {target.description && <Badge className="ms-2">{t("With the job ad")}</Badge>}
                </span>
              ) : target?.description ? (
                <span>{t("For the job ad you pasted")}</span>
              ) : (
                <span>{t("No job picked")}</span>
              )}
              <Button variant="link" className="ms-1" onClick={() => setEditing(true)} disabled={state.kind === "reading"}>
                {target ? t("Change") : t("Pick a job")}
              </Button>
            </div>
          )}
        </header>

        {state.kind === "error" && (
          <ErrorState
            title={t(state.message)}
            action={
              <Button size="sm" onClick={() => void read(null)}>
                <RotateCw /> {t("Try again")}
              </Button>
            }
          />
        )}

        {(state.kind === "loading" || state.kind === "reading") && (
          <div className="flex flex-col gap-6" aria-live="polite" aria-busy>
            <p className="flex items-center gap-2 text-emph text-ink-2">
              <span className="size-2 animate-pulse rounded-full bg-accent" aria-hidden />
              {target?.title ? t("Reading it as a recruiter hiring a {title} would", { title: target.title }) : t("Reading it as a recruiter would")}
            </p>
            <ReadingSkeleton />
          </div>
        )}

        {readout && (
          <>
            <div className="flex flex-wrap items-center gap-8 rounded-panel border border-hairline bg-surface p-6 shadow-card animate-fade-in">
              <ScoreGauge value={readout.score.total} />
              {/* The bars need 220px: on a phone they wrap under the ring instead of pushing the page wider. */}
              <div className="flex min-w-[220px] flex-1 flex-col gap-4">
                <p className="text-emph font-semibold text-ink">{t(VERDICT[readout.verdict])}</p>
                <div className="flex flex-col gap-2">
                  <ScoreBar label={t("ATS")} value={readout.score.breakdown.ats} why={t("How well an applicant tracking system can read and match it.")} />
                  <ScoreBar label={t("Impact")} value={readout.score.breakdown.impact} why={t("Results and numbers, not duties.")} />
                  <ScoreBar label={t("Clarity")} value={readout.score.breakdown.clarity} why={t("How fast a recruiter gets it.")} />
                </div>
              </div>
            </div>
            {readout.summary && (
              <p dir="auto" className="-mt-4 max-w-prose text-emph text-ink">
                {readout.summary}
              </p>
            )}

            {readout.strengths.length > 0 && (
              <Section title={t("What's working")}>
                <ul className="flex flex-col gap-3">
                  {readout.strengths.map((s, i) => (
                    <li key={i} className="flex gap-3 text-body text-ink">
                      <Check className="mt-0.5 size-5 shrink-0 text-success" aria-hidden />
                      <span dir="auto">{s}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {requirements.length > 0 && (
              <Section title={readout.targetTitle ? t("What a {title} needs", { title: readout.targetTitle }) : t("What the role needs")}>
                <ul className="flex flex-col divide-y divide-hairline rounded-panel border border-hairline bg-surface shadow-card">
                  {shown.map((r, i) => (
                    <li key={i} className="flex gap-3 p-4">
                      <Tooltip content={t(STATUS[r.status].label)}>
                        <span className="mt-0.5 shrink-0" tabIndex={0} aria-label={t(STATUS[r.status].label)}>
                          {STATUS[r.status].icon}
                        </span>
                      </Tooltip>
                      <div className="flex min-w-0 flex-col gap-1.5">
                        <p dir="auto" className="text-body font-medium text-ink">
                          {r.text}
                          {r.kind === "must_have" && <Badge tone="outline" className="ms-2 align-middle">{t("Must-have")}</Badge>}
                        </p>
                        {r.quote ? (
                          <blockquote dir="auto" className="border-s-2 border-hairline-strong ps-3 text-body text-ink-2">
                            “{r.quote}”
                          </blockquote>
                        ) : (
                          r.note && <p dir="auto" className="text-body text-ink-2">{r.note}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
                {requirements.length > shown.length && (
                  <Button variant="ghost" className="w-fit" onClick={() => setShowAll(true)}>
                    {t("Show all {n}", { n: requirements.length })}
                  </Button>
                )}
              </Section>
            )}

            {readout.sections.length > 0 && (
              <Section title={t("Section by section")}>
                <div className="flex flex-col gap-3">
                  {readout.sections.map((s, i) => (
                    <details key={i} open={i < 2} className="group rounded-panel border border-hairline bg-surface shadow-card">
                      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-emph font-medium text-ink [&::-webkit-details-marker]:hidden">
                        <span className="min-w-0 truncate">
                          {t(SECTION_LABEL[s.key])}
                          {/* The role is the CV's own words: isolated, so an English role never runs into a Hebrew label. */}
                          {s.entry && <span className="font-normal text-ink-2"> · <bdi>{s.entry}</bdi></span>}
                        </span>
                        {s.issues.length > 0 && <Badge tone="warn">{s.issues.length}</Badge>}
                      </summary>
                      <div className="flex flex-col gap-3 border-t border-hairline px-4 py-4">
                        {s.verdict && <p dir="auto" className="text-body text-ink">{s.verdict}</p>}
                        {s.issues.length > 0 && (
                          <ul className="flex list-disc flex-col gap-1.5 ps-5 text-body text-ink-2">
                            {s.issues.map((x, j) => (
                              <li key={j} dir="auto">{x}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </details>
                  ))}
                </div>
              </Section>
            )}

            {readout.fixes.length > 0 && (
              <Section title={t("Fix first")}>
                <ol className="flex flex-col gap-3">
                  {readout.fixes.slice(0, 3).map((f, i) => (
                    <li key={i} className="flex gap-3 text-body text-ink">
                      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent-wash text-dense font-semibold text-accent-ink">{i + 1}</span>
                      <span dir="auto">{f.text}</span>
                    </li>
                  ))}
                </ol>
                <Link href={`/cv/${id}?panel=tailor`} className={cn(buttonVariants({ variant: "primary", size: "lg" }), "mt-2 w-fit")}>
                  {t("Fix it in the editor")} <ArrowRight className="rtl:rotate-180" />
                </Link>
              </Section>
            )}
          </>
        )}
      </main>

      <aside className="flex flex-col gap-4 lg:sticky lg:top-12 lg:self-start">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-h3 font-semibold text-ink">{kept ? t("Your design, kept") : t("Your design")}</h2>
        </div>
        {original && (
          <Segmented
            value={view}
            onChange={setView}
            options={[
              { value: "hired", label: t("In Hired") },
              { value: "original", label: t("Your file") },
            ]}
            aria-label={t("Which version")}
          />
        )}
        <div className="overflow-hidden rounded-card border border-hairline bg-surface shadow-card">
          {view === "original" && original ? (
            <object data={`${original}#toolbar=0&navpanes=0&view=FitH`} type="application/pdf" className="aspect-[210/297] w-full" aria-label={t("Your file")}>
              <p className="p-4 text-body text-ink-2">{t("Your browser can't show the file here.")}</p>
            </object>
          ) : (
            <CvThumbnail data={data} design={doc.design} eager />
          )}
        </div>
        {kept && (
          <ul className="flex flex-wrap gap-2" aria-label={t("Kept from your file")}>
            {LAYOUT_LABEL[kept.layout] && <Badge>{t(LAYOUT_LABEL[kept.layout])}</Badge>}
            {kept.photo && <Badge>{t("Photo")}</Badge>}
            {data.headings || doc.content.sectionOrder ? <Badge>{t("Your section order")}</Badge> : null}
          </ul>
        )}
        <Link href={`/cv/${id}?panel=design`} className={cn(buttonVariants({ variant: "secondary" }), "w-fit")}>
          <Palette /> {t("Try another design")}
        </Link>
      </aside>
    </div>
  );
}
