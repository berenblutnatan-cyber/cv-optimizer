// Shared cover-letter prompt builder. Extracted from app/api/cover-letter so
// the per-application payoff route (app/api/applications/[id]/cover-letter)
// reuses the EXACT same prompt — one source of truth, no drift. Title-cleaning
// helpers are reused from the optimizer.

import { cleanTitle, inferJobTitleFromDescription } from "@/lib/optimizer/prompt";

export const COVER_LETTER_SYSTEM_PROMPT =
  "You are an expert cover letter writer who creates personalized, compelling letters that get interviews. Your letters are: 1) Highly specific to the role and company, 2) Full of concrete achievements with metrics, 3) Show genuine company research, 4) Sound authentically human, 5) 250-350 words, 4 paragraphs. Never use clichés like 'team player', 'passionate', or 'I believe I would be a great fit'. Every letter should be impossible to reuse for another application.";

export function buildCoverLetterPrompt(input: {
  cvText: string;
  jobTitle?: string;
  jobDescription?: string;
  companyName?: string;
}): { prompt: string; effectiveJobTitle: string; effectiveCompany: string } {
  const cvText = input.cvText ?? "";
  const jobDescription = input.jobDescription ?? "";
  const jobTitle = (input.jobTitle ?? "").slice(0, 200);
  const companyName = (input.companyName ?? "").slice(0, 200);

  const hasJobDescription = jobDescription.trim().length > 0;
  const effectiveJobTitle =
    cleanTitle(jobTitle).trim() || inferJobTitleFromDescription(jobDescription, companyName) || "Role";
  const effectiveCompany = companyName.trim() || "Target Company";

  const prompt = `Create an EXCEPTIONAL, personalized cover letter that makes the recruiter excited to interview this candidate.

═══════════════════════════════════════════════════════════════
STRUCTURE (Exactly 4 paragraphs, 250-350 words total)
═══════════════════════════════════════════════════════════════

**PARAGRAPH 1 - OPENING (Hook the reader immediately)**
- Open with genuine enthusiasm for THIS specific role at THIS company
- Mention how you found the position (or a compelling reason for interest)
- One powerful sentence on why you're a strong fit
- Make them want to keep reading!

**PARAGRAPH 2 - YOUR VALUE (Prove your worth)**
- 2-3 most relevant achievements that DIRECTLY match job requirements
- Use SPECIFIC metrics and results (%, $, numbers from the CV)
- Connect each achievement to what THEY need
- Show, don't tell - concrete examples, not adjectives

**PARAGRAPH 3 - WHY THIS COMPANY (Show you did your research)**
${companyName.trim() ? `- Demonstrate knowledge of ${effectiveCompany} (their mission, products, recent news, challenges)
- Explain why you want to work at ${effectiveCompany} specifically
- What unique value YOU will bring to THEIR team
- This paragraph should be IMPOSSIBLE to reuse for another company` : `- Show understanding of what companies in this space typically value
- Explain why this role excites you specifically
- What unique value you bring based on your background`}

**PARAGRAPH 4 - CLOSING (Confident call to action)**
- Express genuine enthusiasm and confidence (not desperation)
- Clear call to action - request an interview/discussion
- Professional sign-off

═══════════════════════════════════════════════════════════════
TONE & STYLE REQUIREMENTS
═══════════════════════════════════════════════════════════════
✅ Professional but conversational and engaging
✅ Confident without being arrogant
✅ Show personality while maintaining professionalism
✅ Mirror language from the job description naturally
✅ Sound like a REAL HUMAN wrote this, not AI
✅ Every sentence must add value - no filler

❌ AVOID THESE CLICHÉS (instant rejection triggers):
- "I'm a team player" / "hard worker" / "passionate about..."
- "I believe I would be a great fit" / "I am confident that..."
- "fast-paced environment" / "synergy" / "leverage"
- "I am writing to express my interest" / "To whom it may concern"
- Generic statements that could apply to any job
- Desperate language ("I really need this job", "please consider me")

═══════════════════════════════════════════════════════════════
QUALITY CHECKLIST (Verify before returning)
═══════════════════════════════════════════════════════════════
□ Highly personalized to ${effectiveJobTitle} at ${effectiveCompany}
□ Contains 2-3 specific achievements with metrics from the CV
□ Shows genuine research/knowledge about the company
□ Could NOT be used for any other job application
□ 250-350 words (concise but impactful)
□ Reads naturally, like written by an intelligent human
□ Makes the recruiter WANT to interview this person

═══════════════════════════════════════════════════════════════
INPUTS
═══════════════════════════════════════════════════════════════

**Role:** ${effectiveJobTitle}

**Company:** ${effectiveCompany}

**Job Requirements:**
${hasJobDescription ? jobDescription : "[No description provided - use typical requirements for this role]"}

**Candidate's CV:**
${cvText}

═══════════════════════════════════════════════════════════════
OUTPUT
═══════════════════════════════════════════════════════════════
Return ONLY the cover letter text, ready to send. No headers, no explanations, just the letter.
Start with "Dear Hiring Manager," or "Dear [Company] Team," if appropriate.`;

  return { prompt, effectiveJobTitle, effectiveCompany };
}
