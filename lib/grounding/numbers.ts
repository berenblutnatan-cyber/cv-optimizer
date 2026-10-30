// Invented-number check for generated prose (cover letters, and anything else
// written from a CV). A number in the output that is in none of the sources is
// a claim the candidate never made. Pure and client-safe.
//
// What counts as a claim: any figure with a %, $/€/£, x or k/m/bn mark, or
// any bare number of two digits or more. Bare single digits ("2 roles",
// "4 engineers") are skipped: they are often spelled out in the CV and would
// mostly raise false alarms.

export type NumberClaim = { text: string; value: string };

const CLAIM = /(?<![\w.])([$€£]\s?)?(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s?(%|x\b|k\b|m\b|bn\b|million\b|billion\b|thousand\b)?/gi;

function canonical(num: string): string {
  const n = num.replace(/,/g, "");
  return n.includes(".") ? n.replace(/\.?0+$/, "") : n.replace(/^0+(?=\d)/, "");
}

/** Every figure in `text` that reads as a claim, with its canonical digits. */
export function numberClaims(text: string): NumberClaim[] {
  const out: NumberClaim[] = [];
  for (const m of text.matchAll(CLAIM)) {
    const [whole, currency, digits, unit] = m;
    const value = canonical(digits);
    const marked = !!currency || !!unit;
    if (!marked && value.replace(".", "").length < 2) continue;
    out.push({ text: whole.trim(), value });
  }
  return out;
}

/** The figures a source contains, so "18 percent" and "18%" both match 18. */
function sourceValues(sources: string[]): Set<string> {
  const values = new Set<string>();
  for (const s of sources) for (const m of s.matchAll(/\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?/g)) values.add(canonical(m[0]));
  return values;
}

/** Claims in `text` whose number appears in no source. Each listed once. */
export function inventedNumbers(text: string, sources: string[]): string[] {
  const known = sourceValues(sources);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const c of numberClaims(text)) {
    if (known.has(c.value) || seen.has(c.text)) continue;
    seen.add(c.text);
    out.push(c.text);
  }
  return out;
}
