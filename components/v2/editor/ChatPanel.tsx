"use client";

import * as React from "react";
import { ArrowUp, Check, Loader2, Square } from "lucide-react";
import { pendingToolLabel } from "@/lib/chat/cvTools";
import { readSse } from "@/lib/http/readSse";
import type { ResumeDocument } from "@/lib/resume/document";
import { Button, cn, IconButton } from "@/components/ui";
import type { FitState } from "./CvPreview";

type Chip = { label: string; done: boolean };
type Msg = { role: "user" | "assistant"; content: string; chips?: Chip[]; error?: boolean };

type ServerEvent =
  | { type: "text"; text: string }
  | { type: "tool_start"; name: string }
  | { type: "tool_noop"; name: string }
  | { type: "tool"; name: string; input: Record<string, unknown>; label: string }
  | { type: "doc"; doc: ResumeDocument; lastSeq: number }
  | { type: "done" }
  | { type: "error"; error: string };

const STARTERS = ["Interview me", "Review it", "Make my summary sharper"];

// v2's own opener: promise only what this screen does (no upload, no voice yet).
function greeting(hasContent: boolean): string {
  return hasContent
    ? "Your CV is in the preview. Tell me what changed — a new role, a project you shipped — or ask me to review it."
    : "Tell me about your work and I'll write your CV as we talk. What's your name, and what role are you going after?";
}

