// Plain-text CV for pasting into application forms and ATS text boxes.
// No layout, no bullets glyphs that some forms mangle: just clean lines.

import type { ResumeData } from "@/types/resume";
import { formatDateRange } from "./view";

export function toPlainText(c: ResumeData): string {
  const out: string[] = [];
  const line = (s?: string) => out.push(s ?? "");
  const pi = c.personalInfo;
  if (pi.name) line(pi.name);
  if (pi.title) line(pi.title);
  const contact = [pi.email, pi.phone, pi.location, pi.linkedin, pi.website].filter(Boolean).join(" | ");
  if (contact) line(contact);

  const section = (title: string, body: () => void) => {
    const before = out.length;
    line();
    line(title.toUpperCase());
    const start = out.length;
    body();
    if (out.length === start) out.length = before; // drop empty sections
  };

  section("Summary", () => c.summary.trim() && line(c.summary.trim()));
  section("Experience", () =>
    c.experience.forEach((e, i) => {
      if (i) line();
      line([e.role, e.company].filter(Boolean).join(", ") + (e.location ? ` (${e.location})` : ""));
      const when = formatDateRange(e.startDate, e.endDate, e.current);
      if (when) line(when);
      e.description.filter((b) => b.trim()).forEach((b) => line(`- ${b.trim()}`));
    }),
  );
  section("Education", () =>
    c.education.forEach((e) => {
      line([e.degree + (e.field ? ` in ${e.field}` : ""), e.institution].filter((x) => x && x.trim()).join(", "));
      const when = formatDateRange(e.startDate, e.endDate);
      if (when || e.gpa) line([when, e.gpa ? `GPA ${e.gpa}` : ""].filter(Boolean).join(" | "));
      e.achievements.filter((a) => a.trim()).forEach((a) => line(`- ${a.trim()}`));
    }),
  );
  section("Skills", () => c.skills.length && line(c.skills.join(", ")));
  section("Projects", () =>
    c.projects.forEach((p) => {
      line([p.name, p.technologies.join(", ")].filter(Boolean).join(" | "));
      if (p.description) line(p.description);
      p.bullets.filter((b) => b.trim()).forEach((b) => line(`- ${b.trim()}`));
    }),
  );
  section("Certifications", () => c.certifications.forEach((x) => line([x.name, x.issuer, x.date].filter(Boolean).join(", "))));
  section("Languages", () => c.languages.length && line(c.languages.join(", ")));
  c.customSections.forEach((s) => section(s.title || "Other", () => s.items.filter((it) => it.text.trim()).forEach((it) => line(`- ${it.text.trim()}`))));

  return out.join("\n").trim() + "\n";
}
