"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Check, ClipboardPaste, FileUp, Mic, PenLine } from "lucide-react";
import { DEFAULT_DESIGN, emptyDocument, type ResumeDocument } from "@/lib/resume/document";
import { IMPORT_ACCEPT, MAX_IMPORT_BYTES, type ImportEvent } from "@/lib/resume/import-types";
import posthog from "posthog-js";
import { readSse } from "@/lib/http/readSse";
import { trackConversion } from "@/lib/gtag";
import { computeLocalScore } from "@/lib/optimizer/localChecks";
import type { ResumeData } from "@/types/resume";
import { Button, cn, ErrorState, Textarea } from "@/components/ui";
import { CvPreview } from "@/components/v2/editor/CvPreview";

type Phase =
  | { kind: "choose" }
  | { kind: "paste" }
  | { kind: "importing"; label: string; content: ResumeData | null }
  | { kind: "opening"; label: string; content: ResumeData | null }
  | { kind: "error"; message: string; canPaste: boolean };

/** Client-side checks that save a round trip. The server re-checks everything. */
function checkFile(file: File): string | null {
  const name = file.name.toLowerCase();
  if (name.endsWith(".doc")) return "Old .doc files can't be read. Save it as PDF or .docx and try again.";
  if (!/\.(pdf|docx|txt)$/.test(name) && !["application/pdf", "text/plain"].includes(file.type)) return "Upload a PDF, Word (.docx) or text file.";
  if (file.size > MAX_IMPORT_BYTES) return "That file is over 5 MB.";
  if (file.size === 0) return "That file is empty.";
  return null;
}

const SECTIONS: { key: string; label: string; done: (c: ResumeData) => boolean }[] = [
  { key: "profile", label: "Profile", done: (c) => !!c.personalInfo.name },
  { key: "experience", label: "Experience", done: (c) => c.experience.length > 0 },
  { key: "education", label: "Education", done: (c) => c.education.length > 0 },
  { key: "skills", label: "Skills", done: (c) => c.skills.length > 0 },
];

function Tile({
  icon,
  title,
  meta,
  onClick,
  busy,
  highlighted,
  ...rest
}: {
  icon: React.ReactNode;
  title: string;
  meta: string;
  onClick: () => void;
  busy?: boolean;
  highlighted?: boolean;
} & Omit<React.HTMLAttributes<HTMLButtonElement>, "onClick" | "title">) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={cn(
        "group flex min-h-36 flex-col items-start justify-between gap-4 sm:min-h-[200px] sm:gap-6 rounded-panel border bg-surface p-6 text-start shadow-card transition-[border-color,background-color,transform] duration-micro hover:-translate-y-0.5 hover:border-hairline-strong disabled:pointer-events-none disabled:opacity-60",
        highlighted ? "border-accent bg-accent-wash" : "border-hairline",
      )}
      {...rest}
    >
      <span className={cn("grid size-11 place-items-center rounded-card [&_svg]:size-5", highlighted ? "bg-accent text-on-accent" : "bg-surface-2 text-ink group-hover:bg-accent group-hover:text-on-accent")}>
        {icon}
      </span>
      <span>
        <span className="block text-h3 font-semibold text-ink">{title}</span>
        <span className="mt-1 block text-body text-ink-2">{meta}</span>
      </span>
    </button>
  );
}

/**
 * "start": every way to begin (upload, talk, blank). "score": the free check
 * (/score, where ad traffic lands): upload or paste, optionally the job, then
 * straight into the editor's score + tailor panel.
 */
