"use client";

import * as React from "react";
import type { ResumeDocument } from "@/lib/resume/document";
import { SaveQueue, type SaveState, type SendResult, type ServerState } from "@/lib/resume/saveQueue";

export type { SaveState };

/** React binding for the CV's save queue (lib/resume/saveQueue.ts has the rules). */
export function useCvDocument(id: string, initial: ServerState) {
  const [doc, setDoc] = React.useState(initial.doc);
  const [saveState, setSaveState] = React.useState<SaveState>("saved");

  const queueRef = React.useRef<SaveQueue | null>(null);
  if (!queueRef.current) {
    queueRef.current = new SaveQueue(initial, {
      onDoc: setDoc,
      onState: setSaveState,
      send: async (ops, opts): Promise<SendResult> => {
        const res = await fetch(`/api/cv/${id}/ops`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ops }),
          keepalive: opts.keepalive,
        });
        if (res.ok) return { ok: true, ...((await res.json()) as ServerState) };
        // 4xx other than a rate limit will never succeed on retry.
        return { ok: false, retryable: !(res.status >= 400 && res.status < 500 && res.status !== 429) };
      },
      fetchFresh: async () => {
        const r = await fetch(`/api/cv/${id}`);
        if (!r.ok) return null;
        const body = await r.json();
        return body?.doc ? { doc: body.doc, lastSeq: body.lastSeq } : null;
      },
    });
  }
  const q = queueRef.current;

  React.useEffect(() => () => q.dispose(), [q]);

  // Save before the tab goes away (keepalive lets the request outlive the page).
  React.useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") void q.flush({ keepalive: true });
    };
    const onUnload = (e: BeforeUnloadEvent) => {
      if (q.unsaved) {
        void q.flush({ keepalive: true });
        e.preventDefault();
      }
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("beforeunload", onUnload);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("beforeunload", onUnload);
    };
  }, [q]);

  const api = React.useMemo(
    () => ({
      apply: (name: string, input: Record<string, unknown>, key?: string) => q.apply(name, input, key),
      applyRemote: (name: string, input: Record<string, unknown>) => q.applyRemote(name, input),
      adoptServer: (s: ServerState) => q.adoptServer(s),
      /** Resolves true once everything typed so far is saved. */
      settle: () => q.settle(),
      flush: () => q.flush(),
      retry: () => q.retry(),
      getDoc: () => q.doc,
    }),
    [q],
  );

  return { doc, saveState, ...api };
}
