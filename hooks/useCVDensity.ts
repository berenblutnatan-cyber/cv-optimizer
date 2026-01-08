/**
 * useCVDensity Hook
 * 
 * Calculates content density and returns appropriate Tailwind classes
 * to ensure CV templates fill the page without overflowing.
 * 
 * DENSITY LEVELS:
 * - Spacious: < 1500 chars - Large fonts, generous spacing
 * - Standard: 1500-2500 chars - Balanced look
 * - Compact: > 2500 chars - Tight but readable (min 10px font)
 */

export type DensityLevel = "spacious" | "standard" | "compact";

export interface DensityStyles {
  level: DensityLevel;
  
  // Container
  containerPadding: string;
  
  // Typography
  nameSize: string;
  headerSize: string;
  bodySize: string;
  contactSize: string;
  
  // Spacing
  sectionGap: string;
  lineGap: string;
  headerMargin: string;
  lineHeight: string;
  
  // For sidebar templates
  sidebarBodySize: string;
  sidebarHeaderSize: string;
}

interface ParsedSection {
  title: string;
  content: string[];
}

interface ParsedCV {
  name: string;
  contact: string[];
  sections: ParsedSection[];
}

/**
 * Calculate density based on character count and bullet count
 */
function calculateDensity(charCount: number, bulletCount: number): DensityLevel {
  // Weight bullets as they take up more visual space
  const effectiveCount = charCount + (bulletCount * 50);
  
  if (effectiveCount < 1500) {
    return "spacious";
  } else if (effectiveCount <= 2800) {
    return "standard";
  } else {
    return "compact";
  }
}

/**
 * Get Tailwind classes based on density level
 */
function getStyles(level: DensityLevel): DensityStyles {
  switch (level) {
    case "spacious":
      return {
        level,
        // Container - generous padding
        containerPadding: "p-[20mm]",
        // Typography - larger, more readable
        nameSize: "text-2xl",
        headerSize: "text-[14px]",
        bodySize: "text-[13px]",
        contactSize: "text-[12px]",
        // Spacing - generous
        sectionGap: "gap-8",
        lineGap: "gap-2",
        headerMargin: "mb-3",
        lineHeight: "leading-relaxed",
        // Sidebar
        sidebarBodySize: "text-[11px]",
        sidebarHeaderSize: "text-[10px]",
      };
      
    case "standard":
      return {
        level,
        // Container
        containerPadding: "p-[16mm]",
        // Typography
        nameSize: "text-xl",
        headerSize: "text-[12px]",
        bodySize: "text-[11px]",
        contactSize: "text-[11px]",
        // Spacing
        sectionGap: "gap-5",
        lineGap: "gap-1",
        headerMargin: "mb-2",
        lineHeight: "leading-normal",
        // Sidebar
        sidebarBodySize: "text-[10px]",
        sidebarHeaderSize: "text-[9px]",
      };
      
    case "compact":
      return {
        level,
        // Container - minimal padding
        containerPadding: "p-[14mm]",
        // Typography - minimum readable size (never below 10px)
        nameSize: "text-lg",
        headerSize: "text-[11px]",
        bodySize: "text-[10px]",
        contactSize: "text-[10px]",
        // Spacing - tight
        sectionGap: "gap-3",
        lineGap: "gap-0.5",
        headerMargin: "mb-1",
        lineHeight: "leading-snug",
        // Sidebar
        sidebarBodySize: "text-[9px]",
        sidebarHeaderSize: "text-[8px]",
      };
  }
}

/**
 * Parse CV text into structured data
 */
