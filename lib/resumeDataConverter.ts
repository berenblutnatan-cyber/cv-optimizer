/**
 * Legacy builder adapter. The mapping itself lives in lib/resume/view.ts (one
 * source for every template render); the legacy builder additionally
 * title-cases names and job titles, which v2 deliberately does not do.
 */

import type { ResumeData } from "@/types/resume";
import type { ResumePreviewData } from "@/components/builder/ResumePreview";
import { formatName, formatJobTitle } from "@/utils/formatting";
import { toTemplateData } from "@/lib/resume/view";

export function convertToPreviewData(resumeData: ResumeData): ResumePreviewData {
  return toTemplateData(resumeData, { name: formatName, jobTitle: formatJobTitle });
}

export default convertToPreviewData;
