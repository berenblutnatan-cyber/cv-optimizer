/**
 * Convert ResumeData (from store) to ResumePreviewData (for templates)
 */

import { ResumeData } from "@/types/resume";
import { ResumePreviewData } from "@/components/builder/ResumePreview";
import { formatName, formatJobTitle } from "@/utils/formatting";

/**
 * Convert the resume store data format to the template preview format
 */
export function convertToPreviewData(resumeData: ResumeData): ResumePreviewData {
  return {
    name: formatName(resumeData.personalInfo.name) || "Your Name",
    title: formatJobTitle(resumeData.personalInfo.title) || undefined,
    contact: {
      email: resumeData.personalInfo.email || undefined,
      phone: resumeData.personalInfo.phone || undefined,
      location: resumeData.personalInfo.location || undefined,
      linkedin: resumeData.personalInfo.linkedin || undefined,
      website: resumeData.personalInfo.website || undefined,
    },
    summary: resumeData.summary || undefined,
    skills: resumeData.skills.filter(Boolean),
    languages: resumeData.languages?.filter(Boolean) || [],
    photo: resumeData.personalInfo.photo || undefined,
    sections: [
      // Experience section
      ...(resumeData.experience.length > 0 ? [{
        id: "experience",
        title: "Experience",
        type: "experience" as const,
        items: resumeData.experience.map(exp => ({
          id: exp.id,
          title: formatJobTitle(exp.role),
          subtitle: exp.company,
          date: formatDateRange(exp.startDate, exp.endDate, exp.current),
          location: exp.location || undefined,
          bullets: exp.description.filter(Boolean),
        })),
      }] : []),
      // Education section
      ...(resumeData.education.length > 0 ? [{
        id: "education",
        title: "Education",
        type: "education" as const,
        items: resumeData.education.map(edu => ({
          id: edu.id,
          title: edu.degree + (edu.field ? ` in ${edu.field}` : ""),
          subtitle: edu.institution,
          date: formatDateRange(edu.startDate, edu.endDate),
          location: edu.location || undefined,
          description: edu.gpa ? `GPA: ${edu.gpa}` : undefined,
          bullets: edu.achievements?.filter(Boolean) || [],
        })),
      }] : []),
      // Projects section
      ...(resumeData.projects && resumeData.projects.length > 0 ? [{
        id: "projects",
        title: "Projects",
        type: "projects" as const,
        items: resumeData.projects.map(proj => ({
          id: proj.id,
          title: proj.name,
          subtitle: proj.technologies?.join(", ") || undefined,
          description: proj.description || undefined,
          bullets: proj.bullets?.filter(Boolean) || [],
        })),
      }] : []),
      // Certifications section
      ...(resumeData.certifications && resumeData.certifications.length > 0 ? [{
        id: "certifications",
        title: "Certifications",
        type: "certifications" as const,
        items: resumeData.certifications.map(cert => ({
          id: cert.id,
          title: cert.name,
          subtitle: cert.issuer,
          date: cert.date || undefined,
        })),
      }] : []),
      // Custom sections
      ...resumeData.customSections.map(section => ({
        id: section.id,
        title: section.title,
        type: "custom" as const,
        items: section.items.map(item => ({
          id: item.id,
          description: item.text,
        })),
      })),
    ],
  };
}

/**
 * Format date range for display
 */
function formatDateRange(startDate?: string, endDate?: string, current?: boolean): string {
  if (!startDate && !endDate) return "";
  
  const start = startDate || "";
  const end = current ? "Present" : (endDate || "");
  
  if (start && end) {
    return `${start} - ${end}`;
  }
  return start || end;
}

export default convertToPreviewData;
