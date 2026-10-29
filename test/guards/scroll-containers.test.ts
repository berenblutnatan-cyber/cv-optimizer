import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// A scroll container must be positioned. Absolutely positioned descendants
// (every sr-only label is one) are clipped by an overflow container only when
// it, or something inside it, is their containing block. Otherwise they keep
// their place in the page and stretch it: in M5 the tailor panel's sr-only
// labels made the full-height editor scroll 3,000px.

const ROOTS = ["components/v2", "components/ui", "app/(v2)"];

function files(dir: string): string[] {
  let out: string[] = [];
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) out = out.concat(files(p));
    else if (/\.tsx$/.test(f) && !/\.test\.tsx$/.test(f)) out.push(p);
  }
  return out;
}

describe("scroll containers", () => {
  it("every overflow-auto class list also positions the element", () => {
    const bad: string[] = [];
    for (const p of ROOTS.flatMap(files)) {
      const src = readFileSync(p, "utf8");
      for (const m of src.matchAll(/"[^"\n]*\boverflow-(?:y-|x-)?auto\b[^"\n]*"/g)) {
        if (!/\b(relative|absolute|fixed|sticky)\b/.test(m[0])) bad.push(`${p}: ${m[0]}`);
      }
    }
    expect(bad).toEqual([]);
  });
});
