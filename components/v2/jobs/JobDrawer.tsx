"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, Check, Copy, Download, ExternalLink, FileText, MessagesSquare, MoreHorizontal, PenLine, RotateCw, Target, Trash2 } from "lucide-react";
import { JOB_STAGES, STAGE_LABEL, type JobDetail, type JobPatch, type JobSummary } from "@/lib/jobs/types";
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
  Select,
  Sheet,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  toast,
  Tooltip,
} from "@/components/ui";
import { RelativeTime } from "@/components/v2/cv/RelativeTime";

// One job, everything about it: details (stage, next step, CV, notes, the
// post), its cover letter, and the practice done for it. Fields save on blur;
// the letter saves as you type (debounced). One tab on screen at a time.

const MIN_JD = 80;

async function send(url: string, method: string, body?: unknown) {
  const res = await fetch(url, { method, headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) }).catch(() => null);
  const json = res ? await res.json().catch(() => null) : null;
  return { ok: !!res?.ok, status: res?.status ?? 0, json: json as Record<string, unknown> | null };
}

/** A text field that saves when you leave it (and only if it changed). */
function SavedInput({ value, onSave, multiline, ...props }: { value: string; onSave: (v: string) => void; multiline?: number } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  const [v, setV] = React.useState(value);
  React.useEffect(() => setV(value), [value]);
  const commit = () => v.trim() !== value.trim() && onSave(v);
  return multiline ? (
    <Textarea rows={multiline} value={v} onChange={(e) => setV(e.target.value)} onBlur={commit} placeholder={props.placeholder} maxLength={props.maxLength} id={props.id} />
  ) : (
    <Input {...props} value={v} onChange={(e) => setV(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()} />
  );
}

const toLocalDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-CA") : "");

function DetailsTab({ job, cvs, patch }: { job: JobDetail; cvs: { id: string; title: string }[]; patch: (p: JobPatch) => void }) {
  return (
    <div className="flex flex-col gap-5 pt-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Stage">
          <Select value={job.stage} onChange={(e) => patch({ stage: e.target.value as JobDetail["stage"] })}>
            {JOB_STAGES.map((s) => (
              <option key={s} value={s}>
                {STAGE_LABEL[s]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="CV">
          <Select value={job.resumeId ?? ""} onChange={(e) => patch({ resumeId: e.target.value || null })}>
            <option value="">None</option>
            {cvs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto]">
        <Field label="Next step" optional>
          <SavedInput value={job.nextStep ?? ""} onSave={(v) => patch({ nextStep: v || null })} maxLength={200} placeholder="Follow up with the recruiter" />
        </Field>
        <Field label="Due" optional>
          <Input type="date" value={toLocalDate(job.nextStepAt)} onChange={(e) => patch({ nextStepAt: e.target.value ? new Date(`${e.target.value}T09:00:00`).toISOString() : null })} className="sm:w-44" />
        </Field>
      </div>
      <Field label="Link" optional>
        <SavedInput value={job.url ?? ""} onSave={(v) => patch({ url: v || null })} type="url" inputMode="url" maxLength={2000} placeholder="https://" />
      </Field>
      <Field label="Notes" optional>
        <SavedInput value={job.notes ?? ""} onSave={(v) => patch({ notes: v || null })} multiline={4} maxLength={4000} />
      </Field>
      <Field label="Job description" optional>
        <SavedInput value={job.jdText ?? ""} onSave={(v) => patch({ jdText: v || null })} multiline={8} maxLength={20000} placeholder="Paste the job post" />
      </Field>
    </div>
  );
}

function LetterTab({ job, onLetter, goDetails }: { job: JobDetail; onLetter: (l: JobDetail["letter"]) => void; goDetails: () => void }) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [text, setText] = React.useState(job.letter?.body ?? "");
  const [saveState, setSaveState] = React.useState<"saved" | "saving" | "error">("saved");
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const letterId = job.letter?.id;
  React.useEffect(() => setText(job.letter?.body ?? ""), [job.letter?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const missing = !job.resumeId ? "Pick the CV for this job" : (job.jdText ?? "").trim().length < MIN_JD ? "Add the job description" : null;

  const write = async () => {
    setBusy(true);
    setError(null);
    const r = await send(`/api/jobs/${job.id}/letter`, "POST");
    setBusy(false);
    if (!r.ok) return setError(r.status === 402 ? "Out of credits" : typeof r.json?.error === "string" ? r.json.error : "Couldn't write the letter. Try again.");
    const l = r.json?.letter as NonNullable<JobDetail["letter"]>;
    setText(l.body);
    onLetter(l);
  };

  const save = React.useCallback(
    (body: string) => {
      if (!letterId) return;
      if (timer.current) clearTimeout(timer.current);
      setSaveState("saving");
      timer.current = setTimeout(async () => {
        const r = await send(`/api/letters/${letterId}`, "PATCH", { body });
        if (!r.ok) return setSaveState("error");
        setSaveState("saved");
        onLetter(r.json?.letter as NonNullable<JobDetail["letter"]>);
      }, 700);
    },
    [letterId, onLetter],
  );
  React.useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  if (!job.letter && busy) {
    // Takes 20–40 seconds: show the letter taking shape, not a spinner.
    return (
      <div className="flex flex-col gap-3 pt-4" aria-busy>
        <p role="status" className="flex items-center gap-2 text-body font-medium text-ink">
          <span className="size-2 animate-pulse rounded-full bg-accent" aria-hidden />
          Writing from your CV and the job post
        </p>
        <div className="flex flex-col gap-2.5 rounded-card border border-hairline p-4">
          <Skeleton className="h-4 w-40" />
          {[0, 1, 2].map((k) => (
            <div key={k} className="flex flex-col gap-2 pt-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!job.letter) {
    return (
      <div className="pt-4">
        <EmptyState
          icon={<FileText />}
          title={missing ?? "No cover letter yet"}
          action={
            <div className="flex flex-col items-center gap-3">
              {missing ? (
                <Button variant="secondary" size="lg" onClick={goDetails}>
                  <PenLine /> {missing}
                </Button>
              ) : (
                <Tooltip content="Written from your CV and this job post only. Nothing is charged if it fails.">
                  <span>
                    <Button variant="primary" size="lg" loading={busy} onClick={() => void write()}>
                      <PenLine /> Write letter · 1 credit
                    </Button>
                  </span>
                </Tooltip>
              )}
              {error && (
                <ErrorState
                  title={error}
                  action={
                    error === "Out of credits" ? (
                      <Button asChild size="sm" variant="secondary">
                        <Link href="/pricing">Add credits</Link>
                      </Button>
                    ) : undefined
                  }
                />
              )}
            </div>
          }
        />
      </div>
    );
  }

  const fileName = `Cover letter - ${job.company}`.replace(/[\\/:*?"<>|]+/g, "").slice(0, 80);
  return (
    <div className="flex flex-col gap-3 pt-4">
      {job.letter.flags.length > 0 && (
        <div role="status" className="flex flex-wrap items-center gap-2 rounded-card border border-warn/30 bg-warn-wash px-3 py-2.5">
          <AlertTriangle className="size-4 shrink-0 text-warn" aria-hidden />
          <span className="text-body text-ink">Not on your CV:</span>
          {job.letter.flags.map((f) => (
            <Badge key={f} tone="warn">
              {f}
            </Badge>
          ))}
        </div>
      )}
      <label htmlFor="letter-body" className="sr-only">
        Cover letter
      </label>
      <Textarea
        id="letter-body"
        rows={18}
        value={text}
        maxLength={20000}
        onChange={(e) => {
          setText(e.target.value);
          save(e.target.value);
        }}
        className="font-[inherit] leading-relaxed"
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="primary"
          onClick={() =>
            void navigator.clipboard
              ?.writeText(text)
              .then(() => toast.success("Copied"))
              .catch(() => toast.error("Couldn't copy"))
          }
        >
          <Copy /> Copy
        </Button>
        <Button
          variant="secondary"
          onClick={async () => {
            const { letterBlob } = await import("@/lib/export/letter");
            const url = URL.createObjectURL(await letterBlob(text));
            const a = Object.assign(document.createElement("a"), { href: url, download: `${fileName}.docx` });
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          }}
        >
          <Download /> Word
        </Button>
        <Tooltip content="A new letter for 1 credit. This one is replaced.">
          <span>
            <Button variant="ghost" loading={busy} onClick={() => void write()}>
              <RotateCw /> Rewrite
            </Button>
          </span>
        </Tooltip>
        <span className="ms-auto text-body text-ink-3" aria-live="polite">
          {saveState === "saving" ? "Saving…" : saveState === "error" ? <span className="text-danger">Not saved</span> : null}
        </span>
      </div>
      {error && <ErrorState title={error} />}
    </div>
  );
}

function PracticeTab({ job }: { job: JobDetail }) {
  const hasJd = (job.jdText ?? "").trim().length >= MIN_JD;
  const latest = job.tailorings[0];
  const tailor = () => {
    if (!job.resumeId) return;
    try {
      if (job.jdText) sessionStorage.setItem(`hired:tailor-jd:${job.resumeId}`, job.jdText);
    } catch {}
    window.location.assign(`/cv/${job.resumeId}?panel=tailor`);
  };
  const interviewHref = latest ? `/interview/new?cv=${latest.resumeId}&tailoring=${latest.id}` : `/interview/new?job=${job.id}`;
  return (
    <div className="flex flex-col gap-6 pt-4">
      <div className="flex flex-wrap gap-2">
        <Tooltip content={!job.resumeId ? "Pick the CV for this job first." : !hasJd ? "Add the job description first." : "Fit check and grounded changes for this job."}>
          <span>
            <Button variant="primary" disabled={!job.resumeId || !hasJd} onClick={tailor}>
              <Target /> Tailor CV
            </Button>
          </span>
        </Tooltip>
        <Tooltip content={!hasJd && !latest ? "Add the job description first." : "Mock interview for this job."}>
          <span>
            {hasJd || latest ? (
              <Button asChild variant="secondary">
                <Link href={interviewHref}>
                  <MessagesSquare /> Practice interview
                </Link>
              </Button>
            ) : (
              <Button variant="secondary" disabled>
                <MessagesSquare /> Practice interview
              </Button>
            )}
          </span>
        </Tooltip>
      </div>

      {job.tailorings.length > 0 && (
        <section aria-labelledby="job-tailorings">
          <h3 id="job-tailorings" className="mb-2 text-body font-medium text-ink-2">
            Fit checks
          </h3>
          <ul className="flex flex-col divide-y divide-hairline rounded-card border border-hairline">
            {job.tailorings.map((t) => (
              <li key={t.id}>
                <Link href={`/cv/${t.resumeId}?panel=tailor`} className="flex min-h-12 items-center gap-3 px-3 py-2 text-body hover:bg-surface-2/60">
                  <span className="tabular font-semibold text-ink">{t.scoreOriginal}</span>
                  {t.scoreOptimized > t.scoreOriginal && <span className="text-ink-3">→ {t.scoreOptimized}</span>}
                  <span className="ms-auto text-ink-2">
                    <RelativeTime iso={t.createdAt} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {job.interviews.length > 0 && (
        <section aria-labelledby="job-interviews">
          <h3 id="job-interviews" className="mb-2 text-body font-medium text-ink-2">
            Interviews
          </h3>
          <ul className="flex flex-col divide-y divide-hairline rounded-card border border-hairline">
            {job.interviews.map((i) => (
              <li key={i.id}>
                <Link href={`/interview/${i.id}`} className="flex min-h-12 items-center gap-3 px-3 py-2 text-body hover:bg-surface-2/60">
                  {i.overall !== null ? <span className="tabular font-semibold text-ink">{i.overall}</span> : <Badge tone="outline">{i.status === "done" ? "Done" : "Not scored"}</Badge>}
                  <span className="text-ink-2">{i.mode === "voice" ? "Voice" : "Typed"}</span>
                  <span className="ms-auto text-ink-2">
                    <RelativeTime iso={i.createdAt} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export function JobDrawer({
  jobId,
  cvs,
  side,
  onClose,
  onChanged,
  onDeleted,
}: {
  jobId: string | null;
  cvs: { id: string; title: string }[];
  side: "right" | "bottom";
  onClose: () => void;
  onChanged: (j: JobSummary) => void;
  onDeleted: (id: string) => void;
}) {
  const [job, setJob] = React.useState<JobDetail | null>(null);
  const [failed, setFailed] = React.useState(false);
  const [tab, setTab] = React.useState("details");
  const [confirm, setConfirm] = React.useState(false);

  const load = React.useCallback(async (id: string) => {
    setFailed(false);
    const r = await send(`/api/jobs/${id}`, "GET");
    if (!r.ok) return setFailed(true);
    setJob(r.json?.job as JobDetail);
  }, []);

  React.useEffect(() => {
    setJob(null);
    setTab("details");
    if (jobId) void load(jobId);
  }, [jobId, load]);

  const patch = React.useCallback(
    async (p: JobPatch) => {
      if (!job) return;
      const before = job;
      // Optimistic: the field shows the new value at once; a failure puts it back.
      setJob({ ...job, ...("stage" in p ? { stage: p.stage! } : {}), ...p } as JobDetail);
      const r = await send(`/api/jobs/${job.id}`, "PATCH", p);
      if (!r.ok) {
        setJob(before);
        return toast.error(typeof r.json?.error === "string" ? r.json.error : "Couldn't save. Try again.");
      }
      const s = r.json?.job as JobSummary;
      setJob((j) => (j ? { ...j, ...s } : j));
      onChanged(s);
    },
    [job, onChanged],
  );

  const remove = async () => {
    if (!job) return;
    const r = await send(`/api/jobs/${job.id}`, "DELETE");
    if (!r.ok) return toast.error("Couldn't delete. Try again.");
    setConfirm(false);
    onDeleted(job.id);
    onClose();
  };

  return (
    <Sheet open={!!jobId} onOpenChange={(o) => !o && onClose()} side={side} title={job ? job.title : "Job"} className={side === "right" ? "w-[min(560px,100vw)]" : undefined}>
      {failed ? (
        <ErrorState
          className="mt-2"
          title="Couldn't load this job."
          action={
            <Button size="sm" variant="secondary" onClick={() => jobId && void load(jobId)}>
              <RotateCw /> Retry
            </Button>
          }
        />
      ) : !job ? (
        <div className="flex flex-col gap-4 pt-1" aria-busy>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : (
        <div className="flex flex-col">
          <div className="-mt-2 flex items-center gap-2 pb-2">
            <span className="min-w-0 flex-1 truncate text-body text-ink-2">{job.company}</span>
            {job.url && (
              <Tooltip content="Open the job post">
                <Button asChild variant="ghost" className="size-9 px-0 touch:size-11 [&_svg]:size-[18px]">
                  <a href={job.url} target="_blank" rel="noreferrer noopener" aria-label="Open the job post">
                    <ExternalLink />
                  </a>
                </Button>
              </Tooltip>
            )}
            <Menu>
              <MenuTrigger asChild>
                <IconButton label="More" size="md">
                  <MoreHorizontal />
                </IconButton>
              </MenuTrigger>
              <MenuContent>
                <MenuItem icon={<Trash2 />} tone="danger" onSelect={() => setConfirm(true)}>
                  Delete job
                </MenuItem>
              </MenuContent>
            </Menu>
          </div>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="letter">
                Letter {job.letter && <Check className="size-4 text-success" aria-label="written" />}
              </TabsTrigger>
              <TabsTrigger value="practice">Practice</TabsTrigger>
            </TabsList>
            <TabsContent value="details">
              <DetailsTab job={job} cvs={cvs} patch={patch} />
            </TabsContent>
            <TabsContent value="letter">
              <LetterTab job={job} onLetter={(l) => setJob((j) => (j ? { ...j, letter: l } : j))} goDetails={() => setTab("details")} />
            </TabsContent>
            <TabsContent value="practice">
              <PracticeTab job={job} />
            </TabsContent>
          </Tabs>
        </div>
      )}

      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent
          size="sm"
          title="Delete this job?"
          description="Its notes and cover letter go with it. Your CV and fit checks stay."
          showDescription
          footer={
            <>
              <DialogClose asChild>
                <Button variant="ghost">Cancel</Button>
              </DialogClose>
              <Button variant="danger" onClick={() => void remove()}>
                Delete
              </Button>
            </>
          }
        />
      </Dialog>
    </Sheet>
  );
}

