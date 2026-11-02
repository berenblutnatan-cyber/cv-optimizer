// Israeli CV expertise: local format, Hebrew style, and turning military service
// into civilian language. Example figures show where a number goes; every real
// number comes from the candidate (see truth.ts).

export const ISRAELI_OVERLAY = `ISRAELI CV:
FORMAT: one page, 300-450 words. Years only in dates ("2021–2024"). Recently released: service right after the summary. Student: education first.
HEBREW: open bullets with a verbal noun (ניהול, הובלה, הדרכה, תכלול, הטמעה, ייעול), no first person ("ניהלתי" → "ניהול"), no full stop, digits for numbers, no slash forms (קצין/ה). Never the same opener twice in a row. Only the summary may use gendered language, in the candidate's own gender.
BANNED IN HEBREW: "אחראי על" as an opener, "עזרה ב", "עסקתי ב", "בעל מוטיבציה גבוהה", "יחסי אנוש מצוינים", "ראש גדול", "יכולת למידה מהירה", "וכו'", "תפקיד מאתגר".
MILITARY ROLE LINE: civilian title first, military title in brackets, then unit: "Team Leader (Squad Commander) — Golani Brigade, 2019–2021". Never an unexplained abbreviation (מ"כ, רס"פ, חמ"ל). First English mention: "Israel Defense Forces (IDF)".
TRANSLATIONS: מ"כ → team leader · מ"מ → platoon leader · מש"קית ת"ש → welfare and case coordinator · קצין לוגיסטיקה, רס"פ → logistics and inventory manager · חמ"ל → operations coordinator, control room · מודיעין → research and data analysis · מדריך → instructor, trainer · תחקיר → post-mortem review · שבצ"ק → shift scheduling.
NUMBERS TO ASK FOR: people led or trained, weekly or per-shift volume, equipment or budget value, certification rate, rank among peers, early promotion, chosen to instruct.
TITLES: describe what the person actually did, never the job they want.
CLASSIFIED: never ask for or write targets, systems, places or operation names. Write the civilian function, corps level, scale and skills: "Analyst, technology unit, Intelligence Corps (details classified)". If unsure, ask what may be written.`;

export const ANONYMIZE_STANDARDS = `ANONYMOUS CV FOR MILITARY VETERANS: a minimal edit, not a rewrite. Change only what identifies the role.
GENERALIZE, in every section including title and summary:
- The exact role → its function at the same seniority: "fighter pilot" → "officer in an operational role"; "8200 researcher" → "analyst in a technology unit".
- Unit, squadron, battalion or base name or number → corps or unit type only.
- Aircraft, weapons, classified technology, operation names, places, sectors, cross-border activity → general wording ("complex operational systems", "operational activity").
- Terms that give the role away without naming it: sorties → operational missions; flew → carried out; ambushes, raids → operational activity; flying, diving, parachuting, signals intelligence, VIP security → omit the activity, keep corps and seniority.
- Anything that identifies the person through the role, such as a tiny exact headcount of role holders or a uniquely named course.
KEEP WORD FOR WORD: every non-identifying number exactly as written (no rounding, no "about"), rank, years, scale, results, honours, the writing style and verbs, skills, education, languages, volunteering, civilian experience, the CV's language and the person's gender.
Role lines stay "Role — Place, years", where the place is the corps: "Operations Officer (Captain) — Israeli Air Force, 2019–2025".
NEVER invent anything or add or drop achievements. When generalizing, keep the role's weight; never shrink it.`;
