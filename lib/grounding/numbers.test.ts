import { describe, expect, it } from "vitest";
import { inventedNumbers, numberClaims } from "./numbers";

const CV = "Led checkout redesign, lifting conversion 18%. Managed a $2,400,000 budget. Ran 14 pricing experiments. 2019 – 2024.";

describe("numberClaims", () => {
  it("finds marked figures and multi-digit numbers, skips bare single digits", () => {
    expect(numberClaims("Grew revenue 3x and cut costs 12% with 4 engineers over 18 months for $80k").map((c) => c.text)).toEqual(["3x", "12%", "18", "$80k"]);
  });
  it("normalises separators and trailing zeros", () => {
    expect(numberClaims("$2,400,000 and 1.50").map((c) => c.value)).toEqual(["2400000", "1.5"]);
  });
});

describe("inventedNumbers", () => {
  it("passes figures that are on the CV, however they are written", () => {
    expect(inventedNumbers("I lifted conversion by 18 percent and ran 14 experiments on a $2,400,000 budget since 2019.", [CV])).toEqual([]);
  });
  it("flags figures that are on no source, once each", () => {
    expect(inventedNumbers("I lifted conversion 25% and grew revenue 3x. Again: 25%.", [CV])).toEqual(["25%", "3x"]);
  });
  it("a figure from the job post is not invented", () => {
    expect(inventedNumbers("You need 5+ years; I bring 10 years.", [CV, "5+ years of product experience"])).toEqual(["10"]);
  });
  it("ignores digits glued to words (Q4, v2, H1B)", () => {
    expect(inventedNumbers("Shipped v2 in Q4 for H1B holders.", [CV])).toEqual([]);
  });
});
