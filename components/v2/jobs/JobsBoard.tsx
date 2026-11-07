"use client";

import { PageTitle } from "@/components/ui/page-title";
import * as React from "react";
import { Briefcase, LayoutGrid, MoreHorizontal, Plus, Rows3 } from "lucide-react";
import { useT } from "@/lib/i18n/LanguageProvider";
import { isDue, JOB_STAGES, STAGE_LABEL, type JobStage, type JobSummary } from "@/lib/jobs/types";
import {
  Badge,
  Button,
  cn,
  Dialog,
  DialogClose,
  DialogContent,
  EmptyState,
  ErrorState,
  Field,
  IconButton,
  Input,
  Menu,
  MenuContent,
  MenuItem,
  MenuTrigger,
  Segmented,
  Select,
  Textarea,
  toast,
  Tooltip,
} from "@/components/ui";
import { RelativeTime } from "@/components/v2/cv/RelativeTime";
import { JobDrawer } from "./JobDrawer";

// Every application in one place: a table (default) or a board by stage.
// A row or card opens the job's drawer; the board moves jobs by drag or by
// each card's menu (keyboard and touch). Stage changes are optimistic.

type View = "table" | "board";
type Cv = { id: string; title: string };
/** A URL prefix reads the same in every language. */
const URL_HINT = "https://";

const TONE: Record<JobStage, "neutral" | "accent" | "success" | "outline"> = {
  BOOKMARKED: "neutral",
  APPLIED: "accent",
  INTERVIEWING: "accent",
  OFFER: "success",
  REJECTED: "outline",
};

