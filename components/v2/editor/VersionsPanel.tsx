"use client";

import * as React from "react";
import { History, MoreHorizontal, PenLine, RotateCcw, Save } from "lucide-react";
import type { ResumeDocument } from "@/lib/resume/document";
import { Button, cn, EmptyState, ErrorState, IconButton, Menu, MenuContent, MenuItem, MenuTrigger, Skeleton, toast } from "@/components/ui";
import { RelativeTime } from "@/components/v2/cv/RelativeTime";
import { PanelHeader } from "./PanelHeader";

export type Version = { id: string; number: number; label: string | null; createdBy: string; createdAt: string };
export type Viewing = { version: Version; doc: ResumeDocument } | null;

const AUTHOR: Record<string, string> = {
  user: "You",
  chat: "Chat",
  import: "Imported",
  intake_agent: "Voice",
  tailor: "Tailored",
  migration: "Original",
};

export const versionTitle = (v: Version) => v.label || `Version ${v.number}`;

async function json<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error ?? "Something went wrong");
  return body as T;
}

/**
 * Versions of one CV: list, save, rename, preview and restore.
 * `settle` must resolve once local edits are saved, so a snapshot or a
 * restore never misses (or overwrites) what was just typed.
 */
export function useVersions({
  cvId,
  settle,
  adoptServer,
}: {
  cvId: string;
  settle: () => Promise<boolean>;
  adoptServer: (s: { doc: ResumeDocument; lastSeq: number }) => void;
}) {
  const [versions, setVersions] = React.useState<Version[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [viewing, setViewing] = React.useState<Viewing>(null);
  const [busy, setBusy] = React.useState<string | null>(null);
  const viewSeq = React.useRef(0);

  const load = React.useCallback(async () => {
    setError(null);
    try {
      const out = await json<{ versions: Version[] }>(await fetch(`/api/cv/${cvId}/versions`));
      setVersions(out.versions);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [cvId]);

  const save = React.useCallback(async () => {
    setBusy("save");
    try {
      if (!(await settle())) throw new Error("Your latest edits aren't saved yet. Try again.");
      const v = await json<Version>(await fetch(`/api/cv/${cvId}/versions`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }));
      setVersions((list) => [v, ...(list ?? [])]);
      return v;
    } catch (err) {
      toast.error((err as Error).message);
      return null;
    } finally {
      setBusy(null);
    }
  }, [cvId, settle]);

  const rename = React.useCallback(
    async (v: Version, label: string) => {
      const prev = versions;
      setVersions((list) => list?.map((x) => (x.id === v.id ? { ...x, label: label.trim() || null } : x)) ?? list);
      try {
        await json(await fetch(`/api/cv/${cvId}/versions/${v.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ label }) }));
      } catch (err) {
        setVersions(prev);
        toast.error((err as Error).message);
      }
    },
    [cvId, versions],
  );

  const view = React.useCallback(
    async (v: Version | null) => {
      const seq = ++viewSeq.current;
      if (!v) return setViewing(null);
      setBusy(`view:${v.id}`);
      try {
        const out = await json<{ doc: ResumeDocument }>(await fetch(`/api/cv/${cvId}/versions/${v.id}`));
        if (seq === viewSeq.current) setViewing({ version: v, doc: out.doc });
      } catch (err) {
        toast.error((err as Error).message);
      } finally {
        if (seq === viewSeq.current) setBusy(null);
      }
    },
    [cvId],
  );

  const restore = React.useCallback(
    async (v: Version, opts: { undoOf?: Version } = {}): Promise<boolean> => {
      setBusy(`restore:${v.id}`);
      try {
        if (!(await settle())) throw new Error("Your latest edits aren't saved yet. Try again.");
        const out = await json<{ doc: ResumeDocument; lastSeq: number; restored: number; backup: Version | null }>(
          await fetch(`/api/cv/${cvId}/versions/${v.id}/restore`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(opts.undoOf ? { undoOf: opts.undoOf.id } : {}),
          }),
        );
        adoptServer({ doc: out.doc, lastSeq: out.lastSeq });
        viewSeq.current++;
        setViewing(null);
        void load();
        const backup = out.backup;
        if (!opts.undoOf && backup) {
          toast(`Restored ${versionTitle(v)}`, {
            duration: 10_000,
            action: { label: "Undo", onClick: () => void restoreRef.current(backup, { undoOf: v }) },
          });
        }
        return true;
      } catch (err) {
        toast.error((err as Error).message);
        return false;
      } finally {
        setBusy(null);
      }
    },
    [adoptServer, cvId, load, settle],
  );
  const restoreRef = React.useRef(restore);
  restoreRef.current = restore;

  return { versions, error, viewing, busy, load, save, rename, view, restore };
}

export type VersionsApi = ReturnType<typeof useVersions>;

function VersionRow({ v, api }: { v: Version; api: VersionsApi }) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(v.label ?? "");
  const active = api.viewing?.version.id === v.id;
  const loading = api.busy === `view:${v.id}`;

  const commit = () => {
    setEditing(false);
    if ((draft.trim() || null) !== v.label) void api.rename(v, draft);
  };

  return (
    <li className={cn("group flex items-center gap-1 rounded-control pe-1 transition-colors", active ? "bg-accent-wash" : "hover:bg-surface-2")}>
      {editing ? (
        <div className="flex min-h-14 flex-1 items-center px-3">
          <label htmlFor={`v-${v.id}`} className="sr-only">
            Version name
          </label>
          <input
            id={`v-${v.id}`}
            autoFocus
            value={draft}
            maxLength={80}
            placeholder={`Version ${v.number}`}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") {
                e.preventDefault();
                setDraft(v.label ?? "");
                setEditing(false);
              }
            }}
            className="h-9 w-full rounded-control border border-accent bg-surface px-2.5 text-body text-ink outline-none ring-[3px] ring-accent/20"
          />
        </div>
      ) : (
        <button
          type="button"
          aria-pressed={active}
          onClick={() => void api.view(active ? null : v)}
          className="flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-control px-3 text-start"
        >
          <span className={cn("grid h-7 min-w-9 shrink-0 place-items-center rounded-[6px] px-1.5 text-dense font-semibold tabular", active ? "bg-accent text-on-accent" : "bg-surface-2 text-ink-2 group-hover:bg-surface")}>
            v{v.number}
          </span>
          <span className="min-w-0 flex-1">
            <span className={cn("block truncate text-body font-medium", loading ? "text-ink-2" : "text-ink")}>{versionTitle(v)}</span>
            <span className="block truncate text-dense text-ink-2">
              {AUTHOR[v.createdBy] ?? "You"} · <RelativeTime iso={v.createdAt} />
            </span>
          </span>
        </button>
      )}
      <Menu>
        <MenuTrigger asChild>
          <IconButton label="Version actions" className="opacity-60 group-hover:opacity-100 group-focus-within:opacity-100">
            <MoreHorizontal />
          </IconButton>
        </MenuTrigger>
        <MenuContent align="end">
          <MenuItem icon={<RotateCcw />} onSelect={() => void api.restore(v)}>
            Restore
          </MenuItem>
          <MenuItem
            icon={<PenLine />}
            onSelect={() => {
              setDraft(v.label ?? "");
              // Let the menu close (and return focus) before the input takes it.
              setTimeout(() => setEditing(true), 0);
            }}
          >
            Rename
          </MenuItem>
        </MenuContent>
      </Menu>
    </li>
  );
}

export function VersionsPanel({ api, onClose }: { api: VersionsApi; onClose: () => void }) {
  const { load } = api;
  React.useEffect(() => {
    void load();
  }, [load]);

  const saveButton = (
    <Button size="sm" onClick={() => void api.save()} loading={api.busy === "save"}>
      <Save /> Save version
    </Button>
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PanelHeader
        title="Versions"
        onClose={() => {
          void api.view(null);
          onClose();
        }}
        action={api.versions && api.versions.length > 0 ? saveButton : undefined}
      />
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {api.error ? (
          <ErrorState className="m-2" title="Couldn't load versions" action={<Button size="sm" onClick={() => void load()}>Retry</Button>} />
        ) : api.versions === null ? (
          <ul aria-label="Loading versions" className="flex flex-col gap-1">
            {[0, 1, 2].map((i) => (
              <li key={i} className="flex min-h-14 items-center gap-3 px-3">
                <Skeleton className="h-7 w-9 rounded-[6px]" />
                <span className="flex flex-1 flex-col gap-2">
                  <Skeleton className="w-2/3" />
                  <Skeleton className="h-3.5 w-1/3" />
                </span>
              </li>
            ))}
          </ul>
        ) : api.versions.length === 0 ? (
          <EmptyState icon={<History />} title="No versions yet" action={saveButton} />
        ) : (
          <ul className="flex flex-col gap-0.5">
            {api.versions.map((v) => (
              <VersionRow key={v.id} v={v} api={api} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
