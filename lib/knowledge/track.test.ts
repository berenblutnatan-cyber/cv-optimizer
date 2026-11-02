import { describe, expect, it } from "vitest";
import { detectIsraeli } from "./track";

describe("detectIsraeli", () => {
  it("catches Hebrew text and Israeli service markers", () => {
    expect(detectIsraeli("ניהול צוות")).toBe(true);
    expect(detectIsraeli("Team Leader, IDF, 2019-2021")).toBe(true);
    expect(detectIsraeli(null, "Analyst, Intelligence Corps")).toBe(true);
  });

  it("leaves other CVs alone", () => {
    expect(detectIsraeli("Product Manager at Stripe, Dublin")).toBe(false);
    expect(detectIsraeli("Solidified the team", undefined)).toBe(false);
  });
});
