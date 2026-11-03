// @vitest-environment happy-dom
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { PenHero } from "@/components/v2/landing/PenHero";
import { PEN_SAMPLE } from "@/lib/landing/penSample";
import { hasEnglish } from "@/test/guards/jsx-literals";

// The hero's example CV was English on the Hebrew home page too, so that page
// mixed two languages. The sample now follows the page's language.

beforeAll(() => {
  window.matchMedia ??= ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} })) as never;
  globalThis.IntersectionObserver ??= class { observe() {} disconnect() {} } as never;
});
afterEach(cleanup);

describe("landing hero sample", () => {
  it("is all Hebrew, and right to left, on a Hebrew page", () => {
    const { container } = render(<PenHero copy={null} exampleLabel="קורות חיים לדוגמה" sample={PEN_SAMPLE.he} dir="rtl" />);
    expect(hasEnglish(container.textContent ?? "")).toBe(false);
    expect(container.querySelector(".cp-stage")?.getAttribute("dir")).toBe("rtl");
  });

  it("stays English on an English page", () => {
    const { container } = render(<PenHero copy={null} exampleLabel="Example CV" sample={PEN_SAMPLE.en} dir="ltr" />);
    expect(container.textContent).toContain("Alex Morgan");
    expect(container.textContent).not.toMatch(/[֐-׿]/);
  });

  it("gives both languages every line", () => {
    const shape = (o: object): string[] => Object.entries(o).flatMap(([k, v]) => (typeof v === "object" ? shape(v).map((s) => `${k}.${s}`) : [k]));
    expect(shape(PEN_SAMPLE.he)).toEqual(shape(PEN_SAMPLE.en));
    for (const v of Object.values(PEN_SAMPLE.he).flat(2)) if (typeof v === "string") expect(v.trim()).not.toBe("");
  });
});
