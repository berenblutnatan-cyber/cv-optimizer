"use client";

// Guided, collapsible CV preview for the chat builder. Each CV section is an
// accordion panel; only one is open at a time. As the agent fills the open
// section during the conversation it auto-completes, collapses, and the next
// incomplete section opens — so the build walks the user through in order. The
// user can also click any header to expand/collapse, or hit "Next" to advance
// manually. The classic full-document render stays available via the view
// toggle in the preview column.

import { useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  ArrowRight,
  User,
  FileText,
  Briefcase,
  GraduationCap,
  Wrench,
  Sparkles,
} from "lucide-react";
import type { ResumeData } from "@/types/resume";
import { isPlaceholderSummary } from "@/lib/chat/prompts";

type SectionId = "contact" | "summary" | "experience" | "education" | "skills" | "extras";

type SectionDef = {
  id: SectionId;
  label: string;
  icon: typeof User;
  /** True once the section has enough to count as "done". */
  isComplete: (d: ResumeData) => boolean;
  /** True when there's nothing in it yet (drives the empty hint). */
  isEmpty: (d: ResumeData) => boolean;
  /** Extras (projects/certs/languages) are nice-to-have, never block advance. */
  optional?: boolean;
  hint: string;
  render: (d: ResumeData) => React.ReactNode;
};

const dash = (a?: string, b?: string) => [a, b].filter(Boolean).join(" – ");

function Bullets({ items }: { items: string[] }) {
  const real = items.filter((b) => b && b.trim());
  if (real.length === 0) return null;
  return (
    <ul className="mt-1.5 space-y-1">
      {real.map((b, i) => (
        <li key={i} className="flex gap-2 text-[13px] leading-relaxed text-[#0A2647]/80">
          <span className="mt-1.5 h-1 w-1 rounded-full bg-[#B8860B] flex-shrink-0" />
          <span>{b}</span>
        </li>
      ))}
    </ul>
  );
}

function Chips({ items }: { items: string[] }) {
  const real = items.filter((s) => s && s.trim());
  if (real.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {real.map((s, i) => (
        <span
          key={i}
          className="px-2.5 py-1 rounded-full bg-[#0A2647]/[0.05] border border-[#0A2647]/10 text-[12px] text-[#0A2647]/85"
        >
          {s}
        </span>
      ))}
    </div>
  );
}

