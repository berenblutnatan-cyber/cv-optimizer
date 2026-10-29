"use client";

import * as React from "react";
import Link from "next/link";
import { Check, ChevronDown, FilePlus2, Minus, RotateCw } from "lucide-react";
import type { AnswerFeedback, InterviewAnswer, InterviewQuestion, InterviewReport } from "@/lib/interview/types";
import { Badge, Button, cn, ScoreGauge, toast, Tooltip } from "@/components/ui";
import { postJson } from "@/components/v2/voice/call";

const INTERVIEW_TIP = "How these answers would land with this job's hiring manager. A coaching estimate, not a prediction.";

function scoreTone(score: number): "success" | "neutral" | "warn" {
  return score >= 8 ? "success" : score >= 5 ? "neutral" : "warn";
}

/** One answer's feedback. Collapsed it is one row; open it is the whole coaching note. */
function AnswerRow({
  n,
  question,
  answer,
  fb,
  open,
  onToggle,
  added,
  onAdd,
}: {
  n: number;
  question: InterviewQuestion;
  answer: InterviewAnswer | undefined;
  fb: AnswerFeedback;
  open: boolean;
  onToggle: () => void;
  added: boolean;
  onAdd: () => Promise<void>;
}) {
  const [adding, setAdding] = React.useState(false);
  const panelId = React.useId();
  const answered = !!answer;
  return (
    <li className="border-b border-hairline last:border-b-0">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
        className="flex w-full items-start gap-3 px-4 py-4 text-start transition-colors duration-micro hover:bg-surface-2/60 md:px-5"
      >
        <span className="tabular mt-0.5 w-6 shrink-0 text-body text-ink-3">{n}</span>
        {/* Phone: the badges go under the question so it keeps the full width. */}
        <span className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
          <span className={cn("min-w-0 flex-1 text-body text-ink", !open && "line-clamp-2")}>{question.text}</span>
          <span className="flex shrink-0 items-center gap-2">
            {fb.addToCv && !added && (
              <Tooltip content="Something you said that isn't on your CV yet.">
                <span>
                  <Badge tone="accent">
                    <FilePlus2 /> New fact
                  </Badge>
                </span>
              </Tooltip>
            )}
            <Badge tone={answered ? scoreTone(fb.score) : "outline"} className="tabular">
              {answered ? `${fb.score}/10` : "Skipped"}
            </Badge>
          </span>
        </span>
        <span className="flex shrink-0 items-center pt-0.5">
          <ChevronDown className={cn("size-4 text-ink-3 transition-transform duration-panel", open && "rotate-180")} aria-hidden />
        </span>
      </button>

      {open && (
        <div id={panelId} className="flex flex-col gap-5 px-4 pb-5 ps-13 md:px-5 md:ps-14 animate-fade-in">
          {answer && <blockquote className="border-s-2 border-hairline-strong ps-3 text-body text-ink-2">{answer.text}</blockquote>}

          {(fb.worked.length > 0 || fb.missing.length > 0) && (
            <ul className="flex flex-col gap-2">
              {fb.worked.map((w, i) => (
                <li key={`w${i}`} className="flex items-start gap-2.5 text-body text-ink">
                  <Check className="mt-0.5 size-4 shrink-0 text-success" aria-label="Worked" />
                  {w}
                </li>
              ))}
              {fb.missing.map((m, i) => (
                <li key={`m${i}`} className="flex items-start gap-2.5 text-body text-ink">
                  <Minus className="mt-0.5 size-4 shrink-0 text-warn" aria-label="Missing" />
                  {m}
                </li>
              ))}
            </ul>
          )}

          {fb.stronger && answered && (
            <div className="flex flex-col gap-2 rounded-card bg-surface-2 p-4">
              <p className="text-body font-medium text-ink">Stronger</p>
              <p className="text-body text-ink-2">{fb.stronger}</p>
            </div>
          )}

          {fb.addToCv && (
            <div className="flex flex-col gap-3 rounded-card border border-hairline p-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <p className="text-body text-ink">{fb.addToCv.bullet}</p>
                <Tooltip content={`You said: “${fb.addToCv.quote}”`}>
                  <p tabIndex={0} className="mt-1 w-fit text-body text-ink-3">
                    {fb.addToCv.role} · {fb.addToCv.company}
                  </p>
                </Tooltip>
              </div>
              {added ? (
                <span className="inline-flex min-h-11 items-center gap-1.5 text-body font-medium text-success">
                  <Check className="size-4" /> On your CV
                </span>
              ) : (
                <Button
                  variant="primary"
                  loading={adding}
                  onClick={async () => {
                    setAdding(true);
                    await onAdd();
                    setAdding(false);
                  }}
                >
                  <FilePlus2 /> Add to CV
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </li>
  );
}

export function Debrief({
  id,
  resumeId,
  questions,
  answers,
  report,
  appliedAdds,
  againHref,
}: {
  id: string;
  resumeId: string | null;
  questions: InterviewQuestion[];
  answers: InterviewAnswer[];
  report: InterviewReport;
  appliedAdds: number[];
  againHref: string;
}) {
  const firstOpen = report.answers.find((a) => a.addToCv)?.index ?? 0;
  const [open, setOpen] = React.useState<Set<number>>(() => new Set([firstOpen]));
  const [added, setAdded] = React.useState<Set<number>>(() => new Set(appliedAdds));
  const facts = report.answers.filter((a) => a.addToCv && !added.has(a.index)).length;

  const add = async (index: number) => {
    const r = await postJson(`/api/interview/${id}/apply`, { index }).catch(() => null);
    if (!r?.ok) {
      // Already applied from another tab: show it as done, not as an error.
      if (r?.json?.error === "Already on your CV") setAdded((s) => new Set(s).add(index));
      else toast.error(typeof r?.json?.error === "string" ? r.json.error : "Couldn't add it. Try again.");
      return;
    }
    setAdded((s) => new Set(s).add(index));
    toast.success(
      "Added to your CV",
      resumeId
        ? {
            action: {
              label: "Open",
              onClick: () => window.location.assign(`/cv/${resumeId}`),
            },
          }
        : undefined,
    );
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <section className="flex flex-col items-start gap-5 rounded-panel border border-hairline bg-surface p-5 sm:flex-row md:p-8">
        <ScoreGauge value={report.overall} size={112} label="Interview score" tip={INTERVIEW_TIP} />
        <div className="flex min-w-0 flex-1 flex-col gap-4 sm:pt-2">
          <p className="text-emph text-ink">{report.summary}</p>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant={facts > 0 ? "secondary" : "primary"} size="lg">
              <Link href={againHref}>
                <RotateCw /> Practice again
              </Link>
            </Button>
            {resumeId && (
              <Button asChild variant="ghost" size="lg">
                <Link href={`/cv/${resumeId}`}>Open CV</Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      <ol aria-label="Answers" className="overflow-hidden rounded-panel border border-hairline bg-surface">
        {questions.map((q, i) => {
          const fb = report.answers.find((a) => a.index === i) ?? {
            index: i,
            score: 0,
            worked: [],
            missing: [],
            stronger: "",
            addToCv: null,
          };
          return (
            <AnswerRow
              key={i}
              n={i + 1}
              question={q}
              answer={answers.find((a) => a.index === i)}
              fb={fb}
              open={open.has(i)}
              onToggle={() =>
                setOpen((s) => {
                  const next = new Set(s);
                  if (next.has(i)) next.delete(i);
                  else next.add(i);
                  return next;
                })
              }
              added={added.has(i)}
              onAdd={() => add(i)}
            />
          );
        })}
      </ol>
    </div>
  );
}
