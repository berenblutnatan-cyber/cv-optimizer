import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { applyDocumentOp, emptyDocument, type ResumeDocument } from "./document";
import { SaveQueue, type PendingOp, type SendResult } from "./saveQueue";

// A fake server: applies ops with the real reducer, idempotent on clientOpId.
function fakeServer() {
  let doc = emptyDocument();
  let lastSeq = 0;
  const seen = new Set<string>();
  const calls: Omit<PendingOp, "key">[][] = [];
  return {
    calls,
    get doc() {
      return doc;
    },
    apply(ops: Omit<PendingOp, "key">[]): SendResult {
      calls.push(ops);
      for (const op of ops) {
        if (seen.has(op.clientOpId)) continue;
        seen.add(op.clientOpId);
        const next = applyDocumentOp(doc, op.name, op.input);
        if (next !== doc) {
          doc = next;
          lastSeq += 1;
        }
      }
      return { ok: true, doc, lastSeq };
    },
  };
}

const name = (d: ResumeDocument) => d.content.personalInfo.name;
const setName = (v: string) => ({ name: v });

let n = 0;
const ids = () => `ed:test-${++n}`;

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("SaveQueue", () => {
  it("settle() waits for a save already in flight AND the edits queued behind it", async () => {
    const server = fakeServer();
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    let first = true;
    const q = new SaveQueue(
      { doc: emptyDocument(), lastSeq: 0 },
      {
        newId: ids,
        onDoc: () => {},
        onState: () => {},
        fetchFresh: async () => null,
        send: async (ops) => {
          if (first) {
            first = false;
            await gate; // the first save is slow
          }
          return server.apply(ops);
        },
      },
    );

    q.apply("update_personal_info", setName("Dana"), "name");
    void q.flush(); // save #1 is now in flight
    q.apply("update_personal_info", { email: "dana@example.com" }, "email");

    let settled = false;
    const done = q.settle().then((ok) => {
      settled = ok;
    });
    await vi.advanceTimersByTimeAsync(10);
    expect(settled).toBe(false); // must not resolve while save #1 is still running

    release();
    await vi.advanceTimersByTimeAsync(10);
    await done;
    expect(settled).toBe(true);
    expect(name(server.doc)).toBe("Dana");
    expect(server.doc.content.personalInfo.email).toBe("dana@example.com");
    expect(q.unsaved).toBe(false);
  });

  it("coalesces keystrokes in one field into a single op", async () => {
    const server = fakeServer();
    const q = new SaveQueue({ doc: emptyDocument(), lastSeq: 0 }, { newId: ids, onDoc: () => {}, onState: () => {}, fetchFresh: async () => null, send: async (ops) => server.apply(ops) });
    for (const v of ["D", "Da", "Dan", "Dana"]) q.apply("update_personal_info", setName(v), "name");
    expect(await q.settle()).toBe(true);
    expect(server.calls.flat()).toHaveLength(1);
    expect(name(server.doc)).toBe("Dana");
  });

  it("retries a failed save with the same clientOpIds, so it applies once", async () => {
    const server = fakeServer();
    let fails = 1;
    const sent: string[][] = [];
    const q = new SaveQueue(
      { doc: emptyDocument(), lastSeq: 0 },
      {
        newId: ids,
        onDoc: () => {},
        onState: () => {},
        fetchFresh: async () => null,
        retryMs: [50],
        send: async (ops) => {
          sent.push(ops.map((o) => o.clientOpId));
          if (fails-- > 0) {
            server.apply(ops); // the server applied it but the response was lost
            throw new Error("network");
          }
          return server.apply(ops);
        },
      },
    );
    q.apply("set_skills", { skills: ["SQL"] });
    await q.flush();
    expect(q.saveState).toBe("retrying");
    await vi.advanceTimersByTimeAsync(60);
    expect(await q.settle()).toBe(true);
    expect(sent[0]).toEqual(sent[1]);
    expect(server.doc.content.skills).toEqual(["SQL"]);
  });

  it("reports false from settle() when the server stays down, keeping the edit queued", async () => {
    const q = new SaveQueue(
      { doc: emptyDocument(), lastSeq: 0 },
      { newId: ids, onDoc: () => {}, onState: () => {}, fetchFresh: async () => null, retryMs: [], send: async () => ({ ok: false, retryable: true }) },
    );
    q.apply("update_personal_info", setName("Dana"), "name");
    expect(await q.settle()).toBe(false);
    expect(q.unsaved).toBe(true);
    expect(name(q.doc)).toBe("Dana");
  });

  it("replays unsent edits on top of the server's answer", async () => {
    const server = fakeServer();
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const docs: ResumeDocument[] = [];
    const q = new SaveQueue(
      { doc: emptyDocument(), lastSeq: 0 },
      {
        newId: ids,
        onDoc: (d) => docs.push(d),
        onState: () => {},
        fetchFresh: async () => null,
        send: async (ops) => {
          await gate;
          return server.apply(ops);
        },
      },
    );
    q.apply("update_personal_info", setName("Dana"), "name");
    void q.flush();
    q.apply("set_skills", { skills: ["Go"] }); // typed while save #1 is in flight
    release();
    await vi.advanceTimersByTimeAsync(5);
    // The server only had the name when it answered; the skill must still show.
    expect(q.doc.content.skills).toEqual(["Go"]);
    expect(name(q.doc)).toBe("Dana");
    expect(await q.settle()).toBe(true);
    expect(server.doc.content.skills).toEqual(["Go"]);
  });

  it("adoptServer ignores an older state and replays pending edits on a newer one", () => {
    const q = new SaveQueue({ doc: emptyDocument(), lastSeq: 5 }, { newId: ids, onDoc: () => {}, onState: () => {}, fetchFresh: async () => null, send: async () => ({ ok: false, retryable: true }) });
    const stale = { ...emptyDocument(), content: { ...emptyDocument().content, summary: "old" } };
    q.adoptServer({ doc: stale, lastSeq: 3 });
    expect(q.doc.content.summary).toBe("");

    q.apply("update_personal_info", setName("Dana"), "name");
    const restored = { ...emptyDocument(), content: { ...emptyDocument().content, summary: "restored" } };
    q.adoptServer({ doc: restored, lastSeq: 9 });
    expect(q.doc.content.summary).toBe("restored");
    expect(name(q.doc)).toBe("Dana");
  });
  it("saves a voice edit under the agent's op id with its session, in order with typing, never merged", async () => {
    const server = fakeServer();
    const q = new SaveQueue({ doc: emptyDocument(), lastSeq: 0 }, { newId: ids, onDoc: () => {}, onState: () => {}, fetchFresh: async () => null, send: async (ops) => server.apply(ops) });
    q.apply("update_personal_info", setName("Da"), "name");
    expect(q.applyVoice("add_experience", { company: "Acme", role: "PM" }, "vc:sess12345678:0:0", "sess12345678")).toBe(true);
    q.apply("update_personal_info", setName("Dana"), "name");
    // A no-op isn't queued.
    expect(q.applyVoice("remove_experience", { index: 9 }, "vc:sess12345678:0:1", "sess12345678")).toBe(false);
    expect(await q.settle()).toBe(true);
    const sent = server.calls.flat();
    expect(sent.map((o) => o.name)).toEqual(["update_personal_info", "add_experience", "update_personal_info"]);
    expect(sent[1]).toEqual({ clientOpId: "vc:sess12345678:0:0", name: "add_experience", input: { company: "Acme", role: "PM" }, voiceSessionId: "sess12345678" });
    expect(sent[0]).not.toHaveProperty("voiceSessionId");
    expect(name(server.doc)).toBe("Dana");
    expect(server.doc.content.experience).toHaveLength(1);
  });
});
