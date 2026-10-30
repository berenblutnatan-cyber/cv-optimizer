import { applyDocumentOp, emptyDocument, type ResumeDocument } from "@/lib/resume/document";

/** A CV with every section filled, including non-ASCII text. Built through the real reducer. */
export function fullCv(): ResumeDocument {
  const ops: [string, Record<string, unknown>][] = [
    ["update_personal_info", { name: "Dana Lévi", title: "Senior Product Manager", email: "dana@example.com", phone: "+972 50 123 4567", location: "Tel Aviv, Israel", linkedin: "linkedin.com/in/danalevi", website: "danalevi.dev" }],
    ["update_summary", { summary: "Product manager who ships onboarding that converts. Led growth at two B2B SaaS companies." }],
    ["add_experience", { company: "Acme Analytics", role: "Senior PM", location: "Tel Aviv", startDate: "2021", current: true, description: ["Rebuilt onboarding, lifting activation from 31% to 46%", "Led a team of 6 engineers and 2 designers"] }],
    ["add_experience", { company: "Globex", role: "Product Manager", startDate: "2018", endDate: "2021", description: ["Launched the self-serve plan"] }],
    ["add_education", { institution: "Tel Aviv University", degree: "B.Sc.", field: "Industrial Engineering", startDate: "2014", endDate: "2018" }],
    ["set_skills", { skills: ["SQL", "Figma", "A/B testing", "Roadmapping"] }],
    ["set_languages", { languages: ["Hebrew (native)", "English (fluent)"] }],
    ["add_project", { name: "Pricing Lab", description: "Internal tool for price experiments", technologies: ["Python", "dbt"], bullets: ["Ran 14 pricing tests in a quarter"] }],
    ["add_certification", { name: "Pragmatic Product Management", issuer: "Pragmatic Institute", date: "2022" }],
    ["add_custom_section", { title: "Volunteering", items: ["Mentor at Google for Startups"] }],
    ["set_design", { accentColor: "navy" }],
  ];
  return ops.reduce((d, [name, input]) => applyDocumentOp(d, name, input), emptyDocument());
}
