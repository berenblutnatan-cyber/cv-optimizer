"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClipboardPaste, CreditCard, Keyboard, Mic, Play, Target } from "lucide-react";
import { INTERVIEW } from "@/lib/interview/types";
import { Button, cn, ErrorState, Field, Input, Segmented, Select, Textarea, Tooltip } from "@/components/ui";
import { postJson } from "@/components/v2/voice/call";

export type SetupCv = { id: string; title: string };
export type SetupJob = { id: string; cvId: string; jobTitle: string; company: string };

const MIN_JD = 80;

/**
 * What to practise for: a CV, a job (one already tailored, or pasted), and
 * voice or typing. One primary action; the price sits on it.
 */
export function InterviewSetup({
  cvs,
  jobs,
  initial,
  voiceAvailable,
  balance,
  unlimited,
  voiceOverFairUse,
}: {
  cvs: SetupCv[];
  jobs: SetupJob[];
  initial: { cvId: string; tailoringId: string | null; jd: string; jobTitle: string; company: string };
  voiceAvailable: boolean;
  balance: number;
  unlimited: boolean;
  /** Unlimited covers voice up to the monthly fair-use pool, then it costs a credit. */
  voiceOverFairUse: boolean;
}) {
  const router = useRouter();
  const [cvId, setCvId] = React.useState(initial.cvId);
  const cvJobs = jobs.filter((j) => j.cvId === cvId);
  const [jobId, setJobId] = React.useState<string | "paste">(initial.tailoringId && cvJobs.some((j) => j.id === initial.tailoringId) ? initial.tailoringId : cvJobs[0] && !initial.jd ? cvJobs[0].id : "paste");
  const [jd, setJd] = React.useState(initial.jd);
  // Judged when they leave the box, not on every keystroke of a paste.
  const [jdLeft, setJdLeft] = React.useState(false);
  const [jobTitle, setJobTitle] = React.useState(initial.jobTitle);
  const [company, setCompany] = React.useState(initial.company);
  const [mode, setMode] = React.useState<"voice" | "text">(voiceAvailable ? "voice" : "text");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // A different CV has different tailored jobs.
  const pickCv = (id: string) => {
    setCvId(id);
    const first = jobs.find((j) => j.cvId === id);
    setJobId(first ? first.id : "paste");
  };

  const paste = jobId === "paste";
  const ready = paste ? jd.trim().length >= MIN_JD : !!jobId;
  const covered = unlimited && !(mode === "voice" && voiceOverFairUse);
  const canPay = covered || balance >= INTERVIEW.credits;
  const price = covered ? "Included in Unlimited" : `${INTERVIEW.credits} credit · ${balance} left`;

  const start = async () => {
    setBusy(true);
    setError(null);
    const body = paste ? { cvId, mode, jd, jobTitle, company } : { cvId, mode, tailoringId: jobId };
    const r = await postJson("/api/interview", body).catch(() => null);
    if (!r?.ok) {
      setBusy(false);
      if (r?.status === 402) return setError("Out of credits");
      return setError(typeof r?.json?.error === "string" ? r.json.error : "Couldn't write the questions. Try again.");
    }
    const id = (r.json?.interview as { id: string }).id;
    router.push(`/interview/${id}`);
  };

  return (
    <form
      className="flex flex-col gap-6 rounded-panel border border-hairline bg-surface p-5 md:p-8"
      onSubmit={(e) => {
        e.preventDefault();
        if (ready && canPay && !busy) void start();
      }}
    >
      {cvs.length > 1 && (
        <Field label="CV">
          <Select value={cvId} onChange={(e) => pickCv(e.target.value)}>
            {cvs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </Select>
        </Field>
      )}

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-body font-medium text-ink">Job</legend>
        <div className="flex flex-col gap-2">
          {cvJobs.map((j) => (
            <JobOption key={j.id} value={j.id} checked={jobId === j.id} onSelect={() => setJobId(j.id)} icon={<Target />} title={j.jobTitle || j.company || "Tailored job"} meta={j.jobTitle ? j.company : ""} />
          ))}
          <JobOption value="paste" checked={paste} onSelect={() => setJobId("paste")} icon={<ClipboardPaste />} title="Paste a job" />
        </div>
      </fieldset>

      {paste && (
        <div className="flex flex-col gap-4 animate-fade-in">
          <Field label="Job description" error={jdLeft && jd.trim().length > 0 && jd.trim().length < MIN_JD ? "Paste the full description." : undefined}>
            <Textarea rows={7} value={jd} onChange={(e) => setJd(e.target.value)} onBlur={() => setJdLeft(true)} maxLength={30_000} placeholder="Paste the job post" />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Role" optional>
              <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} maxLength={200} />
            </Field>
            <Field label="Company" optional>
              <Input value={company} onChange={(e) => setCompany(e.target.value)} maxLength={200} />
            </Field>
          </div>
        </div>
      )}

      {voiceAvailable && (
        <div className="flex flex-col gap-2">
          <span className="text-body font-medium text-ink">Answer by</span>
          <Segmented
            aria-label="Answer by"
            value={mode}
            onChange={setMode}
            className="w-fit"
            options={[
              { value: "voice", label: "Voice", icon: <Mic /> },
              { value: "text", label: "Typing", icon: <Keyboard /> },
            ]}
          />
        </div>
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

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-5">
        <span className="text-body text-ink-2">{price}</span>
        {canPay ? (
          <Tooltip content={`${INTERVIEW.questions} questions written for this job. Nothing is charged if they can't be written.`}>
            <span>
              <Button type="submit" variant="primary" size="lg" loading={busy} disabled={!ready}>
                <Play /> {busy ? "Writing questions" : "Start"}
              </Button>
            </span>
          </Tooltip>
        ) : (
          <Button asChild variant="primary" size="lg">
            <Link href="/pricing">
              <CreditCard /> Add credits
            </Link>
          </Button>
        )}
      </div>
    </form>
  );
}

function JobOption({ value, checked, onSelect, icon, title, meta }: { value: string; checked: boolean; onSelect: () => void; icon: React.ReactNode; title: string; meta?: string }) {
  // A real radio: arrow keys move between jobs, the label is the hit area.
  return (
    <label
      className={cn(
        "relative flex min-h-13 w-full cursor-pointer items-center gap-3 rounded-card border px-4 py-3 transition-[border-color,background-color,box-shadow] duration-micro has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent [&_svg]:size-4 [&_svg]:shrink-0",
        checked ? "border-accent bg-accent-wash/50 shadow-[0_0_0_1px_rgb(var(--c-accent))]" : "border-hairline hover:border-hairline-strong hover:bg-surface-2/60",
      )}
    >
      <input type="radio" name="iv-job" value={value} checked={checked} onChange={onSelect} className="sr-only" />
      <span className={cn(checked ? "text-accent-ink" : "text-ink-3")}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body font-medium text-ink">{title}</span>
        {meta && <span className="block truncate text-body text-ink-2">{meta}</span>}
      </span>
      <span aria-hidden className={cn("grid size-4 shrink-0 place-items-center rounded-full border", checked ? "border-accent" : "border-hairline-strong")}>
        {checked && <span className="size-2 rounded-full bg-accent" />}
      </span>
    </label>
  );
}
