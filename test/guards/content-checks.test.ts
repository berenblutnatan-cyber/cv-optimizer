import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// "Add role" leaves a blank entry, so `experience.length > 0` once said a CV
// with no experience had some: the checklist ticked it, the free score rose,
// and paid runs (tailor, cover letter, interview) took a credit for nothing.
// "Does this CV have X" goes through lib/resume/substance. An array length may
// only count slots where slots are the point.

const ROOTS = ["lib", "app/(v2)", "app/api", "components/v2"];
const LENGTH_CHECK = /\.(experience|education|skills|projects|certifications)\.length\s*(?:[<>]=?|[!=]==?)\s*\d|\.(experience|education|skills|projects|certifications)\.length\s*(?:&&|\?)/;

// Where the number of slots is what's wanted, not whether they hold words.
const ALLOWED = new Set([
  "lib/resume/substance.ts",
  "lib/optimizer/parseCv.ts", // "did the parser find anything at all", before any user edit
  "lib/builder/fitSuggestions.ts", // trims long skill lists on what withoutBlanks already cleaned
  "components/v2/editor/SectionEditor.tsx", // the editor lists slots, blank ones included
  "lib/resume/plainText.ts", // reads withoutBlanks
  "lib/builder/capacity.ts", // reads withoutBlanks
  "lib/export/docx.ts", // reads the template view, built from withoutBlanks
]);

function files(dir: string): string[] {
  let out: string[] = [];
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (f === "node_modules" || f.startsWith(".")) continue;
    if (statSync(p).isDirectory()) out = out.concat(files(p));
    else if (/\.(ts|tsx)$/.test(f) && !/\.test\.tsx?$/.test(f)) out.push(p);
  }
  return out;
}

describe("content checks", () => {
  it("never decide 'has experience' from an array length", () => {
    const hits = ROOTS.flatMap(files)
      .filter((p) => !ALLOWED.has(p.split("\\").join("/")))
      .flatMap((p) =>
        readFileSync(p, "utf8")
          .split("\n")
          .map((line, i) => (LENGTH_CHECK.test(line) ? `${p}:${i + 1}: ${line.trim()}` : null))
          .filter(Boolean),
      );
    expect(hits).toEqual([]);
  });
});