export function parseCV(data: string): ParsedCV {
  const lines = data.split("\n").filter((line) => line.trim());
  if (lines.length === 0) {
    return { name: "Your Name", contact: [], sections: [] };
  }

  const name = lines[0] || "Your Name";
  const contactLines: string[] = [];
  const contentLines: string[] = [];

  let pastHeader = false;
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    // Contact lines are typically short and contain @ or phone patterns
    if (!pastHeader && (
      line.includes("@") || 
      line.match(/^\+?[\d\s\-()]+$/) || 
      line.match(/linkedin|github|portfolio/i) ||
      line.length < 50
    )) {
      if (contactLines.length < 5) {
        contactLines.push(line);
      } else {
        pastHeader = true;
        contentLines.push(line);
      }
    } else {
      pastHeader = true;
      contentLines.push(line);
    }
  }

  const sections: ParsedSection[] = [];
  let currentSection: ParsedSection | null = null;

  const sectionHeaders = [
    "summary", "objective", "profile", "professional summary", "about",
    "experience", "work experience", "employment", "professional experience",
    "education", "academic background", "academic",
    "skills", "technical skills", "core competencies", "expertise", "technologies",
    "certifications", "certificates", "licenses",
    "projects", "key projects", "personal projects",
    "awards", "achievements", "honors",
    "publications", "languages", "interests", "hobbies", "references"
  ];

  for (const line of contentLines) {
    const lowerLine = line.toLowerCase().replace(/[^a-z\s]/g, "").trim();
    const isHeader = sectionHeaders.some((h) => lowerLine === h || lowerLine.startsWith(h + " "));
    const isAllCaps = line === line.toUpperCase() && line.length > 2 && line.length < 50;

    if (isHeader || isAllCaps) {
      if (currentSection && currentSection.content.length > 0) {
        sections.push(currentSection);
      }
      currentSection = { title: line.replace(/[:\-]/g, "").trim(), content: [] };
    } else if (currentSection) {
      currentSection.content.push(line);
    } else {
      // Content before any section header goes into a default section
      currentSection = { title: "Professional Summary", content: [line] };
    }
  }
  
  if (currentSection && currentSection.content.length > 0) {
    sections.push(currentSection);
  }

  return { name, contact: contactLines, sections };
}

/**
 * Main hook - analyzes CV data and returns density-appropriate styles
 */
export function useCVDensity(cvData: string): {
  parsed: ParsedCV;
  density: DensityStyles;
  stats: { charCount: number; bulletCount: number; lineCount: number };
} {
  const parsed = parseCV(cvData);
  
  // Calculate stats
  const charCount = cvData.length;
  const bulletCount = (cvData.match(/^[\s]*[•\-*]/gm) || []).length;
  const lineCount = parsed.sections.reduce((acc, s) => acc + s.content.length + 1, 0);
  
  // Determine density level
  const level = calculateDensity(charCount, bulletCount);
  const density = getStyles(level);
  
  return {
    parsed,
    density,
    stats: { charCount, bulletCount, lineCount },
  };
}

/**
 * Check if a line is a bullet point
 */
export function isBulletLine(line: string): boolean {
  return /^[•\-*]\s/.test(line.trim());
}

/**
 * Check if a line looks like a job title/company line
 */
export function isJobTitleLine(line: string, lineIdx: number): boolean {
  if (isBulletLine(line)) return false;
  
  return (
    line.includes("|") || 
    line.match(/\d{4}/) !== null || 
    line.match(/^[A-Z][a-zA-Z\s]+,\s*[A-Z]/) !== null ||
    lineIdx === 0
  );
}

/**
 * Utility: Determine which sections should go in sidebar (for Creative template)
 */
export function splitSections(sections: ParsedSection[]): {
  sidebar: ParsedSection[];
  main: ParsedSection[];
} {
  const sidebarKeywords = [
    "skill", "language", "certification", "certificate", 
    "interest", "expertise", "competenc", "hobbi"
  ];
  
  const sidebar = sections.filter((s) =>
    sidebarKeywords.some((k) => s.title.toLowerCase().includes(k))
  );
  
  const main = sections.filter((s) =>
    !sidebarKeywords.some((k) => s.title.toLowerCase().includes(k))
  );
  
  return { sidebar, main };
}

