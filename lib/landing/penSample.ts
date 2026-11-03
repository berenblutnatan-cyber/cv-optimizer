import type { Lang } from "@/lib/i18n/config";

// The hero's example CV, written natively in each language rather than
// translated line by line: a Hebrew page shows a Hebrew CV. The rewrites match
// the wording the rest of the landing uses for the same example.

export type PenSample = {
  name: string;
  role: string;
  score: string;
  experience: string;
  weak1: string;
  fix1: [string, string];
  /** The number highlighted at the end of fix1[1]. */
  fix1Mark: string;
  weak2: string;
  fix2: [string, string];
  notes: { verb: string; number: string; job: string };
  swaps: [[string, string], [string, string]];
  stamp: string;
};

export const PEN_SAMPLE: Record<Lang, PenSample> = {
  en: {
    name: "Alex Morgan",
    role: "Senior Product Manager",
    score: "Score",
    experience: "Experience",
    weak1: "Worked on onboarding for new users",
    fix1: ["Launched self-serve onboarding", "that lifted activation"],
    fix1Mark: "34%",
    weak2: "Responsible for a team",
    fix2: ["Led a 12-person squad across", "engineering, design and data"],
    notes: { verb: "Stronger verb", number: "Your real number", job: "Matches the job" },
    swaps: [["Helped", "Led"], ["Worked on", "Launched"]],
    stamp: "HIRED",
  },
  he: {
    name: "נועה כהן",
    role: "מנהלת מוצר בכירה",
    score: "ציון",
    experience: "ניסיון",
    weak1: "עבדתי על הקליטה של משתמשים חדשים",
    fix1: ["השקתי קליטה עצמאית", "שהעלתה את האקטיבציה ב-"],
    fix1Mark: "34%",
    weak2: "אחראית על צוות",
    fix2: ["הובלתי צוות של 12 אנשים", "מפיתוח, עיצוב ודאטה"],
    notes: { verb: "פועל חזק יותר", number: "המספר האמיתי שלך", job: "מתאים למשרה" },
    swaps: [["עזרתי", "הובלתי"], ["עבדתי על", "השקתי"]],
    stamp: "התקבלת!",
  },
};
