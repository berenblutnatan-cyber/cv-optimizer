"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Download,
  Eye,
  FileText,
  FileType,
  History,
  Loader2,
  MessageSquare,
  MessagesSquare,
  Mic,
  Palette,
  PenLine,
  RotateCcw,
  RotateCw,
  Save,
  Target,
} from "lucide-react";
import { completeness, documentTitle, type ResumeDocument } from "@/lib/resume/document";
import { cvFileBase } from "@/lib/export/filename";
import {
  Button,
  cn,
  CommandPalette,
  IconButton,
  Kbd,
  Menu,
  MenuContent,
  MenuItem,
  MenuTrigger,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Segmented,
  Stamp,
  ThemeToggle,
  toast,
  Tooltip,
  type CommandAction,
} from "@/components/ui";
import { useT } from "@/lib/i18n/LanguageProvider";
import { useCvDocument, type SaveState } from "./useCvDocument";
import { CvPreview, type FitState } from "./CvPreview";
import { SectionEditor, type SectionId } from "./SectionEditor";
import { getTemplateEntry } from "@/lib/templates/registry";
import { ChatPanel } from "./ChatPanel";
import { DesignPanel } from "./DesignPanel";
import { useVersions, versionTitle, VersionsPanel } from "./VersionsPanel";
import { VoicePanel, type VoiceSdk } from "./VoicePanel";
import { TailorPanel } from "./TailorPanel";
import type { LocalProblem } from "@/lib/optimizer/localChecks";
import { problemTitle } from "./problemTitle";

type Mode = "type" | "chat" | "talk";
type MobilePane = "edit" | "preview";
type Panel = "edit" | "design" | "versions" | "tailor";

const MODE_KEY = "hired:editor-mode";
/** A keyboard shortcut reads the same in every language. */
const SEARCH_SHORTCUT = "⌘K";

function SaveIndicator({ state, onRetry }: { state: SaveState; onRetry: () => void }) {
  const { t } = useT();
  if (state === "error") {
    return (
      <Button size="sm" variant="ghost" onClick={onRetry} className="text-danger hover:text-danger">
        <AlertCircle /> {t("Not saved")} <RotateCw />
      </Button>
    );
  }
  const busy = state === "saving" || state === "retrying";
  return (
    <Tooltip content={state === "retrying" ? t("Reconnecting…") : busy ? t("Saving…") : t("All changes saved")}>
      <span role="status" aria-label={busy ? t("Saving") : t("All changes saved")} tabIndex={0} className="grid size-8 place-items-center text-ink-3">
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
      </span>
    </Tooltip>
  );
}

// Score problems with no AI fix are typed in: each opens its section.
const PROBLEM_TARGET = new Map<string, SectionId>([
  ["completeness:name", "profile"],
  ["completeness:title", "profile"],
  ["completeness:email", "profile"],
  ["completeness:phone", "profile"],
  ["completeness:location", "profile"],
  ["completeness:education", "education"],
]);

// Which editor section each completeness item opens.
const COMPLETENESS_TARGET = new Map<string, SectionId>([
  ["name", "profile"],
  ["contact", "profile"],
  ["experience", "experience"],
  ["bullets", "experience"],
  ["education", "education"],
  ["skills", "skills"],
  ["summary", "summary"],
]);

