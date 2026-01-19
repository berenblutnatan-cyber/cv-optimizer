"use client";

import React from "react";
import { BuilderTemplateId, ThemeColor } from "@/context/BuilderContext";
import {
  ModernSidebarTemplate,
  IvyLeagueTemplate,
  MinimalistTemplate,
  ExecutiveTemplate,
  TechieTemplate,
  CreativeTemplate,
  StartupTemplate,
  InternationalTemplate,
} from "@/components/cv-templates/templates";

/**
 * ResumePreview Component
 * 
 * A unified resume preview that renders data using the selected template.
 * This is the SINGLE source of truth for resume rendering across:
 * - Resume Builder
 * - Optimizer Results
 * - PDF Export
 * 
 * FEATURES:
 * - Dynamic template switching (8 templates)
 * - Theme color support (10 colors)
 * - Auto-formatting of text
 * - Empty state handling
 * - Consistent typography
 */

// ==========================================
// TYPES (Re-exported for convenience)
// ==========================================

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

export interface ResumePreviewData {
  name: string;
  title?: string;
  contact: ResumeContact;
  summary?: string;
  skills?: string[];
  languages?: string[];
  sections: ResumeSection[];
  photo?: string;
}

export interface ResumePreviewProps {
  data: ResumePreviewData;
  templateId?: BuilderTemplateId;
  themeColor?: ThemeColor;
  className?: string;
}

// ==========================================
// MAIN COMPONENT
// ==========================================

export function ResumePreview({
  data,
  templateId = "modern-sidebar",
  themeColor = "indigo",
  className,
}: ResumePreviewProps) {
  // Convert ResumePreviewData to TemplateProps format
  const templateData = {
    name: data.name,
    title: data.title,
    contact: data.contact,
    summary: data.summary,
    skills: data.skills,
    languages: data.languages,
    sections: data.sections,
    photo: data.photo,
  };

  // Render the appropriate template
  switch (templateId) {
    case "modern-sidebar":
      return <ModernSidebarTemplate data={templateData} themeColor={themeColor} className={className} />;
    case "ivy-league":
      return <IvyLeagueTemplate data={templateData} themeColor={themeColor} className={className} />;
    case "minimalist":
      return <MinimalistTemplate data={templateData} themeColor={themeColor} className={className} />;
    case "executive":
      return <ExecutiveTemplate data={templateData} themeColor={themeColor} className={className} />;
    case "techie":
      return <TechieTemplate data={templateData} themeColor={themeColor} className={className} />;
    case "creative":
      return <CreativeTemplate data={templateData} themeColor={themeColor} className={className} />;
    case "startup":
      return <StartupTemplate data={templateData} themeColor={themeColor} className={className} />;
    case "international":
      return <InternationalTemplate data={templateData} themeColor={themeColor} className={className} />;
    default:
      return <ModernSidebarTemplate data={templateData} themeColor={themeColor} className={className} />;
  }
}

export default ResumePreview;
