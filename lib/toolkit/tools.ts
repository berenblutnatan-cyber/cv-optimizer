// Career toolkit — CLIENT-SAFE tool registry: ids, labels, icons, and the
// declarative form/output specs that drive the generic ToolForm/ToolResult
// renderers. Prompts + Anthropic schemas live in lib/toolkit/server.ts
// (server-only) — never import that from a client component.

export const TOOL_IDS = [
  "cold-email",
  "application-answers",
  "linkedin",
  "references",
  "salary-prep",
  "offer-comparison",
  "case-study",
] as const;

export type ToolId = (typeof TOOL_IDS)[number];

export type ToolField = {
  name: string;
  /** "cv" renders as the builder-CV chip with paste fallback. */
  type: "text" | "textarea" | "select" | "cv";
  label: string; // i18n key (English-as-key)
  placeholder?: string;
  required?: boolean;
  options?: string[]; // for select
  rows?: number; // for textarea
};

export type ToolOutputField = {
  key: string;
  label: string; // i18n key
  kind: "text" | "list" | "matrix";
};

export type ToolSpec = {
  id: ToolId;
  /** lucide icon name, resolved by ToolCard. */
  icon: "Mail" | "MessageSquare" | "Linkedin" | "Users" | "HandCoins" | "Scale" | "BookOpen";
  title: string; // i18n key
  tagline: string; // i18n key, one line
  fields: ToolField[];
  output: ToolOutputField[];
};

export const TOOLS: Record<ToolId, ToolSpec> = {
  "cold-email": {
    id: "cold-email",
    icon: "Mail",
    title: "Cold email",
    tagline: "A personal intro to a hiring manager or founder",
    fields: [
      { name: "cvText", type: "cv", label: "Your CV", required: true },
      { name: "companyName", type: "text", label: "Company" },
      { name: "jobTitle", type: "text", label: "Role" },
      { name: "recipientName", type: "text", label: "Recipient name" },
      {
        name: "recipientRole",
        type: "select",
        label: "Recipient",
        options: ["Hiring manager", "Founder", "Recruiter"],
      },
      { name: "jobDescription", type: "textarea", label: "Job description", rows: 5 },
    ],
    output: [
      { key: "subject", label: "Subject", kind: "text" },
      { key: "body", label: "Email", kind: "text" },
    ],
  },
  "application-answers": {
    id: "application-answers",
    icon: "MessageSquare",
    title: "Application answers",
    tagline: "Tailored answers for application form questions",
    fields: [
      { name: "cvText", type: "cv", label: "Your CV", required: true },
      { name: "question", type: "textarea", label: "The question", required: true, rows: 3 },
      { name: "jobDescription", type: "textarea", label: "Job description", rows: 5 },
      { name: "maxWords", type: "select", label: "Length", options: ["50", "100", "200"] },
    ],
    output: [{ key: "answer", label: "Answer", kind: "text" }],
  },
  linkedin: {
    id: "linkedin",
    icon: "Linkedin",
    title: "LinkedIn profile",
    tagline: "Headline options + About section from your CV",
    fields: [
      { name: "cvText", type: "cv", label: "Your CV", required: true },
      { name: "targetRole", type: "text", label: "Target role" },
    ],
    output: [
      { key: "headlines", label: "Headlines", kind: "list" },
      { key: "about", label: "About", kind: "text" },
      { key: "skills", label: "Skills to list", kind: "list" },
    ],
  },
  references: {
    id: "references",
    icon: "Users",
    title: "References",
    tagline: "Permission ask, briefing email, formatted list",
    fields: [
      {
        name: "referencesText",
        type: "textarea",
        label: "Your references",
        placeholder: "One per line: Name — relationship — company",
        required: true,
        rows: 4,
      },
      { name: "jobTitle", type: "text", label: "Role" },
      { name: "companyName", type: "text", label: "Company" },
      { name: "cvText", type: "cv", label: "Your CV" },
    ],
    output: [
      { key: "permissionEmail", label: "Permission ask", kind: "text" },
      { key: "briefingEmail", label: "Briefing email", kind: "text" },
      { key: "formattedList", label: "Reference list", kind: "text" },
    ],
  },
  "salary-prep": {
    id: "salary-prep",
    icon: "HandCoins",
    title: "Salary negotiation",
    tagline: "Counter script + total-comp checklist for your offer",
    fields: [
      { name: "jobTitle", type: "text", label: "Role", required: true },
      {
        name: "offerDetails",
        type: "textarea",
        label: "The offer",
        placeholder: "Base, bonus, equity, location…",
        required: true,
        rows: 4,
      },
      { name: "targetBase", type: "text", label: "Your target" },
      { name: "cvText", type: "cv", label: "Your CV" },
    ],
    output: [
      { key: "counterScript", label: "Counter script", kind: "text" },
      { key: "totalCompChecklist", label: "Total comp checklist", kind: "list" },
      { key: "talkingPoints", label: "Talking points", kind: "list" },
    ],
  },
  "offer-comparison": {
    id: "offer-comparison",
    icon: "Scale",
    title: "Offer comparison",
    tagline: "Two offers, one weighted decision matrix",
    fields: [
      {
        name: "offerA",
        type: "textarea",
        label: "Offer A",
        placeholder: "Company, base, bonus, equity, benefits, location…",
        required: true,
        rows: 4,
      },
      {
        name: "offerB",
        type: "textarea",
        label: "Offer B",
        placeholder: "Company, base, bonus, equity, benefits, location…",
        required: true,
        rows: 4,
      },
      { name: "priorities", type: "text", label: "What matters most to you" },
    ],
    output: [
      { key: "matrix", label: "Decision matrix", kind: "matrix" },
      { key: "recommendation", label: "Recommendation", kind: "text" },
    ],
  },
  "case-study": {
    id: "case-study",
    icon: "BookOpen",
    title: "Portfolio case study",
    tagline: "Turn one achievement into a full case study",
    fields: [
      {
        name: "achievement",
        type: "textarea",
        label: "The achievement",
        placeholder: "What you built/led, for whom, what happened",
        required: true,
        rows: 4,
      },
      { name: "role", type: "text", label: "Your role" },
      { name: "cvText", type: "cv", label: "Your CV" },
    ],
    output: [{ key: "caseStudy", label: "Case study", kind: "text" }],
  },
};

export function isToolId(v: string): v is ToolId {
  return (TOOL_IDS as readonly string[]).includes(v);
}
