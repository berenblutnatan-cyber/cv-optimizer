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

  // ── Build onboarding — role step (multi-role + skip) ─────────────────────────
  "Skip for now": "דלגו לעת עתה",
  "Add one or more — we’ll tailor your CV to them. Not sure yet? You can skip this.":
    "הוסיפו אחת או יותר — נתאים את קורות החיים אליהן. עדיין לא בטוחים? אפשר לדלג.",
  "These are just examples — type any role. You can change these anytime.":
    "אלה רק דוגמאות — הקלידו כל משרה. תמיד אפשר לשנות.",

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

  // ── Build onboarding: single start question + role dropdown + fresh start ──
  "How would you like to build it?": "איך תרצו לבנות אותם?",
  "Already have a CV? Upload it and skip the questions — otherwise pick how we work together.":
    "כבר יש לכם קורות חיים? העלו אותם ודלגו על השאלות — אחרת בחרו איך נעבוד יחד.",
  "Chat with your coach": "שוחחו עם המאמן",
  "Answer a few quick questions — it writes each section as you talk.":
    "ענו על כמה שאלות קצרות — הוא כותב כל חלק תוך כדי שיחה.",
  "Talk it out": "דברו את זה",
  "Have a real voice conversation — it builds your CV as you speak.":
    "נהלו שיחה קולית אמיתית — קורות החיים נבנים בזמן שאתם מדברים.",
  "Pick from the list or type your own — add more than one if you’re weighing options. Not sure yet? Just continue.":
    "בחרו מהרשימה או הקלידו בעצמכם — אפשר להוסיף יותר מתפקיד אחד אם אתם מתלבטים. עדיין לא בטוחים? פשוט המשיכו.",
  "Show role suggestions": "הצגת הצעות לתפקידים",
  "Common roles": "תפקידים נפוצים",
  "Continue where you left off": "המשיכו מאיפה שהפסקתם",
  "Create my first draft": "צרו את הטיוטה הראשונה שלי",
  "Getting your voice coach ready…": "מכינים את המאמן הקולי שלכם…",

  // ── Role dropdown options ───────────────────────────────────────────────────
  "Frontend Developer": "מפתח/ת פרונטאנד",
  "Backend Developer": "מפתח/ת בקאנד",
  "Full-Stack Developer": "מפתח/ת פול-סטאק",
  "Mobile Developer": "מפתח/ת מובייל",
  "DevOps Engineer": "מהנדס/ת DevOps",
  "QA Engineer": "מהנדס/ת QA",
  "Data Scientist": "מדען/ית נתונים",
  "Data Engineer": "מהנדס/ת נתונים",
  "Machine Learning Engineer": "מהנדס/ת למידת מכונה",
  "Program Manager": "מנהל/ת תוכנית",
  "Business Analyst": "אנליסט/ית עסקי/ת",
  "UX/UI Designer": "מעצב/ת UX/UI",
  "Graphic Designer": "מעצב/ת גרפי/ת",
  "Digital Marketing Specialist": "מומחה/ית שיווק דיגיטלי",
  "Content Writer": "כותב/ת תוכן",
  "Sales Manager": "מנהל/ת מכירות",
  "Account Executive": "מנהל/ת לקוחות",
  "Customer Success Manager": "מנהל/ת הצלחת לקוח",
  "HR Manager": "מנהל/ת משאבי אנוש",
  Recruiter: "מגייס/ת",
  "Financial Analyst": "אנליסט/ית פיננסי/ת",
  Accountant: "רואה/ת חשבון",
  "Operations Manager": "מנהל/ת תפעול",
  "Office Manager": "מנהל/ת משרד",
  "Executive Assistant": "עוזר/ת אישי/ת בכיר/ה",
  "Customer Support Representative": "נציג/ת תמיכת לקוחות",
  Teacher: "מורה",
  Nurse: "אח/ות",
  Lawyer: "עורך/ת דין",
  "Civil Engineer": "מהנדס/ת אזרחי/ת",
  "Mechanical Engineer": "מהנדס/ת מכונות",
  "Electrical Engineer": "מהנדס/ת חשמל",

  // ── Chat builder closings ───────────────────────────────────────────────────
  "Done — your CV's updated in the preview. Want me to tailor it to a specific role? Tell me the job or paste a link and I'll sharpen it.":
    "סיימתי — קורות החיים עודכנו בתצוגה המקדימה. רוצה שאתאים אותם לתפקיד מסוים? ספר/י לי על המשרה או הדבק/י קישור ואחדד אותם.",

  // ── Chat tool chips (streamed "✦ Updated…" labels) ─────────────────────────
  "Updated your details": "פרטיך עודכנו",
  "Updating your details…": "מעדכן את הפרטים…",
  "Wrote your summary": "התקציר נכתב",
  "Writing your summary…": "כותב את התקציר…",
  "Added a role": "נוסף תפקיד",
  "Added {role}": "נוסף תפקיד: {role}",
  "Added a role at {company}": "נוסף תפקיד ב־{company}",
  "Added {role} at {company}": "נוסף: {role} ב־{company}",
  "Adding a role…": "מוסיף תפקיד…",
  "Polished an experience entry": "רשומת ניסיון לוטשה",
  "Polishing an experience entry…": "מלטש רשומת ניסיון…",
  "Removed an experience entry": "רשומת ניסיון הוסרה",
  "Removing an experience entry…": "מסיר רשומת ניסיון…",
  "Added education": "נוספה השכלה",
  "Added education — {institution}": "נוספה השכלה — {institution}",
  "Adding education…": "מוסיף השכלה…",
  "Updated education": "ההשכלה עודכנה",
  "Updating education…": "מעדכן השכלה…",
  "Removed education": "השכלה הוסרה",
  "Removing education…": "מסיר השכלה…",
  "Updated skills ({count})": "כישורים עודכנו ({count})",
  "Updating skills…": "מעדכן כישורים…",
  "Added a project": "נוסף פרויקט",
  "Added project — {project}": "נוסף פרויקט — {project}",
  "Adding a project…": "מוסיף פרויקט…",
  "Updated a project": "פרויקט עודכן",
  "Updating a project…": "מעדכן פרויקט…",
  "Removed a project": "פרויקט הוסר",
  "Removing a project…": "מסיר פרויקט…",
  "Added a certification": "נוספה הסמכה",
  "Added {cert}": "נוספה הסמכה: {cert}",
  "Adding a certification…": "מוסיף הסמכה…",
  "Removed a certification": "הסמכה הוסרה",
  "Removing a certification…": "מסיר הסמכה…",
  "Added a section": "נוסף פרק",
  "Added “{title}”": "נוסף פרק „{title}”",
  "Adding a section…": "מוסיף פרק…",
  "Removed a section": "פרק הוסר",
  "Removing a section…": "מסיר פרק…",
  "Updated languages": "שפות עודכנו",
  "Updating languages…": "מעדכן שפות…",
  "Updated your CV": "קורות החיים עודכנו",
  "Updating your CV…": "מעדכן את קורות החיים…",
  "Styled your CV": "עיצוב קורות החיים עודכן",
  "Styling your CV…": "מעצב את קורות החיים…",

  // ── Streaming / anon-limit / history drawer (studio builder) ───────────────
  "Stop generating": "עצור יצירה",
  "Stopped — your CV is unchanged. Ask me anything else.": "נעצר — קורות החיים לא השתנו. אפשר לשאול אותי כל דבר אחר.",
  "You've used your free messages — nice progress!": "ניצלת את ההודעות החינמיות — התקדמות יפה!",
  "Sign up free to continue": "הרשמה חינם כדי להמשיך",
  "Create a free account to keep building. Your CV comes with you, and it saves to the cloud from here on.":
    "פתחו חשבון חינם כדי להמשיך לבנות. קורות החיים עוברים איתכם ונשמרים בענן מכאן והלאה.",
  "Your CV only lives on this device for now — clearing your browser loses it. Create a free account to save it to the cloud and open it anywhere.":
    "קורות החיים שמורים כרגע רק במכשיר הזה — ניקוי הדפדפן ימחק אותם. פתחו חשבון חינם כדי לשמור אותם בענן ולפתוח מכל מקום.",
  "Start a new CV? Your current one isn't saved to an account and will be cleared. Sign up first to keep it.":
    "להתחיל קורות חיים חדשים? הנוכחיים אינם שמורים בחשבון ויימחקו. כדאי להירשם קודם כדי לשמור אותם.",
  "Delete this CV? This can't be undone.": "למחוק את קורות החיים האלה? אי אפשר לבטל את הפעולה.",
  "Saving…": "שומר…",

  // ── Purchase success (plan-aware) ──────────────────────────────────────────
  "Unlimited is now active on your account.": "מנוי ללא הגבלה פעיל כעת בחשבונך.",
  "Your Job Search Pass is active — {days} days of Unlimited on your account.":
    "כרטיס חיפוש העבודה שלך פעיל — {days} ימים של שימוש ללא הגבלה בחשבונך.",
  "A receipt has been sent to your email. Cancel anytime.": "קבלה נשלחה למייל שלך. אפשר לבטל בכל עת.",
  "A receipt has been sent to your email. No auto-renew — the pass simply ends.":
    "קבלה נשלחה למייל שלך. ללא חידוש אוטומטי — הכרטיס פשוט מסתיים.",
  "Continue Your Optimization": "המשך האופטימיזציה שלך",
  "Your resume and job details are saved, right where you left off.": "קורות החיים ופרטי המשרה שמורים, בדיוק היכן שעצרת.",
  "Unlimited: cancel anytime": "ללא הגבלה: ביטול בכל עת",
  "/ month": "/ חודש",
  "Top up from $1 with no commitment — or go Unlimited for the whole search.":
    "טעינה החל מ־$1 ללא התחייבות — או ללא הגבלה לכל תקופת החיפוש.",

  // ── Analyze / score resilience ─────────────────────────────────────────────
  "This is taking longer than usual": "זה לוקח יותר זמן מהרגיל",
  "This is taking longer than usual — please try again.": "זה לוקח יותר זמן מהרגיל — נסו שוב.",
  "The analysis timed out — your inputs are untouched. Please try again.":
    "הניתוח חרג מהזמן — הנתונים שלך לא נפגעו. נסו שוב.",
  "Our analysis service hit a snag. Your inputs are safe — please try again.":
    "שירות הניתוח נתקל בתקלה. הנתונים שלך שמורים — נסו שוב.",
  "Our scoring service hit a snag. Your resume is still here — please try again.":
    "שירות הציונים נתקל בתקלה. קורות החיים עדיין כאן — נסו שוב.",

  // ── Applications tracker safety ────────────────────────────────────────────
  "Delete this application?": "למחוק את המועמדות הזו?",
  "This permanently removes it from your board. There's no undo.": "היא תוסר מהלוח לצמיתות. אין ביטול.",
  "Keep it": "השאר אותה",
  "Couldn't delete that application — it's been restored.": "לא הצלחנו למחוק את המועמדות — היא שוחזרה.",
  "Couldn't save that move — it's back where it was.": "לא הצלחנו לשמור את ההעברה — היא חזרה למקומה.",

  // ── Voice builder mobile preview + retry ───────────────────────────────────
  "Preview CV": "תצוגת קורות חיים",
  "Close preview": "סגור תצוגה מקדימה",
  "Live CV preview": "תצוגת קורות חיים חיה",
  "CV updated": "קורות החיים עודכנו",
  "We couldn't save your session": "לא הצלחנו לשמור את השיחה",
  "Your answers are safe on this device.": "התשובות שלך שמורות במכשיר הזה.",

  // ── Template gallery / preview zoom / download honesty ─────────────────────
  "All templates": "כל התבניות",
  "Clear search": "נקה חיפוש",
  "Fit page to screen": "התאם עמוד למסך",
  "Zoom in to read": "הגדל לקריאה",
  "Credit packs start at just $3.": "חבילות קרדיטים החל מ־$3 בלבד.",
  "You're out of credits. Top up to download your CV.": "נגמרו הקרדיטים. טענו מחדש כדי להוריד את קורות החיים.",
  "You need credits to download your CV. Credit packs start at just $3.":
    "צריך קרדיטים כדי להוריד את קורות החיים. חבילות החל מ־$3 בלבד.",
  "Download your CV as a PDF": "הורדת קורות החיים כ־PDF",
  "Same résumé, every template — pick your favorite and make it yours in the builder.":
    "אותם קורות חיים, בכל תבנית — בחרו את המועדפת והפכו אותה לשלכם בבונה.",
  "Our freshest layouts — every one ready to use in the builder.": "הפריסות החדשות ביותר — כולן מוכנות לשימוש בבונה.",
  "The full collection, shown with the same résumé for comparison.": "האוסף המלא, מוצג עם אותם קורות חיים להשוואה.",
  "Or open the Resume Builder →": "או פתחו את בונה קורות החיים ←",

  // ── Landing quote + in-app browser tip ─────────────────────────────────────
  "“I’d been editing the same bullet for a week. Hired rewrote it in one line — and it was the line I actually wanted to say.”":
    "„שבוע שלם ערכתי את אותה שורה. Hired ניסח אותה מחדש בשורה אחת — וזו הייתה בדיוק השורה שרציתי להגיד.”",
  "Tip: Tap the ⋯ menu icon and choose \"Open in Browser\".": "טיפ: הקישו על תפריט ⋯ ובחרו „פתיחה בדפדפן”.",
};

// Final dictionary: bulk auto-generated translations first, curated core last so
// curated entries win on any key collision.
export const he: Record<string, string> = { ...generatedHe, ...core };
