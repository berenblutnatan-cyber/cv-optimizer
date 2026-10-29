"use client";

import * as React from "react";
import Link from "next/link";
import { Check, ClipboardPaste, Copy, CreditCard, LogIn, Sparkles } from "lucide-react";
import type { ToolField, ToolOutputField, ToolSpec } from "@/lib/toolkit/tools";
import { Badge, Button, cn, ErrorState, Field, Input, Select, Skeleton, Textarea, toast } from "@/components/ui";

// One career tool: the form on the left, the result on the right (stacked on
// a phone). The CV field picks one of your CVs, or takes pasted text. The
// price sits on the button: free once a day, then a credit.

type Cv = { id: string; title: string; text: string };
type Matrix = { factor: string; weight: number; a: number; b: number; edge: "A" | "B" | "tie" }[];
type Result = Record<string, string | string[] | Matrix>;

function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = React.useState(false);
  return (
    <Button
      size="sm"
      variant="ghost"
      aria-label={`Copy ${label}`}
      onClick={() =>
        void navigator.clipboard
          ?.writeText(text)
          .then(() => {
            setDone(true);
            setTimeout(() => setDone(false), 1500);
          })
          .catch(() => toast.error("Couldn't copy"))
      }
    >
      {done ? <Check /> : <Copy />} {done ? "Copied" : "Copy"}
    </Button>
  );
}

