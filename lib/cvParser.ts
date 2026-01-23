/**
 * CV Parser
 * 
 * Converts raw CV text (from optimizer) into structured ResumePreviewData
 * for use with the unified template system.
 */

import { ResumePreviewData, ResumeSection, ResumeSectionItem, ResumeContact } from "@/components/builder/ResumePreview";

// ==========================================
// SECTION KEYWORDS
// ==========================================

const SECTION_KEYWORDS: Record<string, ResumeSection["type"]> = {
  // Experience
  "experience": "experience",
  "work experience": "experience",
  "employment": "experience",
  "professional experience": "experience",
  "work history": "experience",
  
  // Education
  "education": "education",
  "academic": "education",
  "academic background": "education",
  "qualifications": "education",
  
  // Projects
  "projects": "projects",
  "key projects": "projects",
  "personal projects": "projects",
  "portfolio": "projects",
  
  // Certifications
  "certifications": "certifications",
  "certificates": "certifications",
  "licenses": "certifications",
  "credentials": "certifications",
  
  // Skills (will be handled separately)
  "skills": "custom",
  "technical skills": "custom",
  "core competencies": "custom",
  "expertise": "custom",
  "technologies": "custom",
  
  // Languages (will be handled separately)
  "languages": "custom",
  
  // Other
  "summary": "custom",
  "objective": "custom",
  "profile": "custom",
  "professional summary": "custom",
  "about": "custom",
  "awards": "custom",
  "achievements": "custom",
  "honors": "custom",
  "publications": "custom",
  "interests": "custom",
  "hobbies": "custom",
  "references": "custom",
};

// ==========================================
// PARSER FUNCTIONS
// ==========================================

/**
 * Parse raw CV text into structured data
 */
export function parseRawCV(text: string): ResumePreviewData {
  const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 0);
  
  if (lines.length === 0) {
    return createEmptyResume();
  }

  // Extract name (first line)
  const name = lines[0];
  
  // Try to find contact info
  const contact = extractContact(lines.slice(1, 6));
  const contactLineCount = Object.values(contact).filter(Boolean).length;
  
  // Parse remaining content
  const contentLines = lines.slice(1 + Math.max(contactLineCount, 1));
  const { summary, skills, languages, sections } = parseContent(contentLines);

  return {
    name,
    title: extractTitle(lines.slice(1, 4)),
    contact,
    summary,
    skills,
    languages,
    sections,
  };
}

/**
 * Extract contact information from lines
 */
function extractContact(lines: string[]): ResumeContact {
  const contact: ResumeContact = {};
  
  // First, split lines by common delimiters (|, •, /) to handle single-line contact info
  const allParts: string[] = [];
  for (const line of lines) {
    const parts = line.split(/\s*[|•]\s*/).map(p => p.trim()).filter(p => p.length > 0);
    allParts.push(...parts);
  }
  
  for (const part of allParts) {
    const lower = part.toLowerCase();
    
    // Email - extract just the email address
    if (part.includes("@") && !contact.email) {
      const emailMatch = part.match(/[\w.-]+@[\w.-]+\.\w+/);
      if (emailMatch) contact.email = emailMatch[0];
    }
    
    // Phone - extract just the phone number
    if (!contact.phone && /(\+?\d[\d\s\-()]{8,})/.test(part)) {
      const phoneMatch = part.match(/(\+?\d[\d\s\-()]{8,})/);
      if (phoneMatch) contact.phone = phoneMatch[1].trim();
    }
    
    // LinkedIn - extract URL specifically
    if (lower.includes("linkedin") && !contact.linkedin) {
      // Try to match a full LinkedIn URL first
      const urlMatch = part.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[\w-]+\/?/i);
      if (urlMatch) {
        contact.linkedin = urlMatch[0];
      } else {
        // Try to match just "linkedin.com/in/username" pattern
        const shortMatch = part.match(/linkedin\.com\/in\/[\w-]+/i);
        if (shortMatch) {
          contact.linkedin = shortMatch[0];
        } else {
          // Last resort: just get the part after "linkedin:" but clean it
          const cleaned = part.replace(/^.*linkedin:?\s*/i, "").split(/\s/)[0].trim();
          if (cleaned && cleaned.length > 2) {
            contact.linkedin = cleaned.includes("linkedin.com") ? cleaned : `linkedin.com/in/${cleaned}`;
          }
        }
      }
    }
    
    // GitHub - extract URL specifically
    if (lower.includes("github") && !contact.github) {
      const urlMatch = part.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[\w-]+\/?/i);
      if (urlMatch) {
        contact.github = urlMatch[0];
      } else {
        const cleaned = part.replace(/^.*github:?\s*/i, "").split(/\s/)[0].trim();
        if (cleaned && cleaned.length > 2) {
          contact.github = cleaned.includes("github.com") ? cleaned : `github.com/${cleaned}`;
        }
      }
    }
    
    // Website - only if it's a URL
    if ((lower.includes("http") || lower.includes("www.")) && !contact.website && !lower.includes("linkedin") && !lower.includes("github")) {
      const urlMatch = part.match(/(?:https?:\/\/)?(?:www\.)?[\w.-]+\.\w+[\/\w.-]*/);
      if (urlMatch) contact.website = urlMatch[0];
    }
    
    // Location (city, country pattern) - skip if it contains other contact info
    if (!contact.location && !part.includes("@") && !lower.includes("linkedin") && !lower.includes("github")) {
      // Match "City, State" or "City, Country" patterns
      const locationMatch = part.match(/^[A-Z][a-zA-Z\s]+,\s*[A-Z][a-zA-Z\s]+$/);
      if (locationMatch) {
        contact.location = locationMatch[0].trim();
      }
    }
  }
  
  return contact;
}

