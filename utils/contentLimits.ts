/**
 * Content Limits Configuration
 * 
 * Defines maximum content limits for each template to ensure
 * everything fits within a single A4 page.
 */

export interface TemplateLimits {
  /** Template identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Whether template has a sidebar for overflow content */
  hasSidebar: boolean;
  /** Maximum recommended characters for summary */
  maxSummaryChars: number;
  /** Maximum recommended experience entries */
  maxExperienceEntries: number;
  /** Maximum bullet points per experience */
  maxBulletsPerExperience: number;
  /** Maximum education entries */
  maxEducationEntries: number;
  /** Maximum skills to display */
  maxSkills: number;
  /** Maximum languages */
  maxLanguages: number;
  /** Recommended font size range */
  fontSizeRange: { min: number; max: number };
  /** Can auto-compress content */
  supportsCompression: boolean;
  /** Sections that can move to sidebar on overflow */
  sidebarSections: string[];
}

export const TEMPLATE_LIMITS: Record<string, TemplateLimits> = {
  "modern-sidebar": {
    id: "modern-sidebar",
    name: "Modern Sidebar",
    hasSidebar: true,
    maxSummaryChars: 350,
    maxExperienceEntries: 3,
    maxBulletsPerExperience: 4,
    maxEducationEntries: 2,
    maxSkills: 8,
    maxLanguages: 4,
    fontSizeRange: { min: 9, max: 11 },
    supportsCompression: true,
    sidebarSections: ["skills", "languages", "certifications"],
  },
  "ivy-league": {
    id: "ivy-league",
    name: "Ivy League",
    hasSidebar: false,
    maxSummaryChars: 400,
    maxExperienceEntries: 4,
    maxBulletsPerExperience: 4,
    maxEducationEntries: 3,
    maxSkills: 12,
    maxLanguages: 4,
    fontSizeRange: { min: 10, max: 12 },
    supportsCompression: true,
    sidebarSections: [],
  },
  "minimalist": {
    id: "minimalist",
    name: "Minimalist",
    hasSidebar: false,
    maxSummaryChars: 300,
    maxExperienceEntries: 3,
    maxBulletsPerExperience: 3,
    maxEducationEntries: 2,
    maxSkills: 10,
    maxLanguages: 3,
    fontSizeRange: { min: 10, max: 11 },
    supportsCompression: true,
    sidebarSections: [],
  },
  "executive": {
    id: "executive",
    name: "Executive",
    hasSidebar: true,
    maxSummaryChars: 400,
    maxExperienceEntries: 4,
    maxBulletsPerExperience: 5,
    maxEducationEntries: 2,
    maxSkills: 10,
    maxLanguages: 4,
    fontSizeRange: { min: 9, max: 11 },
    supportsCompression: true,
    sidebarSections: ["skills", "certifications"],
  },
  "techie": {
    id: "techie",
    name: "Techie",
    hasSidebar: false,
    maxSummaryChars: 250,
    maxExperienceEntries: 3,
    maxBulletsPerExperience: 4,
    maxEducationEntries: 2,
    maxSkills: 15, // Tech template can show more skills
    maxLanguages: 3,
    fontSizeRange: { min: 9, max: 10 },
    supportsCompression: true,
    sidebarSections: [],
  },
  "creative": {
    id: "creative",
    name: "Creative",
    hasSidebar: true,
    maxSummaryChars: 300,
    maxExperienceEntries: 3,
    maxBulletsPerExperience: 3,
    maxEducationEntries: 2,
    maxSkills: 8,
    maxLanguages: 3,
    fontSizeRange: { min: 9, max: 11 },
    supportsCompression: true,
    sidebarSections: ["skills", "languages"],
  },
  "startup": {
    id: "startup",
    name: "Startup",
    hasSidebar: false,
    maxSummaryChars: 350,
    maxExperienceEntries: 3,
    maxBulletsPerExperience: 4,
    maxEducationEntries: 2,
    maxSkills: 10,
    maxLanguages: 3,
    fontSizeRange: { min: 10, max: 12 },
    supportsCompression: true,
    sidebarSections: [],
  },
  "international": {
    id: "international",
    name: "International",
    hasSidebar: true,
    maxSummaryChars: 350,
    maxExperienceEntries: 3,
    maxBulletsPerExperience: 4,
    maxEducationEntries: 3,
    maxSkills: 8,
    maxLanguages: 5, // International template shows more languages
    fontSizeRange: { min: 9, max: 11 },
    supportsCompression: true,
    sidebarSections: ["skills", "languages"],
  },
};

// Default limits for unknown templates
export const DEFAULT_LIMITS: TemplateLimits = {
  id: "default",
  name: "Default",
  hasSidebar: false,
  maxSummaryChars: 350,
  maxExperienceEntries: 3,
  maxBulletsPerExperience: 4,
  maxEducationEntries: 2,
  maxSkills: 10,
  maxLanguages: 4,
  fontSizeRange: { min: 9, max: 11 },
  supportsCompression: true,
  sidebarSections: [],
};

export function getTemplateLimits(templateId: string): TemplateLimits {
  return TEMPLATE_LIMITS[templateId] || DEFAULT_LIMITS;
}

/**
 * Content Analysis Result
 */
export interface ContentAnalysis {
  /** Overall fit status */
  fits: boolean;
  /** Overflow percentage (0 = fits, 100 = 2x overflow) */
  overflowPercent: number;
  /** Specific warnings */
  warnings: ContentWarning[];
  /** Suggested actions */
  suggestions: ContentSuggestion[];
  /** Recommended density setting */
  recommendedDensity: "compact" | "normal" | "spacious";
}

