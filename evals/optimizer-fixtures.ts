// Golden set for the optimizer scoring eval.
//
// Each fixture targets a specific calibration in the scoring rubric. The
// `originalBand` is the score band the prompt's own calibration table says
// this fixture should land in. Keep these fixtures CONCISE — the cost of a
// run scales with prompt size, and prompt-size variance also drifts scores.

export type OptimizerFixture = {
  id: string;
  description: string;
  cvText: string;
  jobTitle?: string;
  jobDescription?: string;
  companyName?: string;
  mode?: "quick" | "specific_role";
  // Expected score range for the ORIGINAL CV (Phase 1 score).
  originalBand: [number, number];
  // Optional band for the optimized score, derived from the constraint table.
  optimizedBand?: [number, number];
  // Free-form assertions on the analysis output.
  assertions?: Array<{
    name: string;
    check: (analysis: AnalysisShape) => boolean | string;
  }>;
};

export type AnalysisShape = {
  scoreComparison?: {
    original?: { total?: number };
    optimized?: { total?: number };
    improvement?: number;
  };
  overallScore?: number;
  summary?: string;
  strengths?: string[];
  improvements?: Array<{ text: string; scoreImpact: number; category: string }>;
  missingKeySkills?: string[];
  keywords?: { present?: string[]; missing?: string[]; added?: string[] };
  optimizedCV?: string;
};

// Tiny CV bodies — enough signal for the model, small enough to keep eval
// costs reasonable. Names/companies are fictitious.

const PRODUCT_ANALYST_CV = `Maya Solomon
maya.solomon@example.com | +972-50-555-1234 | Tel Aviv | https://www.linkedin.com/in/maya-solomon-pa

PROFESSIONAL SUMMARY
Product Analyst with 3 years of experience in mobile-first consumer products.

EXPERIENCE
Product Analyst | Taboola | 2022 - Present
• Built dashboards in Looker tracking activation and retention across 8 mobile products
• Designed A/B tests that drove a 12% lift in 30-day retention on the recommendation feed
• Partnered with PMs and engineers across 4 squads to ship 3 monetization experiments per quarter

Junior Data Analyst | Lemonade | 2020 - 2022
• Maintained SQL/dbt models powering executive dashboards
• Investigated funnel drop-offs that informed a checkout redesign

EDUCATION
B.Sc. in Industrial Engineering | Technion - Israel Institute of Technology | 2020 | GPA: 3.7

SKILLS
SQL, Looker, Amplitude, A/B Testing, Python (pandas), Statistics, Product Analytics`;

const SENIOR_REACT_DEV_CV = `Daniel Park
daniel.park@example.com | +1-415-555-0100 | San Francisco, CA | https://www.linkedin.com/in/danielpark-fe

PROFESSIONAL SUMMARY
Senior Frontend Engineer with 7 years of experience building React applications at scale.

EXPERIENCE
Senior Frontend Engineer | Stripe | 2021 - Present
• Led the rebuild of the Dashboard's billing module, cutting render time from 1100ms to 240ms
• Mentored 4 engineers and ran the team's React component RFC process
• Drove migration to React 18 + Suspense for data fetching across 6 product surfaces

Frontend Engineer | Airbnb | 2018 - 2021
• Built host-onboarding flows in React + TypeScript serving 2M+ hosts annually
• Reduced bundle size by 35% via route-level code splitting

Junior Frontend Engineer | Airbnb | 2017 - 2018
• Shipped UI components used across the booking funnel

EDUCATION
B.S. Computer Science | UC Berkeley | 2017 | GPA: 3.85, Magna Cum Laude

SKILLS
React, TypeScript, Next.js, GraphQL, Webpack, Jest, Cypress, Accessibility`;

const JUNIOR_DEV_CV = `Ari Cohen
ari.cohen@example.com | +972-52-555-9000 | Haifa | https://www.linkedin.com/in/ari-cohen-dev

PROFESSIONAL SUMMARY
Frontend developer, recent bootcamp graduate.

EXPERIENCE
Junior Frontend Developer | Outbrain | 2024 - Present
• Built React components for the publisher dashboard

EDUCATION
ITC Fullstack Bootcamp | 2024
B.A. Communications | Hebrew University | 2023

SKILLS
JavaScript, React, HTML, CSS, Git`;