/**
 * Extract job title from early lines
 */
function extractTitle(lines: string[]): string | undefined {
  for (const line of lines) {
    // Skip if it looks like contact info
    if (line.includes("@") || /^\+?\d/.test(line) || line.toLowerCase().includes("linkedin")) {
      continue;
    }
    
    // Common title patterns
    if (
      /^(senior|junior|lead|principal|staff|chief|head|director|manager|engineer|developer|designer|analyst|consultant|specialist)/i.test(line) ||
      /(manager|engineer|developer|designer|analyst|consultant|specialist|officer|executive|director)$/i.test(line)
    ) {
      return line.trim();
    }
  }
  return undefined;
}

/**
 * Parse content into sections
 */
function parseContent(lines: string[]): {
  summary: string;
  skills: string[];
  languages: string[];
  sections: ResumeSection[];
} {
  let summary = "";
  const skills: string[] = [];
  const languages: string[] = [];
  const sections: ResumeSection[] = [];
  
  let currentSection: ResumeSection | null = null;
  let currentItem: ResumeSectionItem | null = null;
  let inSummary = false;
  let inSkills = false;
  let inLanguages = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lowerLine = line.toLowerCase().replace(/[^a-z\s]/g, "").trim();
    
    // Check if this is a section header
    const isAllCaps = line === line.toUpperCase() && line.length > 2 && line.length < 50;
    const isSectionKeyword = Object.keys(SECTION_KEYWORDS).some(k => lowerLine === k || lowerLine.startsWith(k + " "));
    
    // IMPORTANT: If we're in summary mode and this line is NOT a clear section header for 
    // experience/education/skills, keep collecting summary text
    const isMajorSectionHeader = 
      lowerLine.includes("experience") || 
      lowerLine.includes("education") || 
      lowerLine.includes("skill") ||
      lowerLine.includes("project") ||
      lowerLine.includes("certification") ||
      lowerLine.includes("award") ||
      lowerLine.includes("language") ||
      lowerLine.includes("employment") ||
      lowerLine.includes("work history");
    
    // Handle summary content FIRST - only exit if we hit a major section
    if (inSummary) {
      if (isMajorSectionHeader && (isAllCaps || isSectionKeyword)) {
        // Exit summary mode and process this line as a new section
        inSummary = false;
      } else {
        // Continue collecting summary text
        summary += (summary ? " " : "") + line;
        continue;
      }
    }
    
    if (isAllCaps || isSectionKeyword) {
      // Save current section
      if (currentSection && currentItem) {
        currentSection.items.push(currentItem);
        currentItem = null;
      }
      if (currentSection && currentSection.items.length > 0) {
        sections.push(currentSection);
      }
      
      // Determine section type
      const sectionTitle = line.replace(/[:\-]/g, "").trim();
      const sectionType = SECTION_KEYWORDS[lowerLine] || "custom";
      
      // Handle special sections
      if (lowerLine.includes("summary") || lowerLine.includes("objective") || lowerLine.includes("profile") || lowerLine.includes("about me")) {
        inSummary = true;
        inSkills = false;
        inLanguages = false;
        currentSection = null;
        continue;
      }
      
      if (lowerLine.includes("skill") || lowerLine.includes("competenc") || lowerLine.includes("expertise") || lowerLine.includes("technologies")) {
        inSkills = true;
        inSummary = false;
        inLanguages = false;
        currentSection = null;
        continue;
      }
      
      if (lowerLine === "languages") {
        inLanguages = true;
        inSkills = false;
        inSummary = false;
        currentSection = null;
        continue;
      }
      
      // Create new section
      inSummary = false;
      inSkills = false;
      inLanguages = false;
      currentSection = {
        id: `section-${sections.length}`,
        title: sectionTitle,
        type: sectionType as ResumeSection["type"],
        items: [],
      };
      continue;
    }
    
    // Handle skills content
    if (inSkills) {
      const skillItems = line.split(/[,;•\-|]/).map(s => s.trim()).filter(s => s.length > 0);
      skills.push(...skillItems);
      continue;
    }
    
    // Handle languages content
    if (inLanguages) {
      const cleaned = line.replace(/^[•\-*]\s*/, "").trim();
      if (cleaned) languages.push(cleaned);
      continue;
    }
    
    // Handle section content
    if (currentSection) {
      const isBullet = /^[•\-*]\s/.test(line);
      const isJobTitleLine = isDateLine(line) || (i === 0 || isNewEntry(line, lines[i - 1]));
      
      if (isBullet) {
        // Add bullet to current item
        if (currentItem) {
          if (!currentItem.bullets) currentItem.bullets = [];
          currentItem.bullets.push(line.replace(/^[•\-*]\s*/, "").trim());
        }
      } else if (isJobTitleLine || (!currentItem && !isBullet)) {
        // Save previous item and start new one
        if (currentItem) {
          currentSection.items.push(currentItem);
        }
        
        // Parse job title line (may contain date)
        const { title, date } = parseJobTitleLine(line);
        currentItem = {
          id: `item-${currentSection.items.length}`,
          title,
          date,
        };
      } else if (currentItem) {
        // Could be subtitle or description
        if (!currentItem.subtitle && line.length < 80) {
          currentItem.subtitle = line;
        } else {
          currentItem.description = (currentItem.description || "") + " " + line;
        }
      }
    }
  }
  
  // Save final section
  if (currentSection && currentItem) {
    currentSection.items.push(currentItem);
  }
  if (currentSection && currentSection.items.length > 0) {
    sections.push(currentSection);
  }
  
  return { summary: summary.trim(), skills, languages, sections };
}

