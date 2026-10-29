import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// Two document shapes share the Resume table: legacy (dataVersion 1, bare
// ResumeData) and v2 (dataVersion 2, the op-logged document). A writer that
// doesn't know which one it holds overwrites the other: the legacy autosave
// once replaced v2 CVs with old local drafts. So only two places may write
// Resume rows: the v2 store, and the legacy route, which is limited to
// dataVersion 1. Anything else goes through lib/resume/store.

const ROOTS = ["app", "lib", "components", "hooks", "stores", "scripts"];
const WRITE = /\b(?:prisma|tx|db)\.resume\.(?:create|createMany|update|updateMany|upsert|delete|deleteMany)\b/;

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

describe("Resume writers", () => {
  it("only the v2 store and the dataVersion-1 legacy route write Resume rows", () => {
    const writers = ROOTS.flatMap(files)
      .filter((p) => WRITE.test(readFileSync(p, "utf8")))
      .sort();
    expect(writers).toEqual([join("app", "api", "resume", "route.ts"), join("lib", "resume", "store.ts")].sort());
  });

  it("the legacy route scopes every read and write to dataVersion 1", () => {
    const src = readFileSync(join("app", "api", "resume", "route.ts"), "utf8");
    const calls = src.match(/prisma\.resume\.\w+\(\{[\s\S]*?\}\)/g) ?? [];
    expect(calls.length).toBeGreaterThan(0);
    for (const c of calls.filter((c) => !/findUniqueOrThrow/.test(c))) expect(c).toMatch(/LEGACY/);
  });
});
