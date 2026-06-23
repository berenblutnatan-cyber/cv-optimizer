// Claude finalize prompt — turns a voice transcript into structured ResumeData
// JSON the existing builder/templates can render. Hallucination-resistant by
// design: explicit "use ONLY facts in the transcript" rule, low temperature,
// Zod validation of the response shape.

export function buildFinalizePrompt(transcript: string): string {
  return `You are converting a spoken career conversation into structured resume JSON.

STRICT RULES:
- Use ONLY facts present in the transcript. If a field wasn't mentioned, return an empty string or empty array. DO NOT invent companies, dates, titles, achievements, schools, or numbers.
- Rewrite achievements as crisp bullet points starting with action verbs. Every number, percentage, or claim must come directly from the transcript.
- Preserve every role the speaker mentioned. Do not merge roles. Do not skip roles.
- If the speaker said "I don't remember exact dates" — use a rough date (year only) and DO NOT invent specifics.
- If the speaker corrected themselves ("actually it was 2022, not 2021"), use the corrected version.
- Skip profile fields the speaker did not provide rather than filling them.

OUTPUT FORMAT — return STRICT JSON matching this TypeScript type. No prose, no markdown, no backticks:
{
  "personalInfo": {
    "name": string,
    "email": string,        // empty if not mentioned
    "phone": string,        // empty if not mentioned
    "linkedin": string,     // empty if not mentioned
    "website": string,      // empty if not mentioned
    "location": string,     // empty if not mentioned (city or city, country)
    "title": string         // current professional title
  },
  "summary": string,        // 3-4 line narrative summary based on what they said
  "experience": [
    {
      "id": string,         // any unique slug
      "company": string,
      "role": string,
      "location": string,   // empty if not mentioned
      "startDate": string,  // year or "Month Year"
      "endDate": string,    // "Present" if current, otherwise year/Month Year
      "current": boolean,
      "description": string[]  // 2-3 bullets per role
    }
  ],
  "education": [
    {
      "id": string,
      "institution": string,
      "degree": string,
      "field": string,
      "location": string,
      "startDate": string,
      "endDate": string,
      "gpa": string,        // empty if not mentioned
      "achievements": string[]
    }
  ],
  "skills": string[],
  "projects": [],
  "certifications": [],
  "languages": [],
  "customSections": []
}

TRANSCRIPT:
${transcript}

Return ONLY the JSON object.`;
}
