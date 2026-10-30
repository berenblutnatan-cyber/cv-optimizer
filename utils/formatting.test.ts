import { describe, expect, it } from "vitest";
import { formatBulletPoint, formatJobTitle, formatName, toTitleCase } from "./formatting";

describe("formatters never rewrite deliberate casing", () => {
  it.each([
    ["B.Sc. in Industrial Engineering", "B.Sc. in Industrial Engineering"],
    ["iOS Engineer", "iOS Engineer"],
    ["VP of Product", "VP of Product"],
    ["Head of DevRel", "Head of DevRel"],
  ])("job title %s", (input, out) => expect(formatJobTitle(input)).toBe(out));

  it.each([
    ["DeShawn McDonald", "DeShawn McDonald"],
    ["Ludwig van Beethoven", "Ludwig van Beethoven"],
    ["Dana Levi", "Dana Levi"],
  ])("name %s", (input, out) => expect(formatName(input)).toBe(out));

  it("still tidies text with no casing at all", () => {
    expect(formatJobTitle("senior product manager")).toBe("Senior Product Manager");
    expect(formatJobTitle("VP OF PRODUCT")).toBe("VP of Product");
    expect(formatName("dana levi")).toBe("Dana Levi");
    expect(formatName("o'connor")).toBe("O'Connor");
    expect(toTitleCase("head of sales")).toBe("Head of Sales");
  });

  it("does not capitalize a bullet that opens with a self-cased word", () => {
    expect(formatBulletPoint("iOS app rebuilt in SwiftUI")).toBe("iOS app rebuilt in SwiftUI");
    expect(formatBulletPoint("eBay integration shipped")).toBe("eBay integration shipped");
    expect(formatBulletPoint("led a team of 6")).toBe("Led a team of 6");
  });
});