export function StartFlow({ variant = "start", voice = true }: { variant?: "start" | "score"; /** Voice is set up (the Talk tile shows). */ voice?: boolean }) {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const [phase, setPhase] = React.useState<Phase>({ kind: "choose" });
  const [dragging, setDragging] = React.useState(false);
  const [creatingBlank, setCreatingBlank] = React.useState<false | "blank" | "talk">(false);
  const [pasted, setPasted] = React.useState("");
  const [jobText, setJobText] = React.useState("");
  const jobRef = React.useRef("");
  jobRef.current = jobText;
  const inputRef = React.useRef<HTMLInputElement>(null);
  const abortRef = React.useRef<AbortController | null>(null);
  const previewRef = React.useRef<HTMLDivElement>(null);
  const dragDepth = React.useRef(0);

  React.useEffect(() => () => abortRef.current?.abort(), []);

  const run = async (body: BodyInit, label: string, headers?: HeadersInit) => {
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setPhase({ kind: "importing", label, content: null });
    let latest: ResumeData | null = null;
    try {
      const res = await fetch("/api/cv/import", { method: "POST", body, headers, signal: ctrl.signal });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => null);
        setPhase({ kind: "error", message: err?.error ?? "Import failed. Try again.", canPaste: err?.code === "UNREADABLE" || err?.code === "TOO_SHORT" });
        return;
      }
      let finished = false;
      await readSse<ImportEvent>(res.body, (e) => {
        if (e.type === "partial") {
          latest = e.content;
          setPhase((p) => (p.kind === "importing" ? { ...p, content: e.content } : p));
        } else if (e.type === "done") {
          finished = true;
          setPhase({ kind: "opening", label, content: latest });
          if (variant === "score") {
            // The free score is ready (it renders from this content on the next screen):
            // the Google Ads goal ad traffic on /score is bid against.
            trackConversion("score_generated");
            if (latest) {
              const score = computeLocalScore(latest).overall;
              posthog.capture?.("score_generated", { score, band: score < 65 ? "low" : score < 80 ? "mid" : "high", source: "v2" });
            }
            // The job pasted here rides along to the tailor panel (it opens on this CV).
            try {
              if (jobRef.current.trim()) sessionStorage.setItem(`hired:tailor-jd:${e.id}`, jobRef.current.trim());
            } catch {}
            router.push(`/cv/${e.id}?panel=tailor`);
          } else router.push(`/cv/${e.id}`);
        } else if (e.type === "error") {
          finished = true;
          setPhase({ kind: "error", message: e.error, canPaste: e.code === "NO_CV" });
        }
      });
      if (!finished) setPhase({ kind: "error", message: "The connection dropped. Try again.", canPaste: false });
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setPhase({ kind: "error", message: "Couldn't reach the server. Check your connection and try again.", canPaste: false });
    }
  };

  const importFile = (file: File) => {
    const problem = checkFile(file);
    if (problem) return setPhase({ kind: "error", message: problem, canPaste: false });
    const form = new FormData();
    form.append("file", file);
    void run(form, file.name);
  };

  const importText = () => {
    void run(JSON.stringify({ text: pasted }), "Pasted text", { "content-type": "application/json" });
  };

  // Talk opens the editor in Talk mode; the call itself starts on a tap there (never automatically).
  const startBlank = async (then: "blank" | "talk" = "blank") => {
    setCreatingBlank(then);
    try {
      const res = await fetch("/api/cv", { method: "POST" });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.id) throw new Error(body?.error ?? "Couldn't create a CV. Try again.");
      const editor = then === "talk" ? `/cv/${body.id}?talk=1` : `/cv/${body.id}`;
      // Talking needs an account: go straight to sign-in (the draft is claimed after), never to a wall.
      if (then === "talk" && isSignedIn === false) window.location.assign(`/sign-in?redirect_url=${encodeURIComponent(editor)}`);
      else router.push(editor);
    } catch (err) {
      setCreatingBlank(false);
      setPhase({ kind: "error", message: (err as Error).message, canPaste: false });
    }
  };

  const cancel = () => {
    abortRef.current?.abort();
    setPhase({ kind: "choose" });
  };

  // Accept a drop anywhere on the page, not only on the tile.
  const dropProps =
    phase.kind === "choose" || phase.kind === "error"
      ? {
          onDragEnter: (e: React.DragEvent) => {
            if (!e.dataTransfer.types.includes("Files")) return;
            dragDepth.current += 1;
            setDragging(true);
          },
          onDragLeave: () => {
            dragDepth.current = Math.max(0, dragDepth.current - 1);
            if (dragDepth.current === 0) setDragging(false);
          },
          onDragOver: (e: React.DragEvent) => {
            if (e.dataTransfer.types.includes("Files")) e.preventDefault();
          },
          onDrop: (e: React.DragEvent) => {
            e.preventDefault();
            dragDepth.current = 0;
            setDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) importFile(file);
          },
        }
      : {};

  if (phase.kind === "importing" || phase.kind === "opening") {
    const c = phase.content;
    const doc: ResumeDocument = { ...emptyDocument(), content: c ?? emptyDocument().content, design: { ...DEFAULT_DESIGN, pageMode: "multi", autoFit: false } };
    return (
      <div className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 gap-8 px-4 py-8 md:px-8 lg:grid-cols-[320px_minmax(0,1fr)] lg:py-12">
        <aside className="flex flex-col gap-6 lg:sticky lg:top-12 lg:self-start" aria-live="polite">
          <div>
            <h1 className="text-h2 font-semibold text-ink">{phase.kind === "opening" ? "Opening your CV" : "Reading your CV"}</h1>
            <p className="mt-1 truncate text-body text-ink-2">{phase.label}</p>
          </div>
          <ul className="flex flex-col gap-1">
            {SECTIONS.map((s) => {
              const done = !!c && s.done(c);
              return (
                <li key={s.key} className="flex h-10 items-center gap-3 text-body">
                  <span className={cn("grid size-6 place-items-center rounded-full transition-colors duration-panel", done ? "bg-accent text-on-accent" : "border border-hairline-strong")}>
                    {done ? <Check className="size-3.5" aria-hidden /> : <span className="size-1.5 animate-pulse rounded-full bg-ink-3" aria-hidden />}
                  </span>
                  <span className={done ? "text-ink" : "text-ink-2"}>{s.label}</span>
                  <span className="sr-only">{done ? "found" : "reading"}</span>
                </li>
              );
            })}
          </ul>
          {phase.kind === "importing" && (
            <Button variant="ghost" className="w-fit" onClick={cancel}>
              Cancel
            </Button>
          )}
        </aside>
        <div className="min-w-0">
          {c ? (
            <CvPreview doc={doc} docRef={previewRef} className="mx-auto max-w-[760px] animate-fade-in" />
          ) : (
            <div className="mx-auto aspect-[210/297] w-full max-w-[760px] overflow-hidden rounded-[2px] bg-surface p-[8%] shadow-pop">
              <div className="flex flex-col gap-4" aria-hidden>
                <div className="skeleton h-8 w-1/2" />
                <div className="skeleton h-4 w-1/3" />
                <div className="mt-6 skeleton h-4 w-full" />
                <div className="skeleton h-4 w-11/12" />
                <div className="skeleton h-4 w-4/5" />
                <div className="mt-6 skeleton h-5 w-1/4" />
                <div className="skeleton h-4 w-full" />
                <div className="skeleton h-4 w-5/6" />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-10 md:px-8 md:py-16" {...dropProps}>
      <h1 className="text-h1 font-semibold text-ink">{variant === "score" ? "Score your CV" : "Start your CV"}</h1>

      {phase.kind === "error" && (
        <ErrorState
          className="mt-6"
          title={phase.message}
          action={
            phase.canPaste ? (
              <Button size="sm" onClick={() => setPhase({ kind: "paste" })}>
                <ClipboardPaste /> Paste text
              </Button>
            ) : undefined
          }
        />
      )}

      {phase.kind === "paste" ? (
        <form
          className="mt-8 flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            importText();
          }}
        >
          <label htmlFor="paste-cv" className="text-emph font-medium text-ink">
            Paste your CV
          </label>
          <Textarea id="paste-cv" autoFocus rows={14} value={pasted} onChange={(e) => setPasted(e.target.value)} maxLength={30_000} className="min-h-72" />
          <div className="flex items-center gap-2">
            <Button type="submit" variant="primary" disabled={pasted.trim().length < 50}>
              Import
            </Button>
            <Button type="button" variant="ghost" onClick={() => setPhase({ kind: "choose" })}>
              Back
            </Button>
          </div>
        </form>
      ) : (
        <>
          {variant === "score" ? (
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Tile
                icon={<FileUp />}
                title={dragging ? "Drop to upload" : "Upload a CV"}
                meta="PDF or Word"
                highlighted={dragging}
                onClick={() => inputRef.current?.click()}
              />
              <Tile icon={<ClipboardPaste />} title="Paste it" meta="Any text" onClick={() => setPhase({ kind: "paste" })} />
            </div>
          ) : (
            <div className={cn("mt-8 grid grid-cols-1 gap-4", voice ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
              <Tile
                icon={<FileUp />}
                title={dragging ? "Drop to upload" : "Upload a CV"}
                meta="PDF or Word"
                highlighted={dragging}
                onClick={() => inputRef.current?.click()}
                busy={!!creatingBlank}
              />
              {voice && <Tile icon={<Mic />} title="Talk it through" meta="About 5 minutes" onClick={() => void startBlank("talk")} busy={!!creatingBlank} aria-busy={creatingBlank === "talk"} />}
              <Tile icon={<PenLine />} title="Start blank" meta="Type or chat" onClick={() => void startBlank()} busy={!!creatingBlank} aria-busy={creatingBlank === "blank"} />
            </div>
          )}
          {variant === "score" && (
            <div className="mt-6 flex flex-col gap-1.5">
              <label htmlFor="score-job" className="flex items-center gap-2 text-dense font-medium text-ink">
                Job description <span className="font-normal text-ink-3">optional</span>
              </label>
              <Textarea id="score-job" rows={5} value={jobText} onChange={(e) => setJobText(e.target.value)} maxLength={30_000} />
            </div>
          )}
          <input
            ref={inputRef}
            type="file"
            accept={IMPORT_ACCEPT}
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) importFile(file);
            }}
          />
          {variant === "start" && (
            <Button variant="ghost" className="mt-4 w-fit" onClick={() => setPhase({ kind: "paste" })}>
              <ClipboardPaste /> Paste text instead
            </Button>
          )}
        </>
      )}
    </div>
  );
}
