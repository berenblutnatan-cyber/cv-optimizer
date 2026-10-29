import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// A CSS grid with only responsive column rules (`grid sm:grid-cols-2`) has an
// implicit `auto` column below the breakpoint, whose minimum is its widest
// child's min-content: one long `truncate` title pushes the page sideways on
// a phone (the /cv list did, 2026-10-29). A base `grid-cols-N` gives
// minmax(0, 1fr) columns. This guard keeps every v2 grid that way.

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : p.endsWith(".tsx") ? [p] : [];
  });
}

describe("v2 grids", () => {
  it("every responsive grid declares a base column count", () => {
    const offenders: string[] = [];
    for (const f of [...files("components/v2"), ...files("app/(v2)"), ...files("components/ui")]) {
      for (const m of readFileSync(f, "utf8").matchAll(/className="([^"]*)"/g)) {
        const toks = m[1].split(/\s+/);
        if (!toks.includes("grid")) continue;
        const responsive = toks.some((t) => /^(sm|md|lg|xl|2xl):grid-cols-/.test(t));
        const base = toks.some((t) => /^grid-cols-/.test(t));
        if (responsive && !base) offenders.push(`${f}: ${m[1]}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
