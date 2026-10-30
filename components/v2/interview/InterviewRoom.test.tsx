// @vitest-environment happy-dom
import * as React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PublicInterview } from "@/lib/interview/store";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { VoiceSdk } from "@/components/v2/voice/call";
import { InterviewRoom } from "./InterviewRoom";

// The practice room against a scripted ElevenLabs SDK and a stubbed API. It
// pins down: the question on screen follows the interviewer's begin_question
// marks; a reconnect resumes at that question; End finishes exactly once;
// typed answers post once, skipped ones are left out; scoring polls into the
// debrief.

vi.mock("@/lib/voice/support", () => ({ readVoiceSupport: () => "ok" }));

type Opts = NonNullable<Parameters<ReturnType<VoiceSdk["useConversation"]>["startSession"]>[0]>;

function fakeSdk() {
  const calls = { start: 0, end: 0 };
  let opts: Opts | null = null;
  const conversation = {
    startSession: (o?: Opts) => {
      calls.start++;
      opts = o ?? null;
    },
    endSession: () => {
      calls.end++;
      opts?.onDisconnect?.({ reason: "user" });
    },
    sendContextualUpdate: () => {},
    getInputVolume: () => 0,
    getOutputVolume: () => 0,
    getInputByteFrequencyData: () => new Uint8Array(8),
    isSpeaking: false,
  };
  const sdk: VoiceSdk = { Provider: ({ children }) => <>{children}</>, useConversation: (() => conversation) as unknown as VoiceSdk["useConversation"] };
  return { sdk, calls, agent: () => opts! };
}

const QUESTIONS = [
  { text: "Walk me through your path to payments.", kind: "opener" as const, focus: "story" },
  { text: "Tell me about a conversion win.", kind: "behavioral" as const, focus: "A/B testing" },
  { text: "How would you debug a checkout drop?", kind: "role" as const, focus: "SQL" },
];
const iv = (over: Partial<PublicInterview> = {}): PublicInterview => ({
  id: "iv_test_0001",
  resumeId: "cv_1",
  tailoringId: null,
  jobTitle: "Senior PM",
  company: "Globex",
  mode: "voice",
  status: "ready",
  questions: QUESTIONS,
  answers: [],
  report: null,
  appliedAdds: [],
  refunded: false,
  error: null,
  createdAt: new Date().toISOString(),
  ...over,
});
const REPORT = {
  overall: 71,
  summary: "Clear numbers. Name your own role.",
  answers: [{ index: 0, score: 8, worked: ["Specific result"], missing: ["Your role"], stronger: "I led…", addToCv: { experienceIndex: 0, company: "Acme", role: "PM", bullet: "Cut drop-off 18% with a one-page checkout", quote: "cut drop-off by 18 percent" } }],
};

let posts: { url: string; body: unknown }[] = [];
let serverStatus: PublicInterview["status"] = "scoring";
let tokenStatus = 200;

beforeEach(() => {
  posts = [];
  serverStatus = "scoring";
  tokenStatus = 200;
  // Node 25's own global localStorage shadows happy-dom's and has no setItem: use a real one.
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  });
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: async () => ({ getTracks: () => [{ stop() {} }] }) } });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;
      if (init?.method === "POST") posts.push({ url, body });
      const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
      if (url.endsWith("/token")) return tokenStatus === 200 ? json({ attempt: posts.filter((p) => p.url.endsWith("/token")).length - 1, token: "tok", seconds: 900, variables: {} }) : json({ error: "This practice has ended" }, tokenStatus);
      if (url.endsWith("/connect")) return json({ ok: true });
      if (url.endsWith("/apply")) return json({ doc: {}, lastSeq: 1, version: { id: "v1", number: 1 } });
      if (url.endsWith("/finish")) return json({ interview: iv({ status: "scoring" }) });
      if (url.endsWith("/answers")) return json({ interview: iv({ mode: "text", status: "done", answers: body.answers, report: REPORT }) });
      if (url === "/api/interview/iv_test_0001") return json({ interview: iv({ status: serverStatus, answers: [{ index: 0, text: "At Acme I cut drop-off by 18 percent." }], report: serverStatus === "done" ? REPORT : null }) });
      return json({}, 404);
    }),
  );
  vi.useFakeTimers({ shouldAdvanceTime: true });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const mount = (initial: PublicInterview, sdk?: VoiceSdk) =>
  render(
    <TooltipProvider>
      <InterviewRoom initial={initial} sdk={sdk} />
    </TooltipProvider>,
  );

