// Fixtures for the local (client-side) resume score engine.
// These are plain ResumeData values exercised by scripts/local-checks-eval.ts.
// No API, no network — the engine is pure, so this eval is fully offline.

import { initialResumeState, type ResumeData } from "@/types/resume";

function base(): ResumeData {
  return {
    personalInfo: {
      name: "Jordan Lee",
      email: "jordan@example.com",
      phone: "+1 555 0100",
      linkedin: "",
      website: "",
      location: "Austin, TX",
      title: "Product Analyst",
      photo: undefined,
    },
    summary: "Product analyst with experience in SaaS analytics and stakeholder reporting.",
    experience: [],
    education: [
      {
        id: "edu1",
        institution: "UT Austin",
        degree: "B.Sc.",
        field: "Economics",
        location: "Austin, TX",
        startDate: "2015",
        endDate: "2019",
        achievements: [],
      },
    ],
    skills: ["SQL", "Excel", "Tableau", "Stakeholder management", "A/B testing"],
    projects: [],
    certifications: [],
    languages: [],
    customSections: [],
  };
}

// Weak CV: duties-list bullets ("Responsible for…", "Helped…"), zero numbers,
// and the wizard's placeholder summary still in place.
export const WEAK_CV: ResumeData = {
  ...base(),
  summary: initialResumeState.summary, // the "[X] years" placeholder
  skills: ["Excel", "Email"],
  experience: [
    {
      id: "e1",
      company: "Acme Co",
      role: "Marketing Coordinator",
      location: "Austin, TX",
      startDate: "2020",
      endDate: "Present",
      current: true,
      description: [
        "Responsible for managing the team's social calendar",
        "Worked on email campaigns and helped with events",
        "Assisted the marketing manager with monthly reports",
      ],
    },
  ],
};

// Strong CV: quantified bullets, strong action verbs, real summary, fuller skills.
export const STRONG_CV: ResumeData = {
  ...base(),
  summary:
    "Product Analyst with progressive experience in high-growth SaaS, known for turning product data into measurable revenue impact.",
  skills: ["SQL", "Python", "Tableau", "A/B testing", "Stakeholder management", "Looker", "dbt", "Experimentation"],
  experience: [
    {
      id: "e1",
      company: "Taboola",
      role: "Product Analyst",
      location: "Tel Aviv",
      startDate: "2021",
      endDate: "Present",
      current: true,
      description: [
        "Drove a pricing experiment that lifted ARPU 14% across 2M users",
        "Built a churn model that cut monthly churn by 9%",
        "Launched a self-serve analytics dashboard adopted by 40+ stakeholders",
      ],
    },
  ],
};

// A job description with several keywords the WEAK_CV/STRONG_CV won't fully cover.
export const SAMPLE_JD = `Senior Product Analyst — Fintech
We are looking for a product analyst fluent in SQL, Python, and experimentation.
You will own dashboards in Looker, partner with product managers on roadmap
decisions, and drive retention through cohort analysis and predictive modeling.
Experience with dbt, Snowflake, and stakeholder communication is required.`;
