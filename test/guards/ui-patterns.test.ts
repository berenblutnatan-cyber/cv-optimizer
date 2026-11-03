import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// Each of these was hand-rolled several times before one shared control
// existed, and the copies drifted (four copy buttons, four page-title styles).
// New code uses the shared control; this keeps it that way.

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.tsx$/.test(p) && !/\.test\.tsx$/.test(p) ? [p] : [];
  });
}

const V2 = ["app/(v2)", "components/v2"].flatMap(files);

describe("shared UI patterns", () => {
  it("app pages title themselves with PageTitle", () => {
    const offenders = V2.filter((f) => /<h1 className="[^"]*\btext-h1\b/.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });

  it("copying goes through CopyButton", () => {
    const offenders = V2.filter((f) => readFileSync(f, "utf8").includes("navigator.clipboard"));
    expect(offenders).toEqual([]);
  });

  it("deleting a CV or a job asks for a hold, not a click", () => {
    for (const f of ["components/v2/cv/CvCard.tsx", "components/v2/jobs/JobDrawer.tsx"]) {
      const src = readFileSync(f, "utf8");
      expect(src, f).toContain("<HoldButton");
      expect(src, f).not.toMatch(/<Button variant="danger"[^>]*>\s*Delete/);
    }
  });
});
