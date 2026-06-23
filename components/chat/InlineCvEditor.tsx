"use client";

/**
 * InlineCvEditor — direct, structured editing of the live CV from inside the
 * chat builder. It writes to the SAME `useResumeStore` the AI chat patches, so
 * the user can flip between "✨ Chat" (let the AI build) and "✏️ Edit" (tweak
 * fields by hand) at any time without losing a thing — the merge of the chat
 * and the regular form builder into one surface.
 *
 * Covers the core sections (contact, summary, experience, education, skills).
 * Deep extras (projects, certifications, custom sections) live in the full
 * wizard, linked from the footer.
 */

import { useState } from "react";
import { Plus, Trash2, GripVertical, Sparkles, X } from "lucide-react";
import { useResumeStore } from "@/store/useResumeStore";
import { isPlaceholderSummary } from "@/lib/chat/prompts";
import { InlineAssist } from "@/components/chat/InlineAssist";

const fieldCls =
  "w-full rounded-xl bg-white border border-stone-300 px-3 py-2 text-[14px] text-[#1a1a1a] placeholder-stone-400 outline-none focus:border-[#0A2647]/50 focus:ring-2 focus:ring-[#0A2647]/10 transition-colors";
const labelCls = "block text-[11px] font-medium uppercase tracking-wide text-stone-500 mb-1";

