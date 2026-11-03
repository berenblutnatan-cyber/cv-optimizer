import { describe, expect, it } from "vitest";
import { heV2 } from "@/lib/i18n/he.v2";
import { PEN_SAMPLE } from "@/lib/landing/penSample";

// Wordings that read as translated, not written, in Hebrew. Each was in the
// app once. Add a line when a new calque turns up.
const BANNED: [RegExp, string][] = [
  [/שמביאים (?:לכם )?(?:את )?העבודה/, "'get you hired' is about being accepted: שבזכותם מתקבלים"],
  [/מכתבי מקדים/, "the plural is מכתבים מקדימים"],
  [/פניות קרות/, "a calque of 'cold emails': פניות יזומות"],
  [/ראיון אימון/, "Israelis say סימולציית ראיון"],
  [/לא פגים לעולם/, "stilted: ללא תאריך תפוגה"],
  [/\bבכדי\b/, "plain כדי"],
  [/עושה (?:שכל|סנס)/, "a calque of 'makes sense': הגיוני"],
  [/בסוף היום/, "a calque of 'at the end of the day': בסופו של דבר"],
];

describe("Hebrew copy reads as written, not translated", () => {
  const texts = [...Object.entries(heV2), ...Object.entries(PEN_SAMPLE.he).map(([k, v]) => [k, JSON.stringify(v)] as const)];
  it.each(BANNED)("no %s", (pattern, why) => {
    const hits = texts.filter(([, he]) => pattern.test(he)).map(([en, he]) => `${en} → ${he} (${why})`);
    expect(hits).toEqual([]);
  });
});
