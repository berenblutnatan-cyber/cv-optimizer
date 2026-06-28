// Hebrew translation map. Keys are the exact English source strings used at the
// call site; values are the Hebrew translation. Any English string NOT present
// here renders in English (graceful fallback). Keep entries grouped by area so
// the map stays maintainable as coverage grows.
//
// Interpolation: use {name} placeholders, e.g.
//   t("Step {n} of {total}", { n: 2, total: 5 })  ->  "שלב 2 מתוך 5"

import { generatedHe } from "./he.generated";

// Curated, hand-checked translations for the highest-traffic surfaces. These
// take priority over the auto-generated bulk map (see the spread at the bottom),
// so any machine translation can be overridden by editing an entry here.
const core: Record<string, string> = {
  // ── Global nav / header / footer ───────────────────────────────────────────
  "Sign In": "התחברות",
  "Sign Up": "הרשמה",
  "Sign in": "התחברות",
  "Sign up": "הרשמה",
  "Get Started": "בואו נתחיל",
  "Get started": "בואו נתחיל",
  "Resume Builder": "בונה קורות החיים",
  "Resume builder": "בונה קורות החיים",
  Optimizer: "אופטימיזציה",
  Builder: "בנייה",
  Score: "ציון",
  "CV Score Check": "בדיקת ציון קורות חיים",
  Pricing: "תמחור",
  "Resume Examples": "דוגמאות קורות חיים",
  "Interview Prep": "הכנה לראיון",
  Privacy: "פרטיות",
  Terms: "תנאים",
  "Refund Policy": "מדיניות החזרים",
  Contact: "צור קשר",
  Dashboard: "לוח בקרה",
  Home: "בית",
  "How it works": "איך זה עובד",
  Templates: "תבניות",
  Stories: "סיפורים",
  "© 2026 Hired. All rights reserved.": "© 2026 Hired. כל הזכויות שמורות.",
  "Don't just apply. Get Hired.": "אל תסתפקו בהגשה. תתקבלו לעבודה.",

  // ── Language toggle ────────────────────────────────────────────────────────
  "Switch to Hebrew": "עבור לעברית",
  "Switch to English": "עבור לאנגלית",
  עברית: "עברית",
  English: "English",
  Language: "שפה",

  // ── Common actions / buttons ───────────────────────────────────────────────
  Continue: "המשך",
  Back: "חזרה",
  Next: "הבא",
  Cancel: "ביטול",
  Save: "שמירה",
  Close: "סגירה",
  Done: "סיום",
  Edit: "עריכה",
  Delete: "מחיקה",
  Download: "הורדה",
  Upload: "העלאה",
  Submit: "שליחה",
  Retry: "נסה שוב",
  "Try again": "נסה שוב",
  Loading: "טוען",
  "Loading…": "טוען…",
  "Coming soon": "בקרוב",
  Free: "חינם",
  New: "חדש",
  "Learn more": "מידע נוסף",
  "Start now": "התחל עכשיו",
  "Start for free": "התחל בחינם",
  "Upgrade": "שדרוג",
  "Upgrade now": "שדרג עכשיו",

  // ── Landing / hero ─────────────────────────────────────────────────────────
  "Build a resume that gets you hired":
    "בנו קורות חיים שיביאו אתכם לעבודה",
  "AI Resume Builder & Optimizer": "בונה ומשפר קורות חיים מבוסס AI",
  "Build a resume that gets you hired with our AI-powered resume builder and optimizer.":
    "בנו קורות חיים שיביאו אתכם לעבודה עם בונה ומשפר קורות החיים החכם שלנו.",
  "Upload your CV": "העלו את קורות החיים שלכם",
  "I have an existing CV": "יש לי קורות חיים קיימים",
  "Create from scratch": "צרו מאפס",
  "See how it works": "ראו איך זה עובד",
  "The rewrite engine": "מנוע הניסוח מחדש",
  "One line decides whether they keep reading.":
    "שורה אחת מחליטה אם ימשיכו לקרוא.",
  "Hired turns the lines you’d actually write into the ones a recruiter repeats out loud. Same job — sharper proof.":
    "Hired הופך את השורות שהייתם כותבים לשורות שמגייס חוזר עליהן בקול. אותה עבודה — הוכחה חדה יותר.",
  "Before a human ever sees it": "עוד לפני שאדם רואה אותם",
  "Your résumé is read twice.": "קורות החיים שלכם נקראים פעמיים.",
  "First by software deciding if you’re worth forwarding. Then by a person deciding if you’re worth meeting. Most tools write for one. Hired writes for both.":
    "קודם תוכנה שמחליטה אם שווה להעביר אתכם הלאה. אחר כך אדם שמחליט אם שווה להיפגש איתכם. רוב הכלים כותבים לאחד. Hired כותב לשניהם.",
  "The templates": "התבניות",
  "Built to survive the scan and earn the read.":
    "בנויות לעבור את הסריקה ולזכות בקריאה.",
  "Every layout parses cleanly for the software and looks composed to the person. Start with one — switch anytime, nothing’s locked in.":
    "כל פריסה נקראת נקי על ידי התוכנה ונראית מוקפדת לאדם. התחילו עם אחת — החליפו מתי שתרצו, שום דבר לא ננעל.",
  "+ 9 more in the studio": "+ עוד 9 בסטודיו",
  "Start with a template": "התחילו עם תבנית",
  "Early signals": "סימנים מוקדמים",
  "What people tell us after the rewrite.": "מה אנשים מספרים לנו אחרי הניסוח מחדש.",
  "Quotes from anonymized user interviews. Outcomes vary.":
    "ציטוטים מראיונות משתמשים אנונימיים. התוצאות משתנות.",
  "Stop tweaking. Get": "די להתעסק. הגיע הזמן",
  // Shared emphasis word: works as the gold-highlighted word in both the landing
  // CTA ("…הגיע הזמן לעבודה.") and the onboarding hero ("…שמביאים אתכם לעבודה.").
  "hired.": "לעבודה.",
  "Let’s build a CV that gets you": "בואו נבנה קורות חיים שמביאים אתכם",
  "See where your résumé stands in 60 seconds — no signup, no card.":
    "גלו איפה קורות החיים שלכם עומדים ב-60 שניות — בלי הרשמה, בלי כרטיס.",
  "Check your score — free": "בדקו את הציון שלכם — חינם",
  "or build one from scratch": "או בנו קורות חיים מאפס",
  "Continue building": "המשיכו לבנות",

  // ── Pricing ────────────────────────────────────────────────────────────────
  "Choose your plan": "בחרו את התוכנית שלכם",
  "Most popular": "הכי פופולרי",
  "per month": "לחודש",
  "/month": "/חודש",
  Unlimited: "ללא הגבלה",
  Pro: "פרו",
  Ultimate: "אולטימייט",
  Credits: "קרדיטים",

  // ── Optimizer / score ──────────────────────────────────────────────────────
  "Resume Score": "ציון קורות החיים",
  "Optimize your resume": "שפרו את קורות החיים שלכם",
  "Analyzing your resume…": "מנתחים את קורות החיים שלכם…",
  "Drop your resume here": "גררו לכאן את קורות החיים",
  "Upload resume": "העלו קורות חיים",
  "Paste job description": "הדביקו את תיאור המשרה",

  // ── CV section headings (used by templates) ────────────────────────────────
  Experience: "ניסיון תעסוקתי",
  "Work Experience": "ניסיון תעסוקתי",
  Education: "השכלה",
  Skills: "כישורים",
  Projects: "פרויקטים",
  Languages: "שפות",
  Summary: "תקציר",
  "Professional Summary": "תקציר מקצועי",
  Certifications: "הסמכות",
  Awards: "פרסים",
  "Contact Information": "פרטי קשר",
  References: "ממליצים",
  Interests: "תחומי עניין",
  Volunteer: "התנדבות",
  Publications: "פרסומים",

  // ── Backfill: keys found in code that the bulk merge missed ─────────────────
  or: "או",
  Preview: "תצוגה מקדימה",
  Optimized: "ממוטב",
  ATS: "ATS",
  PRO: "PRO",
  "PROFESSIONAL TITLE": "תפקיד מקצועי",
  "London, UK": "תל אביב, ישראל",
  "Got it — that's in. Now paste the job post you're targeting (or its title) and I'll score your match. Or say \"just score it\" for a general review.":
    "קיבלתי — זה נקלט. עכשיו הדביקו את המשרה שאתם מכוונים אליה (או את הכותרת שלה) ואני אדרג את ההתאמה שלכם. או אמרו \"פשוט תדרג\" לסקירה כללית.",
  "Got your CV. Now paste the job post you're targeting (or its title) — or say \"just score it\" for a general review.":
    "קיבלתי את קורות החיים שלכם. עכשיו הדביקו את המשרה שאתם מכוונים אליה (או את הכותרת שלה) — או אמרו \"פשוט תדרג\" לסקירה כללית.",
};

// Final dictionary: bulk auto-generated translations first, curated core last so
// curated entries win on any key collision.
export const he: Record<string, string> = { ...generatedHe, ...core };
