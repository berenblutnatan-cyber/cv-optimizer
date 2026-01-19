/**
 * Common Template Props
 * 
 * Shared interface for all resume templates.
 */

import { ThemeColor } from "@/context/BuilderContext";

export interface ResumeContact {
  email?: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  website?: string;
  github?: string;
}

export interface ResumeSectionItem {
  id: string;
  title?: string;
  subtitle?: string;
  date?: string;
  location?: string;
  description?: string;
  bullets?: string[];
}

export interface ResumeSection {
  id: string;
  title: string;
  type?: "experience" | "education" | "projects" | "certifications" | "custom";
  items: ResumeSectionItem[];
}

export interface ResumeData {
  name: string;
  title?: string;
  contact: ResumeContact;
  summary?: string;
  skills?: string[];
  languages?: string[];
  sections: ResumeSection[];
  photo?: string;
}

export interface TemplateProps {
  data: ResumeData;
  themeColor: ThemeColor;
  className?: string;
}
