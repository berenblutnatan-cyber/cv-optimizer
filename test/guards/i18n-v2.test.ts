import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { he } from "@/lib/i18n/he";
import { heV2 } from "@/lib/i18n/he.v2";
import { TOOLS } from "@/lib/toolkit/tools";

// The v2 surfaces that replaced translated legacy pages (Start, the free
// score, Pricing, the toolkit) and the shell around them must stay fully
// Hebrew: every t("…") key there needs an entry, or it silently renders in
// English for Hebrew users. Add a file here when you translate it.

const TRANSLATED = [
  "components/v2/AppNav.tsx",
  "components/v2/AccountNav.tsx",
  "components/ui/field.tsx",
  "components/v2/start/StartFlow.tsx",
  "app/(v2)/score/page.tsx",
  "app/(v2)/pricing/page.tsx",
  "app/(v2)/toolkit/page.tsx",
  "app/(v2)/toolkit/[tool]/page.tsx",
  "components/v2/toolkit/ToolRunner.tsx",
];

const dict: Record<string, string> = { ...he, ...heV2 };

function keysIn(file: string): string[] {
  const src = readFileSync(file, "utf8");
  return [...src.matchAll(/\bt\(\s*"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1].replace(/\\"/g, '"'));
}

describe("v2 Hebrew coverage", () => {
  it("every string on a translated surface has a Hebrew entry", () => {
    const missing = TRANSLATED.flatMap((f) => keysIn(f).filter((k) => !(k in dict)).map((k) => `${f}: ${k}`));
    expect(missing).toEqual([]);
  });

  it("every toolkit label, placeholder and option is translated", () => {
    const keys = Object.values(TOOLS).flatMap((s) => [s.title, s.tagline, ...s.fields.flatMap((f) => [f.label, f.placeholder ?? "", ...(f.options ?? [])]), ...s.output.map((o) => o.label)]);
    // Numbers (word counts) read the same in both languages.
    expect(keys.filter((k) => k && !/^\d+$/.test(k) && !(k in dict))).toEqual([]);
  });

  it("placeholders survive translation", () => {
    const vars = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    for (const [en, heText] of Object.entries(heV2)) expect(vars(heText), en).toEqual(vars(en));
  });
});
