"use client";

import * as React from "react";
import { applyDocumentOp, type ResumeDocument } from "@/lib/resume/document";

// Client side of the op log.
//
// - apply(): instant local change (same pure reducer the server runs), queued
//   for saving. Keystrokes in one field coalesce into one pending op.
// - Saving: one request in flight at a time, debounced. A failed request is
//   retried with the SAME clientOpIds, so a retry can never apply twice.
// - Reconcile: the server's answer is authoritative; ops still pending are
//   replayed on top of it so nothing typed meanwhile is lost.
// - applyRemote(): changes the server already saved (chat tool calls) are
//   shown immediately without being re-sent.

export type SaveState = "saved" | "saving" | "retrying" | "error";

type PendingOp = { clientOpId: string; name: string; input: Record<string, unknown>; key?: string };

const DEBOUNCE_MS = 700;
const RETRY_MS = [1000, 3000, 8000];

const newOpId = () => `ed:${crypto.randomUUID()}`;

export function useCvDocument(id: string, initial: { doc: ResumeDocument; lastSeq: number }) {
  const [doc, setDoc] = React.useState(initial.doc);
  const [saveState, setSaveState] = React.useState<SaveState>("saved");

  const base = React.useRef(initial); // last authoritative server state
  const local = React.useRef(initial.doc);
  const pending = React.useRef<PendingOp[]>([]);
  const inflight = React.useRef<PendingOp[] | null>(null);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const attempt = React.useRef(0);

  const commitLocal = React.useCallback((next: ResumeDocument) => {
    local.current = next;
    setDoc(next);
  }, []);

  const replay = (from: ResumeDocument, ops: PendingOp[]) => ops.reduce((d, op) => applyDocumentOp(d, op.name, op.input), from);

  const flush = React.useCallback(async (opts: { keepalive?: boolean } = {}) => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (inflight.current || pending.current.length === 0) return;
    const batch = pending.current.splice(0, 50);
    inflight.current = batch;
    setSaveState(attempt.current > 0 ? "retrying" : "saving");
    try {
      const res = await fetch(`/api/cv/${id}/ops`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ops: batch.map(({ clientOpId, name, input }) => ({ clientOpId, name, input })) }),
        keepalive: opts.keepalive,
      });
      if (!res.ok) {
        // 4xx (other than rate limit) won't succeed on retry: drop the batch
        // and resync from the server instead of looping forever.
        if (res.status >= 400 && res.status < 500 && res.status !== 429) {
          inflight.current = null;
          attempt.current = 0;
          setSaveState("error");
          const fresh = await fetch(`/api/cv/${id}`).then((r) => (r.ok ? r.json() : null));
          if (fresh?.doc) {
            base.current = { doc: fresh.doc, lastSeq: fresh.lastSeq };
            commitLocal(replay(fresh.doc, pending.current));
          }
          return;
        }
        throw new Error(`save failed: ${res.status}`);
      }
      const out = (await res.json()) as { doc: ResumeDocument; lastSeq: number };
      inflight.current = null;
      attempt.current = 0;
      if (out.lastSeq >= base.current.lastSeq) {
        base.current = out;
        commitLocal(replay(out.doc, pending.current));
      }
      if (pending.current.length > 0) void flush();
      else setSaveState("saved");
    } catch {
      // Network or 5xx: put the batch back in front, same ids, and retry.
      pending.current = [...batch, ...pending.current];
      inflight.current = null;
      const wait = RETRY_MS[attempt.current];
      attempt.current += 1;
      if (wait === undefined) {
        attempt.current = 0;
        setSaveState("error");
        return;
      }
      setSaveState("retrying");
      timer.current = setTimeout(() => void flush(), wait);
    }
  }, [commitLocal, id]);

  const schedule = React.useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), DEBOUNCE_MS);
  }, [flush]);

  /**
   * Apply an edit locally and queue it. `key` coalesces rapid edits to the same
   * field (typing) into one op, so a sentence is one op, not forty.
   */
  const apply = React.useCallback(
    (name: string, input: Record<string, unknown>, key?: string): boolean => {
      const next = applyDocumentOp(local.current, name, input);
      if (next === local.current) return false;
      const q = pending.current;
      const last = q[q.length - 1];
      if (key && last && last.key === key) {
        // Same field still being typed and not yet sent: replace it. The input
        // carries the field's full value, so the latest wins.
        q[q.length - 1] = { ...last, input, clientOpId: newOpId() };
      } else {
        q.push({ clientOpId: newOpId(), name, input, key });
      }
      commitLocal(next);
      setSaveState((s) => (s === "saved" || s === "error" ? "saving" : s));
      schedule();
      return true;
    },
    [commitLocal, schedule],
  );

  /** A change the server already persisted (a chat tool call): show it, don't send it. */
  const applyRemote = React.useCallback(
    (name: string, input: Record<string, unknown>) => {
      const next = applyDocumentOp(local.current, name, input);
      if (next !== local.current) commitLocal(next);
    },
    [commitLocal],
  );

  /** Authoritative state from elsewhere (end of a chat turn). */
  const adoptServer = React.useCallback(
    (state: { doc: ResumeDocument; lastSeq: number }) => {
      if (state.lastSeq < base.current.lastSeq) return;
      base.current = state;
      // While a save is in flight its response will carry the newer truth.
      if (inflight.current) return;
      commitLocal(replay(state.doc, pending.current));
    },
    [commitLocal],
  );

  const retry = React.useCallback(() => {
    attempt.current = 0;
    void flush();
  }, [flush]);

  // Save before the tab goes away (keepalive lets the request outlive the page).
  React.useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") void flush({ keepalive: true });
    };
    const onUnload = (e: BeforeUnloadEvent) => {
      if (pending.current.length > 0 || inflight.current) {
        void flush({ keepalive: true });
        e.preventDefault();
      }
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("beforeunload", onUnload);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("beforeunload", onUnload);
    };
  }, [flush]);

  return { doc, saveState, apply, applyRemote, adoptServer, flush, retry, getDoc: () => local.current };
}