describe("InterviewRoom", () => {
  it("voice: shows the question the interviewer marks, ends once, then polls into the debrief", async () => {
    const f = fakeSdk();
    mount(iv(), f.sdk);
    fireEvent.click(screen.getByRole("button", { name: /start interview/i }));
    await act(() => vi.advanceTimersByTimeAsync(10));
    await waitFor(() => expect(f.calls.start).toBe(1));
    act(() => f.agent().onConnect?.({ conversationId: "conv_abc123" }));
    expect(screen.getByText("Getting started")).toBeTruthy();

    act(() => void f.agent().clientTools!.begin_question({ number: 2 }));
    expect(screen.getByText("Question 2 of 3")).toBeTruthy();
    expect(screen.getByText(QUESTIONS[1].text)).toBeTruthy();
    // Bad marks change nothing.
    act(() => void f.agent().clientTools!.begin_question({ number: 9 }));
    expect(screen.getByText("Question 2 of 3")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /end interview/i }));
    await act(() => vi.advanceTimersByTimeAsync(10));
    expect(posts.filter((p) => p.url.endsWith("/finish"))).toHaveLength(1);
    expect(posts.find((p) => p.url.endsWith("/connect"))?.body).toEqual({ conversationId: "conv_abc123" });
    expect(screen.getByText("Scoring your answers", { selector: "p" })).toBeTruthy();

    serverStatus = "done";
    await act(() => vi.advanceTimersByTimeAsync(3100));
    await waitFor(() => expect(screen.getByText(REPORT.summary)).toBeTruthy());
    expect(posts.filter((p) => p.url.endsWith("/finish"))).toHaveLength(1);
  });

  it("voice: a dropped line reconnects and resumes at the question it was on", async () => {
    const f = fakeSdk();
    mount(iv(), f.sdk);
    fireEvent.click(screen.getByRole("button", { name: /start interview/i }));
    await act(() => vi.advanceTimersByTimeAsync(10));
    await waitFor(() => expect(f.calls.start).toBe(1));
    act(() => f.agent().onConnect?.({ conversationId: "conv_first1" }));
    act(() => void f.agent().clientTools!.begin_question({ number: 3 }));
    act(() => f.agent().onDisconnect?.({ reason: "error", message: "network" } as never));
    await act(() => vi.advanceTimersByTimeAsync(1000));
    await waitFor(() => expect(f.calls.start).toBe(2));
    const tokens = posts.filter((p) => p.url.endsWith("/token"));
    expect(tokens.map((t) => t.body)).toEqual([{ startAt: 0 }, { startAt: 2 }]);
    expect(posts.filter((p) => p.url.endsWith("/finish"))).toHaveLength(0);
  });

  it("voice: a session that can't take another call offers the feedback instead", async () => {
    tokenStatus = 410;
    mount(iv({ status: "live" }), fakeSdk().sdk);
    fireEvent.click(screen.getByRole("button", { name: /resume interview/i }));
    await waitFor(() => expect(screen.getByText("This practice has ended")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: /get feedback/i }));
    await act(() => vi.advanceTimersByTimeAsync(10));
    expect(posts.filter((p) => p.url.endsWith("/finish"))).toHaveLength(1);
  });

  it("text: one question at a time, skipped ones left out, posted once", async () => {
    mount(iv({ mode: "text" }));
    expect(screen.getByText("1 of 3")).toBeTruthy();
    fireEvent.change(screen.getByLabelText(QUESTIONS[0].text), { target: { value: "  At Acme I cut checkout drop-off by 18 percent.  " } });
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByText("2 of 3")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /skip/i }));
    expect(screen.getByText("3 of 3")).toBeTruthy();
    fireEvent.change(screen.getByLabelText(QUESTIONS[2].text), { target: { value: "Segment by device and payment method first." } });
    fireEvent.click(screen.getByRole("button", { name: /get feedback/i }));
    await waitFor(() => expect(screen.getByText(REPORT.summary)).toBeTruthy());
    const sent = posts.filter((p) => p.url.endsWith("/answers"));
    expect(sent).toHaveLength(1);
    expect(sent[0].body).toEqual({
      answers: [
        { index: 0, text: "At Acme I cut checkout drop-off by 18 percent." },
        { index: 2, text: "Segment by device and payment method first." },
      ],
    });
  });

  it("text: drafts survive a reload", async () => {
    const first = mount(iv({ mode: "text" }));
    fireEvent.change(screen.getByLabelText(QUESTIONS[0].text), { target: { value: "Draft answer that should stay." } });
    first.unmount();
    mount(iv({ mode: "text" }));
    await waitFor(() => expect((screen.getByLabelText(QUESTIONS[0].text) as HTMLTextAreaElement).value).toBe("Draft answer that should stay."));
  });

  it("debrief: adds a spoken fact to the CV once", async () => {
    mount(iv({ status: "done", answers: [{ index: 0, text: "At Acme I cut drop-off by 18 percent." }], report: REPORT }));
    fireEvent.click(screen.getByRole("button", { name: /add to cv/i }));
    await waitFor(() => expect(screen.getByText("On your CV")).toBeTruthy());
    expect(posts.filter((p) => p.url.endsWith("/apply")).map((p) => p.body)).toEqual([{ index: 0 }]);
    expect(screen.queryByRole("button", { name: /add to cv/i })).toBeNull();
  });
});