const SECTIONS: SectionDef[] = [
  {
    id: "contact",
    label: "Contact",
    icon: User,
    isComplete: (d) =>
      Boolean(d.personalInfo.name.trim()) &&
      Boolean(d.personalInfo.email.trim() || d.personalInfo.phone.trim()),
    isEmpty: (d) => !d.personalInfo.name.trim(),
    hint: "Tell me your name and the role you're going for — I'll add contact details last.",
    render: (d) => {
      const p = d.personalInfo;
      const contacts = [p.email, p.phone, p.location, p.linkedin, p.website].filter(
        (x) => x && x.trim()
      );
      return (
        <div className="space-y-1">
          <div className="text-[#0A2647] font-semibold text-[15px]">{p.name || "—"}</div>
          {p.title ? <div className="text-[#0A2647]/70 text-[13px]">{p.title}</div> : null}
          {contacts.length > 0 ? (
            <div className="text-[#0A2647]/65 text-[12px] flex flex-wrap gap-x-2 gap-y-0.5 pt-0.5">
              {contacts.map((c, i) => (
                <span key={i}>{c}</span>
              ))}
            </div>
          ) : null}
        </div>
      );
    },
  },
  {
    id: "summary",
    label: "Summary",
    icon: FileText,
    isComplete: (d) => !isPlaceholderSummary(d.summary),
    isEmpty: (d) => isPlaceholderSummary(d.summary),
    hint: "We'll write this last — once I know your story and target role.",
    render: (d) =>
      isPlaceholderSummary(d.summary) ? null : (
        <p className="text-[13px] leading-relaxed text-[#0A2647]/85">{d.summary}</p>
      ),
  },
  {
    id: "experience",
    label: "Experience",
    icon: Briefcase,
    isComplete: (d) =>
      d.experience.some((e) => e.role?.trim() && e.company?.trim()),
    isEmpty: (d) => d.experience.length === 0,
    hint: "What's your current or most recent job — company, title, and what you did?",
    render: (d) => (
      <div className="space-y-3">
        {d.experience.map((e) => (
          <div key={e.id}>
            <div className="text-[#0A2647] font-medium text-[14px]">
              {[e.role, e.company].filter(Boolean).join(" · ") || "—"}
            </div>
            <div className="text-[#0A2647]/55 text-[12px]">
              {dash(e.startDate, e.current ? "Present" : e.endDate)}
              {e.location ? ` · ${e.location}` : ""}
            </div>
            <Bullets items={e.description ?? []} />
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "education",
    label: "Education",
    icon: GraduationCap,
    isComplete: (d) => d.education.some((e) => e.institution?.trim() || e.degree?.trim()),
    isEmpty: (d) => d.education.length === 0,
    hint: "Where did you study, and what did you study?",
    render: (d) => (
      <div className="space-y-2">
        {d.education.map((e) => (
          <div key={e.id}>
            <div className="text-[#0A2647] font-medium text-[14px]">
              {[e.degree, e.field].filter(Boolean).join(", ") || e.institution || "—"}
            </div>
            <div className="text-[#0A2647]/55 text-[12px]">
              {[e.institution, dash(e.startDate, e.endDate)].filter(Boolean).join(" · ")}
              {e.gpa ? ` · GPA ${e.gpa}` : ""}
            </div>
            <Bullets items={e.achievements ?? []} />
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "skills",
    label: "Skills",
    icon: Wrench,
    isComplete: (d) => d.skills.length >= 3,
    isEmpty: (d) => d.skills.length === 0,
    hint: "What tools and skills should be on this? I'll add the ones your stories show, too.",
    render: (d) => <Chips items={d.skills} />,
  },
  {
    id: "extras",
    label: "Projects, languages & more",
    icon: Sparkles,
    optional: true,
    isComplete: (d) =>
      d.projects.length > 0 ||
      d.certifications.length > 0 ||
      d.languages.length > 0 ||
      d.customSections.length > 0,
    isEmpty: (d) =>
      d.projects.length === 0 &&
      d.certifications.length === 0 &&
      d.languages.length === 0 &&
      d.customSections.length === 0,
    hint: "Anything else worth adding? Side projects, certifications, languages, volunteering.",
    render: (d) => (
      <div className="space-y-3">
        {d.projects.length > 0 ? (
          <div>
            <div className="text-[#0A2647]/55 text-[11px] uppercase tracking-[0.16em] mb-1">Projects</div>
            {d.projects.map((p) => (
              <div key={p.id} className="mb-1.5">
                <div className="text-[#0A2647] font-medium text-[13px]">{p.name}</div>
                {p.description ? (
                  <div className="text-[#0A2647]/75 text-[12px]">{p.description}</div>
                ) : null}
                <Bullets items={p.bullets ?? []} />
              </div>
            ))}
          </div>
        ) : null}
        {d.certifications.length > 0 ? (
          <div>
            <div className="text-[#0A2647]/55 text-[11px] uppercase tracking-[0.16em] mb-1">Certifications</div>
            {d.certifications.map((c) => (
              <div key={c.id} className="text-[#0A2647]/80 text-[13px]">
                {[c.name, c.issuer, c.date].filter(Boolean).join(" · ")}
              </div>
            ))}
          </div>
        ) : null}
        {d.languages.length > 0 ? (
          <div>
            <div className="text-[#0A2647]/55 text-[11px] uppercase tracking-[0.16em] mb-1">Languages</div>
            <Chips items={d.languages} />
          </div>
        ) : null}
        {d.customSections.map((s) => (
          <div key={s.id}>
            <div className="text-[#0A2647]/55 text-[11px] uppercase tracking-[0.16em] mb-1">{s.title}</div>
            <Bullets items={s.items.map((i) => i.text)} />
          </div>
        ))}
      </div>
    ),
  },
];

export function GuidedSectionsPreview({ data }: { data: ResumeData }) {
  const completion = SECTIONS.map((s) => s.isComplete(data));
  const firstIncomplete = SECTIONS.findIndex((s, i) => !s.optional && !completion[i]);
  const [openId, setOpenId] = useState<SectionId | null>(
    SECTIONS[firstIncomplete === -1 ? 0 : firstIncomplete].id
  );

  // Auto-advance: when the OPEN section flips incomplete -> complete (the agent
  // just filled it), collapse it and open the next incomplete section in order.
  const prevComplete = useRef<Record<SectionId, boolean>>(
    Object.fromEntries(SECTIONS.map((s, i) => [s.id, completion[i]])) as Record<SectionId, boolean>
  );
  useEffect(() => {
    const map = Object.fromEntries(
      SECTIONS.map((s) => [s.id, s.isComplete(data)])
    ) as Record<SectionId, boolean>;
    if (openId) {
      const justCompleted = !prevComplete.current[openId] && map[openId];
      if (justCompleted) {
        const openIdx = SECTIONS.findIndex((s) => s.id === openId);
        const next = SECTIONS.find((s, i) => i > openIdx && !s.optional && !map[s.id]);
        setOpenId(next ? next.id : null);
      }
    }
    prevComplete.current = map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  function advanceFrom(id: SectionId) {
    const idx = SECTIONS.findIndex((s) => s.id === id);
    const next = SECTIONS[idx + 1];
    setOpenId(next ? next.id : null);
  }

  const doneCount = SECTIONS.filter((s, i) => !s.optional && completion[i]).length;
  const required = SECTIONS.filter((s) => !s.optional).length;

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-shrink-0 flex items-center justify-between px-1 pb-2">
        <div className="text-[11px] uppercase tracking-[0.18em] text-[#0A2647]/55">Guided build</div>
        <div className="text-[11px] text-[#0A2647]/55">
          {doneCount}/{required} sections
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-2 [-ms-overflow-style:none] [scrollbar-width:thin]">
        {SECTIONS.map((s, i) => {
          const complete = completion[i];
          const empty = s.isEmpty(data);
          const open = openId === s.id;
          const Icon = s.icon;
          return (
            <div
              key={s.id}
              className={`rounded-2xl border transition-colors ${
                open
                  ? "bg-[#0A2647]/[0.04] border-[#0A2647]/25"
                  : "bg-white border-[#0A2647]/10 hover:bg-[#0A2647]/[0.05]"
              }`}
            >
              <button
                type="button"
                onClick={() => setOpenId(open ? null : s.id)}
                aria-expanded={open}
                className="w-full flex items-center gap-3 px-3.5 py-3 text-left"
              >
                <span
                  className={`grid place-items-center h-7 w-7 rounded-full flex-shrink-0 ${
                    complete ? "bg-[#059669]/20 text-[#059669]" : "bg-[#0A2647]/[0.05] text-[#0A2647]/70"
                  }`}
                >
                  {complete ? <Check className="h-4 w-4" strokeWidth={2.4} /> : <Icon className="h-4 w-4" />}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[14px] text-[#0A2647] font-medium truncate">{s.label}</span>
                  <span className="block text-[11px] text-[#0A2647]/50">
                    {complete ? "Done" : empty ? (s.optional ? "Optional" : "Up next") : "In progress"}
                  </span>
                </span>
                <ChevronDown
                  className={`h-4 w-4 text-[#0A2647]/50 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
                />
              </button>
              {open ? (
                <div className="px-3.5 pb-3.5 pt-0.5">
                  {empty ? (
                    <p className="text-[13px] leading-relaxed text-[#0A2647]/55 italic">{s.hint}</p>
                  ) : (
                    s.render(data)
                  )}
                  <div className="mt-3 flex justify-end">
                    {i < SECTIONS.length - 1 ? (
                      <button
                        type="button"
                        onClick={() => advanceFrom(s.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0A2647]/[0.05] border border-[#0A2647]/10 text-[12px] text-[#0A2647]/80 hover:bg-[#0A2647]/10 hover:text-[#0A2647] transition-colors"
                      >
                        Next
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
