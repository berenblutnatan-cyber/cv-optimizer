"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, Check, Download, ExternalLink, FileText, MessagesSquare, MoreHorizontal, PenLine, RotateCw, Target, Trash2 } from "lucide-react";
import { useT } from "@/lib/i18n/LanguageProvider";
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
  HoldButton,
  CopyButton,
} from "@/components/ui";
import { RelativeTime } from "@/components/v2/cv/RelativeTime";

// One job, everything about it: details (stage, next step, CV, notes, the
// post), its cover letter, and the practice done for it. Fields save on blur;
// the letter saves as you type (debounced). One tab on screen at a time.

const MIN_JD = 80;
/** A URL prefix reads the same in every language. */
const URL_HINT = "https://";

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
  const { t } = useT();
  return (
    <div className="flex flex-col gap-5 pt-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={t("Stage")}>
          <Select value={job.stage} onChange={(e) => patch({ stage: e.target.value as JobDetail["stage"] })}>
            {JOB_STAGES.map((s) => (
              <option key={s} value={s}>
                {t(STAGE_LABEL[s])}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("CV")}>
          <Select value={job.resumeId ?? ""} onChange={(e) => patch({ resumeId: e.target.value || null })}>
            <option value="">{t("None")}</option>
            {cvs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto]">
        <Field label={t("Next step")} optional>
          <SavedInput value={job.nextStep ?? ""} onSave={(v) => patch({ nextStep: v || null })} maxLength={200} placeholder={t("Follow up with the recruiter")} />
        </Field>
        <Field label={t("Due")} optional>
          <Input type="date" value={toLocalDate(job.nextStepAt)} onChange={(e) => patch({ nextStepAt: e.target.value ? new Date(`${e.target.value}T09:00:00`).toISOString() : null })} className="sm:w-44" />
        </Field>
      </div>
      <Field label={t("Link")} optional>
        <SavedInput value={job.url ?? ""} onSave={(v) => patch({ url: v || null })} type="url" inputMode="url" dir="ltr" maxLength={2000} placeholder={URL_HINT} />
      </Field>
      <Field label={t("Notes")} optional>
        <SavedInput value={job.notes ?? ""} onSave={(v) => patch({ notes: v || null })} multiline={4} maxLength={4000} />
      </Field>
      <Field label={t("Job description")} optional>
        <SavedInput value={job.jdText ?? ""} onSave={(v) => patch({ jdText: v || null })} multiline={8} maxLength={20000} placeholder={t("Paste the job post")} />
      </Field>
    </div>
  );
}

function LetterTab({ job, onLetter, goDetails }: { job: JobDetail; onLetter: (l: JobDetail["letter"]) => void; goDetails: () => void }) {
  const { t } = useT();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [outOfCredits, setOutOfCredits] = React.useState(false);
  const [text, setText] = React.useState(job.letter?.body ?? "");
  const [saveState, setSaveState] = React.useState<"saved" | "saving" | "error">("saved");
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const letterId = job.letter?.id;
  React.useEffect(() => setText(job.letter?.body ?? ""), [job.letter?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const missing = !job.resumeId ? t("Pick the CV for this job") : (job.jdText ?? "").trim().length < MIN_JD ? t("Add the job description") : null;

  const write = async () => {
    setBusy(true);
    setError(null);
    setOutOfCredits(false);
    const r = await send(`/api/jobs/${job.id}/letter`, "POST");
    setBusy(false);
    if (!r.ok) {
      setOutOfCredits(r.status === 402);
      return setError(r.status === 402 ? t("Out of credits") : typeof r.json?.error === "string" ? r.json.error : t("Couldn't write the letter. Try again."));
    }
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
          {t("Writing from your CV and the job post")}
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
          title={missing ?? t("No cover letter yet")}
          action={
            <div className="flex flex-col items-center gap-3">
              {missing ? (
                <Button variant="secondary" size="lg" onClick={goDetails}>
                  <PenLine /> {missing}
                </Button>
              ) : (
                <Tooltip content={t("Written from your CV and this job post only. Nothing is charged if it fails.")}>
                  <span>
                    <Button variant="primary" size="lg" loading={busy} onClick={() => void write()}>
                      <PenLine /> {t("Write letter · 1 credit")}
                    </Button>
                  </span>
                </Tooltip>
              )}
              {error && (
                <ErrorState
                  title={error}
                  action={
                    outOfCredits ? (
                      <Button asChild size="sm" variant="secondary">
                        <Link href="/pricing">{t("Add credits")}</Link>
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

  const fileName = t("Cover letter - {company}", { company: job.company }).replace(/[\\/:*?"<>|]+/g, "").slice(0, 80);
  return (
    <div className="flex flex-col gap-3 pt-4">
      {job.letter.flags.length > 0 && (
        <div role="status" className="flex flex-wrap items-center gap-2 rounded-card border border-warn/30 bg-warn-wash px-3 py-2.5">
          <AlertTriangle className="size-4 shrink-0 text-warn" aria-hidden />
          <span className="text-body text-ink">{t("Not on your CV:")}</span>
          {job.letter.flags.map((f) => (
            <Badge key={f} tone="warn">
              {f}
            </Badge>
          ))}
        </div>
      )}
      <label htmlFor="letter-body" className="sr-only">
        {t("Cover letter")}
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
        <CopyButton text={text} variant="primary" size="md" />
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
        <Tooltip content={t("A new letter for 1 credit. This one is replaced.")}>
          <span>
            <Button variant="ghost" loading={busy} onClick={() => void write()}>
              <RotateCw /> {t("Rewrite")}
            </Button>
          </span>
        </Tooltip>
        <span className="ms-auto text-body text-ink-3" aria-live="polite">
          {saveState === "saving" ? t("Saving…") : saveState === "error" ? <span className="text-danger">{t("Not saved")}</span> : null}
        </span>
      </div>
      {error && <ErrorState title={error} />}
    </div>
  );
}

function PracticeTab({ job }: { job: JobDetail }) {
  const { t } = useT();
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
        <Tooltip content={!job.resumeId ? t("Pick the CV for this job first.") : !hasJd ? t("Add the job description first.") : t("Fit check and grounded changes for this job.")}>
          <span>
            <Button variant="primary" disabled={!job.resumeId || !hasJd} onClick={tailor}>
              <Target /> {t("Tailor CV")}
            </Button>
          </span>
        </Tooltip>
        <Tooltip content={!hasJd && !latest ? t("Add the job description first.") : t("Mock interview for this job.")}>
          <span>
            {hasJd || latest ? (
              <Button asChild variant="secondary">
                <Link href={interviewHref}>
                  <MessagesSquare /> {t("Practice interview")}
                </Link>
              </Button>
            ) : (
              <Button variant="secondary" disabled>
                <MessagesSquare /> {t("Practice interview")}
              </Button>
            )}
          </span>
        </Tooltip>
      </div>

      {job.tailorings.length > 0 && (
        <section aria-labelledby="job-tailorings">
          <h3 id="job-tailorings" className="mb-2 text-body font-medium text-ink-2">
            {t("Fit checks")}
          </h3>
          <ul className="flex flex-col divide-y divide-hairline rounded-card border border-hairline">
            {job.tailorings.map((f) => (
              <li key={f.id}>
                <Link href={`/cv/${f.resumeId}?panel=tailor`} className="flex min-h-12 items-center gap-3 px-3 py-2 text-body hover:bg-surface-2/60">
                  <span className="tabular font-semibold text-ink">{f.scoreOriginal}</span>
                  {f.scoreOptimized > f.scoreOriginal && (
                    <span className="text-ink-3">
                      <span aria-hidden className="inline-block rtl:-scale-x-100">→</span> <span className="sr-only">{t("to")}</span> {f.scoreOptimized}
                    </span>
                  )}
                  <span className="ms-auto text-ink-2">
                    <RelativeTime iso={f.createdAt} />
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
            {t("Interviews")}
          </h3>
          <ul className="flex flex-col divide-y divide-hairline rounded-card border border-hairline">
            {job.interviews.map((i) => (
              <li key={i.id}>
                <Link href={`/interview/${i.id}`} className="flex min-h-12 items-center gap-3 px-3 py-2 text-body hover:bg-surface-2/60">
                  {i.overall !== null ? <span className="tabular font-semibold text-ink">{i.overall}</span> : <Badge tone="outline">{i.status === "done" ? t("Done") : t("Not scored")}</Badge>}
                  <span className="text-ink-2">{i.mode === "voice" ? t("Voice") : t("Typed")}</span>
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
  const { t, dir } = useT();

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
        return toast.error(typeof r.json?.error === "string" ? r.json.error : t("Couldn't save. Try again."));
      }
      const s = r.json?.job as JobSummary;
      setJob((j) => (j ? { ...j, ...s } : j));
      onChanged(s);
    },
    [job, onChanged],
  );

  const remove = async () => {
    if (!job) return false;
    const r = await send(`/api/jobs/${job.id}`, "DELETE");
    if (!r.ok) {
      toast.error(t("Couldn't delete. Try again."));
      return false;
    }
    setConfirm(false);
    onDeleted(job.id);
    onClose();
    return true;
  };

  return (
    <Sheet open={!!jobId} onOpenChange={(o) => !o && onClose()} side={side} title={job ? job.title || t("Untitled job") : t("Job")} className={side === "right" ? "w-[min(560px,100vw)]" : undefined}>
      <div dir={dir}>
      {failed ? (
        <ErrorState
          className="mt-2"
          title={t("Couldn't load this job.")}
          action={
            <Button size="sm" variant="secondary" onClick={() => jobId && void load(jobId)}>
              <RotateCw /> {t("Retry")}
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
              <Tooltip content={t("Open the job post")}>
                <Button asChild variant="ghost" className="size-9 px-0 touch:size-11 [&_svg]:size-[18px]">
                  <a href={job.url} target="_blank" rel="noreferrer noopener" aria-label={t("Open the job post")}>
                    <ExternalLink />
                  </a>
                </Button>
              </Tooltip>
            )}
            <Menu dir={dir}>
              <MenuTrigger asChild>
                <IconButton label={t("More")} size="md">
                  <MoreHorizontal />
                </IconButton>
              </MenuTrigger>
              <MenuContent>
                <MenuItem icon={<Trash2 />} tone="danger" onSelect={() => setConfirm(true)}>
                  {t("Delete job")}
                </MenuItem>
              </MenuContent>
            </Menu>
          </div>
          <Tabs value={tab} onValueChange={setTab} dir={dir}>
            <TabsList>
              <TabsTrigger value="details">{t("Details")}</TabsTrigger>
              <TabsTrigger value="letter">
                {t("Letter")} {job.letter && <Check className="size-4 text-success" aria-label={t("written")} />}
              </TabsTrigger>
              <TabsTrigger value="practice">{t("Practice")}</TabsTrigger>
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
      </div>

      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent
          size="sm"
          title={t("Delete this job?")}
          description={t("Its notes and cover letter go with it. Your CV and fit checks stay.")}
          showDescription
          footer={
            <>
              <DialogClose asChild>
                <Button variant="ghost">{t("Cancel")}</Button>
              </DialogClose>
              <HoldButton hint={t("Hold to delete")} done={t("Deleting…")} onConfirm={remove}>
                <Trash2 /> {t("Delete")}
              </HoldButton>
            </>
          }
        />
      </Dialog>
    </Sheet>
  );
}

