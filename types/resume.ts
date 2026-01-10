/**
 * Resume Data Types
 * Comprehensive schema for CV Builder
 */

export interface PersonalInfo {
  name: string;
  email: string;
  phone: string;
  linkedin: string;
  website: string;
  location: string;
  title: string; // Professional title, e.g., "Software Engineer"
}

export interface Experience {
  id: string;
  company: string;
  role: string;
  location: string;
  startDate: string;
  endDate: string; // "Present" for current role
  current: boolean;
  description: string[]; // Bullet points
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  field: string; // Field of study
  location: string;
  startDate: string;
  endDate: string;
  gpa?: string;
  achievements: string[]; // Honors, relevant coursework, etc.
}

export interface Project {
  id: string;
  name: string;
  description: string;
  technologies: string[];
  link?: string;
  bullets: string[];
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  date: string;
  link?: string;
}

// Custom section item (can be a bullet point or text block)
export interface CustomSectionItem {
  id: string;
  text: string;
}

// Custom section (e.g., Volunteering, Publications, Awards)
export interface CustomSection {
  id: string;
  title: string;
  items: CustomSectionItem[];
}

export interface ResumeData {
  personalInfo: PersonalInfo;
  summary: string;
  experience: Experience[];
  education: Education[];
  skills: string[];
  projects: Project[];
  certifications: Certification[];
  languages: string[];
  customSections: CustomSection[];
}

/**
 * Initial empty state for the resume builder
 */
export const initialResumeState: ResumeData = {
  personalInfo: {
    name: "",
    email: "",
    phone: "",
    linkedin: "",
    website: "",
    location: "",
    title: "",
  },
  summary: "",
  experience: [],
  education: [],
  skills: [],
  projects: [],
  certifications: [],
  languages: [],
  customSections: [],
};

/**
 * Helper to generate unique IDs
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Wizard step definitions
 */
export const WIZARD_STEPS = [
  { id: 0, title: "Personal Info", description: "Your contact details" },
  { id: 1, title: "Summary", description: "Professional summary" },
  { id: 2, title: "Experience", description: "Work history" },
  { id: 3, title: "Education", description: "Academic background" },
  { id: 4, title: "Skills", description: "Your expertise" },
  { id: 5, title: "Custom Sections", description: "Additional sections" },
  { id: 6, title: "Review & Export", description: "Final review" },
] as const;

export const TOTAL_STEPS = WIZARD_STEPS.length;

/**
 * Convert ResumeData to plain text for templates
 * This bridges the builder data with our existing template components
 */
export function resumeToText(data: ResumeData): string {
  const lines: string[] = [];

  // Header
  if (data.personalInfo.name) {
    lines.push(data.personalInfo.name);
  }

  // Contact line
  const contactParts: string[] = [];
  if (data.personalInfo.email) contactParts.push(data.personalInfo.email);
  if (data.personalInfo.phone) contactParts.push(data.personalInfo.phone);
  if (data.personalInfo.linkedin) contactParts.push(data.personalInfo.linkedin);
  if (data.personalInfo.location) contactParts.push(data.personalInfo.location);
  if (contactParts.length > 0) {
    lines.push(contactParts.join(" | "));
  }

  // Professional Title
  if (data.personalInfo.title) {
    lines.push(data.personalInfo.title);
  }

  // Summary
  if (data.summary) {
    lines.push("");
    lines.push("SUMMARY");
    lines.push(data.summary);
  }

  // Experience
  if (data.experience.length > 0) {
    lines.push("");
    lines.push("EXPERIENCE");
    for (const exp of data.experience) {
      const dateRange = exp.current ? `${exp.startDate} - Present` : `${exp.startDate} - ${exp.endDate}`;
      lines.push(`${exp.role} at ${exp.company} | ${dateRange}`);
      if (exp.location) lines.push(exp.location);
      for (const bullet of exp.description) {
        if (bullet.trim()) lines.push(`• ${bullet}`);
      }
    }
  }

  // Education
  if (data.education.length > 0) {
    lines.push("");
    lines.push("EDUCATION");
    for (const edu of data.education) {
      lines.push(`${edu.degree} in ${edu.field}`);
      lines.push(`${edu.institution} | ${edu.startDate} - ${edu.endDate}`);
      if (edu.gpa) lines.push(`GPA: ${edu.gpa}`);
      for (const achievement of edu.achievements) {
        if (achievement.trim()) lines.push(`• ${achievement}`);
      }
    }
  }

  // Skills
  if (data.skills.length > 0) {
    lines.push("");
    lines.push("SKILLS");
    lines.push(data.skills.join(", "));
  }

  // Projects
  if (data.projects.length > 0) {
    lines.push("");
    lines.push("PROJECTS");
    for (const proj of data.projects) {
      lines.push(proj.name);
      if (proj.description) lines.push(proj.description);
      if (proj.technologies.length > 0) {
        lines.push(`Technologies: ${proj.technologies.join(", ")}`);
      }
      for (const bullet of proj.bullets) {
        if (bullet.trim()) lines.push(`• ${bullet}`);
      }
    }
  }

  // Certifications
  if (data.certifications.length > 0) {
    lines.push("");
    lines.push("CERTIFICATIONS");
    for (const cert of data.certifications) {
      lines.push(`${cert.name} - ${cert.issuer} (${cert.date})`);
    }
  }

  // Languages
  if (data.languages.length > 0) {
    lines.push("");
    lines.push("LANGUAGES");
    lines.push(data.languages.join(", "));
  }

  // Custom Sections (with null check for backward compatibility)
  if (data.customSections && Array.isArray(data.customSections)) {
    for (const section of data.customSections) {
      if (section.items && section.items.length > 0) {
        lines.push("");
        lines.push(section.title.toUpperCase());
        for (const item of section.items) {
          if (item.text && item.text.trim()) lines.push(`• ${item.text}`);
        }
      }
    }
  }

  return lines.join("\n");
}
