"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import type { ResumeData } from "@/types/resume";
import { cn, toast } from "@/components/ui";
import { AddRow, AutoTextarea, BulletList, EntryCard, TagInput, TextField } from "./fields";

type Apply = (name: string, input: Record<string, unknown>, key?: string) => boolean;
type SectionKey = "experience" | "education" | "projects" | "certifications" | "customSections";

const newEntryId = (prefix: string) => `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
const range = (a?: string, b?: string, current?: boolean) => [a, current ? "Present" : b].filter(Boolean).join(" – ");

export type SectionId = "profile" | "summary" | "experience" | "education" | "skills" | "projects" | "certifications" | "languages" | "custom";

function Section({
  id,
  title,
  count,
  open,
  onToggle,
  children,
}: {
  id: SectionId;
  title: string;
  count?: number;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section id={`section-${id}`} className="scroll-mt-4 border-b border-hairline last:border-b-0">
      <h2>
        <button type="button" onClick={onToggle} aria-expanded={open} className="flex h-14 w-full items-center gap-3 px-5 text-start hover:bg-surface-2/60">
          <span className="flex-1 text-emph font-semibold text-ink">{title}</span>
          {count ? <span className="tabular text-dense text-ink-3">{count}</span> : null}
          <ChevronDown className={cn("size-4 text-ink-3 transition-transform duration-panel", open && "rotate-180")} aria-hidden />
        </button>
      </h2>
      {open && <div className="flex flex-col gap-3 px-5 pb-6">{children}</div>}
    </section>
  );
}

/** Undoable delete: remove now, offer to put it back exactly where it was. */
function useDeleteWithUndo(apply: Apply) {
  return React.useCallback(
    (section: SectionKey, removeTool: string, entry: { id: string }, index: number, label: string) => {
      if (!apply(removeTool, { id: entry.id })) return;
      toast(`${label} deleted`, {
        duration: 10_000, // long enough to notice and reach Undo
        action: { label: "Undo", onClick: () => apply("insert_entry", { section, index, entry }) },
      });
    },
    [apply],
  );
}

export function SectionEditor({
  content,
  apply,
  openSections,
  setOpenSections,
}: {
  content: ResumeData;
  apply: Apply;
  openSections: Set<SectionId>;
  setOpenSections: (next: Set<SectionId>) => void;
}) {
  const [openEntry, setOpenEntry] = React.useState<string | null>(null);
  const [justAdded, setJustAdded] = React.useState<string | null>(null);
  const del = useDeleteWithUndo(apply);
  const pi = content.personalInfo;
  const toggle = (s: SectionId) => {
    const next = new Set(openSections);
    if (next.has(s)) next.delete(s);
    else next.add(s);
    setOpenSections(next);
  };
  const setPi = (field: keyof typeof pi) => (v: string) => apply("update_personal_info", { [field]: v }, `pi:${field}`);
  const add = (section: SectionKey, prefix: string, entry: Record<string, unknown> = {}) => {
    const id = newEntryId(prefix);
    apply("insert_entry", { section, entry: { id, ...entry } });
    setOpenEntry(id);
    setJustAdded(id);
  };
  const move = (section: SectionKey, id: string, direction: "up" | "down") => apply("move_entry", { section, id, direction });

  return (
    <div className="flex flex-col">
      <Section id="profile" title="Profile" open={openSections.has("profile")} onToggle={() => toggle("profile")}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField label="Full name" value={pi.name} onChange={setPi("name")} placeholder="Dana Levi" autoComplete="name" />
          <TextField label="Headline" value={pi.title} onChange={setPi("title")} placeholder="Senior Product Manager" autoComplete="organization-title" />
          <TextField label="Email" type="email" value={pi.email} onChange={setPi("email")} placeholder="dana@email.com" autoComplete="email" />
          <TextField label="Phone" type="tel" value={pi.phone} onChange={setPi("phone")} placeholder="+972 50 000 0000" autoComplete="tel" />
          <TextField label="Location" value={pi.location} onChange={setPi("location")} placeholder="Tel Aviv, Israel" />
          <TextField label="LinkedIn" value={pi.linkedin} onChange={setPi("linkedin")} placeholder="linkedin.com/in/dana" />
          <TextField label="Website" value={pi.website} onChange={setPi("website")} placeholder="dana.design" className="sm:col-span-2" />
        </div>
      </Section>

      <Section id="summary" title="Summary" open={openSections.has("summary")} onToggle={() => toggle("summary")}>
        <label htmlFor="summary-field" className="sr-only">
          Summary
        </label>
        <AutoTextarea
          id="summary-field"
          value={content.summary}
          onChange={(e) => apply("update_summary", { summary: e.target.value }, "summary")}
          placeholder="Two to four sentences: who you are, what you're best at, what you want next."
          className="min-h-24"
        />
      </Section>

      <Section id="experience" title="Experience" count={content.experience.length} open={openSections.has("experience")} onToggle={() => toggle("experience")}>
        {content.experience.map((e, i) => (
          <EntryCard
            key={e.id}
            title={[e.role, e.company].filter(Boolean).join(" · ")}
            meta={range(e.startDate, e.endDate, e.current)}
            open={openEntry === e.id}
            autoFocus={justAdded === e.id}
            onToggle={() => setOpenEntry(openEntry === e.id ? null : e.id)}
            onMoveUp={i > 0 ? () => move("experience", e.id, "up") : undefined}
            onMoveDown={i < content.experience.length - 1 ? () => move("experience", e.id, "down") : undefined}
            onDelete={() => del("experience", "remove_experience", e, i, "Role")}
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <TextField label="Role" value={e.role} onChange={(v) => apply("update_experience", { id: e.id, role: v }, `exp:${e.id}:role`)} placeholder="Product Manager" />
              <TextField label="Company" value={e.company} onChange={(v) => apply("update_experience", { id: e.id, company: v }, `exp:${e.id}:company`)} placeholder="Acme" />
              <TextField label="Start" value={e.startDate} onChange={(v) => apply("update_experience", { id: e.id, startDate: v }, `exp:${e.id}:start`)} placeholder="Mar 2022" />
              {e.current ? (
                <TextField label="End" value="Present" onChange={() => undefined} disabled />
              ) : (
                <TextField label="End" value={e.endDate} onChange={(v) => apply("update_experience", { id: e.id, endDate: v }, `exp:${e.id}:end`)} placeholder="Jun 2024" />
              )}
              <TextField label="Location" value={e.location} onChange={(v) => apply("update_experience", { id: e.id, location: v }, `exp:${e.id}:loc`)} placeholder="Remote" />
              <label className="flex h-9 items-center gap-2.5 self-end text-body text-ink">
                <input
                  type="checkbox"
                  checked={e.current}
                  onChange={(ev) => apply("update_experience", { id: e.id, current: ev.target.checked, endDate: ev.target.checked ? "Present" : "" })}
                  className="size-4 rounded-[4px] accent-[rgb(var(--c-accent))]"
                />
                I work here now
              </label>
            </div>
            <BulletList
              label="Achievements"
              items={e.description}
              onChange={(next) => apply("update_experience", { id: e.id, description: next }, `exp:${e.id}:bullets`)}
              placeholder="Cut time to first invoice from 9 days to 2 by rebuilding onboarding"
            />
          </EntryCard>
        ))}
        <AddRow label="Add role" onClick={() => add("experience", "exp")} />
      </Section>

      <Section id="education" title="Education" count={content.education.length} open={openSections.has("education")} onToggle={() => toggle("education")}>
        {content.education.map((e, i) => (
          <EntryCard
            key={e.id}
            title={[e.degree, e.institution].filter(Boolean).join(" · ")}
            meta={range(e.startDate, e.endDate)}
            open={openEntry === e.id}
            autoFocus={justAdded === e.id}
            onToggle={() => setOpenEntry(openEntry === e.id ? null : e.id)}
            onMoveUp={i > 0 ? () => move("education", e.id, "up") : undefined}
            onMoveDown={i < content.education.length - 1 ? () => move("education", e.id, "down") : undefined}
            onDelete={() => del("education", "remove_education", e, i, "Education")}
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <TextField label="School" value={e.institution} onChange={(v) => apply("update_education", { id: e.id, institution: v }, `edu:${e.id}:inst`)} placeholder="Tel Aviv University" className="sm:col-span-2" />
              <TextField label="Degree" value={e.degree} onChange={(v) => apply("update_education", { id: e.id, degree: v }, `edu:${e.id}:deg`)} placeholder="B.Sc." />
              <TextField label="Field" value={e.field} onChange={(v) => apply("update_education", { id: e.id, field: v }, `edu:${e.id}:field`)} placeholder="Computer Science" />
              <TextField label="Start" value={e.startDate} onChange={(v) => apply("update_education", { id: e.id, startDate: v }, `edu:${e.id}:start`)} placeholder="2016" />
              <TextField label="End" value={e.endDate} onChange={(v) => apply("update_education", { id: e.id, endDate: v }, `edu:${e.id}:end`)} placeholder="2019" />
              <TextField label="GPA" value={e.gpa ?? ""} onChange={(v) => apply("update_education", { id: e.id, gpa: v }, `edu:${e.id}:gpa`)} placeholder="3.8" />
              <TextField label="Location" value={e.location} onChange={(v) => apply("update_education", { id: e.id, location: v }, `edu:${e.id}:loc`)} />
            </div>
            <BulletList
              label="Honors"
              items={e.achievements}
              onChange={(next) => apply("update_education", { id: e.id, achievements: next }, `edu:${e.id}:ach`)}
              addLabel="Add honor"
            />
          </EntryCard>
        ))}
        <AddRow label="Add education" onClick={() => add("education", "edu")} />
      </Section>

      <Section id="skills" title="Skills" count={content.skills.length} open={openSections.has("skills")} onToggle={() => toggle("skills")}>
        <TagInput label="Skills" values={content.skills} onChange={(v) => apply("set_skills", { skills: v })} placeholder="Type a skill, press Enter" />
      </Section>

      <Section id="projects" title="Projects" count={content.projects.length} open={openSections.has("projects")} onToggle={() => toggle("projects")}>
        {content.projects.map((p, i) => (
          <EntryCard
            key={p.id}
            title={p.name}
            meta={p.technologies.join(", ")}
            open={openEntry === p.id}
            autoFocus={justAdded === p.id}
            onToggle={() => setOpenEntry(openEntry === p.id ? null : p.id)}
            onMoveUp={i > 0 ? () => move("projects", p.id, "up") : undefined}
            onMoveDown={i < content.projects.length - 1 ? () => move("projects", p.id, "down") : undefined}
            onDelete={() => del("projects", "remove_project", p, i, "Project")}
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <TextField label="Name" value={p.name} onChange={(v) => apply("update_project", { id: p.id, name: v }, `prj:${p.id}:name`)} />
              <TextField label="Link" value={p.link ?? ""} onChange={(v) => apply("update_project", { id: p.id, link: v }, `prj:${p.id}:link`)} placeholder="github.com/…" />
              <TextField label="One-line description" value={p.description} onChange={(v) => apply("update_project", { id: p.id, description: v }, `prj:${p.id}:desc`)} className="sm:col-span-2" />
            </div>
            <TagInput label="Technologies" values={p.technologies} onChange={(v) => apply("update_project", { id: p.id, technologies: v })} placeholder="Technologies" />
            <BulletList label="Highlights" items={p.bullets} onChange={(next) => apply("update_project", { id: p.id, bullets: next }, `prj:${p.id}:bullets`)} />
          </EntryCard>
        ))}
        <AddRow label="Add project" onClick={() => add("projects", "prj")} />
      </Section>

      <Section id="certifications" title="Certifications" count={content.certifications.length} open={openSections.has("certifications")} onToggle={() => toggle("certifications")}>
        {content.certifications.map((c, i) => (
          <EntryCard
            key={c.id}
            title={c.name}
            meta={[c.issuer, c.date].filter(Boolean).join(" · ")}
            open={openEntry === c.id}
            autoFocus={justAdded === c.id}
            onToggle={() => setOpenEntry(openEntry === c.id ? null : c.id)}
            onMoveUp={i > 0 ? () => move("certifications", c.id, "up") : undefined}
            onMoveDown={i < content.certifications.length - 1 ? () => move("certifications", c.id, "down") : undefined}
            onDelete={() => del("certifications", "remove_certification", c, i, "Certification")}
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <TextField label="Name" value={c.name} onChange={(v) => apply("update_certification", { id: c.id, name: v }, `cert:${c.id}:name`)} className="sm:col-span-2" />
              <TextField label="Issuer" value={c.issuer} onChange={(v) => apply("update_certification", { id: c.id, issuer: v }, `cert:${c.id}:issuer`)} />
              <TextField label="Date" value={c.date} onChange={(v) => apply("update_certification", { id: c.id, date: v }, `cert:${c.id}:date`)} placeholder="2024" />
            </div>
          </EntryCard>
        ))}
        <AddRow label="Add certification" onClick={() => add("certifications", "cert")} />
      </Section>

      <Section id="languages" title="Languages" count={content.languages.length} open={openSections.has("languages")} onToggle={() => toggle("languages")}>
        <TagInput label="Languages" values={content.languages} onChange={(v) => apply("set_languages", { languages: v })} placeholder="English (fluent)" />
      </Section>

      <Section id="custom" title="More sections" count={content.customSections.length} open={openSections.has("custom")} onToggle={() => toggle("custom")}>
        {content.customSections.map((c, i) => (
          <EntryCard
            key={c.id}
            title={c.title}
            meta={c.items.length ? `${c.items.length} item${c.items.length === 1 ? "" : "s"}` : undefined}
            open={openEntry === c.id}
            autoFocus={justAdded === c.id}
            onToggle={() => setOpenEntry(openEntry === c.id ? null : c.id)}
            onMoveUp={i > 0 ? () => move("customSections", c.id, "up") : undefined}
            onMoveDown={i < content.customSections.length - 1 ? () => move("customSections", c.id, "down") : undefined}
            onDelete={() => del("customSections", "remove_custom_section", c, i, "Section")}
          >
            <TextField label="Section title" value={c.title} onChange={(v) => apply("update_custom_section", { id: c.id, title: v }, `cus:${c.id}:title`)} placeholder="Volunteering" />
            <BulletList
              label="Items"
              items={c.items.map((it) => it.text)}
              onChange={(next) => apply("update_custom_section", { id: c.id, items: next }, `cus:${c.id}:items`)}
              addLabel="Add item"
            />
          </EntryCard>
        ))}
        <AddRow label="Add a section" onClick={() => add("customSections", "cus", { title: "" })} />
      </Section>
    </div>
  );
}
