// Bullet-writing + quantification expertise.
// Source skills: resume-bullet-writer MERGED WITH resume-quantifier (their
// 60% overlap is deduped here — this file is the only home for
// quantification facts). Curated, no unsourced stats.

/** Injected into the REWRITE pass and reused by writing surfaces. */
export const BULLET_STANDARDS = `BULLET FORMULAS (use one per bullet):
- X-Y-Z: "Accomplished [X] as measured by [Y] by doing [Z]" — e.g. "Grew Instagram following 250% (5K→17.5K) by implementing a daily content calendar and influencer partnerships."
- CAR: Challenge → Action → Result — e.g. "Reduced customer churn by implementing proactive outreach, retaining 85% of at-risk accounts worth $500K ARR."
POWER VERBS (lead with one; never "Responsible for", "Helped with", "Worked on"):
Led, Spearheaded, Orchestrated · Delivered, Exceeded, Secured · Grew, Scaled, Accelerated · Built, Launched, Pioneered · Streamlined, Automated, Transformed · Analyzed, Diagnosed, Forecasted · Negotiated, Influenced, Facilitated · Resolved, Eliminated, Prevented.
QUANTIFY EVERY BULLET — at least one number or scope marker per bullet, 2-3 max. Metric types: money ($ generated/saved/managed) · percentages (growth, error reduction) · time (from X to Y, hours saved/week) · scale (team size, users, projects, customers) · before→after ("from 3.2 to 4.8/5").
WHEN THE CV HAS NO EXACT NUMBER (never invent one): keep the person's real facts and surface scope instead — team size, cadence ("30+ interviews", "weekly reports to 50+ stakeholders"), portfolio size. Formats that stay honest: "~40%", ranges "8-12", minimum bounds "100+". If no scope exists in the source material, write the bullet without a number — do NOT fabricate.
LENGTH: 1-2 lines per bullet. Cut filler; every word earns its place.`;

/** Injected into the AUDIT pass — what a demanding reviewer checks per bullet. */
export const BULLET_AUDIT_LENS = `BULLET QUALITY BAR (critique against this):
- Duties vs achievements: "Responsible for managing team" fails; "Led team of 12 to deliver $2M product, +35% revenue" passes.
- Every bullet should carry ≥1 real number or scope marker (money, %, time, team/user scale, before→after). Flag bullets with zero quantification AND name what metric type the role would expect (sales: quota %, deal size · support: tickets/day, CSAT · ops: cycle time, cost · eng: latency, uptime, scale · marketing: leads, conversion, ROI · PM: launches, adoption, revenue).
- Weak openers to flag: "Responsible for", "Helped", "Worked on", "Assisted with", "Participated in".
- Passive voice, vague nouns ("various projects", "multiple tasks"), and >2-line bullets are issues.`;
