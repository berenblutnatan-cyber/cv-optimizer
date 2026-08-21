// Deterministic content-trim ladder — the next lever when auto-fit has
// exhausted density (fitReport.atMinimum). Every trim is a plain CvToolCall
// the user confirms in a checklist; nothing is ever trimmed silently.
//
// Ranking follows resume convention: oldest roles surrender bullets first,
// recent roles keep more, skills cap at a scannable dozen.

import type { ResumeData } from "@/types/resume";
import type { CvToolCall } from "@/lib/chat/cvTools";

export type TrimSuggestion = {
  id: string;
  label: string;
  /** Rough lines a single application saves (drives ordering). */
  estLinesSaved: number;
  patch: CvToolCall;
};

const RECENT_KEEP = 4; // bullets kept on the 2 most recent roles
const OLDER_KEEP = 2; // bullets kept on older roles
const SKILLS_KEEP = 12;
const EDU_ACHIEVEMENTS_KEEP = 2;
const PROJECT_BULLETS_KEEP = 2;

export function buildTrimSuggestions(data: ResumeData): TrimSuggestion[] {
  const out: TrimSuggestion[] = [];

  data.experience.forEach((exp, index) => {
    const keep = index < 2 ? RECENT_KEEP : OLDER_KEEP;
    const bullets = exp.description.filter((b) => b.trim());
    if (bullets.length > keep) {
      out.push({
        id: `trim-exp-${index}`,
        label: `${exp.role || exp.company}: keep ${keep} of ${bullets.length} bullets`,
        estLinesSaved: bullets.length - keep,
        patch: { name: "update_experience", input: { index, description: bullets.slice(0, keep) } },
      });
    }
  });

  if (data.skills.length > SKILLS_KEEP) {
    out.push({
      id: "trim-skills",
      label: `Skills: keep the top ${SKILLS_KEEP} of ${data.skills.length}`,
      estLinesSaved: Math.ceil((data.skills.length - SKILLS_KEEP) / 6),
      patch: { name: "set_skills", input: { skills: data.skills.slice(0, SKILLS_KEEP) } },
    });
  }

  data.education.forEach((edu, index) => {
    const achievements = edu.achievements.filter((a) => a.trim());
    if (achievements.length > EDU_ACHIEVEMENTS_KEEP) {
      out.push({
        id: `trim-edu-${index}`,
        label: `${edu.institution}: keep ${EDU_ACHIEVEMENTS_KEEP} of ${achievements.length} details`,
        estLinesSaved: achievements.length - EDU_ACHIEVEMENTS_KEEP,
        patch: {
          name: "update_education",
          input: { index, achievements: achievements.slice(0, EDU_ACHIEVEMENTS_KEEP) },
        },
      });
    }
  });

  data.projects.forEach((proj, index) => {
    const bullets = proj.bullets.filter((b) => b.trim());
    if (bullets.length > PROJECT_BULLETS_KEEP) {
      out.push({
        id: `trim-proj-${index}`,
        label: `${proj.name}: keep ${PROJECT_BULLETS_KEEP} of ${bullets.length} bullets`,
        estLinesSaved: bullets.length - PROJECT_BULLETS_KEEP,
        patch: { name: "update_project", input: { index, bullets: bullets.slice(0, PROJECT_BULLETS_KEEP) } },
      });
    }
  });

  return out.sort((a, b) => b.estLinesSaved - a.estLinesSaved);
}