/**
 * Check if line contains a date
 */
function isDateLine(line: string): boolean {
  return /\d{4}/.test(line) || /present|current/i.test(line);
}

/**
 * Check if this looks like a new entry
 */
function isNewEntry(line: string, prevLine: string): boolean {
  if (!prevLine) return true;
  // New entry if previous line was a bullet
  if (/^[•\-*]\s/.test(prevLine)) return true;
  // New entry if line contains a pipe or date
  if (line.includes("|") || isDateLine(line)) return true;
  return false;
}

/**
 * Parse job title line to extract title and date
 */
function parseJobTitleLine(line: string): { title: string; date?: string } {
  // Pattern: "Job Title | Company | Date" or "Job Title, Company (Date)"
  const pipeMatch = line.match(/^(.+?)\s*\|\s*(.+?)\s*\|\s*(.+)$/);
  if (pipeMatch) {
    return {
      title: pipeMatch[1].trim(),
      date: pipeMatch[3].trim(),
    };
  }
  
  // Pattern with parentheses: "Job Title (2020 - Present)"
  const parenMatch = line.match(/^(.+?)\s*\((\d{4}.+?)\)$/);
  if (parenMatch) {
    return {
      title: parenMatch[1].trim(),
      date: parenMatch[2].trim(),
    };
  }
  
  // Pattern with date at end: "Job Title, Company 2020 - 2023"
  const dateMatch = line.match(/^(.+?)\s+(\d{4}\s*[-–]\s*(?:\d{4}|present|current))$/i);
  if (dateMatch) {
    return {
      title: dateMatch[1].trim(),
      date: dateMatch[2].trim(),
    };
  }
  
  return { title: line };
}

/**
 * Create empty resume data structure
 */
function createEmptyResume(): ResumePreviewData {
  return {
    name: "Your Name",
    contact: {},
    sections: [],
  };
}

export default parseRawCV;
