import { describeToolCall } from "@/lib/chat/cvTools";
import type { ResumeDocument } from "@/lib/resume/document";
import { toolResultText, VOICE_TOOL_NAMES, voiceOpId } from "./protocol";

// Browser side of one voice connection: turns the agent's client tool calls
// into saved CV edits, numbered in arrival order (the numbering the server
// replays the transcript under). Framework-free, so it is tested directly.

export type BridgeDeps = {
  /** Apply + queue for saving under this id. True when the CV changed. */
  applyVoice: (name: string, input: Record<string, unknown>, clientOpId: string, voiceSessionId: string) => boolean;
  getDoc: () => ResumeDocument;
  onEdit?: (label: string) => void;
};

export class VoiceToolBridge {
  private n = 0;
  constructor(
    private readonly sessionId: string,
    private readonly attempt: number,
    private readonly deps: BridgeDeps,
  ) {}

  /** Calls handled so far on this connection. */
  get count(): number {
    return this.n;
  }

  handle(name: string, params: unknown): string {
    // Number first: the transcript has this call whatever happens to it here.
    const clientOpId = voiceOpId(this.sessionId, this.attempt, this.n++);
    const input = params && typeof params === "object" && !Array.isArray(params) ? (params as Record<string, unknown>) : {};
    let changed = false;
    try {
      changed = this.deps.applyVoice(name, input, clientOpId, this.sessionId);
    } catch (err) {
      console.error("[voice] tool failed", name, err);
    }
    if (changed) this.deps.onEdit?.(describeToolCall(name, input));
    return toolResultText(name, input, this.deps.getDoc().content, changed);
  }

  /** One handler per CV tool, in the shape the ElevenLabs SDK takes. */
  clientTools(): Record<string, (params: unknown) => string> {
    return Object.fromEntries([...VOICE_TOOL_NAMES].map((name) => [name, (params: unknown) => this.handle(name, params)]));
  }
}