function useDesktop() {
  const [desktop, setDesktop] = React.useState(true);
  React.useEffect(() => {
    const m = window.matchMedia("(min-width: 768px)");
    const on = () => setDesktop(m.matches);
    on();
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return desktop;
}

function NextStep({ job }: { job: JobSummary }) {
  const { t, lang } = useT();
  if (!job.nextStep && !job.nextStepAt) return <span className="text-ink-3">–</span>;
  const due = isDue(job.nextStepAt);
  return (
    <span className={cn("flex min-w-0 max-w-full items-center gap-1.5", due ? "text-warn" : "text-ink-2")}>
      {due && <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-warn" />}
      <span className="truncate">{job.nextStep || t("Next step")}</span>
      {job.nextStepAt && <span className="shrink-0 tabular">· {new Date(job.nextStepAt).toLocaleDateString(lang === "he" ? "he-IL" : "en", { month: "short", day: "numeric" })}</span>}
      {due && <span className="sr-only">{t("(due)")}</span>}
    </span>
  );
}

function AddJobDialog({ open, onOpenChange, cvs, onAdded }: { open: boolean; onOpenChange: (o: boolean) => void; cvs: Cv[]; onAdded: (j: JobSummary) => void }) {
  const { t, dir } = useT();
  const [title, setTitle] = React.useState("");
  const [company, setCompany] = React.useState("");
  const [url, setUrl] = React.useState("");
  const [resumeId, setResumeId] = React.useState(cvs[0]?.id ?? "");
  const [jd, setJd] = React.useState("");
  const [showJd, setShowJd] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setTitle("");
    setCompany("");
    setUrl("");
    setJd("");
    setShowJd(false);
    setError(null);
    setResumeId(cvs[0]?.id ?? "");
  }, [open, cvs]);

  const submit = async () => {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/jobs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title, company, url: url || null, resumeId: resumeId || null, jdText: jd || null }),
    }).catch(() => null);
    const j = res ? await res.json().catch(() => null) : null;
    setBusy(false);
    if (!res?.ok) return setError(typeof j?.error === "string" ? j.error : t("Couldn't add it. Try again."));
    onAdded(j.job as JobSummary);
    onOpenChange(false);
  };

  const ready = title.trim() && company.trim();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={t("Add job")}
        footer={
          <>
            <DialogClose asChild>
              <Button variant="ghost">{t("Cancel")}</Button>
            </DialogClose>
            <Button variant="primary" type="submit" form="add-job" loading={busy} disabled={!ready}>
              {t("Add")}
            </Button>
          </>
        }
      >
        <form
          id="add-job"
          dir={dir}
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (ready && !busy) void submit();
          }}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t("Role")}>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} autoFocus />
            </Field>
            <Field label={t("Company")}>
              <Input value={company} onChange={(e) => setCompany(e.target.value)} maxLength={200} />
            </Field>
          </div>
          <Field label={t("Link")} optional>
            <Input type="url" inputMode="url" dir="ltr" value={url} onChange={(e) => setUrl(e.target.value)} maxLength={2000} placeholder={URL_HINT} />
          </Field>
          {cvs.length > 0 && (
            <Field label={t("CV")}>
              <Select value={resumeId} onChange={(e) => setResumeId(e.target.value)}>
                <option value="">{t("None")}</option>
                {cvs.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          {showJd ? (
            <Field label={t("Job description")} optional>
              <Textarea rows={6} value={jd} onChange={(e) => setJd(e.target.value)} maxLength={20000} placeholder={t("Paste the job post")} autoFocus />
            </Field>
          ) : (
            <Button type="button" variant="ghost" className="-ms-2 w-fit" onClick={() => setShowJd(true)}>
              <Plus /> {t("Job description")}
            </Button>
          )}
          {error && <ErrorState title={error} />}
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MoveMenu({ job, onMove }: { job: JobSummary; onMove: (stage: JobStage) => void }) {
  const { t, dir } = useT();
  return (
    <Menu dir={dir}>
      <MenuTrigger asChild>
        <IconButton label={t("Move {title}", { title: job.title || t("Untitled job") })} size="md" onClick={(e) => e.stopPropagation()}>
          <MoreHorizontal />
        </IconButton>
      </MenuTrigger>
      <MenuContent>
        {JOB_STAGES.filter((s) => s !== job.stage).map((s) => (
          <MenuItem key={s} onSelect={() => onMove(s)}>
            {t("Move to {stage}", { stage: t(STAGE_LABEL[s]) })}
          </MenuItem>
        ))}
      </MenuContent>
    </Menu>
  );
}

function Board({ jobs, onOpen, onMove }: { jobs: JobSummary[]; onOpen: (id: string) => void; onMove: (id: string, stage: JobStage) => void }) {
  const { t } = useT();
  const [over, setOver] = React.useState<JobStage | null>(null);
  // The card being carried leaves a ghost behind; the one just moved lands in its new column.
  const [dragging, setDragging] = React.useState<string | null>(null);
  const [landed, setLanded] = React.useState<string | null>(null);
  const move = (id: string, stage: JobStage) => {
    setLanded(id);
    onMove(id, stage);
  };
  return (
    <div className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto relative px-4 pb-4 md:mx-0 md:grid md:grid-cols-5 md:overflow-visible md:px-0">
      {JOB_STAGES.map((stage) => {
        const col = jobs.filter((j) => j.stage === stage);
        return (
          <section
            key={stage}
            aria-label={t(STAGE_LABEL[stage])}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(stage);
            }}
            onDragLeave={() => setOver((o) => (o === stage ? null : o))}
            onDrop={(e) => {
              e.preventDefault();
              setOver(null);
              const id = e.dataTransfer.getData("text/job");
              if (id && jobs.find((j) => j.id === id)?.stage !== stage) move(id, stage);
            }}
            className={cn(
              "flex w-[78vw] max-w-72 shrink-0 snap-start flex-col gap-2 rounded-panel border p-2 transition-colors duration-micro md:w-auto md:max-w-none",
              over === stage ? "border-accent bg-accent-wash/40" : "border-transparent bg-surface-2/60",
            )}
          >
            <h2 className="flex items-center justify-between px-2 pb-1 pt-1.5 text-body font-medium text-ink">
              {t(STAGE_LABEL[stage])}
              <span className="tabular text-ink-3">{col.length}</span>
            </h2>
            {col.map((j) => (
              <article
                key={j.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/job", j.id);
                  e.dataTransfer.effectAllowed = "move";
                  setDragging(j.id);
                }}
                onDragEnd={() => setDragging(null)}
                onAnimationEnd={() => setLanded((l) => (l === j.id ? null : l))}
                className={cn(
                  "group relative flex cursor-grab flex-col gap-1.5 rounded-card border border-hairline bg-surface p-3 shadow-card transition-[box-shadow,opacity,transform] duration-micro hover:shadow-pop active:cursor-grabbing",
                  dragging === j.id && "scale-[0.98] border-dashed opacity-40 shadow-none",
                  landed === j.id && "card-land",
                )}
              >
                <button type="button" onClick={() => onOpen(j.id)} className="flex flex-col gap-0.5 pe-9 text-start after:absolute after:inset-0 after:rounded-card">
                  <span className="line-clamp-2 text-body font-medium text-ink">{j.title || t("Untitled job")}</span>
                  <span className="truncate text-body text-ink-2">{j.company}</span>
                </button>
                {(j.nextStep || j.nextStepAt) && (
                  <div className="min-w-0 text-body">
                    <NextStep job={j} />
                  </div>
                )}
                <div className="absolute end-1.5 top-1.5 z-10">
                  <MoveMenu job={j} onMove={(s) => move(j.id, s)} />
                </div>
              </article>
            ))}
          </section>
        );
      })}
    </div>
  );
}

