import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import picomatch from "next/dist/compiled/picomatch";

// The PDF route runs headless Chromium, whose binary ships only if
// next.config's outputFileTracingIncludes matches the route. With the key
// "/api/cv/[id]/pdf" a real `next build` traced none of the binary's files
// (checked in .next/server/app/api/cv/[id]/pdf/route.js.nft.json), so every
// PDF would have failed on Vercel; "/api/cv/*/pdf" traces all four.

const config = createRequire(import.meta.url)("../../next.config.js");

describe("PDF route tracing", () => {
  it("ships Chromium's files with /api/cv/[id]/pdf", () => {
    const includes: Record<string, string[]> = config.outputFileTracingIncludes ?? {};
    const files = Object.entries(includes)
      .filter(([glob]) => picomatch(glob, { dot: true, contains: true })("/api/cv/[id]/pdf"))
      .flatMap(([, f]) => f);
    expect(files.some((f) => f.includes("@sparticuz/chromium/bin"))).toBe(true);
  });

  it("never puts a [segment] in a tracing key", () => {
    expect(Object.keys(config.outputFileTracingIncludes ?? {}).filter((k) => /[[\]]/.test(k))).toEqual([]);
  });

  it("keeps Chromium out of the bundle", () => {
    expect(config.serverExternalPackages).toEqual(expect.arrayContaining(["@sparticuz/chromium", "puppeteer-core"]));
  });
});