function MatrixTable({ rows }: { rows: Matrix }) {
  const total = (k: "a" | "b") => Math.round(rows.reduce((sum, r) => sum + r[k] * r.weight, 0) / 10) / 10;
  return (
    <div className="overflow-x-auto relative rounded-card border border-hairline">
      <table className="w-full text-body">
        <thead>
          <tr className="border-b border-hairline text-ink-2">
            <th scope="col" className="px-3 py-2 text-start font-medium">
              Factor
            </th>
            <th scope="col" className="px-3 py-2 text-end font-medium">
              Weight
            </th>
            <th scope="col" className="px-3 py-2 text-end font-medium">
              A
            </th>
            <th scope="col" className="px-3 py-2 text-end font-medium">
              B
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-hairline last:border-b-0">
              <td className="px-3 py-2 text-ink">{r.factor}</td>
              <td className="tabular px-3 py-2 text-end text-ink-2">{r.weight}%</td>
              <td className={cn("tabular px-3 py-2 text-end", r.edge === "A" ? "font-semibold text-ink" : "text-ink-2")}>{r.a}</td>
              <td className={cn("tabular px-3 py-2 text-end", r.edge === "B" ? "font-semibold text-ink" : "text-ink-2")}>{r.b}</td>
            </tr>
          ))}
          <tr className="bg-surface-2/60">
            <th scope="row" className="px-3 py-2 text-start font-medium text-ink">
              Weighted score
            </th>
            <td />
            <td className="tabular px-3 py-2 text-end font-semibold text-ink">{total("a")}</td>
            <td className="tabular px-3 py-2 text-end font-semibold text-ink">{total("b")}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function Output({ spec, result }: { spec: ToolSpec; result: Result }) {
  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {spec.output.map((o: ToolOutputField) => {
        const v = result[o.key];
        if (v == null || (Array.isArray(v) && v.length === 0)) return null;
        const asText = o.kind === "list" ? (v as string[]).join("\n") : o.kind === "text" ? String(v) : "";
        return (
          <section key={o.key} aria-label={o.label} className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-body font-medium text-ink-2">{o.label}</h3>
              {o.kind !== "matrix" && <CopyButton text={asText} label={o.label} />}
            </div>
            {o.kind === "matrix" ? (
              <MatrixTable rows={v as Matrix} />
            ) : o.kind === "list" ? (
              <ul className="flex flex-col gap-2 rounded-card border border-hairline p-4">
                {(v as string[]).map((item, i) => (
                  <li key={i} className="text-body text-ink">
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="whitespace-pre-wrap rounded-card border border-hairline p-4 text-body leading-relaxed text-ink">{String(v)}</p>
            )}
          </section>
        );
      })}
    </div>
  );
}

/** Pick one of your CVs; its text is what the tool reads. */
function CvField({ field, cvs, onChange }: { field: ToolField; cvs: Cv[]; onChange: (text: string) => void }) {
  const [cvId, setCvId] = React.useState(cvs[0]?.id ?? "");
  React.useEffect(() => {
    onChange(cvs.find((c) => c.id === cvId)?.text ?? "");
  }, [cvId]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Field label={field.label} optional={!field.required}>
      <Select value={cvId} onChange={(e) => setCvId(e.target.value)}>
        {cvs.map((c) => (
          <option key={c.id} value={c.id}>
            {c.title}
          </option>
        ))}
      </Select>
    </Field>
  );
}

export function ToolRunner({ spec, cvs, signedIn, freeToday }: { spec: ToolSpec; cvs: Cv[]; signedIn: boolean; freeToday: boolean }) {
  const [values, setValues] = React.useState<Record<string, string>>(() => Object.fromEntries(spec.fields.map((f) => [f.name, f.type === "select" ? (f.options?.[0] ?? "") : ""])));
  const [result, setResult] = React.useState<Result | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<{ message: string; code?: string } | null>(null);
  const [free, setFree] = React.useState(freeToday);
  const [pasteCv, setPasteCv] = React.useState(false);
  const outRef = React.useRef<HTMLDivElement>(null);

  const set = (name: string, v: string) => setValues((s) => ({ ...s, [name]: v }));
  const missing = spec.fields.filter((f) => f.required && !(values[f.name] ?? "").trim());
  const canPay = free || signedIn;

  const run = async () => {
    setBusy(true);
    setError(null);
    // A phone shows the result below the form: bring it into view.
    requestAnimationFrame(() => outRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    const res = await fetch(`/api/toolkit/${spec.id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ inputs: values }) }).catch(() => null);
    const j = res ? await res.json().catch(() => null) : null;
    setBusy(false);
    if (!res?.ok) {
      if (res?.status === 402) setFree(false);
      return setError({ message: typeof j?.error === "string" ? j.error : "Couldn't generate. Try again.", code: j?.code });
    }
    setResult(j.result as Result);
    setFree(false);
  };

  const action = !canPay ? (
    <Button asChild variant="primary" size="lg">
      <Link href={`/sign-in?redirect_url=${encodeURIComponent(`/toolkit/${spec.id}`)}`}>
        <LogIn /> Sign in to use again
      </Link>
    </Button>
  ) : (
    <Button type="submit" variant="primary" size="lg" loading={busy} disabled={missing.length > 0}>
      <Sparkles /> {result ? "Again" : "Generate"}
    </Button>
  );

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <form
        className="flex h-fit flex-col gap-4 rounded-panel border border-hairline bg-surface p-5 md:p-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (!missing.length && !busy && canPay) void run();
        }}
      >
        {spec.fields.map((f) =>
          f.type === "cv" ? (
            <div key={f.name} className="flex flex-col gap-1">
              {pasteCv || cvs.length === 0 ? (
                <Field label={f.label} optional={!f.required}>
                  <Textarea rows={6} value={values[f.name] ?? ""} onChange={(e) => set(f.name, e.target.value)} maxLength={30_000} placeholder="Paste your CV" />
                </Field>
              ) : (
                <CvField field={f} cvs={cvs} onChange={(v) => set(f.name, v)} />
              )}
              {cvs.length > 0 && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="-ms-2 w-fit"
                  onClick={() => {
                    setPasteCv((p) => !p);
                    set(f.name, "");
                  }}
                >
                  <ClipboardPaste /> {pasteCv ? "Use a saved CV" : "Paste instead"}
                </Button>
              )}
            </div>
          ) : f.type === "select" ? (
            <Field key={f.name} label={f.label} optional={!f.required}>
              <Select value={values[f.name]} onChange={(e) => set(f.name, e.target.value)}>
                {f.options?.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </Select>
            </Field>
          ) : f.type === "textarea" ? (
            <Field key={f.name} label={f.label} optional={!f.required}>
              <Textarea rows={f.rows ?? 4} value={values[f.name]} onChange={(e) => set(f.name, e.target.value)} placeholder={f.placeholder} maxLength={f.name === "jobDescription" ? 30_000 : 2000} />
            </Field>
          ) : (
            <Field key={f.name} label={f.label} optional={!f.required}>
              <Input value={values[f.name]} onChange={(e) => set(f.name, e.target.value)} placeholder={f.placeholder} maxLength={2000} />
            </Field>
          ),
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-4">
          <Badge tone={free ? "accent" : "neutral"}>{free ? "Free today" : signedIn ? "1 credit" : "Free use spent"}</Badge>
          {action}
        </div>
      </form>

      <div ref={outRef} className="scroll-mt-20 min-w-0" aria-live="polite" aria-busy={busy}>
        {busy ? (
          <div className="flex flex-col gap-4 rounded-panel border border-hairline bg-surface p-5 md:p-6">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : error ? (
          <ErrorState
            title={error.message}
            action={
              error.code === "NO_CREDITS" ? (
                <Button asChild size="sm" variant="secondary">
                  <Link href="/pricing">
                    <CreditCard /> Add credits
                  </Link>
                </Button>
              ) : undefined
            }
          />
        ) : result ? (
          <div className="rounded-panel border border-hairline bg-surface p-5 md:p-6">
            <Output spec={spec} result={result} />
          </div>
        ) : (
          <div aria-hidden className="hidden h-full min-h-64 items-center justify-center rounded-panel border border-dashed border-hairline-strong text-ink-3 lg:flex [&_svg]:size-6">
            <Sparkles />
          </div>
        )}
      </div>
    </div>
  );
}