export interface ContentWarning {
  type: "summary" | "experience" | "education" | "skills" | "overall";
  message: string;
  severity: "info" | "warning" | "error";
  currentValue: number;
  maxValue: number;
}

export interface ContentSuggestion {
  action: string;
  description: string;
  priority: "high" | "medium" | "low";
}

/**
 * Analyze resume content against template limits
 */
export function analyzeContentFit(
  resumeData: {
    summary?: string;
    sections?: Array<{ items?: Array<{ bullets?: string[] }> }>;
    skills?: string[];
    languages?: string[];
    education?: Array<unknown>;
  },
  templateId: string
): ContentAnalysis {
  const limits = getTemplateLimits(templateId);
  const warnings: ContentWarning[] = [];
  const suggestions: ContentSuggestion[] = [];
  
  let overflowScore = 0;

  // Check summary length
  const summaryLength = resumeData.summary?.length || 0;
  if (summaryLength > limits.maxSummaryChars) {
    const overflow = ((summaryLength - limits.maxSummaryChars) / limits.maxSummaryChars) * 100;
    overflowScore += overflow * 0.15;
    warnings.push({
      type: "summary",
      message: `Summary is ${summaryLength - limits.maxSummaryChars} characters over limit`,
      severity: overflow > 50 ? "error" : "warning",
      currentValue: summaryLength,
      maxValue: limits.maxSummaryChars,
    });
    suggestions.push({
      action: "Shorten summary",
      description: `Reduce summary to ${limits.maxSummaryChars} characters or less`,
      priority: "high",
    });
  }

  // Check experience entries
  const experienceSection = resumeData.sections?.find(
    (s) => s.items && s.items.length > 0
  );
  const experienceCount = experienceSection?.items?.length || 0;
  
  if (experienceCount > limits.maxExperienceEntries) {
    overflowScore += (experienceCount - limits.maxExperienceEntries) * 15;
    warnings.push({
      type: "experience",
      message: `${experienceCount - limits.maxExperienceEntries} extra experience entries`,
      severity: "error",
      currentValue: experienceCount,
      maxValue: limits.maxExperienceEntries,
    });
    suggestions.push({
      action: "Reduce experience entries",
      description: `Keep only ${limits.maxExperienceEntries} most relevant positions`,
      priority: "high",
    });
  }

  // Check bullets per experience
  experienceSection?.items?.forEach((item, idx) => {
    const bulletCount = item.bullets?.length || 0;
    if (bulletCount > limits.maxBulletsPerExperience) {
      overflowScore += (bulletCount - limits.maxBulletsPerExperience) * 5;
      warnings.push({
        type: "experience",
        message: `Position ${idx + 1} has ${bulletCount - limits.maxBulletsPerExperience} extra bullet points`,
        severity: "warning",
        currentValue: bulletCount,
        maxValue: limits.maxBulletsPerExperience,
      });
    }
  });

  // Check skills count
  const skillsCount = resumeData.skills?.length || 0;
  if (skillsCount > limits.maxSkills) {
    overflowScore += (skillsCount - limits.maxSkills) * 3;
    warnings.push({
      type: "skills",
      message: `${skillsCount - limits.maxSkills} extra skills`,
      severity: "warning",
      currentValue: skillsCount,
      maxValue: limits.maxSkills,
    });
    
    if (limits.hasSidebar) {
      suggestions.push({
        action: "Move skills to sidebar",
        description: "This template has a sidebar that can hold additional skills",
        priority: "medium",
      });
    } else {
      suggestions.push({
        action: "Reduce skills list",
        description: `Keep only ${limits.maxSkills} most relevant skills`,
        priority: "medium",
      });
    }
  }

  // Determine recommended density
  let recommendedDensity: "compact" | "normal" | "spacious" = "normal";
  if (overflowScore > 30) {
    recommendedDensity = "compact";
    suggestions.push({
      action: "Use Compact mode",
      description: "Switch to Compact density in the preview toolbar",
      priority: "high",
    });
  } else if (overflowScore < 10 && warnings.length === 0) {
    recommendedDensity = "spacious";
  }

  // If still overflowing after suggestions
  if (overflowScore > 50) {
    suggestions.push({
      action: "Consider extended format",
      description: "Your content may require a 2-page resume or larger format",
      priority: "low",
    });
  }

  return {
    fits: overflowScore < 25,
    overflowPercent: Math.min(overflowScore, 100),
    warnings,
    suggestions,
    recommendedDensity,
  };
}

/**
 * Get templates sorted by capacity (most content-friendly first)
 */
export function getTemplatesByCapacity(): TemplateLimits[] {
  return Object.values(TEMPLATE_LIMITS).sort((a, b) => {
    const capacityA = a.maxExperienceEntries * a.maxBulletsPerExperience + a.maxSkills;
    const capacityB = b.maxExperienceEntries * b.maxBulletsPerExperience + b.maxSkills;
    return capacityB - capacityA;
  });
}

/**
 * Suggest best template for given content
 */
export function suggestBestTemplate(resumeData: {
  summary?: string;
  sections?: Array<{ items?: Array<{ bullets?: string[] }> }>;
  skills?: string[];
}): string {
  const templates = getTemplatesByCapacity();
  
  for (const template of templates) {
    const analysis = analyzeContentFit(resumeData, template.id);
    if (analysis.fits) {
      return template.id;
    }
  }
  
  // Return the most spacious template if nothing fits
  return templates[0].id;
}
