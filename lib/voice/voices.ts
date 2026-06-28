// The set of voices the OpenAI Realtime agent (`gpt-realtime`) can speak in.
// The voice is chosen by the user before a session starts and is set once at
// session-creation time — the Realtime API does not allow changing the voice
// mid-session after audio has been produced.
//
// This is the single source of truth: the client picker renders VOICE_OPTIONS,
// and the session route validates the incoming voice against VOICE_IDS so we
// never forward an arbitrary string to OpenAI.

export type VoiceOption = {
  /** OpenAI Realtime voice id. */
  id: string;
  /** Short human label shown in the picker. */
  label: string;
  /** One-line character description. */
  blurb: string;
};

export const VOICE_OPTIONS: VoiceOption[] = [
  { id: "verse", label: "Verse", blurb: "Warm & expressive" },
  { id: "cedar", label: "Cedar", blurb: "Natural & grounded" },
  { id: "marin", label: "Marin", blurb: "Bright & friendly" },
  { id: "coral", label: "Coral", blurb: "Upbeat & clear" },
  { id: "ash", label: "Ash", blurb: "Calm & low" },
  { id: "sage", label: "Sage", blurb: "Measured & thoughtful" },
];

export const DEFAULT_VOICE = "verse";

const VOICE_IDS = new Set(VOICE_OPTIONS.map((v) => v.id));

/** Returns the voice if it's one we offer, otherwise the default. */
export function normalizeVoice(voice: unknown): string {
  return typeof voice === "string" && VOICE_IDS.has(voice) ? voice : DEFAULT_VOICE;
}
