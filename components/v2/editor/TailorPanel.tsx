"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Briefcase, Check, CircleDashed, History, Link2, LogIn, MessagesSquare, RotateCw, Target } from "lucide-react";
import { readSse } from "@/lib/http/readSse";
import { msg } from "@/lib/i18n/config";
import { problemTitle } from "./problemTitle";
import { useT } from "@/lib/i18n/LanguageProvider";
import { computeLocalScore, flattenProblems, type LocalProblem } from "@/lib/optimizer/localChecks";
import { completeness, type ResumeDocument } from "@/lib/resume/document";
import { coverageCounts, isAppliable, requirementRows, type TailorDetail, type TailorEvent, type TailorSummary } from "@/lib/tailor/view";
import type { ApplyVerdict } from "@/lib/knowledge";
import { applyVerdict } from "@/lib/knowledge/verdict";
import {
  Badge,
  Button,
  cn,
  DiffLine,
  EmptyState,
  ErrorState,
  Field,
  Input,
  ScoreBar,
  ScoreGauge,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  toast,
  Tooltip,
} from "@/components/ui";
import { PanelHeader } from "./PanelHeader";

// Tailor the CV to one job: paste the job, get coverage + grounded rewrites,
// apply the ones you want (saved as a version). The free local score sits on
// top so there is always something useful here, even before spending a credit.

const MIN_JD = 80;

const VERDICT: Record<ApplyVerdict, string> = {
  strong_apply: msg("Strong match. Apply now."),
  apply: msg("Good match. Apply."),
  apply_with_cover_letter: msg("Worth applying, with a strong cover letter."),
  stretch: msg("A stretch. Tailor hard first."),
  skip: msg("Not a fit as it stands."),
};

type T = ReturnType<typeof useT>["t"];

// URL scheme hint, not prose: the same in every language.
const URL_PLACEHOLDER = "https://";

type Stage = Extract<TailorEvent, { type: "stage" }>["stage"];
const STAGES: { key: Stage; label: string }[] = [
  { key: "reading", label: msg("Reading the job") },
  { key: "auditing", label: msg("Scoring the fit") },
  { key: "rewriting", label: msg("Writing changes") },
  { key: "finalizing", label: msg("Checking every fact") },
];

type View =
  | { name: "start"; error?: string; code?: string }
  | { name: "running"; stage: number; audit: { score: number; coverage: ReturnType<typeof coverageCounts> } | null }
  | { name: "result"; t: TailorDetail };

const STATUS: Record<"strong" | "partial" | "missing", { label: string; className: string }> = {
  strong: { label: msg("Strong"), className: "bg-success-wash text-success" },
  partial: { label: msg("Partial"), className: "bg-warn-wash text-warn" },
  missing: { label: msg("Missing"), className: "bg-danger-wash text-danger" },
};

function day(iso: string, lang: string) {
  return new Date(iso).toLocaleDateString(lang === "he" ? "he-IL" : "en", { month: "short", day: "numeric" });
}

/** Put this job in the tracker (once): the run, its CV and the job post go with it. */
function TrackJob({ tailoringId, jobId, onTracked }: { tailoringId: string; jobId: string | null; onTracked: (jobId: string) => void }) {
  const { t } = useT();
  const [busy, setBusy] = React.useState(false);
  if (jobId) {
    return (
      <Button asChild size="sm" variant="ghost">
        <Link href={`/jobs?job=${jobId}`}>
          <Check /> {t("In Jobs")}
        </Link>
      </Button>
    );
  }
  return (
    <Tooltip content={t("Track this application: stage, next step, cover letter.")}>
      <Button
        size="sm"
        variant="secondary"
        loading={busy}
        onClick={async () => {
          setBusy(true);
          const res = await fetch("/api/jobs", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ fromTailoringId: tailoringId }) }).catch(() => null);
          const j = res ? await res.json().catch(() => null) : null;
          setBusy(false);
          if (!res?.ok || !j?.job?.id) return toast.error(typeof j?.error === "string" ? j.error : t("Couldn't add it. Try again."));
          onTracked(j.job.id);
          toast.success(t("Added to Jobs"), { action: { label: t("Open"), onClick: () => window.location.assign(`/jobs?job=${j.job.id}`) } });
        }}
      >
        <Briefcase /> {t("Track job")}
      </Button>
    </Tooltip>
  );
}

