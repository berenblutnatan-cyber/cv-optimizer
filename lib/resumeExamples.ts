// Seed data for the Resume Examples Library (/resume-examples) — an SEO/organic
// acquisition funnel into the builder. Each entry is a complete, ResumeData-shaped
// example by role. Adding a new example = append an object here (and it gets a
// static page + sitemap entry automatically).
//
// Stable string ids (no generateId/Date.now) so pages stay deterministic.

import type { ResumeData } from "@/types/resume";

export type ResumeExample = {
  slug: string;
  role: string; // e.g. "Software Engineer"
  category: string; // e.g. "Engineering"
  seniority: string; // e.g. "Mid-level"
  blurb: string; // 1-2 sentence SEO/intro line
  data: ResumeData;
};

const empty: Pick<ResumeData, "projects" | "certifications" | "customSections"> = {
  projects: [],
  certifications: [],
  customSections: [],
};

export const RESUME_EXAMPLES: ResumeExample[] = [
  {
    slug: "software-engineer",
    role: "Software Engineer",
    category: "Engineering",
    seniority: "Mid-level",
    blurb:
      "A results-focused software engineer resume that leads with quantified impact — shipped features, performance wins, and scale — exactly what hiring managers and ATS scan for.",
    data: {
      ...empty,
      personalInfo: {
        name: "Alex Rivera",
        email: "alex.rivera@email.com",
        phone: "+1 (415) 555-0142",
        linkedin: "linkedin.com/in/alexrivera",
        website: "alexrivera.dev",
        location: "San Francisco, CA",
        title: "Software Engineer",
      },
      summary:
        "Software Engineer with 5 years building reliable, high-traffic web services at consumer-scale startups. Known for shipping fast without breaking things and for turning ambiguous problems into measurable product wins.",
      experience: [
        {
          id: "se-e1",
          company: "Brightloop",
          role: "Software Engineer",
          location: "San Francisco, CA",
          startDate: "2022",
          endDate: "Present",
          current: true,
          description: [
            "Led the migration of a monolith to event-driven services across 14 domains, cutting p95 latency 38% with zero downtime",
            "Shipped a caching layer that reduced database load 60% and saved an estimated $90K/year in infrastructure",
            "Mentored 3 junior engineers and introduced a code-review rubric that cut review cycle time 25%",
          ],
        },
        {
          id: "se-e2",
          company: "Nimbus Labs",
          role: "Junior Software Engineer",
          location: "Remote",
          startDate: "2019",
          endDate: "2022",
          current: false,
          description: [
            "Built the billing integration handling $4M annual recurring revenue with 99.98% uptime",
            "Automated the release pipeline, reducing deploy time from 45 minutes to 6",
          ],
        },
      ],
      education: [
        {
          id: "se-ed1",
          institution: "University of Washington",
          degree: "B.Sc.",
          field: "Computer Science",
          location: "Seattle, WA",
          startDate: "2015",
          endDate: "2019",
          gpa: "3.8",
          achievements: ["Dean's List (6 quarters)"],
        },
      ],
      skills: ["TypeScript", "Go", "React", "Node.js", "PostgreSQL", "AWS", "Kubernetes", "CI/CD", "Distributed systems"],
      languages: ["English (native)", "Spanish (fluent)"],
    },
  },
  {
    slug: "product-manager",
    role: "Product Manager",
    category: "Product",
    seniority: "Senior",
    blurb:
      "A product manager resume that tells a story of outcomes — growth, retention, and cross-functional leadership — instead of a list of responsibilities.",
    data: {
      ...empty,
      personalInfo: {
        name: "Priya Nair",
        email: "priya.nair@email.com",
        phone: "+1 (646) 555-0188",
        linkedin: "linkedin.com/in/priyanair",
        website: "",
        location: "New York, NY",
        title: "Senior Product Manager",
      },
      summary:
        "Senior Product Manager with 7 years in B2B SaaS, blending data-driven decision making with sharp customer empathy. Track record of taking products from zero to market and growing them past $10M ARR.",
      experience: [
        {
          id: "pm-e1",
          company: "Coral CRM",
          role: "Senior Product Manager",
          location: "New York, NY",
          startDate: "2021",
          endDate: "Present",
          current: true,
          description: [
            "Owned the activation roadmap that lifted 30-day retention from 41% to 63% across 12,000 accounts",
            "Drove a usage-based pricing launch that grew expansion revenue 22% in two quarters",
            "Ran weekly discovery with 50+ customers, reshaping the roadmap and cutting churn 15%",
          ],
        },
        {
          id: "pm-e2",
          company: "Hatch Analytics",
          role: "Product Manager",
          location: "Boston, MA",
          startDate: "2017",
          endDate: "2021",
          current: false,
          description: [
            "Launched a self-serve onboarding flow adopted by 80% of new users, cutting time-to-value from 9 days to 2",
            "Partnered with engineering and design to ship a reporting suite that became the #1 cited reason for renewal",
          ],
        },
      ],
      education: [
        {
          id: "pm-ed1",
          institution: "Cornell University",
          degree: "B.A.",
          field: "Economics",
          location: "Ithaca, NY",
          startDate: "2013",
          endDate: "2017",
          achievements: [],
        },
      ],
      skills: ["Product strategy", "Roadmapping", "A/B testing", "SQL", "User research", "Go-to-market", "Stakeholder management", "Figma", "Analytics"],
      languages: [],
    },
  },
  {
    slug: "data-analyst",
    role: "Data Analyst",
    category: "Analytics",
    seniority: "Entry to mid",
    blurb:
      "A data analyst resume that surfaces the metrics that matter — dashboards shipped, decisions influenced, dollars saved — with the SQL and BI keywords ATS looks for.",
    data: {
      ...empty,
      personalInfo: {
        name: "Daniel Okafor",
        email: "daniel.okafor@email.com",
        phone: "+44 20 7946 0321",
        linkedin: "linkedin.com/in/danielokafor",
        website: "",
        location: "London, UK",
        title: "Data Analyst",
      },
      summary:
        "Data Analyst with 3 years turning messy data into decisions for product and marketing teams. Fluent in SQL and BI tooling, and comfortable owning a question end to end — from extraction to the recommendation that ships.",
      experience: [
        {
          id: "da-e1",
          company: "Meridian Retail",
          role: "Data Analyst",
          location: "London, UK",
          startDate: "2022",
          endDate: "Present",
          current: true,
          description: [
            "Built a cohort-retention dashboard in Looker that became the weekly source of truth for 4 product squads",
            "Identified a checkout drop-off via funnel analysis, informing a fix that recovered £1.2M in annual revenue",
            "Automated a manual reporting process with dbt and SQL, saving the team ~15 hours a week",
          ],
        },
        {
          id: "da-e2",
          company: "Beacon Media",
          role: "Junior Analyst",
          location: "London, UK",
          startDate: "2021",
          endDate: "2022",
          current: false,
          description: [
            "Ran A/B tests on email campaigns that lifted click-through 18% across a 400K subscriber base",
          ],
        },
      ],
      education: [
        {
          id: "da-ed1",
          institution: "University of Manchester",
          degree: "B.Sc.",
          field: "Statistics",
          location: "Manchester, UK",
          startDate: "2017",
          endDate: "2020",
          gpa: "First-class honours",
          achievements: [],
        },
      ],
      skills: ["SQL", "Python", "Looker", "Tableau", "dbt", "Excel", "A/B testing", "Data visualization", "Statistics"],
      languages: [],
    },
  },
  {
    slug: "registered-nurse",
    role: "Registered Nurse",
    category: "Healthcare",
    seniority: "Experienced",
    blurb:
      "A registered nurse resume that balances clinical credentials with measurable patient-care outcomes — certifications up top, impact in every bullet.",
    data: {
      ...empty,
      personalInfo: {
        name: "Maria Santos",
        email: "maria.santos@email.com",
        phone: "+1 (312) 555-0173",
        linkedin: "linkedin.com/in/mariasantosrn",
        website: "",
        location: "Chicago, IL",
        title: "Registered Nurse (RN, BSN)",
      },
      summary:
        "Compassionate Registered Nurse with 8 years in acute and critical care, known for steady judgment under pressure and consistently strong patient-satisfaction scores. BLS and ACLS certified.",
      experience: [
        {
          id: "rn-e1",
          company: "Lakeside Medical Center",
          role: "Registered Nurse, ICU",
          location: "Chicago, IL",
          startDate: "2018",
          endDate: "Present",
          current: true,
          description: [
            "Managed care for up to 6 critically ill patients per shift while maintaining a 98% patient-satisfaction score",
            "Precepted 12 new graduate nurses, improving first-year retention on the unit by 20%",
            "Led a hand-hygiene initiative that reduced unit infection rates 30% over 12 months",
          ],
        },
        {
          id: "rn-e2",
          company: "St. Agnes Hospital",
          role: "Registered Nurse, Med-Surg",
          location: "Chicago, IL",
          startDate: "2016",
          endDate: "2018",
          current: false,
          description: [
            "Coordinated discharge planning that cut 30-day readmissions 12% on a 28-bed unit",
          ],
        },
      ],
      education: [
        {
          id: "rn-ed1",
          institution: "University of Illinois Chicago",
          degree: "B.S.N.",
          field: "Nursing",
          location: "Chicago, IL",
          startDate: "2012",
          endDate: "2016",
          achievements: [],
        },
      ],
      skills: ["Critical care", "Patient assessment", "BLS", "ACLS", "EHR (Epic)", "Medication administration", "Care coordination", "Patient education"],
      languages: ["English (native)", "Spanish (fluent)"],
    },
  },
];

export const EXAMPLE_SLUGS = RESUME_EXAMPLES.map((e) => e.slug);

export function getExample(slug: string): ResumeExample | undefined {
  return RESUME_EXAMPLES.find((e) => e.slug === slug);
}