function SectionCard({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-stone-50 border border-stone-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[13px] font-semibold tracking-wide text-[#0A2647]">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

export function InlineCvEditor() {
  const resumeData = useResumeStore((s) => s.resumeData);
  const updatePersonalInfo = useResumeStore((s) => s.updatePersonalInfo);
  const updateSummary = useResumeStore((s) => s.updateSummary);
  const addExperience = useResumeStore((s) => s.addExperience);
  const updateExperience = useResumeStore((s) => s.updateExperience);
  const removeExperience = useResumeStore((s) => s.removeExperience);
  const addEducation = useResumeStore((s) => s.addEducation);
  const updateEducation = useResumeStore((s) => s.updateEducation);
  const removeEducation = useResumeStore((s) => s.removeEducation);
  const addSkill = useResumeStore((s) => s.addSkill);
  const removeSkill = useResumeStore((s) => s.removeSkill);

  const [skillDraft, setSkillDraft] = useState("");
  const { personalInfo, summary, experience, education, skills } = resumeData;
  const summaryValue = isPlaceholderSummary(summary) ? "" : summary;

  function commitSkill() {
    const next = skillDraft.trim();
    if (next) addSkill(next);
    setSkillDraft("");
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-4 px-4 py-4 overflow-y-auto">
      {/* Contact */}
      <SectionCard title="Contact">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className={labelCls}>Full name</label>
            <input
              className={fieldCls}
              value={personalInfo.name}
              onChange={(e) => updatePersonalInfo({ name: e.target.value })}
              placeholder="Jane Doe"
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Professional title</label>
            <input
              className={fieldCls}
              value={personalInfo.title}
              onChange={(e) => updatePersonalInfo({ title: e.target.value })}
              placeholder="Senior Product Designer"
            />
            <InlineAssist
              action="suggest_headline"
              getTarget={() => ({ currentTitle: personalInfo.title })}
              label="Suggest headline"
              className="mt-1.5"
            />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input
              className={fieldCls}
              value={personalInfo.email}
              onChange={(e) => updatePersonalInfo({ email: e.target.value })}
              placeholder="jane@email.com"
            />
          </div>
          <div>
            <label className={labelCls}>Phone</label>
            <input
              className={fieldCls}
              value={personalInfo.phone}
              onChange={(e) => updatePersonalInfo({ phone: e.target.value })}
              placeholder="+1 555 0100"
            />
          </div>
          <div>
            <label className={labelCls}>Location</label>
            <input
              className={fieldCls}
              value={personalInfo.location}
              onChange={(e) => updatePersonalInfo({ location: e.target.value })}
              placeholder="London, UK"
            />
          </div>
          <div>
            <label className={labelCls}>LinkedIn</label>
            <input
              className={fieldCls}
              value={personalInfo.linkedin}
              onChange={(e) => updatePersonalInfo({ linkedin: e.target.value })}
              placeholder="linkedin.com/in/jane"
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Website</label>
            <input
              className={fieldCls}
              value={personalInfo.website}
              onChange={(e) => updatePersonalInfo({ website: e.target.value })}
              placeholder="janedoe.com"
            />
          </div>
        </div>
      </SectionCard>

      {/* Summary */}
      <SectionCard title="Summary">
        <textarea
          className={`${fieldCls} min-h-[96px] resize-y leading-relaxed`}
          value={summaryValue}
          onChange={(e) => updateSummary(e.target.value)}
          placeholder="A short, punchy overview of who you are and the value you bring."
        />
        <InlineAssist
          action={summaryValue ? "improve_summary" : "write_summary"}
          getTarget={() => ({ text: summaryValue, currentSummary: summaryValue })}
          label={summaryValue ? "Improve with AI" : "Write with AI"}
          className="mt-2"
        />
      </SectionCard>

      {/* Experience */}
      <SectionCard
        title="Experience"
        action={
          <button
            type="button"
            onClick={() => addExperience()}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#0A2647]/[0.07] border border-[#0A2647]/15 text-[11px] text-[#0A2647] hover:bg-[#0A2647]/[0.12] transition-colors"
          >
            <Plus className="h-3 w-3" /> Add
          </button>
        }
      >
        {experience.length === 0 ? (
          <p className="text-[13px] text-stone-500">No roles yet — add one, or ask the AI in Chat to pull them from your CV.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {experience.map((exp, expIndex) => (
              <div key={exp.id} className="rounded-xl bg-white border border-stone-200 p-3">
                <div className="flex items-start gap-2">
                  <GripVertical className="h-4 w-4 text-stone-300 mt-2 flex-shrink-0" />
                  <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <input
                      className={fieldCls}
                      value={exp.role}
                      onChange={(e) => updateExperience(exp.id, { role: e.target.value })}
                      placeholder="Role / title"
                    />
                    <input
                      className={fieldCls}
                      value={exp.company}
                      onChange={(e) => updateExperience(exp.id, { company: e.target.value })}
                      placeholder="Company"
                    />
                    <input
                      className={fieldCls}
                      value={exp.location}
                      onChange={(e) => updateExperience(exp.id, { location: e.target.value })}
                      placeholder="Location"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        className={fieldCls}
                        value={exp.startDate}
                        onChange={(e) => updateExperience(exp.id, { startDate: e.target.value })}
                        placeholder="Start"
                      />
                      <input
                        className={fieldCls}
                        value={exp.current ? "Present" : exp.endDate}
                        disabled={exp.current}
                        onChange={(e) => updateExperience(exp.id, { endDate: e.target.value })}
                        placeholder="End"
                      />
                    </div>
                    <label className="sm:col-span-2 inline-flex items-center gap-2 text-[12px] text-stone-600">
                      <input
                        type="checkbox"
                        checked={exp.current}
                        onChange={(e) =>
                          updateExperience(exp.id, {
                            current: e.target.checked,
                            endDate: e.target.checked ? "Present" : "",
                          })
                        }
                        className="accent-[#0A2647]"
                      />
                      I currently work here
                    </label>
                    <div className="sm:col-span-2">
                      <label className={labelCls}>Highlights (one per line)</label>
                      <textarea
                        className={`${fieldCls} min-h-[72px] resize-y leading-relaxed`}
                        value={exp.description.join("\n")}
                        onChange={(e) =>
                          updateExperience(exp.id, {
                            description: e.target.value.split("\n"),
                          })
                        }
                        placeholder="Led a team of 6 to ship…&#10;Cut load time 40% by…"
                      />
                    </div>
                    <div className="sm:col-span-2 flex flex-wrap gap-2">
                      {exp.description.some((b) => b.trim()) ? (
                        <>
                          <InlineAssist
                            action="improve_bullets"
                            getTarget={() => ({
                              expIndex,
                              role: exp.role,
                              company: exp.company,
                              existingBullets: exp.description.filter((b) => b.trim()),
                            })}
                          />
                          <InlineAssist
                            action="quantify_bullets"
                            getTarget={() => ({
                              expIndex,
                              role: exp.role,
                              company: exp.company,
                              existingBullets: exp.description.filter((b) => b.trim()),
                            })}
                          />
                        </>
                      ) : null}
                      <InlineAssist
                        action="generate_bullets"
                        getTarget={() => ({
                          expIndex,
                          role: exp.role,
                          company: exp.company,
                          existingBullets: exp.description.filter((b) => b.trim()),
                        })}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeExperience(exp.id)}
                    aria-label="Remove role"
                    className="flex-shrink-0 grid place-items-center h-7 w-7 rounded-lg text-stone-400 hover:text-rose-500 hover:bg-stone-100 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Education */}
      <SectionCard
        title="Education"
        action={
          <button
            type="button"
            onClick={() => addEducation()}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#0A2647]/[0.07] border border-[#0A2647]/15 text-[11px] text-[#0A2647] hover:bg-[#0A2647]/[0.12] transition-colors"
          >
            <Plus className="h-3 w-3" /> Add
          </button>
        }
      >
        {education.length === 0 ? (
          <p className="text-[13px] text-stone-500">No schools yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {education.map((edu) => (
              <div key={edu.id} className="rounded-xl bg-white border border-stone-200 p-3">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <input
                      className={fieldCls}
                      value={edu.degree}
                      onChange={(e) => updateEducation(edu.id, { degree: e.target.value })}
                      placeholder="Degree (e.g. BSc)"
                    />
                    <input
                      className={fieldCls}
                      value={edu.field}
                      onChange={(e) => updateEducation(edu.id, { field: e.target.value })}
                      placeholder="Field of study"
                    />
                    <input
                      className={`${fieldCls} sm:col-span-2`}
                      value={edu.institution}
                      onChange={(e) => updateEducation(edu.id, { institution: e.target.value })}
                      placeholder="Institution"
                    />
                    <input
                      className={fieldCls}
                      value={edu.location}
                      onChange={(e) => updateEducation(edu.id, { location: e.target.value })}
                      placeholder="Location"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        className={fieldCls}
                        value={edu.startDate}
                        onChange={(e) => updateEducation(edu.id, { startDate: e.target.value })}
                        placeholder="Start"
                      />
                      <input
                        className={fieldCls}
                        value={edu.endDate}
                        onChange={(e) => updateEducation(edu.id, { endDate: e.target.value })}
                        placeholder="End"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeEducation(edu.id)}
                    aria-label="Remove education"
                    className="flex-shrink-0 grid place-items-center h-7 w-7 rounded-lg text-stone-400 hover:text-rose-500 hover:bg-stone-100 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Skills */}
      <SectionCard title="Skills">
        <div className="flex flex-wrap gap-1.5 mb-2.5">
          {skills.map((skill) => (
            <span
              key={skill}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0A2647]/[0.06] border border-[#0A2647]/15 text-[12px] text-[#0A2647]"
            >
              {skill}
              <button
                type="button"
                onClick={() => removeSkill(skill)}
                aria-label={`Remove ${skill}`}
                className="grid place-items-center h-4 w-4 rounded-full text-[#0A2647]/50 hover:text-[#0A2647] hover:bg-[#0A2647]/12"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          {skills.length === 0 ? (
            <span className="text-[13px] text-stone-500">Add skills below — they show as tags on your CV.</span>
          ) : null}
        </div>
        <input
          className={fieldCls}
          value={skillDraft}
          onChange={(e) => setSkillDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              commitSkill();
            }
          }}
          onBlur={commitSkill}
          placeholder="Type a skill and press Enter"
        />
        <InlineAssist
          action="suggest_skills"
          getTarget={() => ({ currentSkills: skills })}
          label="Suggest missing skills"
          className="mt-2.5"
        />
      </SectionCard>

      {/* Deeper sections (projects, certifications, custom blocks) are added
          through the AI — Edit covers the core fields by hand. */}
      <p className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-stone-50 border border-stone-200 text-[13px] text-stone-500">
        <Sparkles className="h-3.5 w-3.5 text-[#B8860B]" />
        Want projects, certifications or custom sections? Ask in Chat.
      </p>
    </div>
  );
}