function Table({ jobs, onOpen }: { jobs: JobSummary[]; onOpen: (id: string) => void }) {
  const { t } = useT();
  return (
    <>
      {/* Phone: a list. The table needs more width than a phone has. */}
      <ul className="flex flex-col overflow-hidden rounded-panel border border-hairline bg-surface md:hidden">
        {jobs.map((j) => (
          <li key={j.id} className="border-b border-hairline last:border-b-0">
            <button type="button" onClick={() => onOpen(j.id)} className="flex w-full flex-col gap-1 px-4 py-3 text-start hover:bg-surface-2/60">
              <span className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-body font-medium text-ink">{j.title || t("Untitled job")}</span>
                <Badge tone={TONE[j.stage]}>{t(STAGE_LABEL[j.stage])}</Badge>
              </span>
              <span className="truncate text-body text-ink-2">{j.company}</span>
              {(j.nextStep || j.nextStepAt) && (
                <span className="block min-w-0 text-body">
                  <NextStep job={j} />
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-hidden rounded-panel border border-hairline bg-surface md:block">
        <table className="w-full table-fixed text-body">
          <thead>
            <tr className="border-b border-hairline text-start text-ink-2">
              <th scope="col" className="w-[30%] px-4 py-3 text-start font-medium">
                {t("Role")}
              </th>
              <th scope="col" className="w-[14%] px-3 py-3 text-start font-medium">
                {t("Stage")}
              </th>
              <th scope="col" className="w-[16%] px-3 py-3 text-start font-medium">
                {t("CV")}
              </th>
              <th scope="col" className="w-[8%] px-3 py-3 text-start font-medium">
                <Tooltip content={t("Fit at the last tailoring check for this job.")}>
                  <span tabIndex={0}>{t("Fit")}</span>
                </Tooltip>
              </th>
              <th scope="col" className="w-[20%] px-3 py-3 text-start font-medium">
                {t("Next step")}
              </th>
              <th scope="col" className="w-[12%] px-4 py-3 text-end font-medium">
                {t("Updated")}
              </th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((j) => (
              <tr key={j.id} className="group cursor-pointer border-b border-hairline transition-colors duration-micro last:border-b-0 hover:bg-surface-2/60" onClick={() => onOpen(j.id)}>
                <td className="px-4 py-3">
                  {/* The row's real control: keyboard and screen readers open the job here. */}
                  <button type="button" onClick={(e) => (e.stopPropagation(), onOpen(j.id))} className="block w-full min-w-0 text-start">
                    <span className="block truncate font-medium text-ink">{j.title || t("Untitled job")}</span>
                    <span className="block truncate text-ink-2">{j.company}</span>
                  </button>
                </td>
                <td className="px-3 py-3">
                  <Badge tone={TONE[j.stage]}>{t(STAGE_LABEL[j.stage])}</Badge>
                </td>
                <td className="truncate px-3 py-3 text-ink-2">{j.resumeTitle === null ? <span className="text-ink-3">–</span> : j.resumeTitle || t("Untitled CV")}</td>
                <td className="tabular px-3 py-3 font-medium text-ink">{j.score ?? <span className="font-normal text-ink-3">–</span>}</td>
                <td className="px-3 py-3">
                  <NextStep job={j} />
                </td>
                <td className="px-4 py-3 text-end text-ink-2">
                  <RelativeTime iso={j.updatedAt} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function JobsBoard({ initialJobs, cvs, openId }: { initialJobs: JobSummary[]; cvs: Cv[]; openId: string | null }) {
  const [jobs, setJobs] = React.useState(initialJobs);
  const [view, setViewState] = React.useState<View>("table");
  const [open, setOpenState] = React.useState<string | null>(openId);
  const [adding, setAdding] = React.useState(false);
  const desktop = useDesktop();
  const { t } = useT();

  React.useEffect(() => {
    try {
      const v = localStorage.getItem("hired:jobs-view");
      if (v === "board" || v === "table") setViewState(v);
    } catch {}
  }, []);
  const setView = (v: View) => {
    setViewState(v);
    try {
      localStorage.setItem("hired:jobs-view", v);
    } catch {}
  };

  // The open job lives in the URL, so a link (or a refresh) lands on it.
  const setOpen = React.useCallback((id: string | null) => {
    setOpenState(id);
    const u = new URL(window.location.href);
    if (id) u.searchParams.set("job", id);
    else u.searchParams.delete("job");
    window.history.replaceState(null, "", u.toString());
  }, []);

  const upsert = React.useCallback((j: JobSummary) => setJobs((all) => [j, ...all.filter((x) => x.id !== j.id)]), []);

  const move = async (id: string, stage: JobStage) => {
    const before = jobs;
    const job = jobs.find((j) => j.id === id);
    if (!job || job.stage === stage) return;
    setJobs((all) => all.map((j) => (j.id === id ? { ...j, stage } : j)));
    const res = await fetch(`/api/jobs/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ stage }) }).catch(() => null);
    if (!res?.ok) {
      setJobs(before);
      return toast.error(t("Couldn't move it. Try again."));
    }
    upsert((await res.json()).job as JobSummary);
  };

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <PageTitle>{t("Jobs")}</PageTitle>
        {jobs.length > 0 && (
          <div className="flex items-center gap-2">
            <Segmented
              aria-label={t("View")}
              value={view}
              onChange={setView}
              options={[
                { value: "table", label: t("Table"), icon: <Rows3 /> },
                { value: "board", label: t("Board"), icon: <LayoutGrid /> },
              ]}
            />
            <Button variant="primary" onClick={() => setAdding(true)}>
              <Plus /> {t("Add job")}
            </Button>
          </div>
        )}
      </div>

      {jobs.length === 0 ? (
        <div className="rounded-panel border border-hairline bg-surface">
          <EmptyState
            icon={<Briefcase />}
            title={t("No jobs yet")}
            action={
              <Button variant="primary" size="lg" onClick={() => setAdding(true)}>
                <Plus /> {t("Add job")}
              </Button>
            }
          />
        </div>
      ) : view === "board" ? (
        <Board jobs={jobs} onOpen={setOpen} onMove={(id, s) => void move(id, s)} />
      ) : (
        <Table jobs={jobs} onOpen={setOpen} />
      )}

      <AddJobDialog
        open={adding}
        onOpenChange={setAdding}
        cvs={cvs}
        onAdded={(j) => {
          upsert(j);
          setOpen(j.id);
        }}
      />
      <JobDrawer jobId={open} cvs={cvs} side={desktop ? "right" : "bottom"} onClose={() => setOpen(null)} onChanged={upsert} onDeleted={(id) => setJobs((all) => all.filter((j) => j.id !== id))} />
    </>
  );
}

