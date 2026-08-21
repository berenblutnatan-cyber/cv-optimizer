// Track-specific calibration. Source skills: tech-resume-optimizer,
// executive-resume-writer, academic-cv-builder, creative-portfolio-resume,
// career-changer-translator.
//
// Dedup rule: these are DELTAS on top of blocks/bullets.ts — never restate
// the base formulas/verbs here. Each track carries two flavors:
//   auditLens    — what a reviewer for this track additionally demands
//   writeFormula — how rewrites for this track should be shaped

import type { Track } from "../types";

type TrackPack = { auditLens: string; writeFormula: string };

const TRACKS: Record<Track, TrackPack> = {
  tech: {
    auditLens: `TECH LENS: expect concrete tech per bullet and technical metrics — scale ("500K DAU", "10K req/s", "50TB daily"), performance ("500ms → 200ms"), reliability ("99.99% uptime"), cost ("cut AWS spend 40%"). Flag: tool soup without outcomes, missing GitHub/portfolio for engineering roles, skills list with skill-bars or MS Office, tutorial-grade projects presented as experience.`,
    writeFormula: `TECH FORMULA: [Action Verb] + [Technical What] + [Scale/Impact] + [Technology Used] — e.g. "Optimized PostgreSQL queries and added Redis caching, cutting API latency 60% (500ms→200ms) for 100K DAU." Name real technologies from the CV; keep the skills section grouped (Languages / Frameworks / Cloud / Tools).`,
  },
  executive: {
    auditLens: `EXECUTIVE LENS: the bar is "so what", not "what" — expect strategic scope on every recent role: P&L or budget owned, org size, geography, transformation outcomes. Flag: tactical task bullets on senior roles, missing company-context (stage, revenue, headcount), individual-contributor framing, no board/advisory or exec-development signals for C-level targets.`,
    writeFormula: `EXECUTIVE FORMULA: [Leadership Action] + [Strategic Initiative] + [Business Outcome at Scale] — e.g. "Orchestrated post-merger integration across 3 business units (600 staff), delivering $12M in synergies a year early." Transformation shape: "Inherited [situation]. Implemented [strategic change]. Achieved [outcome]." Add a company-context line under each role (revenue/stage/headcount/span). Verbs: spearheaded, orchestrated, catalyzed, steered — never tactical verbs on exec roles.`,
  },
  academic: {
    auditLens: `ACADEMIC LENS: judge as a CV, not a resume — completeness beats brevity. Expect: publications with correct author-order signaling, grants with role (PI/Co-PI/Co-I) and amounts, teaching + mentoring records, service. Flag: missing dissertation/advisor detail, publications without venues/years, grants without role or amount, industry-style "impact bullets" replacing scholarly records.`,
    writeFormula: `ACADEMIC FORMULA: preserve scholarly conventions — grants as "AGENCY MECHANISM (Role) Title, $total ($X to my lab), years"; teaching as course + level + enrollment; mentoring with mentee outcomes. Bold the person's name in author lists if formatting allows. Do not compress the record to 1 page.`,
  },
  creative: {
    auditLens: `CREATIVE LENS: the portfolio is the product — expect a prominent portfolio link and case-study-ready project entries (problem → approach → outcome with a metric). Flag: missing portfolio URL, decorative-skills lists without shipped work, no client/brand names where they exist, bullets describing tools instead of outcomes.`,
    writeFormula: `CREATIVE FORMULA: every project bullet = [What you made] + [For whom/context] + [Measured outcome] — e.g. "Redesigned checkout flow for 2M-visitor store, lifting mobile conversion 18%→41%." Lead with the portfolio link. Keep the CV itself ATS-safe (single column, standard headers); the designed version lives in the portfolio.`,
  },
  general: { auditLens: "", writeFormula: "" },
};

export function trackAuditLens(track: Track): string {
  return TRACKS[track].auditLens;
}

export function trackWriteFormula(track: Track): string {
  return TRACKS[track].writeFormula;
}

/** Career-pivot overlay (career-changer-translator). Writing surfaces only. */
export const CAREER_CHANGE_OVERLAY = `CAREER-CHANGE TRANSLATION: reframe true experience in the target industry's language — e.g. teaching: lesson plans→training curriculum, classroom management→group facilitation, IEPs→individual development plans · military: platoon→cross-functional team, mission→initiative, intel→data analysis · retail/hospitality: guests→customers, upselling→revenue growth, service recovery→customer retention · healthcare: EMR→enterprise systems, rounds→status reviews. Keep every fact true; only the vocabulary crosses over. Lead bullets with the transferable function (leadership, budget, stakeholder management, analysis) rather than the industry-specific task.`;
