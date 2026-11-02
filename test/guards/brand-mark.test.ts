import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { markSvg } from "@/lib/brand/mark";

// The logo drifted once: the header drew a letter while the favicon and the old
// pages kept an earlier design. One geometry now feeds all of them.

describe("brand mark", () => {
  it("serves the favicon from the shared geometry", () => {
    expect(readFileSync("app/icon.svg", "utf8")).toBe(markSvg());
  });

  it("gives iOS a PNG, the only format Next serves as an apple-icon", () => {
    expect(existsSync("app/apple-icon.svg")).toBe(false);
    const png = readFileSync("app/apple-icon.png");
    expect(png.readUInt32BE(16)).toBe(180);
    expect(png.readUInt32BE(20)).toBe(180);
  });

  it("ships a favicon.ico for clients that ignore SVG", () => {
    const ico = readFileSync("app/favicon.ico");
    expect(ico.readUInt16LE(2)).toBe(1);
    expect(ico.readUInt16LE(4)).toBe(3);
  });

  it.each(["components/Logo.tsx", "components/v2/AppHeader.tsx", "components/v2/design/Gallery.tsx"])("%s draws the shared mark", (file) => {
    const src = readFileSync(file, "utf8");
    expect(src).toContain("HiredMark");
    expect(src).not.toMatch(/>H<\/span>|<svg/);
  });
});
