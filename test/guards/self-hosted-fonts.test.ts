import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// next/font/google downloads fonts during `next build`. Google sometimes answers
// with gstatic.com/l/font?kit=… URLs that Turbopack cannot resolve, and the
// production build dies: Rubik on 2026-10-31, Playfair on 2026-11-01, each with
// no code change involved. Fonts live in lib/fonts, so a build never needs Google.

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.(tsx?|css)$/.test(p) ? [p] : [];
  });
}

describe("fonts", () => {
  it("nothing fetches fonts from Google at build time", () => {
    const offenders = ["app", "components", "lib"]
      .flatMap(files)
      .filter((f) => /next\/font\/google|fonts\.googleapis\.com/.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });
});