const LAWYER_CV = `Rachel Goldstein
rachel.goldstein@example.com | +972-54-555-2222 | Tel Aviv | https://www.linkedin.com/in/rachel-goldstein-law

PROFESSIONAL SUMMARY
Corporate lawyer with 5 years of M&A experience.

EXPERIENCE
Associate | Herzog Fox Neeman | 2020 - Present
• Negotiated and drafted SPAs for cross-border tech M&A transactions
• Managed due-diligence workstreams for 12+ deals annually

Junior Associate | Goldfarb Seligman | 2018 - 2020
• Supported partners on private equity and venture deals

EDUCATION
LL.B. Law | Tel Aviv University | 2018 | Magna Cum Laude

SKILLS
Contract drafting, Negotiation, Due diligence, Hebrew, English`;

const REACT_JD = `Senior React Engineer

We're hiring a Senior React Engineer to lead frontend on our growth platform.

Requirements:
- 5+ years building production React applications
- Strong TypeScript and Next.js experience
- Performance-tuning experience (bundle size, rendering, Core Web Vitals)
- Experience mentoring engineers and driving technical RFCs
- Comfort with GraphQL or REST API design

Nice to have:
- Experience with React 18 / Suspense / Server Components
- Accessibility (WCAG 2.2)
- Design-system contribution`;

const PRODUCT_ANALYST_JD = `Product Analyst, Growth

We are looking for a Product Analyst to join our Growth team.

You will:
- Build dashboards and self-serve analytics for PMs and growth marketers
- Design and analyze A/B tests on activation, onboarding, and monetization
- Partner with cross-functional squads to ship data-informed experiments

Requirements:
- 2+ years as a Product/Growth/Data Analyst at a consumer product company
- Strong SQL; experience with Amplitude or Mixpanel
- Experimentation experience (A/B testing, hypothesis design)
- Comfortable presenting findings to PMs and execs

Nice to have:
- Python (pandas) for ad-hoc analysis
- Experience with consumer mobile products`;

const SENIOR_PRODUCT_ANALYST_JD = `Senior Product Analyst (5+ years)

We are looking for a SENIOR Product Analyst with 5+ years of experience to mentor a team of 3 analysts and own the analytics roadmap for our growth org.

Requirements:
- 5+ years as a Product Analyst at consumer product companies
- Track record of leading projects and mentoring junior analysts
- Strong SQL, Amplitude/Mixpanel, A/B testing
- Experience building self-serve analytics platforms`;

const SOCIAL_WORKER_JD = `Licensed Clinical Social Worker

We are hiring a licensed clinical social worker to join our community mental health team.

REQUIREMENTS (non-negotiable):
- Master of Social Work (MSW) from an accredited program
- Active LCSW license
- 200+ supervised clinical hours
- Experience with trauma-informed care`;

