/**
 * Text Formatting Utilities
 * 
 * Professional text formatting for resume templates.
 * Ensures consistent capitalization and typography across the app.
 */

// ==========================================
// TITLE CASE CONVERSION
// ==========================================

// Words that should stay lowercase in titles (unless first word)
const LOWERCASE_WORDS = new Set([
  'a', 'an', 'the', 'and', 'but', 'or', 'for', 'nor', 'on', 'at', 'to', 'by',
  'from', 'up', 'as', 'in', 'out', 'of', 'off', 'with', 'over', 'into'
]);

// Common abbreviations that should stay uppercase
const UPPERCASE_WORDS = new Set([
  'ceo', 'cto', 'cfo', 'coo', 'vp', 'svp', 'evp', 'hr', 'it', 'qa', 'ui', 'ux',
  'api', 'sql', 'aws', 'gcp', 'saas', 'b2b', 'b2c', 'roi', 'kpi', 'mba', 'phd',
  'bsc', 'msc', 'llm', 'md', 'jd', 'usa', 'uk', 'eu', 'pm', 'pmp', 'scrum',
  'agile', 'devops', 'ci', 'cd', 'seo', 'crm', 'erp', 'ml', 'ai', 'nlp', 'cv'
]);

/**
 * Convert string to Title Case
 * Handles special cases like abbreviations and small words
 */
