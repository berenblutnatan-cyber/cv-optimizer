// @vitest-environment happy-dom
import * as React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { applyDocumentOp, emptyDocument, type ResumeDocument } from "@/lib/resume/document";
import { TooltipProvider } from "@/components/ui/tooltip";
import { VoicePanel, type VoiceSdk } from "./VoicePanel";

// The call UI against a scripted SDK. Like the real one, the fake fires
// onDisconnect synchronously inside endSession(). Two bugs this pins down:
// - every voice edit re-rendered the panel, which rebuilt the tool bridge and
//   remounted the connection: the call hung up after the first edit;
// - End → endSession → onDisconnect → finish ran again and again (hundreds of
//   POST /end), because the phase ref only changed on the next render.

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
  const sdk: VoiceSdk = {
    Provider: ({ children }) => <>{children}</>,
    useConversation: (() => conversation) as unknown as VoiceSdk["useConversation"],
  };
  return { sdk, calls, agent: () => opts! };
}

let posted: string[] = [];

beforeEach(() => {
  posted = [];
  vi.useFakeTimers({ shouldAdvanceTime: true });
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia: async () => ({ getTracks: () => [{ stop() {} }] }) },
  });
  (window as unknown as { RTCPeerConnection: unknown }).RTCPeerConnection = function () {};
  vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    if (method === "POST") posted.push(url);
    const body =
      method === "GET"
        ? { free: true, credits: 0, seconds: 300, unlimited: false, balance: 1, available: true }
        : url.endsWith("/api/voice/sessions")
          ? { sessionId: "sess_test_0001", attempt: 0, token: "tok", seconds: 300, variables: {} }
          : url.endsWith("/end")
            ? { versionNumber: 2, edits: 2 }
            : { ok: true };
    return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
  });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

/** The editor around the panel: a real reducer, and new inline props on every render (as a parent may pass). */
function Editor({ sdk }: { sdk: VoiceSdk }) {
  const [doc, setDoc] = React.useState<ResumeDocument>(emptyDocument());
  const ref = React.useRef(doc);
  ref.current = doc;
  const [, bump] = React.useState(0);
  return (
    <TooltipProvider>
      <div data-testid="name">{doc.content.personalInfo.name}</div>
      <VoicePanel
        cvId="cv1"
        signedIn
        sdk={sdk}
        applyVoice={(name, input) => {
          const next = applyDocumentOp(ref.current, name, input);
          if (next === ref.current) return false;
          ref.current = next;
          setDoc(next);
          return true;
        }}
        getDoc={() => ref.current}
        settle={async () => true}
        onEdit={() => bump((n) => n + 1)}
        onUseChat={() => {}}
        onKeepEditing={() => {}}
      />
    </TooltipProvider>
  );
}

async function startCall() {
  const fake = fakeSdk();
  render(<Editor sdk={fake.sdk} />);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(50);
  });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Tap to talk" }));
    await vi.advanceTimersByTimeAsync(50);
  });
  // The connection starts on the next tick (dev double-mount guard).
  await act(async () => {
    await vi.advanceTimersByTimeAsync(10);
  });
  expect(fake.calls.start).toBe(1);
  await act(async () => fake.agent().onConnect?.({ conversationId: "conv_1" }));
  return fake;
}

describe("VoicePanel", () => {
  it("keeps the call up while the agent edits the CV", async () => {
    const fake = await startCall();
    const tools = fake.agent().clientTools as Record<string, (p: unknown) => string>;
    await act(async () => {
      tools.update_personal_info({ name: "Dana" });
    });
    await act(async () => {
      tools.add_experience({ company: "Acme", role: "PM" });
      await vi.advanceTimersByTimeAsync(100);
    });
    expect(screen.getByTestId("name").textContent).toBe("Dana");
    expect(screen.getByText("Added PM at Acme")).toBeTruthy();
    expect(fake.calls.end).toBe(0);
    expect(fake.calls.start).toBe(1);
    expect(screen.getByRole("button", { name: /End/ })).toBeTruthy();
  });

  it("End hangs up once, saves once, and lands on the saved version", async () => {
    const fake = await startCall();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /End/ }));
      await vi.advanceTimersByTimeAsync(100);
    });
    expect(posted.filter((u) => u.endsWith("/end"))).toHaveLength(1);
    expect(fake.calls.end).toBeLessThanOrEqual(2);
    expect(screen.getByText("Saved as v2")).toBeTruthy();
  });

  it("a failed end request still leaves the panel, never stuck on Saving", async () => {
    await startCall();
    vi.stubGlobal("fetch", async () => {
      throw new TypeError("offline");
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /End/ }));
      await vi.advanceTimersByTimeAsync(100);
    });
    expect(screen.queryByText("Saving…")).toBeNull();
    expect(screen.getByText("Saved")).toBeTruthy();
  });

  it("an agent hang-up ends the call the same way", async () => {
    const fake = await startCall();
    await act(async () => {
      fake.agent().onDisconnect?.({ reason: "agent" });
      await vi.advanceTimersByTimeAsync(100);
    });
    expect(posted.filter((u) => u.endsWith("/end"))).toHaveLength(1);
    expect(screen.getByText("Saved as v2")).toBeTruthy();
  });
});