export const FIXTURES: OptimizerFixture[] = [
  {
    id: "pa-pa-direct-match",
    description: "Product Analyst → Product Analyst (direct match, strong fit)",
    cvText: PRODUCT_ANALYST_CV,
    jobTitle: "Product Analyst",
    jobDescription: PRODUCT_ANALYST_JD,
    companyName: "Outbrain",
    originalBand: [78, 95],
    optimizedBand: [85, 99],
    assertions: [
      {
        name: "preserves LinkedIn URL verbatim",
        check: (a) =>
          (a.optimizedCV ?? "").includes("https://www.linkedin.com/in/maya-solomon-pa") ||
          "LinkedIn URL missing from optimizedCV",
      },
      {
        name: "preserves GPA in education",
        check: (a) => (a.optimizedCV ?? "").includes("3.7") || "GPA 3.7 missing",
      },
      {
        name: "preserves Taboola company name",
        check: (a) => (a.optimizedCV ?? "").includes("Taboola") || "Taboola missing",
      },
      {
        name: "preserves Lemonade company name",
        check: (a) => (a.optimizedCV ?? "").includes("Lemonade") || "Lemonade missing",
      },
    ],
  },
  {
    id: "react-react-direct-match",
    description: "Senior React Dev → Senior React Engineer (direct match)",
    cvText: SENIOR_REACT_DEV_CV,
    jobTitle: "Senior React Engineer",
    jobDescription: REACT_JD,
    companyName: "Acme",
    originalBand: [82, 95],
    optimizedBand: [88, 99],
    assertions: [
      {
        name: "preserves Stripe company name",
        check: (a) => (a.optimizedCV ?? "").includes("Stripe") || "Stripe missing",
      },
      {
        name: "preserves Magna Cum Laude honor",
        check: (a) =>
          /magna cum laude/i.test(a.optimizedCV ?? "") || "Magna Cum Laude missing",
      },
      {
        name: "all 3 experience entries preserved (RULE 1 anti-collapse)",
        check: (a) => {
          const cv = a.optimizedCV ?? "";
          return (
            (cv.includes("2021") && cv.includes("2018") && cv.includes("2017")) ||
            "expected all 3 role date ranges present (2017, 2018, 2021)"
          );
        },
      },
    ],
  },
  {
    id: "pa-senior-pa-seniority-gap",
    description: "Product Analyst (3y) → Senior Product Analyst (5y+ req) — seniority cap",
    cvText: PRODUCT_ANALYST_CV,
    jobTitle: "Senior Product Analyst",
    jobDescription: SENIOR_PRODUCT_ANALYST_JD,
    companyName: "Acme",
    originalBand: [55, 78],
    assertions: [
      {
        name: "honors seniority hard cap (no higher than 78)",
        check: (a) => {
          const s = a.scoreComparison?.original?.total ?? a.overallScore ?? 0;
          return s <= 78 || `score ${s} exceeds seniority cap`;
        },
      },
    ],
  },
  {
    id: "junior-dev-quickmode",
    description: "Junior dev quick mode — overall CV quality, not job match",
    cvText: JUNIOR_DEV_CV,
    mode: "quick",
    originalBand: [30, 65],
    assertions: [
      {
        name: "summary critiques presentation, not seniority gap",
        check: (a) =>
          !/seniority|years required|year gap/i.test(a.summary ?? "") ||
          "summary should not invoke seniority gap in quick mode",
      },
    ],
  },
  {
    id: "lawyer-dev-no-fit",
    description: "Lawyer → Software Engineer (career change, no tech)",
    cvText: LAWYER_CV,
    jobTitle: "Software Engineer",
    jobDescription: REACT_JD,
    originalBand: [15, 40],
    optimizedBand: [25, 60],
    assertions: [
      {
        name: "improvement stays bounded (≤ 28 pts for 35-54 tier)",
        check: (a) => {
          const orig = a.scoreComparison?.original?.total ?? 0;
          const opt = a.scoreComparison?.optimized?.total ?? 0;
          const delta = opt - orig;
          if (orig === 0 || opt === 0) return "missing scoreComparison fields";
          // Bounds derived from the prompt's MAXIMUM IMPROVEMENT BY ORIGINAL SCORE TIER table.
          const max = orig < 35 ? 22 : orig < 55 ? 28 : orig < 75 ? 32 : 20;
          return delta <= max + 2 /* tolerance */ || `delta ${delta} > tier max ${max}`;
        },
      },
    ],
  },
  {
    id: "lawyer-social-worker-hard-cap",
    description: "Lawyer → Social Worker (missing required MSW + LCSW)",
    cvText: LAWYER_CV,
    jobTitle: "Licensed Clinical Social Worker",
    jobDescription: SOCIAL_WORKER_JD,
    originalBand: [15, 40],
    optimizedBand: [20, 60],
    assertions: [
      {
        name: "missing required credential surfaces in improvements OR missingKeySkills",
        check: (a) => {
          const haystack = [
            ...(a.improvements ?? []).map((i) => i.text),
            ...(a.missingKeySkills ?? []),
          ].join(" ").toLowerCase();
          return (
            /(msw|lcsw|license|social work)/i.test(haystack) ||
            "expected MSW/LCSW gap to be called out"
          );
        },
      },
      {
        name: "optimized score doesn't escape the missing-credential cap (orig + 20)",
        check: (a) => {
          const orig = a.scoreComparison?.original?.total ?? 0;
          const opt = a.scoreComparison?.optimized?.total ?? 0;
          return opt <= orig + 22 || `optimized ${opt} > orig ${orig} + 20 cap`;
        },
      },
    ],
  },
];
