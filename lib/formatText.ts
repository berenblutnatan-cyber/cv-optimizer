/**
 * Text Formatting Utilities for Resume Builder
 * 
 * Professional formatting standards for resume text:
 * - Auto-capitalization for names and sentences
 * - Proper title case for job titles
 * - Date formatting consistency
 */

// ==========================================
// CAPITALIZATION UTILITIES
// ==========================================

/**
 * Capitalize first letter of each word (Title Case)
 * Used for: Names, Job Titles, Company Names, Degrees
 * 
 * @example "john doe" -> "John Doe"
 * @example "senior product manager" -> "Senior Product Manager"
 */
export function toTitleCase(text: string): string {
  if (!text) return "";
  
  // Words that should stay lowercase (unless first word)
  const lowercaseWords = new Set([
    "a", "an", "the", "and", "but", "or", "for", "nor", "on", "at", 
    "to", "by", "in", "of", "with", "as"
  ]);
  
  return text
    .toLowerCase()
    .split(" ")
    .map((word, index) => {
      if (index === 0 || !lowercaseWords.has(word)) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }
      return word;
    })
    .join(" ");
}

/**
 * Capitalize first letter of a sentence
 * Used for: Bullet points, descriptions, summaries
 * 
 * @example "led a team of engineers" -> "Led a team of engineers"
 */
export function capitalizeFirstLetter(text: string): string {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Auto-format name (handles edge cases like "McDonald", "O'Brien")
 * 
 * @example "john mcdonald" -> "John McDonald"
 * @example "mary o'brien" -> "Mary O'Brien"
 */
export function formatName(name: string): string {
  if (!name) return "";
  
  return name
    .split(" ")
    .map(word => {
      // Handle special prefixes
      if (word.toLowerCase().startsWith("mc")) {
        return "Mc" + word.charAt(2).toUpperCase() + word.slice(3).toLowerCase();
      }
      if (word.toLowerCase().startsWith("o'")) {
        return "O'" + word.charAt(2).toUpperCase() + word.slice(3).toLowerCase();
      }
      if (word.toLowerCase().startsWith("mac") && word.length > 3) {
        return "Mac" + word.charAt(3).toUpperCase() + word.slice(4).toLowerCase();
      }
      // Standard capitalization
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

/**
 * Format job title with proper capitalization
 * 
 * @example "senior software engineer" -> "Senior Software Engineer"
 * @example "ceo" -> "CEO"
 */
export function formatJobTitle(title: string): string {
  if (!title) return "";
  
  // Common acronyms that should be uppercase
  const acronyms = new Set([
    "ceo", "cto", "cfo", "coo", "cmo", "cio", "vp", "svp", "evp",
    "hr", "it", "qa", "ui", "ux", "ai", "ml", "pm", "seo", "sem"
  ]);
  
  return title
    .split(" ")
    .map(word => {
      const lowerWord = word.toLowerCase();
      if (acronyms.has(lowerWord)) {
        return word.toUpperCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

/**
 * Format bullet point text
 * - Capitalizes first letter
 * - Ensures no leading bullet character (cleaned separately)
 * 
 * @example "• managed team" -> "Managed team"
 */
export function formatBulletPoint(text: string): string {
  if (!text) return "";
  
  // Remove leading bullet characters
  const cleaned = text.replace(/^[•\-*]\s*/, "").trim();
  return capitalizeFirstLetter(cleaned);
}

/**
 * Main formatting function - applies appropriate formatting based on field type
 */
export type FieldType = "name" | "title" | "company" | "degree" | "bullet" | "paragraph" | "contact";

export function formatResumeText(text: string, fieldType: FieldType = "paragraph"): string {
  if (!text) return "";
  
  switch (fieldType) {
    case "name":
      return formatName(text);
    case "title":
    case "degree":
      return formatJobTitle(text);
    case "company":
      return toTitleCase(text);
    case "bullet":
      return formatBulletPoint(text);
    case "paragraph":
      return capitalizeFirstLetter(text);
    case "contact":
      return text; // Don't modify contact info (emails, phones, URLs)
    default:
      return text;
  }
}

// ==========================================
// DATE FORMATTING
// ==========================================

/**
 * Format date range for consistent display
 * 
 * @example "2021", "present" -> "2021 - Present"
 * @example "jan 2020", "dec 2022" -> "Jan 2020 - Dec 2022"
 */
export function formatDateRange(start: string, end?: string): string {
  const formatPart = (date: string): string => {
    if (!date) return "";
    
    // Handle "present", "current", "now"
    if (/^(present|current|now|ongoing)$/i.test(date.trim())) {
      return "Present";
    }
    
    // Handle month abbreviations
    const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    let formatted = date.trim();
    
    months.forEach((month, index) => {
      const regex = new RegExp(`\\b${month}\\b`, "gi");
      const fullMonth = month.charAt(0).toUpperCase() + month.slice(1);
      formatted = formatted.replace(regex, fullMonth);
    });
    
    return formatted;
  };
  
  const startFormatted = formatPart(start);
  const endFormatted = end ? formatPart(end) : "";
  
  if (endFormatted) {
    return `${startFormatted} - ${endFormatted}`;
  }
  
  return startFormatted;
}

// ==========================================
// VALIDATION & CLEANUP
// ==========================================

/**
 * Check if a text field has meaningful content
 * Used for hiding empty sections
 */
export function hasContent(text: string | undefined | null): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  // Check if it's just placeholder-like text
  if (/^(click to edit|add |your |enter )/i.test(trimmed)) {
    return false;
  }
  return trimmed.length > 0;
}

/**
 * Clean and normalize text
 * - Trim whitespace
 * - Collapse multiple spaces
 * - Remove control characters
 */
export function cleanText(text: string): string {
  if (!text) return "";
  return text
    .replace(/[\x00-\x1F\x7F]/g, "") // Remove control chars
    .replace(/\s+/g, " ")            // Collapse whitespace
    .trim();
}

export default {
  toTitleCase,
  capitalizeFirstLetter,
  formatName,
  formatJobTitle,
  formatBulletPoint,
  formatResumeText,
  formatDateRange,
  hasContent,
  cleanText,
};
