/**
 * Job Titles for Resume Score Teaser
 * 
 * Organized by category with 100+ common job titles
 * Used in the GoalSelector combobox for strict validation
 * 
 * NOTE: Array is wrapped in Set to guarantee uniqueness and prevent React key errors
 */

export const JOB_CATEGORIES = [
  "General Application",
  "Student / Intern",
  "Career Change",
  "Entry Level Position",
  "Senior / Leadership Role",
] as const;

// Raw list of job titles (may contain duplicates from categorization)
const RAW_JOB_TITLES = [
  // === BROAD CATEGORIES ===
  "General Application",
  "Student / Intern",
  "Career Change",
  "Entry Level Position",
  "Senior / Leadership Role",
  
  // === TECHNOLOGY & SOFTWARE ===
  "Software Engineer",
  "Senior Software Engineer",
  "Staff Software Engineer",
  "Principal Engineer",
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "Mobile Developer",
  "iOS Developer",
  "Android Developer",
  "DevOps Engineer",
  "Site Reliability Engineer",
  "Cloud Engineer",
  "Data Engineer",
  "Machine Learning Engineer",
  "AI Engineer",
  "Data Scientist",
  "Data Analyst",
  "Business Intelligence Analyst",
  "QA Engineer",
  "Test Automation Engineer",
  "Security Engineer",
  "Cybersecurity Analyst",
  "Network Engineer",
  "Systems Administrator",
  "Database Administrator",
  "Solutions Architect",
  "Technical Architect",
  "Engineering Manager",
  "VP of Engineering",
  "CTO",
  "Technical Lead",
  "Scrum Master",
  "Agile Coach",
  
  // === PRODUCT & DESIGN ===
  "Product Manager",
  "Senior Product Manager",
  "Product Owner",
  "Product Designer",
  "UX Designer",
  "UI Designer",
  "UX Researcher",
  "Interaction Designer",
  "Visual Designer",
  "Graphic Designer",
  "Brand Designer",
  "Creative Director",
  "Art Director",
  "Design Lead",
  "Head of Product",
  "Chief Product Officer",
  
  // === MARKETING ===
  "Marketing Manager",
  "Digital Marketing Manager",
  "Content Marketing Manager",
  "SEO Specialist",
  "SEM Specialist",
  "Social Media Manager",
  "Growth Marketing Manager",
  "Performance Marketing Manager",
  "Email Marketing Specialist",
  "Marketing Analyst",
  "Brand Manager",
  "Communications Manager",
  "PR Specialist",
  "Content Writer",
  "Copywriter",
  "Marketing Coordinator",
  "CMO",
  "VP of Marketing",
  
  // === SALES & BUSINESS DEVELOPMENT ===
  "Sales Representative",
  "Account Executive",
  "Sales Manager",
  "Business Development Representative",
  "Business Development Manager",
  "Account Manager",
  "Customer Success Manager",
  "Sales Engineer",
  "Solutions Consultant",
  "Partnership Manager",
  "VP of Sales",
  "Chief Revenue Officer",
  
  // === FINANCE & ACCOUNTING ===
  "Financial Analyst",
  "Senior Financial Analyst",
  "Accountant",
  "Senior Accountant",
  "Controller",
  "CFO",
  "Investment Analyst",
  "Investment Banker",
  "Portfolio Manager",
  "Risk Analyst",
  "Auditor",
  "Tax Specialist",
  "Bookkeeper",
  "Accounts Payable Specialist",
  "Accounts Receivable Specialist",
  "Payroll Specialist",
  "Treasury Analyst",
  
  // === HUMAN RESOURCES ===
  "HR Manager",
  "HR Business Partner",
  "Recruiter",
  "Technical Recruiter",
  "Talent Acquisition Specialist",
  "HR Coordinator",
  "HR Generalist",
  "Compensation Analyst",
  "Benefits Specialist",
  "Training Specialist",
  "Learning & Development Manager",
  "CHRO",
  "VP of People",
  
  // === OPERATIONS & PROJECT MANAGEMENT ===
  "Operations Manager",
  "Project Manager",
  "Program Manager",
  "Technical Program Manager",
  "Operations Analyst",
  "Business Analyst",
  "Process Improvement Specialist",
  "Supply Chain Manager",
  "Logistics Manager",
  "Procurement Specialist",
  "Vendor Manager",
  "COO",
  
  // === CUSTOMER SERVICE & SUPPORT ===
  "Customer Service Representative",
  "Customer Support Specialist",
  "Technical Support Specialist",
  "Help Desk Analyst",
  "Customer Service Manager",
  "Support Engineer",
  
  // === HEALTHCARE ===
  "Registered Nurse",
  "Nurse Practitioner",
  "Physician Assistant",
  "Medical Assistant",
  "Healthcare Administrator",
  "Clinical Research Coordinator",
  "Pharmacist",
  "Physical Therapist",
  "Occupational Therapist",
  "Medical Technologist",
  "Radiologic Technologist",
  "Healthcare Consultant",
  
  // === LEGAL ===
  "Attorney",
  "Lawyer",
  "Paralegal",
  "Legal Assistant",
  "Compliance Officer",
  "Contract Manager",
  "General Counsel",
  "Legal Counsel",
  
  // === EDUCATION ===
  "Teacher",
  "Professor",
  "Instructional Designer",
  "Academic Advisor",
  "School Administrator",
  "Curriculum Developer",
  "Tutor",
  "Education Coordinator",
  
  // === CREATIVE & MEDIA ===
  "Video Producer",
  "Video Editor",
  "Photographer",
  "Motion Designer",
  "Animator",
  "3D Artist",
  "Game Designer",
  "Sound Designer",
  "Journalist",
  "Editor",
  "Producer",
  
  // === CONSULTING ===
  "Management Consultant",
  "Strategy Consultant",
  "IT Consultant",
  "Business Consultant",
  "Senior Consultant",
  "Principal Consultant",
  "Consultant",
  
  // === EXECUTIVE ===
  "CEO",
  "General Manager",
  "Executive Director",
  "Managing Director",
  "Vice President",
  "Senior Vice President",
  "Director",
  "Senior Director",
  
  // === OTHER COMMON ROLES ===
  "Research Scientist",
  "Research Associate",
  "Administrative Assistant",
  "Executive Assistant",
  "Office Manager",
  "Receptionist",
  "Real Estate Agent",
  "Insurance Agent",
  "Financial Advisor",
  "Personal Trainer",
  "Chef",
  "Restaurant Manager",
  "Event Coordinator",
  "Nonprofit Manager",
  "Volunteer Coordinator",
  "Social Worker",
  "Counselor",
  "Psychologist",
];

// DEDUPLICATED job titles array - prevents React "duplicate key" errors
export const JOB_TITLES = Array.from(new Set(RAW_JOB_TITLES));

export type JobTitle = string;

/**
 * Search/filter job titles by query
 */
export function searchJobTitles(query: string): string[] {
  if (!query.trim()) return [...JOB_TITLES];
  
  const lowerQuery = query.toLowerCase();
  return JOB_TITLES.filter(title => 
    title.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Validate if a title is in our list
 */
export function isValidJobTitle(title: string): boolean {
  return JOB_TITLES.includes(title);
}
