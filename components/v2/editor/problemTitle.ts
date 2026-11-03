import { msg } from "@/lib/i18n/config";

type T = (source: string, vars?: Record<string, string | number>) => string;

// The free local checks (lib/optimizer/localChecks) title their problems in
// English. Static titles are dictionary keys; counted ones are matched here
// so the count moves into a placeholder. test/guards/local-check-titles.test.ts fails when wording here drifts.
const COUNTED: { re: RegExp; one: string; many: string }[] = [
  { re: /^Strengthen (\d+) weak bullets?$/, one: msg("Strengthen 1 weak bullet"), many: msg("Strengthen {n} weak bullets") },
  { re: /^Replace (\d+) clichés?$/, one: msg("Replace 1 cliché"), many: msg("Replace {n} clichés") },
  { re: /^Tighten (\d+) long bullets?$/, one: msg("Tighten 1 long bullet"), many: msg("Tighten {n} long bullets") },
  { re: /^Cover (\d+) more keywords? from the job$/, one: msg("Cover 1 more keyword from the job"), many: msg("Cover {n} more keywords from the job") },
];

export function problemTitle(title: string, t: T): string {
  for (const c of COUNTED) {
    const m = c.re.exec(title);
    if (m) {
      const n = Number(m[1]);
      return n === 1 ? t(c.one) : t(c.many, { n });
    }
  }
  return t(title);
}
