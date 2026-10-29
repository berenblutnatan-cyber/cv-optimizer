// Can this browser hold a voice call? Checked before anything is charged.
// In-app browsers (Instagram, Facebook, LinkedIn, TikTok…) block or break the
// microphone, so they are sent to a real browser instead.

export type VoiceSupport = "ok" | "in_app" | "unsupported";

const IN_APP = /FBAN|FBAV|FB_IAB|Instagram|LinkedInApp|TikTok|musical_ly|Bytedance|Snapchat|Line\/|MicroMessenger/i;

export function voiceSupportFor(ua: string, hasMedia: boolean, hasRtc: boolean): VoiceSupport {
  if (IN_APP.test(ua)) return "in_app";
  if (!hasMedia || !hasRtc) return "unsupported";
  return "ok";
}

export function readVoiceSupport(): VoiceSupport {
  if (typeof window === "undefined") return "ok";
  return voiceSupportFor(navigator.userAgent, !!navigator.mediaDevices?.getUserMedia, typeof window.RTCPeerConnection === "function");
}
