"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  ChevronDown,
  Download,
  Eye,
  FileText,
  FileType,
  Loader2,
  MessageSquare,
  Palette,
  PenLine,
  RotateCw,
} from "lucide-react";
import { THEME_COLOR_VALUES, type ThemeColor } from "@/context/BuilderContext";
import { TEMPLATE_LIST } from "@/lib/templates/registry";
import { DESIGN_COLORS } from "@/lib/chat/cvTools";
import { completeness, documentTitle, type DesignTemplate, type ResumeDocument } from "@/lib/resume/document";
import { toTemplateData } from "@/lib/resume/view";
import { toPlainText } from "@/lib/resume/plainText";
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
  ThemeToggle,
  toast,
  Tooltip,
  type CommandAction,
} from "@/components/ui";
import { useCvDocument, type SaveState } from "./useCvDocument";
import { CvPreview, type FitState } from "./CvPreview";
import { SectionEditor, type SectionId } from "./SectionEditor";
import { ChatPanel } from "./ChatPanel";

type Mode = "type" | "chat";
type MobilePane = "edit" | "preview";

const MODE_KEY = "hired:editor-mode";

function SaveIndicator({ state, onRetry }: { state: SaveState; onRetry: () => void }) {
  if (state === "error") {
    return (
      <Button size="sm" variant="ghost" onClick={onRetry} className="text-danger hover:text-danger">
        <AlertCircle /> Not saved <RotateCw />
      </Button>
    );
  }
  const busy = state === "saving" || state === "retrying";
  return (
    <Tooltip content={state === "retrying" ? "Reconnecting…" : busy ? "Saving…" : "Saved"}>
      <span role="status" aria-label={busy ? "Saving" : "Saved"} tabIndex={0} className="grid size-8 place-items-center text-ink-3">
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
      </span>
    </Tooltip>
  );
}