export function TailorPanel({
  cvId,
  doc,
  signedIn,
  settle,
  adoptServer,
  onClose,
  onFix,
}: {
  cvId: string;
  doc: ResumeDocument;
  signedIn: boolean;
  settle: () => Promise<boolean>;
  adoptServer: (s: { doc: ResumeDocument; lastSeq: number }) => void;
  onClose: () => void;
  /** Act on one of the free score's problems (open its section, or ask Chat). */
  onFix: (p: LocalProblem) => void;
}) {
  const { t, dir, lang } = useT();
  const [view, setView] = React.useState<View>({ name: "start" });
  const [jd, setJd] = React.useState("");
  const [jobUrl, setJobUrl] = React.useState("");
  const [useUrl, setUseUrl] = React.useState(false);
  const [company, setCompany] = React.useState("");
  const [jobTitle, setJobTitle] = React.useState("");
  const [history, setHistory] = React.useState<TailorSummary[] | null>(null);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [applying, setApplying] = React.useState(false);
  const abortRef = React.useRef<AbortController | null>(null);

  const hasExperience = completeness(doc.content).some((i) => i.key === "experience" && i.done);
  const local = React.useMemo(() => computeLocalScore(doc.content), [doc.content]);
  const part = (c: "ats" | "impact" | "clarity") => local.categories.find((x) => x.category === c)?.score ?? null;
  // One fix per topic: two checks often flag the same gap (ats:skills and
  // completeness:skills both say "add skills"). Ids are "<check>:<topic>".
  const problems = React.useMemo(() => {
    const seen = new Set<string>();
    return flattenProblems(local)
      .filter((p) => {
        const topic = p.id.split(":")[1] ?? p.id;
        if (seen.has(topic)) return false;
        seen.add(topic);
        return true;
      })
      .slice(0, 3);
  }, [local]);

  // A job handed over from /score (pasted there before the CV existed).
  React.useEffect(() => {
    try {
      // Kept until a run starts: it must survive the sign-in round trip.
      const saved = sessionStorage.getItem(`hired:tailor-jd:${cvId}`);
      if (saved) setJd(saved);
    } catch {}
  }, [cvId]);

  const loadHistory = React.useCallback(async () => {
    if (!signedIn) return setHistory([]);
    const r = await fetch(`/api/cv/${cvId}/tailor`, { cache: "no-store" }).catch(() => null);
    setHistory(r?.ok ? ((await r.json()).tailorings as TailorSummary[]) : []);
  }, [cvId, signedIn]);
  React.useEffect(() => {
    void loadHistory();
  }, [loadHistory]);
  // Closing the panel mid-run doesn't cancel it: the server finishes, saves it to
  // the earlier checks, and charges only for that saved result.

  const showResult = (job: TailorDetail) => {
    setSelected(new Set(job.analysis.suggestions.filter((s) => isAppliable(s) && !job.appliedSuggestionIds.includes(s.id)).map((s) => s.id)));
    setView({ name: "result", t: job });
  };

  const run = async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setView({ name: "running", stage: 0, audit: null });
    try {
      sessionStorage.removeItem(`hired:tailor-jd:${cvId}`);
    } catch {}
    // The check reads the saved CV: everything typed so far goes first.
    if (!(await settle())) return setView({ name: "start", error: msg("Your latest edits aren't saved yet. Try again.") });
    let res: Response;
    try {
      res = await fetch(`/api/cv/${cvId}/tailor`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(useUrl ? { jobUrl, company, jobTitle } : { jobDescription: jd, company, jobTitle }),
        signal: ctrl.signal,
      });
    } catch {
      if (!ctrl.signal.aborted) setView({ name: "start", error: msg("Couldn't reach the server. Try again.") });
      return;
    }
    if (!res.ok || !res.body) {
      const body = await res.json().catch(() => null);
      return setView({ name: "start", error: body?.error ?? msg("The check didn't start. Try again."), code: body?.code });
    }
    let finished = false;
    await readSse<TailorEvent>(res.body, (e) => {
      if (e.type === "stage") setView((v) => (v.name === "running" ? { ...v, stage: Math.max(v.stage, STAGES.findIndex((s) => s.key === e.stage)) } : v));
      else if (e.type === "audit") setView((v) => (v.name === "running" ? { ...v, audit: { score: e.score, coverage: e.coverage } } : v));
      else if (e.type === "done") {
        finished = true;
        showResult(e.tailoring);
        void loadHistory();
      } else if (e.type === "error") {
        finished = true;
        setView({ name: "start", error: e.error, code: e.code });
      }
    }).catch(() => {});
    if (!finished && !ctrl.signal.aborted) {
      // The stream dropped: the run may still have finished and been saved.
      setView({ name: "start", error: msg("The connection dropped. If the check finished, it's in your history below.") });
      void loadHistory();
    }
  };

  const open = async (id: string) => {
    const r = await fetch(`/api/cv/${cvId}/tailor/${id}`, { cache: "no-store" }).catch(() => null);
    if (!r?.ok) return toast.error(t("Couldn't open that check."));
    showResult((await r.json()) as TailorDetail);
  };

  const apply = async (job: TailorDetail) => {
    if (selected.size === 0 || applying) return;
    setApplying(true);
    try {
      if (!(await settle())) throw new Error(msg("Your latest edits aren't saved yet. Try again."));
      const r = await fetch(`/api/cv/${cvId}/tailor/${job.id}/apply`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ suggestionIds: [...selected] }),
      });
      const body = await r.json().catch(() => null);
      if (r.status === 409) {
        setView({ name: "result", t: { ...job, applicable: false } });
        throw new Error(body?.error ?? msg("Your CV changed since this check."));
      }
      if (!r.ok) throw new Error(body?.error ?? msg("Couldn't apply the changes."));
      adoptServer({ doc: body.doc, lastSeq: body.lastSeq });
      const appliedIds = [...job.appliedSuggestionIds, ...selected];
      setView({ name: "result", t: { ...job, appliedSuggestionIds: appliedIds } });
      setSelected(new Set());
      toast.success(body.version ? t("Applied. Saved as v{n}.", { n: body.version.number }) : t("Already applied."));
      void loadHistory();
    } catch (err) {
      toast.error(t((err as Error).message));
    } finally {
      setApplying(false);
    }
  };

  const runAgain = (job: TailorDetail) => {
    setJd(job.jdText);
    setUseUrl(false);
    setCompany(job.company);
    setJobTitle(job.jobTitle);
    setView({ name: "start" });
  };

  // ── Views ──────────────────────────────────────────────────────────────────

  // The same three parts the landing page shows, then what to fix: the top fix
  // is this panel's main action, signed in or not.
  const localScore = (
    <section className="flex flex-col gap-4 border-b border-hairline p-5">
      <div className="flex items-start gap-5">
        <ScoreGauge value={local.overall} size={88} />
        <div className="flex min-w-0 flex-1 flex-col gap-2 pt-1">
          <Tooltip content={t("From your CV alone, free and instant. Tailoring scores it against a real job.")}>
            <p tabIndex={0} className="w-fit text-emph font-medium text-ink">
              {t("Before any job")}
            </p>
          </Tooltip>
          <ScoreBar label="ATS" value={part("ats")} why={t("Can screening software read it: skills, contact, structure.")} />
          <ScoreBar label={t("Impact")} value={part("impact")} why={t("Results with numbers, not duties.")} />
          <ScoreBar label={t("Clarity")} value={part("clarity")} why={t("Easy to scan in ten seconds.")} />
        </div>
      </div>
      {problems.length > 0 ? (
        <ul className="flex flex-col gap-1" aria-label={t("Fix first")}>
          {problems.map((p, i) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onFix(p)}
                className={cn(
                  "group flex min-h-11 w-full items-center gap-3 rounded-control px-3 text-start text-body transition-colors duration-micro",
                  i === 0 ? "bg-accent text-on-accent hover:bg-accent/90" : "text-ink hover:bg-surface-2",
                )}
              >
                <span aria-hidden className={cn("size-2 shrink-0 rounded-full", i === 0 ? "bg-on-accent" : p.severity === "high" ? "bg-danger" : p.severity === "medium" ? "bg-warn" : "bg-ink-3")} />
                <span className="min-w-0 flex-1">{problemTitle(p.title, t)}</span>
                <span className={cn("inline-flex shrink-0 items-center gap-1 font-medium", i === 0 ? "text-on-accent" : "text-accent-ink")}>
                  {t("Fix")} <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden />
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-body text-ink-2">{t("Nothing obvious to fix.")}</p>
      )}
    </section>
  );

  if (!signedIn) {
    return (
      <div dir={dir} className="flex h-full min-h-0 flex-col">
        <PanelHeader title={t("Tailor")} onClose={onClose} />
        {/* The free score needs no account; tailoring to a job does. */}
        <div className="min-h-0 flex-1 relative overflow-y-auto">
          {localScore}
          {/* Fixing needs no account; tailoring to a job does. */}
          <div className="flex items-center justify-between gap-3 p-5">
            <span className="flex items-center gap-2 text-body text-ink-2">
              <Target className="size-4 shrink-0" aria-hidden /> {t("Sign in to tailor")}
            </span>
            <Button asChild size="sm" variant="secondary">
              <a href={`/sign-in?redirect_url=${encodeURIComponent(`/cv/${cvId}?panel=tailor`)}`}>
                <LogIn /> {t("Sign in")}
              </a>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (view.name === "running") {
    return (
      <div dir={dir} className="flex h-full min-h-0 flex-col">
        <PanelHeader title={t("Tailor")} onClose={onClose} />
        <div className="flex flex-1 flex-col gap-6 relative overflow-y-auto p-5" aria-busy>
          <div className="flex items-center gap-5">
            <ScoreGauge value={view.audit?.score ?? null} loading={!view.audit} size={96} />
            {view.audit ? (
              <div className="flex flex-col gap-1.5 text-body">
                <span className="text-success">{t("{n} strong", { n: view.audit.coverage.strong })}</span>
                <span className="text-warn">{t("{n} partial", { n: view.audit.coverage.partial })}</span>
                <span className="text-danger">{t("{n} missing", { n: view.audit.coverage.missing })}</span>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-24" />
              </div>
            )}
          </div>
          <ol className="flex flex-col gap-3" aria-live="polite">
            {STAGES.map((s, i) => (
              <li key={s.key} className={cn("flex items-center gap-3 text-body", i < view.stage ? "text-ink-2" : i === view.stage ? "font-medium text-ink" : "text-ink-3")}>
                {i < view.stage ? <Check className="size-4 text-success" /> : <CircleDashed className={cn("size-4", i === view.stage && "animate-spin text-accent")} />}
                {t(s.label)}
              </li>
            ))}
          </ol>
          <div className="flex flex-col gap-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (view.name === "result") {
    const job = view.t;
    const a = job.analysis;
    const rows = requirementRows(a);
    const reqById = new Map(rows.map((r) => [r.id, r]));
    const appliable = a.suggestions.filter(isAppliable);
    const advice = a.suggestions.filter((s) => !isAppliable(s));
    const pending = appliable.filter((s) => !job.appliedSuggestionIds.includes(s.id));
    const original = a.scoreComparison.original;
    const title = job.company || job.jobTitle || t("This job");
    return (
      <div dir={dir} className="flex h-full min-h-0 flex-col">
        <PanelHeader
          title={title}
          onClose={onClose}
          action={
            <Button size="sm" variant="ghost" onClick={() => setView({ name: "start" })}>
              <ArrowLeft className="rtl:-scale-x-100" /> {t("New job")}
            </Button>
          }
        />
        <div className="min-h-0 flex-1 relative overflow-y-auto">
          <section className="flex flex-col gap-4 border-b border-hairline p-5">
            <div className="flex items-start gap-5">
              <ScoreGauge value={original.total} size={96} />
              <div className="flex min-w-0 flex-1 flex-col gap-2 pt-1">
                <ScoreBar label="ATS" value={original.breakdown.ats} why={t("Can screening software read it and find this job's keywords.")} />
                <ScoreBar label={t("Impact")} value={original.breakdown.impact} why={t("Results with numbers, not duties.")} />
                <ScoreBar label={t("Clarity")} value={original.breakdown.clarity} why={t("Easy to scan in ten seconds.")} />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-body font-medium text-ink">{t(VERDICT[a.applyVerdict ?? applyVerdict(original.total)])}</p>
              <span className="ms-auto flex flex-wrap items-center gap-2">
                <TrackJob tailoringId={job.id} jobId={job.jobApplicationId} onTracked={(jobId) => setView({ name: "result", t: { ...job, jobApplicationId: jobId } })} />
                <Tooltip content={t("Mock interview for this job, aimed at its weak spots.")}>
                  <Button asChild size="sm" variant="secondary">
                    <Link href={`/interview/new?cv=${cvId}&tailoring=${job.id}`}>
                      <MessagesSquare /> {t("Practice interview")}
                    </Link>
                  </Button>
                </Tooltip>
              </span>
              {a.scoreComparison.improvement > 0 && (
                <Tooltip content={t("With every grounded change applied.")}>
                  <span tabIndex={0}>
                    <Badge tone="accent">{t("Up to {n}", { n: a.scoreComparison.optimized.total })}</Badge>
                  </span>
                </Tooltip>
              )}
            </div>
            {!job.applicable && (
              <ErrorState
                title={t("Your CV changed since this check.")}
                action={
                  <Button size="sm" variant="secondary" onClick={() => runAgain(job)}>
                    <RotateCw /> {t("Run again")}
                  </Button>
                }
              />
            )}
          </section>

          <Tabs defaultValue="changes" className="flex flex-col">
            <TabsList className="px-5">
              <TabsTrigger value="changes">{t("Changes ({n})", { n: a.suggestions.length })}</TabsTrigger>
              <TabsTrigger value="requirements">{t("Requirements ({n})", { n: rows.length })}</TabsTrigger>
            </TabsList>
            <TabsContent value="changes" className="flex flex-col gap-3 p-5">
              {a.suggestions.length === 0 && <p className="text-body text-ink-2">{t("No changes needed for this job.")}</p>}
              {[...appliable, ...advice].map((s) => {
                const req = s.linkedRequirementIds.map((id) => reqById.get(id)).find(Boolean);
                const evidence = req?.evidence[0]?.quote;
                const done = job.appliedSuggestionIds.includes(s.id);
                const can = isAppliable(s) && !done && job.applicable;
                return (
                  <DiffLine
                    key={s.id}
                    before={s.before ?? undefined}
                    after={s.after}
                    requirement={req?.text}
                    evidence={evidence}
                    grounded={isAppliable(s)}
                    applied={done}
                    actions={
                      done ? (
                        <span className="inline-flex items-center gap-1.5 text-dense font-medium text-success">
                          <Check className="size-4" /> {t("Change applied")}
                        </span>
                      ) : can ? (
                        <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 px-1 text-body text-ink">
                          <input
                            type="checkbox"
                            className="size-4 accent-[rgb(var(--c-accent))]"
                            checked={selected.has(s.id)}
                            onChange={(e) =>
                              setSelected((prev) => {
                                const next = new Set(prev);
                                if (e.target.checked) next.add(s.id);
                                else next.delete(s.id);
                                return next;
                              })
                            }
                          />
                          {t("Include")}
                        </label>
                      ) : undefined
                    }
                  />
                );
              })}
            </TabsContent>
            <TabsContent value="requirements" className="p-5">
              <ul className="flex flex-col divide-y divide-hairline">
                {rows.map((r) => (
                  <li key={r.id} className="flex items-start gap-3 py-3">
                    <span className={cn("mt-0.5 inline-flex h-6 shrink-0 items-center rounded-full px-2.5 text-dense font-medium", STATUS[r.status].className)}>{t(STATUS[r.status].label)}</span>
                    <div className="min-w-0">
                      <p dir="auto" className="text-body text-ink">{r.text}</p>
                      {r.note && <p dir="auto" className="mt-1 text-body text-ink-2">{r.note}</p>}
                    </div>
                    {r.kind === "nice_to_have" && (
                      <Tooltip content={t("Nice to have, not required.")}>
                        <span tabIndex={0} className="ms-auto shrink-0">
                          <Badge tone="neutral">{t("Bonus")}</Badge>
                        </span>
                      </Tooltip>
                    )}
                  </li>
                ))}
              </ul>
            </TabsContent>
          </Tabs>
        </div>
        {job.applicable && pending.length > 0 && (
          <div className="flex shrink-0 items-center justify-between gap-3 border-t border-hairline bg-surface px-4 py-3">
            <Button variant="ghost" size="sm" onClick={() => setSelected(selected.size === pending.length ? new Set() : new Set(pending.map((s) => s.id)))}>
              {selected.size === pending.length ? t("Clear") : t("Select all")}
            </Button>
            <Button size="lg" variant="primary" disabled={selected.size === 0} loading={applying} onClick={() => void apply(job)}>
              <Check /> {selected.size === 1 ? t("Apply 1 change") : t("Apply {n} changes", { n: selected.size })}
            </Button>
          </div>
        )}
      </div>
    );
  }

  // start
  const ready = useUrl ? /^https?:\/\/\S+\.\S+/.test(jobUrl.trim()) : jd.trim().length >= MIN_JD;
  return (
    <div dir={dir} className="flex h-full min-h-0 flex-col">
      <PanelHeader title={t("Tailor")} onClose={onClose} />
      <div className="min-h-0 flex-1 relative overflow-y-auto">
        {localScore}

        {!hasExperience ? (
          <EmptyState icon={<Target />} title={t("Add your experience first")} />
        ) : (
          <form
            className="flex flex-col gap-4 p-5"
            onSubmit={(e) => {
              e.preventDefault();
              if (ready) void run();
            }}
          >
            {view.error && (
              <ErrorState
                title={t(view.error)}
                action={
                  view.code === "NO_CREDITS" ? (
                    <Button asChild size="sm" variant="primary">
                      <Link href="/pricing">{t("Add credits")}</Link>
                    </Button>
                  ) : undefined
                }
              />
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label={t("Company")} optional>
                <Input value={company} onChange={(e) => setCompany(e.target.value)} maxLength={200} autoComplete="off" />
              </Field>
              <Field label={t("Job title")} optional>
                <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} maxLength={200} autoComplete="off" />
              </Field>
            </div>
            {useUrl ? (
              <Field label={t("Job link")} hint={t("Most job boards work. LinkedIn blocks it: paste the text instead.")}>
                <Input type="url" inputMode="url" value={jobUrl} onChange={(e) => setJobUrl(e.target.value)} placeholder={URL_PLACEHOLDER} dir="ltr" />
              </Field>
            ) : (
              <Field label={t("Job description")}>
                <Textarea rows={9} dir="auto" value={jd} onChange={(e) => setJd(e.target.value)} maxLength={30_000} className="min-h-48" />
              </Field>
            )}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setUseUrl((u) => !u)}>
                <Link2 /> {useUrl ? t("Paste the text instead") : t("Use a link instead")}
              </Button>
              <Button type="submit" size="lg" variant="primary" disabled={!ready}>
                <Target /> {t("Tailor · 1 credit")}
              </Button>
            </div>
          </form>
        )}

        {history === null ? (
          <div className="flex flex-col gap-2 px-5 pb-5">
            <Skeleton className="h-12 w-full" />
          </div>
        ) : history.length > 0 ? (
          <section aria-labelledby="tailor-history" className="border-t border-hairline px-5 py-4">
            <h3 id="tailor-history" className="mb-2 flex items-center gap-2 text-body font-medium text-ink-2">
              <History className="size-4" /> {t("Earlier checks")}
            </h3>
            <ul className="flex flex-col">
              {history.map((h) => (
                <li key={h.id}>
                  <button
                    type="button"
                    onClick={() => void open(h.id)}
                    className="flex min-h-11 w-full items-center gap-3 rounded-control px-2 text-start hover:bg-surface-2"
                  >
                    <span dir="auto" className="min-w-0 flex-1 truncate text-body text-ink">{h.company || h.jobTitle || t("A job")}</span>
                    {h.applied > 0 && <Check className="size-4 shrink-0 text-success" aria-label={t("Changes applied")} />}
                    <span className="tabular shrink-0 text-body text-ink-2">{h.scoreOriginal}</span>
                    <span className="shrink-0 text-dense text-ink-3">{day(h.createdAt, lang)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}
