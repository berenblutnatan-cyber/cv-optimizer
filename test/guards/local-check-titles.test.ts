import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { he } from "@/lib/i18n/he";
import { heV2 } from "@/lib/i18n/he.v2";
import { problemTitle } from "@/components/v2/editor/problemTitle";
import { hasEnglish } from "./jsx-literals";

// The Tailor panel shows the free local checks' problem titles, which
// lib/optimizer/localChecks writes in English. Every title it can produce must
// come out Hebrew, so a rewording there can't slip English onto a Hebrew page.

const dict: Record<string, string> = { ...he, ...heV2 };
const t = (s: string, vars?: Record<string, string | number>) => (dict[s] ?? s).replace(/\{(\w+)\}/g, (m, k) => (vars && k in vars ? String(vars[k]) : m));
const src = readFileSync("lib/optimizer/localChecks.ts", "utf8");

/** A template title with its count filled in: `${n === 1 ? "" : "s"}` picks the plural, any other `${…}` is the count. */
const fill = (tpl: string, n: number) => tpl.replace(/\$\{[^}]*=== 1 \? "" : "s"\}/g, n === 1 ? "" : "s").replace(/\$\{[^}]*\}/g, String(n));

describe("local check titles", () => {
  const plain = [...src.matchAll(/\btitle: "((?:[^"\\]|\\.)*)"/g)].map((m) => m[1]);
  const counted = [...src.matchAll(/\btitle: `([^`]*)`/g)].map((m) => m[1]);

  it("finds the titles", () => {
    expect(plain.length).toBeGreaterThan(5);
    expect(counted.length).toBeGreaterThan(2);
  });

  it("every title reads in Hebrew", () => {
    const titles = [...plain, ...counted.flatMap((c) => [fill(c, 1), fill(c, 3)])];
    expect(titles.filter((title) => hasEnglish(problemTitle(title, t)))).toEqual([]);
  });
});
