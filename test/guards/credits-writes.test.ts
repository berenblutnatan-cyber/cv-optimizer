import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// User.credits changes ONLY through lib/billing/ledger (charge/grant/revoke),
// which writes the ledger row in the same transaction. A direct
// increment/decrement elsewhere skips the ledger and the row lock: that is
// how balances went negative and purchases went unrecorded before M3.

const ROOTS = ["app", "lib", "components", "hooks", "stores", "scripts"];
const ALLOWED = [join("lib", "billing")];

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

const PATTERNS = [
  /\bcredits\s*:\s*\{\s*(increment|decrement|set|multiply|divide)\b/, // Prisma atomic ops (any line breaks)
  /"credits"\s*=\s*"?credits"?/i, // raw SQL SET credits = credits ...
  /SET\s+"?credits"?\s*=/i,
];

describe("credit writes", () => {
  it("happen only in lib/billing", () => {
    const offenders: string[] = [];
    for (const root of ROOTS) {
      for (const f of files(root)) {
        if (ALLOWED.some((a) => f.startsWith(a))) continue;
        const text = readFileSync(f, "utf8");
        for (const re of PATTERNS) {
          for (const m of text.matchAll(new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g"))) {
            const line = text.slice(0, m.index).split("\n").length;
            offenders.push(`${f}:${line}: ${m[0].replace(/\s+/g, " ")}`);
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
