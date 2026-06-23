import type { ResumePreviewData } from "@/components/builder/ResumePreview";

/**
 * SAMPLE_RESUME — a professionally written, recruiter-grade sample CV.
 *
 * Used as the placeholder content in the builder preview and in the template
 * gallery thumbnails so an empty document still reads like a polished,
 * Enhancv-quality resume instead of "YOUR NAME". Every bullet leads with a
 * verb and carries a number — the way we coach users to write.
 */
export const SAMPLE_RESUME: ResumePreviewData = {
  name: "Alex Morgan",
  title: "Senior Product Manager",
  contact: {
    email: "alex.morgan@email.com",
    phone: "+1 (415) 555-0188",
    location: "San Francisco, CA",
    linkedin: "linkedin.com/in/alexmorgan",
    website: "alexmorgan.io",
  },
  summary:
    "Product leader with 8+ years shipping B2B SaaS used by 2M+ people. Took three products from zero to market, grew ARR from $4M to $28M, and built the data-driven roadmap process now used company-wide. Known for turning ambiguous problems into focused, measurable bets.",
  skills: [
    "Product Strategy",
    "Roadmapping",
    "A/B Testing",
    "SQL",
    "User Research",
    "Go-to-Market",
    "Stakeholder Management",
    "Figma",
    "Agile / Scrum",
    "Data Analysis",
  ],
  languages: ["English (Native)", "Spanish (Professional)"],
  sections: [
    {
      id: "experience",
      title: "Experience",
      type: "experience",
      items: [
        {
          id: "exp1",
          title: "Senior Product Manager",
          subtitle: "Northwind Software",
          date: "2021 — Present",
          location: "San Francisco, CA",
          bullets: [
            "Grew core product ARR from $9M to $28M in 24 months by reprioritizing the roadmap around three retention drivers.",
            "Launched a self-serve onboarding flow that lifted activation 34% and cut time-to-value from 9 days to under 2.",
            "Led a 12-person cross-functional squad (eng, design, data) shipping biweekly against clear, measurable bets.",
          ],
        },
        {
          id: "exp2",
          title: "Product Manager",
          subtitle: "Brightline Analytics",
          date: "2018 — 2021",
          location: "Austin, TX",
          bullets: [
            "Took a new analytics product from 0 to 40k weekly active users in its first year.",
            "Ran 60+ A/B tests; the winning checkout redesign added $2.1M in incremental annual revenue.",
            "Built the company's first opportunity-sizing framework, now the standard for every roadmap decision.",
          ],
        },
        {
          id: "exp3",
          title: "Associate Product Manager",
          subtitle: "Tello",
          date: "2016 — 2018",
          location: "Remote",
          bullets: [
            "Shipped a referral program that drove 22% of new signups within two quarters.",
            "Partnered with 15 enterprise customers to turn support themes into the top-voted roadmap items.",
          ],
        },
      ],
    },
    {
      id: "education",
      title: "Education",
      type: "education",
      items: [
        {
          id: "edu1",
          title: "B.S., Computer Science",
          subtitle: "University of California, Berkeley",
          date: "2012 — 2016",
          location: "Berkeley, CA",
          bullets: ["Minor in Business Administration · Dean's List (4 semesters)"],
        },
      ],
    },
    {
      id: "projects",
      title: "Projects",
      type: "projects",
      items: [
        {
          id: "proj1",
          title: "Pulse — Open-source feedback tool",
          subtitle: "Creator & Maintainer",
          date: "2022",
          bullets: ["1,800+ GitHub stars; adopted by 200+ product teams to close the feedback loop."],
        },
      ],
    },
  ],
};

/** True when the live CV has no real content yet (so we show the sample). */
export function isEmptyResume(data: { name?: string; sections?: { items?: unknown[] }[] }): boolean {
  const hasName = Boolean(data.name && data.name.trim() && data.name.trim().toUpperCase() !== "YOUR NAME");
  const hasItems = (data.sections ?? []).some((s) => (s.items ?? []).length > 0);
  return !hasName && !hasItems;
}
