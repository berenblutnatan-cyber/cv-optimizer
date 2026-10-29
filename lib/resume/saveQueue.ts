import { applyDocumentOp, type ResumeDocument } from "./document";

// The client side of the op log, framework-free so it can be tested directly.
//
// - apply(): instant local change (the same pure reducer the server runs),
//   queued for saving. Edits sharing a `key` (keystrokes in one field)
//   coalesce into one pending op while it is still unsent.
// - One request in flight at a time, debounced. A failed request is retried
//   with the SAME clientOpIds, so a retry can never apply twice.
// - The server's answer is authoritative; ops still pending are replayed on
//   top of it so nothing typed meanwhile is lost.
// - settle(): resolves once everything queued so far is on the server (or
//   reports that it could not be). Anything that reads the server copy
//   (chat, export, restore) must settle first.

export type SaveState = "saved" | "saving" | "retrying" | "error";
export type PendingOp = { clientOpId: string; name: string; input: Record<string, unknown>; key?: string };
export type ServerState = { doc: ResumeDocument; lastSeq: number };
/** ok: saved. `retryable: false`: the server rejected the batch (4xx), resync instead of retrying. */
export type SendResult = ({ ok: true } & ServerState) | { ok: false; retryable: boolean };

export type SaveQueueDeps = {
  send: (ops: Omit<PendingOp, "key">[], opts: { keepalive?: boolean }) => Promise<SendResult>;
  fetchFresh: () => Promise<ServerState | null>;
  onDoc: (doc: ResumeDocument) => void;
  onState: (s: SaveState) => void;
  newId?: () => string;
  debounceMs?: number;
  retryMs?: number[];
};

const MAX_BATCH = 50;

export class SaveQueue {
  private base: ServerState;
  private local: ResumeDocument;
  private pending: PendingOp[] = [];
  private inflight: Promise<void> | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private attempt = 0;
  private state: SaveState = "saved";
  private readonly d: Required<SaveQueueDeps>;

  constructor(initial: ServerState, deps: SaveQueueDeps) {
    this.base = initial;
    this.local = initial.doc;
    this.d = {
      newId: () => `ed:${crypto.randomUUID()}`,
      debounceMs: 700,
      retryMs: [1000, 3000, 8000],
      ...deps,
    };
  }

  get doc(): ResumeDocument {
    return this.local;
  }
  get saveState(): SaveState {
    return this.state;
  }
  /** Edits not yet confirmed by the server. */
  get unsaved(): boolean {
    return this.pending.length > 0 || this.inflight !== null;
  }

  private setState(s: SaveState) {
    if (s === this.state) return;
    this.state = s;
    this.d.onState(s);
  }

  private commit(next: ResumeDocument) {
    this.local = next;
    this.d.onDoc(next);
  }

  private replay(from: ResumeDocument): ResumeDocument {
    return this.pending.reduce((doc, op) => applyDocumentOp(doc, op.name, op.input), from);
  }

  private clearTimer() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  private schedule(ms: number) {
    this.clearTimer();
    this.timer = setTimeout(() => void this.flush(), ms);
  }

  apply(name: string, input: Record<string, unknown>, key?: string): boolean {
    const next = applyDocumentOp(this.local, name, input);
    if (next === this.local) return false;
    const last = this.pending[this.pending.length - 1];
    if (key && last && last.key === key) {
      // Same field, not sent yet: the input carries the field's full value, so the latest wins.
      this.pending[this.pending.length - 1] = { ...last, input, clientOpId: this.d.newId() };
    } else {
      this.pending.push({ clientOpId: this.d.newId(), name, input, key });
    }
    this.commit(next);
    if (this.state === "saved" || this.state === "error") this.setState("saving");
    this.schedule(this.d.debounceMs);
    return true;
  }

  /** A change the server already persisted (a chat tool call): show it, don't send it. */
  applyRemote(name: string, input: Record<string, unknown>) {
    const next = applyDocumentOp(this.local, name, input);
    if (next !== this.local) this.commit(next);
  }

  /** Authoritative state from elsewhere (end of a chat turn, a restore). */
  adoptServer(s: ServerState) {
    if (s.lastSeq < this.base.lastSeq) return;
    this.base = s;
    // A save in flight will answer with the newer truth.
    if (this.inflight) return;
    this.commit(this.replay(s.doc));
  }

  /** Send what is queued now (one request at a time). */
  flush(opts: { keepalive?: boolean } = {}): Promise<void> {
    this.clearTimer();
    if (this.inflight) return this.inflight;
    if (this.pending.length === 0) return Promise.resolve();
    const p = this.sendBatch(opts).finally(() => {
      if (this.inflight === p) this.inflight = null;
    });
    this.inflight = p;
    return p;
  }

  private async sendBatch(opts: { keepalive?: boolean }) {
    const batch = this.pending.splice(0, MAX_BATCH);
    this.setState(this.attempt > 0 ? "retrying" : "saving");
    let res: SendResult;
    try {
      res = await this.d.send(
        batch.map(({ clientOpId, name, input }) => ({ clientOpId, name, input })),
        opts,
      );
    } catch {
      res = { ok: false, retryable: true };
    }

    if (res.ok) {
      this.attempt = 0;
      if (res.lastSeq >= this.base.lastSeq) {
        this.base = { doc: res.doc, lastSeq: res.lastSeq };
        this.commit(this.replay(res.doc));
      }
      if (this.pending.length > 0) this.schedule(0);
      else this.setState("saved");
      return;
    }

    if (!res.retryable) {
      // The server refused the batch: it will never succeed. Resync instead of looping.
      this.attempt = 0;
      this.setState("error");
      const fresh = await this.d.fetchFresh().catch(() => null);
      if (fresh) {
        this.base = fresh;
        this.commit(this.replay(fresh.doc));
      }
      return;
    }

    // Network or 5xx: put the batch back in front, same ids, and retry.
    this.pending = [...batch, ...this.pending];
    const wait = this.d.retryMs[this.attempt];
    this.attempt += 1;
    if (wait === undefined) {
      this.attempt = 0;
      this.setState("error");
      return;
    }
    this.setState("retrying");
    this.schedule(wait);
  }

  /**
   * Resolve true once every edit queued before (and during) this call is on
   * the server; false if saving failed (the edits stay queued for retry).
   */
  async settle(): Promise<boolean> {
    for (let guard = 0; guard < 100; guard++) {
      if (this.inflight) {
        await this.inflight;
        continue;
      }
      if (this.pending.length === 0) return true;
      if (this.state === "error" || this.attempt > 0) {
        // A previous attempt failed: try once more now, then give up.
        this.attempt = 0;
        await this.flush();
        if (this.pending.length > 0 || this.failed()) return false;
        continue;
      }
      await this.flush();
      if (this.failed()) return false;
    }
    return !this.unsaved;
  }

  // A method, not a property read, so TypeScript doesn't narrow it across awaits.
  private failed(): boolean {
    return this.state === "error" || this.attempt > 0;
  }

  retry() {
    this.attempt = 0;
    void this.flush();
  }

  dispose() {
    this.clearTimer();
  }
}