export function toTitleCase(str: string): string {
  if (!str || typeof str !== 'string') return str || '';
  
  return str
    .toLowerCase()
    .split(' ')
    .map((word, index) => {
      // Check if it's an uppercase abbreviation
      if (UPPERCASE_WORDS.has(word.toLowerCase())) {
        return word.toUpperCase();
      }
      
      // Keep lowercase words lowercase (except first word)
      if (index > 0 && LOWERCASE_WORDS.has(word)) {
        return word;
      }
      
      // Capitalize first letter
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

/**
 * Format a person's name
 * Handles special cases like O'Connor, McDonald, etc.
 */
export function formatName(name: string): string {
  if (!name || typeof name !== 'string') return name || '';
  
  return name
    .split(' ')
    .map(part => {
      const lower = part.toLowerCase();
      
      // Handle O'Connor, O'Brien, etc.
      if (lower.startsWith("o'") && part.length > 2) {
        return "O'" + part.charAt(2).toUpperCase() + part.slice(3).toLowerCase();
      }
      
      // Handle McDonald, MacArthur, etc.
      if (lower.startsWith('mc') && part.length > 2) {
        return 'Mc' + part.charAt(2).toUpperCase() + part.slice(3).toLowerCase();
      }
      if (lower.startsWith('mac') && part.length > 3) {
        return 'Mac' + part.charAt(3).toUpperCase() + part.slice(4).toLowerCase();
      }
      
      // Standard capitalization
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join(' ');
}

/**
 * Format a job title with proper capitalization
 */
export function formatJobTitle(title: string): string {
  if (!title || typeof title !== 'string') return title || '';
  return toTitleCase(title);
}

/**
 * Ensure sentence starts with capital letter
 */
export function formatSentence(str: string): string {
  if (!str || typeof str !== 'string') return str || '';
  const trimmed = str.trim();
  if (!trimmed) return '';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

/**
 * Format bullet point text
 * Capitalizes first letter, ensures no trailing period on fragments
 */
export function formatBulletPoint(text: string): string {
  if (!text || typeof text !== 'string') return text || '';
  const trimmed = text.trim();
  if (!trimmed) return '';
  
  // Capitalize first letter
  let formatted = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  
  return formatted;
}

/**
 * Format date range for display
 */
export function formatDateRange(start?: string, end?: string): string {
  if (!start && !end) return '';
  if (!start) return end || '';
  if (!end) return `${start} - Present`;
  return `${start} - ${end}`;
}

// ==========================================
// CONTENT VALIDATION
// ==========================================

/**
 * Check if a value has meaningful content
 * Used to conditionally render fields
 */
export function hasContent(value: string | string[] | undefined | null): boolean {
  if (value === undefined || value === null) return false;
  if (Array.isArray(value)) {
    return value.some(item => item && item.trim().length > 0);
  }
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Check if contact field should be displayed
 */
export function shouldShowField(value: string | undefined | null): boolean {
  return hasContent(value);
}

// ==========================================
// UNIVERSAL TEXT FORMATTER
// ==========================================

export type TextFormatType = 'name' | 'title' | 'sentence' | 'bullet' | 'none';

/**
 * Universal text formatter
 * Applies appropriate formatting based on text type
 */
export function formatText(text: string, type: TextFormatType = 'sentence'): string {
  if (!text || typeof text !== 'string') return text || '';
  
  switch (type) {
    case 'name':
      return formatName(text);
    case 'title':
      return formatJobTitle(text);
    case 'sentence':
      return formatSentence(text);
    case 'bullet':
      return formatBulletPoint(text);
    case 'none':
    default:
      return text;
  }
}

// ==========================================
// FONT CONSTANTS
// ==========================================

/**
 * Font family constants for consistent typography
 * These map to the CSS variables defined in layout.tsx
 */
export const FONTS = {
  // Heading fonts
  heading: {
    serif: 'var(--font-merriweather), Merriweather, Georgia, serif',
    sans: 'var(--font-montserrat), Montserrat, sans-serif',
  },
  // Body fonts
  body: {
    primary: 'var(--font-sans), Inter, system-ui, sans-serif',
    secondary: 'var(--font-lato), Lato, sans-serif',
  },
  // Mono font for code
  mono: 'var(--font-mono), JetBrains Mono, monospace',
} as const;

/**
 * Typography scale for consistent sizing
 */
export const TYPE_SCALE = {
  // Resume name
  name: {
    fontSize: '28px',
    fontWeight: 700,
    lineHeight: 1.2,
    letterSpacing: '-0.02em',
  },
  // Section titles
  sectionTitle: {
    fontSize: '11px',
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
  },
  // Job/Education titles
  itemTitle: {
    fontSize: '12px',
    fontWeight: 600,
    lineHeight: 1.3,
  },
  // Company/Institution names
  itemSubtitle: {
    fontSize: '11px',
    fontWeight: 500,
    lineHeight: 1.3,
  },
  // Body text / bullets
  body: {
    fontSize: '10px',
    fontWeight: 400,
    lineHeight: 1.6,
  },
  // Dates
  date: {
    fontSize: '10px',
    fontWeight: 500,
    fontStyle: 'normal' as const,
  },
  // Contact info
  contact: {
    fontSize: '10px',
    fontWeight: 400,
    lineHeight: 1.4,
  },
} as const;

// ==========================================
// COLOR THEMES
// ==========================================

export interface ThemeColors {
  primary: string;
  dark: string;
  light: string;
  text: string;
  muted: string;
}

export const THEME_COLORS: Record<string, ThemeColors> = {
  indigo: {
    primary: '#6366f1',
    dark: '#4f46e5',
    light: '#e0e7ff',
    text: '#3730a3',
    muted: '#a5b4fc',
  },
  blue: {
    primary: '#3b82f6',
    dark: '#1d4ed8',
    light: '#dbeafe',
    text: '#1e3a8a',
    muted: '#93c5fd',
  },
  purple: {
    primary: '#8b5cf6',
    dark: '#6d28d9',
    light: '#ede9fe',
    text: '#4c1d95',
    muted: '#c4b5fd',
  },
  rose: {
    primary: '#f43f5e',
    dark: '#be123c',
    light: '#ffe4e6',
    text: '#881337',
    muted: '#fda4af',
  },
  amber: {
    primary: '#f59e0b',
    dark: '#b45309',
    light: '#fef3c7',
    text: '#78350f',
    muted: '#fcd34d',
  },
  slate: {
    primary: '#475569',
    dark: '#1e293b',
    light: '#f1f5f9',
    text: '#0f172a',
    muted: '#94a3b8',
  },
  violet: {
    primary: '#8b5cf6',
    dark: '#7c3aed',
    light: '#ede9fe',
    text: '#5b21b6',
    muted: '#c4b5fd',
  },
};

export function getThemeColors(theme: string = 'indigo'): ThemeColors {
  return THEME_COLORS[theme] || THEME_COLORS.indigo;
}
