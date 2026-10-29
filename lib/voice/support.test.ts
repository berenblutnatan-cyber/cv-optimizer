import { describe, expect, it } from "vitest";
import { voiceSupportFor } from "./support";

const SAFARI = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1";
const INSTAGRAM = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0.0.0.0";
const FACEBOOK = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/480.0.0.0]";
const LINKEDIN = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [LinkedInApp]/9.30";

describe("voice browser support", () => {
  it("real browsers can talk", () => expect(voiceSupportFor(SAFARI, true, true)).toBe("ok"));
  it("in-app browsers are sent to a real browser", () => {
    for (const ua of [INSTAGRAM, FACEBOOK, LINKEDIN]) expect(voiceSupportFor(ua, true, true)).toBe("in_app");
  });
  it("no mic or no WebRTC can't talk", () => {
    expect(voiceSupportFor(SAFARI, false, true)).toBe("unsupported");
    expect(voiceSupportFor(SAFARI, true, false)).toBe("unsupported");
  });
});
