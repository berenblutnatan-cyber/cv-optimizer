import { describe, expect, it } from "vitest";
import { signWebhook, verifyWebhookSignature, WEBHOOK_TOLERANCE_SEC } from "./elevenlabs";

const SECRET = "wsec_test_0123456789abcdef";
const body = JSON.stringify({ type: "post_call_transcription", data: { conversation_id: "c1" } });

describe("ElevenLabs webhook signature", () => {
  const now = 1_800_000_000;
  it("accepts a correct signature", () => {
    expect(verifyWebhookSignature(body, signWebhook(body, SECRET, now), SECRET, now)).toBe(true);
  });
  it("rejects a changed body, a wrong secret, or no header", () => {
    const sig = signWebhook(body, SECRET, now);
    expect(verifyWebhookSignature(body.replace("c1", "c2"), sig, SECRET, now)).toBe(false);
    expect(verifyWebhookSignature(body, sig, "another_secret_value", now)).toBe(false);
    expect(verifyWebhookSignature(body, null, SECRET, now)).toBe(false);
    expect(verifyWebhookSignature(body, "v0=abc", SECRET, now)).toBe(false);
  });
  it("rejects a replay outside the tolerance window", () => {
    const old = now - WEBHOOK_TOLERANCE_SEC - 1;
    expect(verifyWebhookSignature(body, signWebhook(body, SECRET, old), SECRET, now)).toBe(false);
  });
  it("accepts any matching v0 during a secret rotation", () => {
    const good = signWebhook(body, SECRET, now).split(",")[1];
    expect(verifyWebhookSignature(body, `t=${now},v0=deadbeef,${good}`, SECRET, now)).toBe(true);
  });
});