function CompletenessButton({ doc, onJump }: { doc: ResumeDocument; onJump: (s: SectionId) => void }) {
  const { t, dir } = useT();
  const items = completeness(doc.content);
  const done = items.filter((i) => i.done).length;
  const pct = done / items.length;
  const r = 9;
  const c = 2 * Math.PI * r;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="inline-flex h-8 items-center gap-2 rounded-control px-2 text-dense font-medium text-ink-2 hover:bg-surface-2 hover:text-ink touch:h-11" aria-label={t("Completeness {done} of {total}", { done, total: items.length })}>
          <svg width="22" height="22" className="-rotate-90" aria-hidden>
            <circle cx="11" cy="11" r={r} fill="none" strokeWidth="3" className="stroke-hairline-strong" />
            <circle cx="11" cy="11" r={r} fill="none" strokeWidth="3" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} className="stroke-accent transition-[stroke-dashoffset] duration-500" />
          </svg>
          <span className="tabular">
            {done}/{items.length}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent dir={dir} align="start" className="w-72 p-2">
        <ul>
          {items.map((it) => (
            <li key={it.key}>
              <button
                type="button"
                onClick={() => {
                  const s = COMPLETENESS_TARGET.get(it.key);
                  if (s) onJump(s);
                }}
                className="flex h-10 w-full items-center gap-3 rounded-control px-2.5 text-start text-body hover:bg-surface-2"
              >
                <span className={cn("grid size-5 shrink-0 place-items-center rounded-full", it.done ? "bg-accent text-on-accent" : "border border-hairline-strong")}>
                  {it.done && <Check className="size-3.5" />}
                </span>
                <span className={it.done ? "text-ink-2 line-through decoration-ink-3" : "text-ink"}>{t(it.label)}</span>
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function EditorShell({
  id,
  initial,
  signedIn,
  startInTalk = false,
  startPanel,
  voiceSdk,
}: {
  id: string;
  initial: { doc: ResumeDocument; lastSeq: number };
  signedIn: boolean;
  startInTalk?: boolean;
  /** Open a panel on load (?panel=tailor or ?panel=design, from the review). */
  startPanel?: "tailor" | "design";
  /** Tests and QA only: a scripted agent in place of ElevenLabs. */
  voiceSdk?: VoiceSdk;
}) {
  const { t, dir } = useT();
  const { doc, saveState, apply, applyRemote, applyVoice, adoptServer, settle, retry, getDoc } = useCvDocument(id, initial);
  const docRef = React.useRef<HTMLDivElement>(null);
  const viewRef = React.useRef<HTMLDivElement>(null);
  const hasContent = React.useMemo(() => completeness(initial.doc.content).some((i) => i.done), [initial.doc.content]);
  const [mode, setModeState] = React.useState<Mode>(startInTalk ? "talk" : hasContent ? "type" : "chat");
  // Each voice edit pulses the preview; on a phone it marks the Preview tab.
  const [pulse, setPulse] = React.useState(0);
  const [previewDirty, setPreviewDirty] = React.useState(false);
  const [onCall, setOnCall] = React.useState(false);
  const [callSlot, setCallSlot] = React.useState<HTMLDivElement | null>(null);
  const [panel, setPanel] = React.useState<Panel>(startPanel ?? "edit");
  const [mobilePane, setMobilePane] = React.useState<MobilePane>("edit");
  const [openSections, setOpenSections] = React.useState<Set<SectionId>>(new Set(["profile", "experience"]));
  const [fit, setFit] = React.useState<FitState | null>(null);
  const [exporting, setExporting] = React.useState<null | "pdf" | "docx" | "txt">(null);
  // Only a CV with a name on it earns the stamp; an empty one is just a file.
  const [win, celebrate] = useFirstExport(!!doc.content.personalInfo.name?.trim());
  const versions = useVersions({ cvId: id, settle, adoptServer });
  const { viewing } = versions;

  React.useEffect(() => {
    if (startInTalk) return;
    try {
      const m = localStorage.getItem(MODE_KEY);
      if (hasContent && (m === "type" || m === "chat" || m === "talk")) setModeState(m);
      // A blank CV on a phone starts by talking: it's faster than typing on glass.
      else if (!hasContent && signedIn && window.matchMedia("(max-width: 1023px)").matches) setModeState("talk");
    } catch {}
  }, [hasContent, signedIn, startInTalk]);
  const onVoiceEdit = React.useCallback(() => {
    setPulse((n) => n + 1);
    setPreviewDirty(true);
  }, []);
  const showCall = React.useCallback(() => {
    setModeState("talk");
    setPanel("edit");
    setMobilePane("edit");
  }, []);
  const setMode = (m: Mode) => {
    setModeState(m);
    setPanel("edit");
    try {
      localStorage.setItem(MODE_KEY, m);
    } catch {}
  };
  const togglePanel = (p: Exclude<Panel, "edit">) => {
    setMobilePane("edit");
    setPanel((cur) => {
      if (cur === "versions" && p !== "versions") void versions.view(null);
      return cur === p ? "edit" : p;
    });
  };
  const closePanel = React.useCallback(() => setPanel("edit"), []);
  const [chatAsk, setChatAsk] = React.useState<{ id: number; text: string } | null>(null);

  // documentTitle falls back to English "Untitled CV" when there is no name or headline.
  const title = doc.content.personalInfo.name || doc.content.personalInfo.title ? documentTitle(doc) : t("Untitled CV");
  React.useEffect(() => {
    document.title = `${title} · Hired`;
  }, [title]);

  const fileBase = cvFileBase(doc.content.personalInfo.name);

  // The browser's print dialog: only the fallback now, when the server PDF fails.
  const printPdf = React.useCallback(async () => {
    if (!docRef.current) return;
    try {
      const { exportToPdf } = await import("@/utils/exportToPdf");
      await exportToPdf(docRef.current, fileBase, { mode: "print" });
    } catch (err) {
      console.error(err);
      toast.error(t("Couldn't open the print dialog. Try Word instead."));
    }
  }, [fileBase, t]);

  // A real PDF file, printed on the server from exactly what the preview shows.
  const exportPdf = React.useCallback(async () => {
    if (!docRef.current || exporting) return;
    setExporting("pdf");
    try {
      void settle();
      const { printDocumentHtml } = await import("@/lib/export/printDocument");
      const res = await fetch(`/api/cv/${id}/pdf`, {
        method: "POST",
        headers: { "content-type": "text/html; charset=utf-8" },
        body: printDocumentHtml(docRef.current, fileBase),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Couldn't make the PDF.");
      download(await res.blob(), `${fileBase}.pdf`);
      celebrate();
    } catch (err) {
      console.error(err);
      toast.error(t((err as Error).message || "Couldn't make the PDF."), { action: { label: t("Print instead"), onClick: () => void printPdf() } });
    } finally {
      setExporting(null);
    }
  }, [exporting, fileBase, id, settle, celebrate, printPdf, t]);

  // Word and text come from the server copy, so everything typed is saved first.
  const exportFile = React.useCallback(
    async (format: "docx" | "txt") => {
      if (exporting) return;
      setExporting(format);
      try {
        if (!(await settle())) throw new Error(t("Your latest edits aren't saved yet. Try again."));
        const res = await fetch(`/api/cv/${id}/export?format=${format}`);
        if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? t("Export failed. Try PDF."));
        download(await res.blob(), `${fileBase}.${format}`);
        celebrate();
      } catch (err) {
        toast.error((err as Error).message);
      } finally {
        setExporting(null);
      }
    },
    [exporting, fileBase, id, settle, celebrate, t],
  );

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "e") {
        e.preventDefault();
        void exportPdf();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [exportPdf]);

  const jumpTo = (s: SectionId) => {
    setMode("type");
    setMobilePane("edit");
    setOpenSections((prev) => new Set([...prev, s]));
    requestAnimationFrame(() => document.getElementById(`section-${s}`)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  // A fix from the score: typed fields open where they're typed; the rest go to Chat as the user's ask.
  const fixProblem = (p: LocalProblem) => {
    const section = PROBLEM_TARGET.get(p.id);
    if (section || p.fix?.kind !== "ai") return jumpTo(section ?? "profile");
    askChat(problemTitle(p.title, t));
  };

  // A fix from the review, in its own words: Chat makes the change.
  const askChat = (text: string) => {
    setMode("chat");
    setMobilePane("edit");
    setChatAsk((prev) => ({ id: (prev?.id ?? 0) + 1, text }));
  };

  const actions: CommandAction[] = [
    { id: "type", label: t("Edit by typing"), group: t("Mode"), icon: <PenLine />, run: () => setMode("type") },
    { id: "chat", label: t("Edit by chatting"), group: t("Mode"), icon: <MessageSquare />, run: () => setMode("chat") },
    { id: "talk", label: t("Edit by talking"), group: t("Mode"), icon: <Mic />, run: () => setMode("talk") },
    { id: "tailor", label: t("Tailor to a job"), group: t("Tailor"), icon: <Target />, run: () => togglePanel("tailor") },
    { id: "interview", label: t("Practice an interview"), group: t("Tailor"), icon: <MessagesSquare />, run: () => void settle().then(() => window.location.assign(`/interview/new?cv=${id}`)) },
    { id: "design", label: t("Change design"), group: t("Design"), icon: <Palette />, run: () => togglePanel("design") },
    { id: "multi", label: doc.design.pageMode === "one" ? t("Allow multiple pages") : t("Fit to one page"), group: t("Design"), icon: <Palette />, run: () => apply("set_design", doc.design.pageMode === "one" ? { pageMode: "multi" } : { pageMode: "one", autoFit: true }) },
    { id: "versions", label: t("Version history"), group: t("Versions"), icon: <History />, run: () => togglePanel("versions") },
    { id: "save-version", label: t("Save a version"), group: t("Versions"), icon: <Save />, run: () => void versions.save().then((v) => v && toast(t("Saved {title}", { title: versionTitle(v, t) }))) },
    { id: "pdf", label: t("Export PDF"), group: t("Export"), icon: <Download />, shortcut: "⌘E", run: () => void exportPdf() },
    { id: "docx", label: t("Export Word"), group: t("Export"), icon: <FileType />, run: () => void exportFile("docx") },
    { id: "txt", label: t("Export plain text"), group: t("Export"), icon: <FileText />, run: () => void exportFile("txt") },
  ];

  const overflowing = doc.design.pageMode === "one" && fit && !fit.fits;
  const hasAnyContent = completeness(doc.content).some((i) => i.done);

  const left = (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      {panel === "design" && <DesignPanel doc={doc} apply={apply} onClose={closePanel} />}
      {panel === "versions" && <VersionsPanel api={versions} onClose={closePanel} />}
      {panel === "tailor" && <TailorPanel cvId={id} doc={doc} signedIn={signedIn} settle={settle} adoptServer={adoptServer} onClose={closePanel} onFix={fixProblem} onAsk={askChat} />}
      <div className={cn("flex min-h-0 flex-1 flex-col", panel !== "edit" && "hidden")}>
        <div className="flex h-13 shrink-0 items-center justify-between gap-2 border-b border-hairline px-3">
          <Segmented
            aria-label={t("Editing mode")}
            size="sm"
            value={mode}
            onChange={setMode}
            options={[
              { value: "type", label: t("Type"), icon: <PenLine /> },
              { value: "chat", label: t("Chat"), icon: <MessageSquare /> },
              {
                value: "talk",
                label: t("Talk"),
                icon: (
                  <span className="relative">
                    <Mic />
                    {onCall && mode !== "talk" && <span aria-label={t("On a call")} className="absolute -end-1 -top-1 size-2 rounded-full bg-danger" />}
                  </span>
                ),
              },
            ]}
          />
          <CompletenessButton doc={doc} onJump={jumpTo} />
        </div>
        <div className={cn("min-h-0 flex-1", mode === "type" ? "relative overflow-y-auto" : "hidden")}>
          <SectionEditor content={doc.content} apply={apply} openSections={openSections} setOpenSections={setOpenSections} photoShown={getTemplateEntry(doc.design.template)?.supportsPhoto ?? false} onOpenDesign={() => setPanel("design")} />
        </div>
        {/* Kept mounted while hidden so a streaming reply survives a mode or panel switch. */}
        <div className={cn("min-h-0 flex-1", mode === "chat" ? "flex flex-col" : "hidden")}>
          <ChatPanel cvId={id} hasContent={hasContent} fit={fit} flush={settle} applyRemote={applyRemote} adoptServer={adoptServer} ask={chatAsk} />
        </div>
        {/* Kept mounted too: switching mode mid-call doesn't hang up. */}
        <div className={cn("min-h-0 flex-1", mode === "talk" ? "flex flex-col" : "hidden")}>
          <VoicePanel
            cvId={id}
            signedIn={signedIn}
            applyVoice={applyVoice}
            getDoc={getDoc}
            settle={settle}
            onEdit={onVoiceEdit}
            onUseChat={() => setMode("chat")}
            onKeepEditing={() => setMode("type")}
            onShowPreview={() => {
              setMobilePane("preview");
              setPreviewDirty(false);
            }}
            onShowCall={showCall}
            onCallChange={setOnCall}
            callBarSlot={callSlot}
            sdk={voiceSdk}
          />
        </div>
      </div>
    </div>
  );

  const preview = (
    <div className="flex h-full min-h-0 flex-col bg-surface-2">
      {viewing && (
        <div role="status" className="flex min-h-12 shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-hairline bg-surface px-4 py-2">
          <span className="min-w-0 flex-1 truncate text-body">
            <span className="font-medium text-ink">{t("v{n}", { n: viewing.version.number })}</span>
            <span className="text-ink-2"> · {versionTitle(viewing.version, t)}</span>
          </span>
          <Button size="sm" variant="ghost" onClick={() => void versions.view(null)}>
            {t("Back to current")}
          </Button>
          <Button size="sm" variant="primary" loading={versions.busy === `restore:${viewing.version.id}`} onClick={() => void versions.restore(viewing.version)}>
            <RotateCcw /> {t("Restore")}
          </Button>
        </div>
      )}
      <div className="min-h-0 flex-1 relative overflow-y-auto px-4 py-6 md:px-10 md:py-10">
        {/* The live CV stays mounted while a version is shown: it is the export root. */}
        <div className={cn("relative", viewing && "hidden")}>
          {pulse > 0 && <span key={pulse} aria-hidden className="pointer-events-none absolute inset-0 z-10 mx-auto max-w-[860px] rounded-[2px] animate-voice-pulse" />}
          <CvPreview
            doc={doc}
            docRef={docRef}
            onFit={setFit}
            onAutoFit={(levels) => apply("set_design", { ...levels, fromAutoFit: true }, "autofit")}
            className="mx-auto max-w-[860px]"
          />
        </div>
        {viewing && <CvPreview key={viewing.version.id} doc={viewing.doc} docRef={viewRef} className="mx-auto max-w-[860px] animate-fade-in" />}
      </div>
      {!viewing && (overflowing || doc.design.pageMode === "multi") && (
        <div className="flex h-12 shrink-0 items-center justify-center gap-3 border-t border-hairline bg-surface px-4 text-body">
          {overflowing ? (
            <>
              <span className="text-warn">{t("Over one page")}</span>
              <Button size="sm" onClick={() => apply("set_design", { pageMode: "multi" })}>
                {t("Allow 2 pages")}
              </Button>
            </>
          ) : (
            <>
              <span className="text-ink-2">{t("Multi-page")}</span>
              <Button size="sm" variant="ghost" onClick={() => apply("set_design", { pageMode: "one", autoFit: true })}>
                {t("Fit to one page")}
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div dir={dir} className="relative flex h-dvh flex-col overflow-hidden bg-canvas">
      <CommandPalette actions={actions} />
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-hairline bg-surface px-2 md:px-3">
        <Tooltip content={t("All CVs")}>
          <Link href="/cv" aria-label={t("All CVs")} className="grid size-9 place-items-center rounded-control text-ink-2 hover:bg-surface-2 hover:text-ink touch:size-11">
            <ArrowLeft className="size-[18px] rtl:-scale-x-100" />
          </Link>
        </Tooltip>
        <h1 className="min-w-0 truncate text-emph font-semibold text-ink">{title}</h1>
        <SaveIndicator state={saveState} onRetry={retry} />
        <div className="ms-auto flex items-center gap-1">
          <div className="hidden lg:block">
            <ThemeToggle />
          </div>
          <Tooltip content={t("Search")} shortcut={SEARCH_SHORTCUT}>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event("hired:command"))}
              className="hidden h-8 items-center gap-1.5 rounded-control px-2 text-ink-3 hover:bg-surface-2 hover:text-ink md:inline-flex"
              aria-label={t("Search actions")}
            >
              <Kbd>{SEARCH_SHORTCUT}</Kbd>
            </button>
          </Tooltip>
          <Button size="sm" variant="ghost" aria-label={t("Tailor to a job")} aria-pressed={panel === "tailor"} className={cn(panel === "tailor" && "bg-surface-2 text-ink")} onClick={() => togglePanel("tailor")}>
            <Target /> <span className="hidden md:inline">{t("Tailor")}</span>
          </Button>
          <IconButton label={t("Version history")} active={panel === "versions"} onClick={() => togglePanel("versions")}>
            <History />
          </IconButton>
          <Button size="sm" variant="ghost" aria-label={t("Design")} aria-pressed={panel === "design"} className={cn(panel === "design" && "bg-surface-2 text-ink")} onClick={() => togglePanel("design")}>
            <Palette /> <span className="hidden md:inline">{t("Design")}</span>
          </Button>
          <Menu>
            <MenuTrigger asChild>
              {/* Primary once there is something to export; on a blank CV the next step (type, chat, talk) leads. */}
              <Button variant={hasAnyContent ? "primary" : "secondary"} size="sm" aria-label={t("Export")} loading={exporting !== null}>
                <Download /> <span className="hidden sm:inline">{t("Export")}</span>
              </Button>
            </MenuTrigger>
            <MenuContent align="end">
              <MenuItem icon={<Download />} shortcut="⌘E" onSelect={() => void exportPdf()}>
                PDF
              </MenuItem>
              <MenuItem icon={<FileType />} onSelect={() => void exportFile("docx")}>
                Word
              </MenuItem>
              <MenuItem icon={<FileText />} onSelect={() => void exportFile("txt")}>
                {t("Plain text")}
              </MenuItem>
            </MenuContent>
          </Menu>
        </div>
      </header>

      {/* A live call's controls: above every mode and pane, so the mic is never on unseen. */}
      <div ref={setCallSlot} />

      {/* Phone: one pane at a time. */}
      <div className="flex h-12 shrink-0 items-center justify-center border-b border-hairline bg-surface lg:hidden">
        <Segmented
          aria-label={t("View")}
          size="sm"
          value={mobilePane}
          onChange={(p) => {
            setMobilePane(p);
            if (p === "preview") setPreviewDirty(false);
          }}
          options={[
            {
              value: "edit",
              label: panel === "design" ? t("Design") : panel === "versions" ? t("Versions") : panel === "tailor" ? t("Tailor") : t("Edit"),
              icon: panel === "design" ? <Palette /> : panel === "versions" ? <History /> : panel === "tailor" ? <Target /> : <PenLine />,
            },
            {
              value: "preview",
              label: t("Preview"),
              icon: (
                <span className="relative">
                  <Eye />
                  {previewDirty && mobilePane !== "preview" && <span aria-label={t("Updated")} className="absolute -end-1 -top-1 size-2 rounded-full bg-accent" />}
                </span>
              ),
            },
          ]}
        />
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(420px,480px)_minmax(0,1fr)]">
        <div className={cn("min-h-0 border-hairline lg:block lg:border-e", mobilePane === "edit" ? "block" : "hidden")}>{left}</div>
        {/* The preview stays mounted on phones too: it is the export root. */}
        <div className={cn("min-h-0 lg:block", mobilePane === "preview" ? "block" : "invisible absolute -z-10 h-0 w-0 overflow-hidden lg:visible lg:static lg:z-auto lg:h-auto lg:w-auto lg:overflow-visible")}>
          {preview}
        </div>
      </div>
      {win > 0 && (
        <div className="pointer-events-none fixed inset-0 z-50 grid place-items-center">
          <Stamp play={win}>{t("READY")}</Stamp>
          <span role="status" className="sr-only">
            {t("Your first CV is ready.")}
          </span>
        </div>
      )}
    </div>
  );
}

const FIRST_EXPORT = "hired:first-export";

/** The first export ever on this device gets the stamp; every later one is just a download. */
function useFirstExport(worthIt: boolean) {
  const [win, setWin] = React.useState(0);
  React.useEffect(() => {
    if (!win) return;
    const t = setTimeout(() => setWin(0), 2200);
    return () => clearTimeout(t);
  }, [win]);
  const celebrate = React.useCallback(() => {
    if (!worthIt) return;
    try {
      if (localStorage.getItem(FIRST_EXPORT)) return;
      localStorage.setItem(FIRST_EXPORT, "1");
    } catch {
      return;
    }
    setWin((n) => n + 1);
  }, [worthIt]);
  return [win, celebrate] as const;
}
