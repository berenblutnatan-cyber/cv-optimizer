"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import type { ResumeData } from "@/types/resume";
import { cn, toast } from "@/components/ui";
import { useT } from "@/lib/i18n/LanguageProvider";
import { AddRow, AutoTextarea, BulletList, EntryCard, TagInput, TextField } from "./fields";

type Apply = (name: string, input: Record<string, unknown>, key?: string) => boolean;
type SectionKey = "experience" | "education" | "projects" | "certifications" | "customSections";

const newEntryId = (prefix: string) => `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
const range = (present: string, a?: string, b?: string, current?: boolean) => [a, current ? present : b].filter(Boolean).join(" – ");

// Examples that read the same in every language (addresses, not words).
const EMAIL_EXAMPLE = "dana@email.com";
const LINKEDIN_EXAMPLE = "linkedin.com/in/dana";
const WEBSITE_EXAMPLE = "dana.design";
const LINK_EXAMPLE = "github.com/…";

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
  const { t } = useT();
  return React.useCallback(
    (section: SectionKey, removeTool: string, entry: { id: string }, index: number, message: string) => {
      if (!apply(removeTool, { id: entry.id })) return;
      toast(message, {
        duration: 10_000, // long enough to notice and reach Undo
        action: { label: t("Undo"), onClick: () => apply("insert_entry", { section, index, entry }) },
      });
    },
    [apply, t],
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
  const { t } = useT();
  const present = t("Present");
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
      <Section id="profile" title={t("Profile")} open={openSections.has("profile")} onToggle={() => toggle("profile")}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField label={t("Full name")} value={pi.name} onChange={setPi("name")} placeholder={t("Dana Levi")} autoComplete="name" />
          <TextField label={t("Headline")} value={pi.title} onChange={setPi("title")} placeholder={t("Senior Product Manager")} autoComplete="organization-title" />
          <TextField label={t("Email")} type="email" value={pi.email} onChange={setPi("email")} placeholder={EMAIL_EXAMPLE} autoComplete="email" />
          <TextField label={t("Phone")} type="tel" value={pi.phone} onChange={setPi("phone")} placeholder="+972 50 000 0000" autoComplete="tel" />
          <TextField label={t("Location")} value={pi.location} onChange={setPi("location")} placeholder={t("Tel Aviv, Israel")} />
          <TextField label={t("LinkedIn")} value={pi.linkedin} onChange={setPi("linkedin")} placeholder={LINKEDIN_EXAMPLE} />
          <TextField label={t("Website")} value={pi.website} onChange={setPi("website")} placeholder={WEBSITE_EXAMPLE} className="sm:col-span-2" />
        </div>
      </Section>

      <Section id="summary" title={t("Summary")} open={openSections.has("summary")} onToggle={() => toggle("summary")}>
        <label htmlFor="summary-field" className="sr-only">
          {t("Summary")}
        </label>
        <AutoTextarea
          id="summary-field"
          value={content.summary}
          onChange={(e) => apply("update_summary", { summary: e.target.value }, "summary")}
          placeholder={t("Two to four sentences: who you are, what you're best at, what you want next.")}
          className="min-h-24"
        />
      </Section>

      <Section id="experience" title={t("Experience")} count={content.experience.length} open={openSections.has("experience")} onToggle={() => toggle("experience")}>
        {content.experience.map((e, i) => (
          <EntryCard
            key={e.id}
            title={[e.role, e.company].filter(Boolean).join(" · ")}
            meta={range(present, e.startDate, e.endDate, e.current)}
            open={openEntry === e.id}
            autoFocus={justAdded === e.id}
            onToggle={() => setOpenEntry(openEntry === e.id ? null : e.id)}
            onMoveUp={i > 0 ? () => move("experience", e.id, "up") : undefined}
            onMoveDown={i < content.experience.length - 1 ? () => move("experience", e.id, "down") : undefined}
            onDelete={() => del("experience", "remove_experience", e, i, t("Role deleted"))}
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <TextField label={t("Role")} value={e.role} onChange={(v) => apply("update_experience", { id: e.id, role: v }, `exp:${e.id}:role`)} placeholder={t("Product Manager")} />
              <TextField label={t("Company")} value={e.company} onChange={(v) => apply("update_experience", { id: e.id, company: v }, `exp:${e.id}:company`)} placeholder={t("Acme")} />
              <TextField label={t("Start")} value={e.startDate} onChange={(v) => apply("update_experience", { id: e.id, startDate: v }, `exp:${e.id}:start`)} placeholder={t("Mar 2022")} />
              {e.current ? (
                <TextField label={t("End")} value={present} onChange={() => undefined} disabled />
              ) : (
                <TextField label={t("End")} value={e.endDate} onChange={(v) => apply("update_experience", { id: e.id, endDate: v }, `exp:${e.id}:end`)} placeholder={t("Jun 2024")} />
              )}
              <TextField label={t("Location")} value={e.location} onChange={(v) => apply("update_experience", { id: e.id, location: v }, `exp:${e.id}:loc`)} placeholder={t("Remote")} />
              <label className="flex h-9 items-center gap-2.5 self-end text-body text-ink">
                <input
                  type="checkbox"
                  checked={e.current}
                  onChange={(ev) => apply("update_experience", { id: e.id, current: ev.target.checked, endDate: ev.target.checked ? "Present" : "" })}
                  className="size-4 rounded-[4px] accent-[rgb(var(--c-accent))]"
                />
                {t("I work here now")}
              </label>
            </div>
            <BulletList
              label={t("Achievements")}
              items={e.description}
              onChange={(next) => apply("update_experience", { id: e.id, description: next }, `exp:${e.id}:bullets`)}
              placeholder={t("Cut time to first invoice from 9 days to 2 by rebuilding onboarding")}
            />
          </EntryCard>
        ))}
        <AddRow label={t("Add role")} onClick={() => add("experience", "exp")} />
      </Section>

      <Section id="education" title={t("Education")} count={content.education.length} open={openSections.has("education")} onToggle={() => toggle("education")}>
        {content.education.map((e, i) => (
          <EntryCard
            key={e.id}
            title={[e.degree, e.institution].filter(Boolean).join(" · ")}
            meta={range(present, e.startDate, e.endDate)}
            open={openEntry === e.id}
            autoFocus={justAdded === e.id}
            onToggle={() => setOpenEntry(openEntry === e.id ? null : e.id)}
            onMoveUp={i > 0 ? () => move("education", e.id, "up") : undefined}
            onMoveDown={i < content.education.length - 1 ? () => move("education", e.id, "down") : undefined}
            onDelete={() => del("education", "remove_education", e, i, t("Education deleted"))}
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <TextField label={t("School")} value={e.institution} onChange={(v) => apply("update_education", { id: e.id, institution: v }, `edu:${e.id}:inst`)} placeholder={t("Tel Aviv University")} className="sm:col-span-2" />
              <TextField label={t("Degree")} value={e.degree} onChange={(v) => apply("update_education", { id: e.id, degree: v }, `edu:${e.id}:deg`)} placeholder={t("B.Sc.")} />
              <TextField label={t("Field")} value={e.field} onChange={(v) => apply("update_education", { id: e.id, field: v }, `edu:${e.id}:field`)} placeholder={t("Computer Science")} />
              <TextField label={t("Start")} value={e.startDate} onChange={(v) => apply("update_education", { id: e.id, startDate: v }, `edu:${e.id}:start`)} placeholder="2016" />
              <TextField label={t("End")} value={e.endDate} onChange={(v) => apply("update_education", { id: e.id, endDate: v }, `edu:${e.id}:end`)} placeholder="2019" />
              <TextField label={t("GPA")} value={e.gpa ?? ""} onChange={(v) => apply("update_education", { id: e.id, gpa: v }, `edu:${e.id}:gpa`)} placeholder="3.8" />
              <TextField label={t("Location")} value={e.location} onChange={(v) => apply("update_education", { id: e.id, location: v }, `edu:${e.id}:loc`)} />
            </div>
            <BulletList
              label={t("Honors")}
              items={e.achievements}
              onChange={(next) => apply("update_education", { id: e.id, achievements: next }, `edu:${e.id}:ach`)}
              addLabel={t("Add honor")}
            />
          </EntryCard>
        ))}
        <AddRow label={t("Add education")} onClick={() => add("education", "edu")} />
      </Section>

      <Section id="skills" title={t("Skills")} count={content.skills.length} open={openSections.has("skills")} onToggle={() => toggle("skills")}>
        <TagInput label={t("Skills")} values={content.skills} onChange={(v) => apply("set_skills", { skills: v })} placeholder={t("Type a skill, press Enter")} />
      </Section>

      <Section id="projects" title={t("Projects")} count={content.projects.length} open={openSections.has("projects")} onToggle={() => toggle("projects")}>
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
            onDelete={() => del("projects", "remove_project", p, i, t("Project deleted"))}
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <TextField label={t("Name")} value={p.name} onChange={(v) => apply("update_project", { id: p.id, name: v }, `prj:${p.id}:name`)} />
              <TextField label={t("Link")} value={p.link ?? ""} onChange={(v) => apply("update_project", { id: p.id, link: v }, `prj:${p.id}:link`)} placeholder={LINK_EXAMPLE} />
              <TextField label={t("One-line description")} value={p.description} onChange={(v) => apply("update_project", { id: p.id, description: v }, `prj:${p.id}:desc`)} className="sm:col-span-2" />
            </div>
            <TagInput label={t("Technologies")} values={p.technologies} onChange={(v) => apply("update_project", { id: p.id, technologies: v })} placeholder={t("Technologies")} />
            <BulletList label={t("Highlights")} items={p.bullets} onChange={(next) => apply("update_project", { id: p.id, bullets: next }, `prj:${p.id}:bullets`)} />
          </EntryCard>
        ))}
        <AddRow label={t("Add project")} onClick={() => add("projects", "prj")} />
      </Section>

      <Section id="certifications" title={t("Certifications")} count={content.certifications.length} open={openSections.has("certifications")} onToggle={() => toggle("certifications")}>
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
            onDelete={() => del("certifications", "remove_certification", c, i, t("Certification deleted"))}
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <TextField label={t("Name")} value={c.name} onChange={(v) => apply("update_certification", { id: c.id, name: v }, `cert:${c.id}:name`)} className="sm:col-span-2" />
              <TextField label={t("Issuer")} value={c.issuer} onChange={(v) => apply("update_certification", { id: c.id, issuer: v }, `cert:${c.id}:issuer`)} />
              <TextField label={t("Date")} value={c.date} onChange={(v) => apply("update_certification", { id: c.id, date: v }, `cert:${c.id}:date`)} placeholder="2024" />
            </div>
          </EntryCard>
        ))}
        <AddRow label={t("Add certification")} onClick={() => add("certifications", "cert")} />
      </Section>

      <Section id="languages" title={t("Languages")} count={content.languages.length} open={openSections.has("languages")} onToggle={() => toggle("languages")}>
        <TagInput label={t("Languages")} values={content.languages} onChange={(v) => apply("set_languages", { languages: v })} placeholder={t("English (fluent)")} />
      </Section>

      <Section id="custom" title={t("More sections")} count={content.customSections.length} open={openSections.has("custom")} onToggle={() => toggle("custom")}>
        {content.customSections.map((c, i) => (
          <EntryCard
            key={c.id}
            title={c.title}
            meta={c.items.length ? (c.items.length === 1 ? t("1 item") : t("{n} items", { n: c.items.length })) : undefined}
            open={openEntry === c.id}
            autoFocus={justAdded === c.id}
            onToggle={() => setOpenEntry(openEntry === c.id ? null : c.id)}
            onMoveUp={i > 0 ? () => move("customSections", c.id, "up") : undefined}
            onMoveDown={i < content.customSections.length - 1 ? () => move("customSections", c.id, "down") : undefined}
            onDelete={() => del("customSections", "remove_custom_section", c, i, t("Section deleted"))}
          >
            <TextField label={t("Section title")} value={c.title} onChange={(v) => apply("update_custom_section", { id: c.id, title: v }, `cus:${c.id}:title`)} placeholder={t("Volunteering")} />
            <BulletList
              label={t("Items")}
              items={c.items.map((it) => it.text)}
              onChange={(next) => apply("update_custom_section", { id: c.id, items: next }, `cus:${c.id}:items`)}
              addLabel={t("Add item")}
            />
          </EntryCard>
        ))}
        <AddRow label={t("Add a section")} onClick={() => add("customSections", "cus", { title: "" })} />
      </Section>
    </div>
  );
}
