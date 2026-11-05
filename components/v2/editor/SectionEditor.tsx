"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, ChevronDown, GripVertical, MoreHorizontal, Trash2 } from "lucide-react";
import { MotionConfig, Reorder, useDragControls } from "framer-motion";
import type { ResumeData } from "@/types/resume";
import { cn, IconButton, Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger, toast } from "@/components/ui";
import { useT } from "@/lib/i18n/LanguageProvider";
import { moveSection, sectionKeys } from "@/lib/resume/sectionOrder";
import { AddRow, AutoTextarea, BulletList, EntryCard, TagInput, TextField } from "./fields";
import { PhotoField } from "./PhotoField";

type Apply = (name: string, input: Record<string, unknown>, key?: string) => boolean;
type SectionKey = "experience" | "education" | "projects" | "certifications" | "customSections";

const newEntryId = (prefix: string) => `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
const range = (present: string, a?: string, b?: string, current?: boolean) => [a, current ? present : b].filter(Boolean).join(" – ");

// Examples that read the same in every language (addresses, not words).
const EMAIL_EXAMPLE = "dana@email.com";
const LINKEDIN_EXAMPLE = "linkedin.com/in/dana";
const WEBSITE_EXAMPLE = "dana.design";
const LINK_EXAMPLE = "github.com/…";

/** An editor section: the fixed ones, or a custom section by its own id. */
export type SectionId = "profile" | "summary" | "experience" | "education" | "skills" | "projects" | "certifications" | "languages" | (string & {});

/** What a body section's header offers for its place in the CV. */
type Placement = { onMoveUp?: () => void; onMoveDown?: () => void; onDelete?: () => void; onDragStart: (e: React.PointerEvent) => void };

function Section({
  id,
  title,
  count,
  open,
  onToggle,
  placement,
  children,
}: {
  id: SectionId;
  title: string;
  count?: number;
  open: boolean;
  onToggle: () => void;
  /** Body sections can be dragged and moved; profile, summary, skills and languages stay put. */
  placement?: Placement;
  children: React.ReactNode;
}) {
  const { t } = useT();
  return (
    <section id={`section-${id}`} className="scroll-mt-4 border-b border-hairline bg-surface last:border-b-0">
      <div className="flex items-center pe-2">
        {placement && (
          <button
            type="button"
            aria-label={t("Drag to reorder")}
            title={t("Drag to reorder")}
            onPointerDown={placement.onDragStart}
            onKeyDown={(e) => {
              if (e.key === "ArrowUp" && placement.onMoveUp) {
                e.preventDefault();
                placement.onMoveUp();
              } else if (e.key === "ArrowDown" && placement.onMoveDown) {
                e.preventDefault();
                placement.onMoveDown();
              }
            }}
            className="grid h-14 w-9 shrink-0 cursor-grab touch-none place-items-center text-ink-3 transition-colors hover:text-ink active:cursor-grabbing touch:w-11"
          >
            <GripVertical className="size-4" aria-hidden />
          </button>
        )}
        <h2 className="min-w-0 flex-1">
          <button type="button" onClick={onToggle} aria-expanded={open} className={cn("flex h-14 w-full items-center gap-3 text-start hover:bg-surface-2/60", placement ? "pe-3" : "px-5")}>
            <span className={cn("min-w-0 flex-1 truncate text-emph font-semibold", title ? "text-ink" : "text-ink-3")}>{title || t("Untitled section")}</span>
            {count ? <span className="tabular text-dense text-ink-3">{count}</span> : null}
            <ChevronDown className={cn("size-4 text-ink-3 transition-transform duration-panel", open && "rotate-180")} aria-hidden />
          </button>
        </h2>
        {placement && (
          <Menu>
            <MenuTrigger asChild>
              <IconButton label={t("Section actions")}>
                <MoreHorizontal />
              </IconButton>
            </MenuTrigger>
            <MenuContent align="end">
              <MenuItem icon={<ArrowUp />} disabled={!placement.onMoveUp} onSelect={placement.onMoveUp}>
                {t("Move up")}
              </MenuItem>
              <MenuItem icon={<ArrowDown />} disabled={!placement.onMoveDown} onSelect={placement.onMoveDown}>
                {t("Move down")}
              </MenuItem>
              {placement.onDelete && (
                <>
                  <MenuSeparator />
                  <MenuItem icon={<Trash2 />} tone="danger" onSelect={placement.onDelete}>
                    {t("Delete section")}
                  </MenuItem>
                </>
              )}
            </MenuContent>
          </Menu>
        )}
      </div>
      {open && <div className={cn("flex flex-col gap-3 pb-6", placement ? "pe-5 ps-9 touch:ps-11" : "px-5")}>{children}</div>}
    </section>
  );
}

/** One draggable body section. The drag starts only from its handle, so fields stay usable. */
function Movable({ value, onDrop, children }: { value: string; onDrop: () => void; children: (onDragStart: (e: React.PointerEvent) => void) => React.ReactNode }) {
  const controls = useDragControls();
  return (
    <Reorder.Item as="div" value={value} dragListener={false} dragControls={controls} onDragEnd={onDrop} className="relative" whileDrag={{ zIndex: 10, boxShadow: "var(--shadow-pop)" }}>
      {children((e) => controls.start(e))}
    </Reorder.Item>
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
  photoShown,
  onOpenDesign,
}: {
  content: ResumeData;
  apply: Apply;
  openSections: Set<SectionId>;
  setOpenSections: (next: Set<SectionId>) => void;
  /** Whether the current design shows a photo. */
  photoShown: boolean;
  onOpenDesign: () => void;
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

  // The body sections in the CV's order. While dragging, the list follows the
  // pointer locally; the order is saved once, when the section is dropped.
  const keys = sectionKeys(content);
  const [dragOrder, setDragOrder] = React.useState<string[] | null>(null);
  const order = dragOrder ?? keys;
  const placement = (key: string, onDelete?: () => void, i = order.indexOf(key)): Placement => ({
    onMoveUp: i > 0 ? () => apply("set_section_order", { order: moveSection(content, key, "up") }) : undefined,
    onMoveDown: i < order.length - 1 ? () => apply("set_section_order", { order: moveSection(content, key, "down") }) : undefined,
    onDelete,
    onDragStart: () => undefined,
  });
  const dropped = () => {
    if (dragOrder) apply("set_section_order", { order: dragOrder });
    setDragOrder(null);
  };

  const bodySection = (key: string, onDragStart: (e: React.PointerEvent) => void) => {
    switch (key) {
      case "experience":
        return (
          <Section id="experience" placement={{ ...placement("experience"), onDragStart }} title={t("Experience")} count={content.experience.length} open={openSections.has("experience")} onToggle={() => toggle("experience")}>
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
        );
      case "education":
        return (
          <Section id="education" placement={{ ...placement("education"), onDragStart }} title={t("Education")} count={content.education.length} open={openSections.has("education")} onToggle={() => toggle("education")}>
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
        );
      case "projects":
        return (
          <Section id="projects" placement={{ ...placement("projects"), onDragStart }} title={t("Projects")} count={content.projects.length} open={openSections.has("projects")} onToggle={() => toggle("projects")}>
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
        );
      case "certifications":
        return (
          <Section id="certifications" placement={{ ...placement("certifications"), onDragStart }} title={t("Certifications")} count={content.certifications.length} open={openSections.has("certifications")} onToggle={() => toggle("certifications")}>
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
        );
      default: {
        const c = content.customSections.find((x) => x.id === key);
        if (!c) return null;
        return (
            <Section
              id={c.id}
              title={c.title}
              count={c.items.length || undefined}
              open={openSections.has(c.id)}
              onToggle={() => toggle(c.id)}
              placement={{ ...placement(c.id, () => del("customSections", "remove_custom_section", c, content.customSections.indexOf(c), t("Section deleted"))), onDragStart }}
            >
              <TextField label={t("Section title")} value={c.title} onChange={(v) => apply("update_custom_section", { id: c.id, title: v }, `cus:${c.id}:title`)} placeholder={t("Volunteering")} />
              <BulletList
                label={t("Items")}
                items={c.items.map((it) => it.text)}
                onChange={(next) => apply("update_custom_section", { id: c.id, items: next }, `cus:${c.id}:items`)}
                addLabel={t("Add item")}
              />
            </Section>
        );
      }
    }
  };
  const addSection = () => {
    const id = newEntryId("cus");
    apply("insert_entry", { section: "customSections", entry: { id, title: "", items: [] } });
    setOpenSections(new Set([...openSections, id]));
    requestAnimationFrame(() => document.querySelector<HTMLInputElement>(`#section-${id} input`)?.focus());
  };

  return (
    <MotionConfig reducedMotion="user">
    <div className="flex flex-col">
      <Section id="profile" title={t("Profile")} open={openSections.has("profile")} onToggle={() => toggle("profile")}>
        <PhotoField photo={pi.photo} shown={photoShown} onChange={(photo) => apply("update_personal_info", { photo })} onOpenDesign={onOpenDesign} />
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

      <Reorder.Group as="div" axis="y" values={order} onReorder={setDragOrder} className="flex flex-col">
        {order.map((key) => (
          <Movable key={key} value={key} onDrop={dropped}>
            {(onDragStart) => bodySection(key, onDragStart)}
          </Movable>
        ))}
      </Reorder.Group>
      <div className="border-b border-hairline px-5 py-4">
        <AddRow label={t("Add a section")} onClick={addSection} />
      </div>

      <Section id="skills" title={t("Skills")} count={content.skills.length} open={openSections.has("skills")} onToggle={() => toggle("skills")}>
        <TagInput label={t("Skills")} values={content.skills} onChange={(v) => apply("set_skills", { skills: v })} placeholder={t("Type a skill, press Enter")} />
      </Section>

      <Section id="languages" title={t("Languages")} count={content.languages.length} open={openSections.has("languages")} onToggle={() => toggle("languages")}>
        <TagInput label={t("Languages")} values={content.languages} onChange={(v) => apply("set_languages", { languages: v })} placeholder={t("English (fluent)")} />
      </Section>

    </div>
    </MotionConfig>
  );
}