function CompletenessButton({ doc, onJump }: { doc: ResumeDocument; onJump: (s: SectionId) => void }) {
  const items = completeness(doc.content);
  const done = items.filter((i) => i.done).length;
  const pct = done / items.length;
  const r = 9;
  const c = 2 * Math.PI * r;
  const target: Record<string, SectionId> = { name: "profile", contact: "profile", experience: "experience", bullets: "experience", education: "education", skills: "skills", summary: "summary" };
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="inline-flex h-8 items-center gap-2 rounded-control px-2 text-dense font-medium text-ink-2 hover:bg-surface-2 hover:text-ink" aria-label={`Completeness ${done} of ${items.length}`}>
          <svg width="22" height="22" className="-rotate-90" aria-hidden>
            <circle cx="11" cy="11" r={r} fill="none" strokeWidth="3" className="stroke-hairline-strong" />
            <circle cx="11" cy="11" r={r} fill="none" strokeWidth="3" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} className="stroke-accent transition-[stroke-dashoffset] duration-500" />
          </svg>
          <span className="tabular">
            {done}/{items.length}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-2">
        <ul>
          {items.map((it) => (
            <li key={it.key}>
              <button
                type="button"
                onClick={() => onJump(target[it.key])}
                className="flex h-10 w-full items-center gap-3 rounded-control px-2.5 text-start text-body hover:bg-surface-2"
              >
                <span className={cn("grid size-5 shrink-0 place-items-center rounded-full", it.done ? "bg-accent text-on-accent" : "border border-hairline-strong")}>
                  {it.done && <Check className="size-3.5" />}
                </span>
                <span className={it.done ? "text-ink-2 line-through decoration-ink-3" : "text-ink"}>{it.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

function DesignPopover({ doc, apply }: { doc: ResumeDocument; apply: (n: string, i: Record<string, unknown>, k?: string) => boolean }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" variant="ghost">
          <Palette /> <span className="hidden md:inline">Design</span> <ChevronDown className="hidden md:block" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[340px] p-0"
        tabIndex={-1}
        onOpenAutoFocus={(e) => {
          // Focus the panel itself: auto-focusing the first swatch would pop
          // its tooltip open. Keyboard users Tab in from here.
          e.preventDefault();
          (e.currentTarget as HTMLElement | null)?.focus();
        }}
      >
        <div className="border-b border-hairline p-4">
          <p className="mb-2.5 text-dense font-medium text-ink-2">Accent</p>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Accent colour">
            {DESIGN_COLORS.map((c) => (
              <Tooltip key={c} content={c[0].toUpperCase() + c.slice(1)}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={doc.design.accentColor === c}
                  aria-label={c}
                  onClick={() => apply("set_design", { accentColor: c })}
                  className={cn("size-8 rounded-full ring-offset-2 ring-offset-surface transition-shadow", doc.design.accentColor === c ? "ring-2 ring-ink" : "hover:ring-2 hover:ring-hairline-strong")}
                  style={{ background: THEME_COLOR_VALUES[c as ThemeColor].primary }}
                />
              </Tooltip>
            ))}
          </div>
        </div>
        <div className="border-b border-hairline p-4">
          <p className="mb-2.5 text-dense font-medium text-ink-2">Length</p>
          <Segmented
            aria-label="Page length"
            size="sm"
            value={doc.design.pageMode}
            onChange={(v) => apply("set_design", { pageMode: v, ...(v === "one" ? { autoFit: true } : {}) })}
            options={[
              { value: "one", label: "One page" },
              { value: "multi", label: "Multi-page" },
            ]}
          />
        </div>
        <div className="max-h-[42vh] overflow-y-auto p-2" role="radiogroup" aria-label="Template">
          <p className="px-2 pb-1.5 pt-2 text-dense font-medium text-ink-2">Template</p>
          {TEMPLATE_LIST.map((t) => (
            <Tooltip key={t.id} content={t.description} side="left">
              <button
                type="button"
                role="radio"
                aria-checked={doc.design.template === t.id}
                onClick={() => apply("set_design", { template: t.id as DesignTemplate })}
                className={cn("flex h-10 w-full items-center gap-3 rounded-control px-2.5 text-start text-body", doc.design.template === t.id ? "bg-surface-2 font-medium text-ink" : "text-ink-2 hover:bg-surface-2 hover:text-ink")}
              >
                <span aria-hidden className="h-6 w-5 shrink-0 rounded-[3px] border border-hairline" style={{ background: t.preview }} />
                <span className="flex-1 truncate">{t.name}</span>
                {doc.design.template === t.id && <Check className="size-4 text-ink" />}
              </button>
            </Tooltip>
          ))}
        </div>
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

export function EditorShell({ id, initial }: { id: string; initial: { doc: ResumeDocument; lastSeq: number } }) {
  const { doc, saveState, apply, applyRemote, adoptServer, flush, retry } = useCvDocument(id, initial);
  const docRef = React.useRef<HTMLDivElement>(null);
  const hasContent = React.useMemo(() => completeness(initial.doc.content).some((i) => i.done), [initial.doc.content]);
  const [mode, setModeState] = React.useState<Mode>(hasContent ? "type" : "chat");
  const [mobilePane, setMobilePane] = React.useState<MobilePane>("edit");
  const [openSections, setOpenSections] = React.useState<Set<SectionId>>(new Set(["profile", "experience"]));
  const [fit, setFit] = React.useState<FitState | null>(null);
  const [exporting, setExporting] = React.useState(false);

  React.useEffect(() => {
    try {
      const m = localStorage.getItem(MODE_KEY);
      if (hasContent && (m === "type" || m === "chat")) setModeState(m);
    } catch {}
  }, [hasContent]);
  const setMode = (m: Mode) => {
    setModeState(m);
    try {
      localStorage.setItem(MODE_KEY, m);
    } catch {}
  };

  const title = documentTitle(doc);
  React.useEffect(() => {
    document.title = `${title} · Hired`;
  }, [title]);

  const fileBase = (doc.content.personalInfo.name || "CV").replace(/[^\p{L}\p{N} _-]+/gu, "").trim() || "CV";

  const exportPdf = React.useCallback(async () => {
    if (!docRef.current || exporting) return;
    setExporting(true);
    try {
      await flush();
      const { exportToPdf } = await import("@/utils/exportToPdf");
      await exportToPdf(docRef.current, `${fileBase} CV`, { mode: "print" });
    } catch (err) {
      console.error(err);
      toast.error("Couldn't open the print dialog. Try Word instead.");
    } finally {
      setExporting(false);
    }
  }, [exporting, fileBase, flush]);

  const exportWord = React.useCallback(async () => {
    try {
      const { exportToWord } = await import("@/utils/exportToWord");
      await exportToWord(toTemplateData(doc.content), `${fileBase} CV`);
    } catch (err) {
      console.error(err);
      toast.error("Word export failed. Try PDF.");
    }
  }, [doc.content, fileBase]);

  const exportText = React.useCallback(() => {
    download(new Blob([toPlainText(doc.content)], { type: "text/plain;charset=utf-8" }), `${fileBase} CV.txt`);
  }, [doc.content, fileBase]);

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

  const actions: CommandAction[] = [
    { id: "type", label: "Edit by typing", group: "Mode", icon: <PenLine />, run: () => setMode("type") },
    { id: "chat", label: "Edit by chatting", group: "Mode", icon: <MessageSquare />, run: () => setMode("chat") },
    { id: "pdf", label: "Export PDF", group: "Export", icon: <Download />, shortcut: "⌘E", run: () => void exportPdf() },
    { id: "docx", label: "Export Word", group: "Export", icon: <FileType />, run: () => void exportWord() },
    { id: "txt", label: "Export plain text", group: "Export", icon: <FileText />, run: exportText },
    { id: "multi", label: doc.design.pageMode === "one" ? "Allow multiple pages" : "Fit to one page", group: "Design", icon: <Palette />, run: () => apply("set_design", doc.design.pageMode === "one" ? { pageMode: "multi" } : { pageMode: "one", autoFit: true }) },
  ];

  const overflowing = doc.design.pageMode === "one" && fit && !fit.fits;

  const left = (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      <div className="flex h-13 shrink-0 items-center justify-between gap-2 border-b border-hairline px-3">
        <Segmented
          aria-label="Editing mode"
          size="sm"
          value={mode}
          onChange={setMode}
          options={[
            { value: "type", label: "Type", icon: <PenLine /> },
            { value: "chat", label: "Chat", icon: <MessageSquare /> },
          ]}
        />
        <CompletenessButton doc={doc} onJump={jumpTo} />
      </div>
      <div className={cn("min-h-0 flex-1", mode === "type" ? "overflow-y-auto" : "hidden")}>
        <SectionEditor content={doc.content} apply={apply} openSections={openSections} setOpenSections={setOpenSections} />
      </div>
      {/* Kept mounted while hidden so a streaming reply survives a mode switch. */}
      <div className={cn("min-h-0 flex-1", mode === "chat" ? "flex flex-col" : "hidden")}>
        <ChatPanel cvId={id} hasContent={hasContent} fit={fit} flush={flush} applyRemote={applyRemote} adoptServer={adoptServer} />
      </div>
    </div>
  );

  const preview = (
    <div className="flex h-full min-h-0 flex-col bg-surface-2">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-10 md:py-10">
        <CvPreview
          doc={doc}
          docRef={docRef}
          onFit={setFit}
          onAutoFit={(levels) => apply("set_design", { ...levels, fromAutoFit: true }, "autofit")}
          className="mx-auto max-w-[860px]"
        />
      </div>
      {(overflowing || doc.design.pageMode === "multi") && (
        <div className="flex h-12 shrink-0 items-center justify-center gap-3 border-t border-hairline bg-surface px-4 text-body">
          {overflowing ? (
            <>
              <span className="text-warn">Over one page</span>
              <Button size="sm" onClick={() => apply("set_design", { pageMode: "multi" })}>
                Allow 2 pages
              </Button>
            </>
          ) : (
            <>
              <span className="text-ink-2">Multi-page</span>
              <Button size="sm" variant="ghost" onClick={() => apply("set_design", { pageMode: "one", autoFit: true })}>
                Fit to one page
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="flex h-dvh flex-col bg-canvas">
      <CommandPalette actions={actions} />
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-hairline bg-surface px-2 md:px-3">
        <Tooltip content="All CVs">
          <Link href="/cv" aria-label="All CVs" className="grid size-9 place-items-center rounded-control text-ink-2 hover:bg-surface-2 hover:text-ink">
            <ArrowLeft className="size-[18px]" />
          </Link>
        </Tooltip>
        <h1 className="min-w-0 truncate text-emph font-semibold text-ink">{title}</h1>
        <SaveIndicator state={saveState} onRetry={retry} />
        <div className="ms-auto flex items-center gap-1">
          <div className="hidden lg:block">
            <ThemeToggle />
          </div>
          <Tooltip content="Search" shortcut="⌘K">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event("hired:command"))}
              className="hidden h-8 items-center gap-1.5 rounded-control px-2 text-ink-3 hover:bg-surface-2 hover:text-ink md:inline-flex"
              aria-label="Search actions"
            >
              <Kbd>⌘K</Kbd>
            </button>
          </Tooltip>
          <DesignPopover doc={doc} apply={apply} />
          <Menu>
            <MenuTrigger asChild>
              <Button variant="primary" size="sm" loading={exporting}>
                <Download /> Export
              </Button>
            </MenuTrigger>
            <MenuContent>
              <MenuItem icon={<Download />} shortcut="⌘E" onSelect={() => void exportPdf()}>
                PDF
              </MenuItem>
              <MenuItem icon={<FileType />} onSelect={() => void exportWord()}>
                Word
              </MenuItem>
              <MenuItem icon={<FileText />} onSelect={exportText}>
                Plain text
              </MenuItem>
            </MenuContent>
          </Menu>
        </div>
      </header>

      {/* Phone: one pane at a time. */}
      <div className="flex h-12 shrink-0 items-center justify-center border-b border-hairline bg-surface lg:hidden">
        <Segmented
          aria-label="View"
          size="sm"
          value={mobilePane}
          onChange={setMobilePane}
          options={[
            { value: "edit", label: "Edit", icon: <PenLine /> },
            { value: "preview", label: "Preview", icon: <Eye /> },
          ]}
        />
      </div>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(420px,480px)_1fr]">
        <div className={cn("min-h-0 border-hairline lg:block lg:border-e", mobilePane === "edit" ? "block" : "hidden")}>{left}</div>
        {/* The preview stays mounted on phones too: it is the export root. */}
        <div className={cn("min-h-0 lg:block", mobilePane === "preview" ? "block" : "invisible absolute -z-10 h-0 w-0 overflow-hidden lg:visible lg:static lg:z-auto lg:h-auto lg:w-auto lg:overflow-visible")}>
          {preview}
        </div>
      </div>
    </div>
  );
}