export function ChatPanel({
  cvId,
  hasContent,
  fit,
  flush,
  applyRemote,
  adoptServer,
}: {
  cvId: string;
  hasContent: boolean;
  fit: FitState | null;
  flush: () => Promise<unknown>;
  applyRemote: (name: string, input: Record<string, unknown>) => void;
  adoptServer: (s: { doc: ResumeDocument; lastSeq: number }) => void;
}) {
  const storageKey = `hired:chat:${cvId}`;
  const [messages, setMessages] = React.useState<Msg[]>(() => [{ role: "assistant", content: greeting(hasContent) }]);
  const [draft, setDraft] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const abortRef = React.useRef<AbortController | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  // The thread survives a refresh (per tab); the CV itself is in the database.
  React.useEffect(() => {
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) setMessages(JSON.parse(saved));
    } catch {}
  }, [storageKey]);
  React.useEffect(() => {
    if (busy) return;
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(messages.slice(-60)));
    } catch {}
  }, [messages, busy, storageKey]);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const patchLast = (fn: (m: Msg) => Msg) =>
    setMessages((ms) => {
      const copy = ms.slice();
      copy[copy.length - 1] = fn(copy[copy.length - 1]);
      return copy;
    });

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || busy) return;
    setDraft("");
    const history = [...messages.filter((m) => !m.error), { role: "user" as const, content }];
    setMessages([...messages, { role: "user", content }, { role: "assistant", content: "", chips: [] }]);
    setBusy(true);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      await flush(); // the agent reads the CV from the server; send typed edits first
      const res = await fetch(`/api/cv/${cvId}/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: history.map(({ role, content }) => ({ role, content })),
          fit: fit ? { ratio: fit.ratio, autoFit: true, atMinimum: fit.atMinimum, pageMode: "one" } : undefined,
        }),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => null);
        patchLast((m) => ({ ...m, content: err?.error ?? "Couldn't reach the assistant. Try again.", error: true }));
        return;
      }
      await readSse<ServerEvent>(res.body, (e) => {
        if (e.type === "text") patchLast((m) => ({ ...m, content: m.content + e.text }));
        else if (e.type === "tool_start") patchLast((m) => ({ ...m, chips: [...(m.chips ?? []), { label: pendingToolLabel(e.name), done: false }] }));
        else if (e.type === "tool" || e.type === "tool_noop") {
          if (e.type === "tool") applyRemote(e.name, e.input);
          patchLast((m) => {
            const chips = (m.chips ?? []).slice();
            const i = chips.findIndex((c) => !c.done);
            if (i === -1) return m;
            if (e.type === "tool") chips[i] = { label: e.label, done: true };
            else chips.splice(i, 1);
            return { ...m, chips };
          });
        } else if (e.type === "doc") adoptServer({ doc: e.doc, lastSeq: e.lastSeq });
        else if (e.type === "error") patchLast((m) => ({ ...m, content: m.content || e.error, error: !m.content }));
      });
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        patchLast((m) => ({ ...m, content: m.content || "Connection dropped. Everything shown is saved.", error: !m.content }));
      }
    } finally {
      // Drop chips that never resolved (stream cut mid-call).
      patchLast((m) => ({ ...m, chips: (m.chips ?? []).filter((c) => c.done) }));
      setBusy(false);
      abortRef.current = null;
      inputRef.current?.focus();
    }
  };

  const userTurns = messages.filter((m) => m.role === "user").length;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-5 py-5" aria-live="polite">
        <ol className="flex flex-col gap-5">
          {messages.map((m, i) => (
            <li key={i} className={cn("flex flex-col gap-2", m.role === "user" && "items-end")}>
              {m.role === "user" ? (
                <p className="max-w-[85%] whitespace-pre-wrap rounded-card bg-surface-2 px-3.5 py-2.5 text-body text-ink">{m.content}</p>
              ) : (
                <>
                  {m.chips && m.chips.length > 0 && (
                    <ul className="flex flex-wrap gap-1.5">
                      {m.chips.map((c, k) => (
                        <li key={k} className={cn("inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-dense font-medium", c.done ? "bg-accent-wash text-accent-ink" : "bg-surface-2 text-ink-2")}>
                          {c.done ? <Check className="size-3.5" aria-hidden /> : <Loader2 className="size-3.5 animate-spin" aria-hidden />}
                          {c.label}
                        </li>
                      ))}
                    </ul>
                  )}
                  {m.content ? (
                    <p className={cn("whitespace-pre-wrap text-body leading-relaxed", m.error ? "text-danger" : "text-ink")}>{m.content}</p>
                  ) : busy && i === messages.length - 1 && !(m.chips && m.chips.length) ? (
                    <div className="flex gap-1.5 py-2" aria-label="Thinking">
                      {[0, 1, 2].map((d) => (
                        <span key={d} className="size-1.5 animate-pulse rounded-full bg-ink-3" style={{ animationDelay: `${d * 160}ms` }} />
                      ))}
                    </div>
                  ) : null}
                </>
              )}
            </li>
          ))}
        </ol>
        {userTurns === 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            {(hasContent ? STARTERS : STARTERS.slice(0, 1)).map((s) => (
              <Button key={s} size="sm" onClick={() => void send(s)}>
                {s}
              </Button>
            ))}
          </div>
        )}
      </div>

      <form
        className="border-t border-hairline p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void send(draft);
        }}
      >
        <div className="flex items-end gap-2 rounded-card border border-hairline-strong bg-surface p-1.5 transition-[border-color,box-shadow] focus-within:border-accent focus-within:ring-[3px] focus-within:ring-accent/20">
          <label htmlFor="chat-input" className="sr-only">
            Message
          </label>
          <textarea
            id="chat-input"
            ref={inputRef}
            rows={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void send(draft);
              }
            }}
            placeholder={hasContent ? "Ask for a change" : "Tell me about your last role"}
            className="max-h-40 min-h-9 flex-1 resize-none bg-transparent px-2 py-1.5 text-body text-ink outline-none placeholder:text-ink-3"
          />
          {busy ? (
            <IconButton label="Stop" onClick={() => abortRef.current?.abort()} className="bg-surface-2 text-ink">
              <Square className="!size-3.5 fill-current" />
            </IconButton>
          ) : (
            <IconButton label="Send" type="submit" disabled={!draft.trim()} className="bg-accent text-on-accent hover:bg-accent-hover hover:text-on-accent disabled:bg-surface-2 disabled:text-ink-3">
              <ArrowUp />
            </IconButton>
          )}
        </div>
      </form>
    </div>
  );
}
