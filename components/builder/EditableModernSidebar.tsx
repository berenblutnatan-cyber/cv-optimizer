"use client";

import React, { useCallback } from "react";
import { A4PageWrapper, A4Grid } from "@/components/cv-templates/A4PageWrapper";
import { EditableField, EditableParagraph } from "./EditableField";

/**
 * EditableModernSidebar Template
 * 
 * A WYSIWYG version of the ModernSidebar template where all text
 * is editable directly on the preview. Users click on any text
 * to edit it in place.
 * 
 * FEATURES:
 * - All text fields are inline editable
 * - Same visual design as ModernSidebar
 * - Reports active field to BuilderContext for AI assistant
 * - Structured data model for easy export
 */

// ==========================================
// TYPES
// ==========================================

export interface ResumeSection {
  id: string;
  title: string;
  items: ResumeSectionItem[];
}

export interface ResumeSectionItem {
  id: string;
  title?: string;
  subtitle?: string;
  date?: string;
  description?: string;
  bullets?: string[];
}

export interface ResumeData {
  // Header
  name: string;
  title: string;
  
  // Contact (sidebar)
  email: string;
  phone: string;
  location: string;
  linkedin?: string;
  website?: string;
  
  // Skills (sidebar)
  skills: string[];
  
  // Languages (sidebar)
  languages: string[];
  
  // Main sections
  summary: string;
  sections: ResumeSection[];
}

export interface EditableModernSidebarProps {
  data: ResumeData;
  onDataChange: (data: ResumeData) => void;
  photo?: string;
}

// ==========================================
// CONSTANTS
// ==========================================

const COLORS = {
  sidebarBg: "#0f172a",
  sidebarText: "#e2e8f0",
  sidebarMuted: "#94a3b8",
  sidebarAccent: "#10b981",
  sidebarAccentLight: "#34d399",
  mainBg: "#ffffff",
  mainText: "#1e293b",
  mainMuted: "#64748b",
  mainAccent: "#059669",
  mainBorder: "#e2e8f0",
};

// ==========================================
// ICONS
// ==========================================

const Icons = {
  Email: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
      <polyline points="22,6 12,13 2,6"/>
    </svg>
  ),
  Phone: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
    </svg>
  ),
  Location: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  ),
  LinkedIn: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6z"/>
      <rect x="2" y="9" width="4" height="12"/>
      <circle cx="4" cy="4" r="2"/>
    </svg>
  ),
  Globe: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
    </svg>
  ),
};

// ==========================================
// SUB-COMPONENTS
// ==========================================

function SidebarSectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{
      fontSize: "10px",
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: "0.1em",
      color: COLORS.sidebarAccentLight,
      marginBottom: "12px",
    }}>
      {children}
    </h3>
  );
}

function MainSectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{
      fontSize: "10px",
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: "0.1em",
      color: COLORS.mainAccent,
      marginBottom: "12px",
      paddingBottom: "6px",
      borderBottom: `1px solid ${COLORS.mainBorder}`,
      display: "flex",
      alignItems: "center",
      gap: "8px",
    }}>
      <span style={{
        width: "16px",
        height: "2px",
        backgroundColor: COLORS.mainAccent,
      }} />
      {children}
    </h3>
  );
}

function SkillBar({ skill, level = 80 }: { skill: string; level?: number }) {
  return (
    <div style={{ marginBottom: "8px" }}>
      <div style={{
        fontSize: "10px",
        color: COLORS.sidebarText,
        marginBottom: "4px",
      }}>
        {skill}
      </div>
      <div style={{
        height: "4px",
        backgroundColor: "rgba(255,255,255,0.1)",
        borderRadius: "2px",
        overflow: "hidden",
      }}>
        <div style={{
          height: "100%",
          width: `${level}%`,
          backgroundColor: COLORS.sidebarAccent,
          borderRadius: "2px",
        }} />
      </div>
    </div>
  );
}

// ==========================================
// MAIN COMPONENT
// ==========================================

export function EditableModernSidebar({
  data,
  onDataChange,
  photo,
}: EditableModernSidebarProps) {
  
  // Helper to update a single field
  const updateField = useCallback(<K extends keyof ResumeData>(
    field: K,
    value: ResumeData[K]
  ) => {
    onDataChange({ ...data, [field]: value });
  }, [data, onDataChange]);

  // Helper to update a section
  const updateSection = useCallback((sectionIndex: number, updates: Partial<ResumeSection>) => {
    const newSections = [...data.sections];
    newSections[sectionIndex] = { ...newSections[sectionIndex], ...updates };
    onDataChange({ ...data, sections: newSections });
  }, [data, onDataChange]);

  // Helper to update a section item
  const updateSectionItem = useCallback((
    sectionIndex: number, 
    itemIndex: number, 
    updates: Partial<ResumeSectionItem>
  ) => {
    const newSections = [...data.sections];
    const newItems = [...newSections[sectionIndex].items];
    newItems[itemIndex] = { ...newItems[itemIndex], ...updates };
    newSections[sectionIndex] = { ...newSections[sectionIndex], items: newItems };
    onDataChange({ ...data, sections: newSections });
  }, [data, onDataChange]);

  // Helper to update skills array
  const updateSkill = useCallback((index: number, value: string) => {
    const newSkills = [...data.skills];
    newSkills[index] = value;
    onDataChange({ ...data, skills: newSkills });
  }, [data, onDataChange]);

  // Helper to update languages array
  const updateLanguage = useCallback((index: number, value: string) => {
    const newLanguages = [...data.languages];
    newLanguages[index] = value;
    onDataChange({ ...data, languages: newLanguages });
  }, [data, onDataChange]);

  return (
    <A4PageWrapper className="cv-text cv-text-sans">
      <A4Grid columns="32% 68%">
        {/* ==========================================
            LEFT SIDEBAR
            ========================================== */}
        <aside style={{
          backgroundColor: COLORS.sidebarBg,
          color: COLORS.sidebarText,
          padding: "24px 20px",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          boxSizing: "border-box",
        }}>
          {/* Photo */}
          {photo && (
            <div style={{
              width: "80px",
              height: "80px",
              borderRadius: "50%",
              overflow: "hidden",
              margin: "0 auto 16px auto",
              border: `3px solid ${COLORS.sidebarAccent}`,
            }}>
              <img src={photo} alt={data.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          )}

          {/* Contact Section */}
          <div style={{ marginBottom: "24px" }}>
            <SidebarSectionHeader>Contact</SidebarSectionHeader>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {/* Email */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", fontSize: "10px", color: COLORS.sidebarMuted }}>
                <span style={{ color: COLORS.sidebarAccent, flexShrink: 0, marginTop: "1px" }}>
                  <Icons.Email />
                </span>
                <EditableField
                  id="contact-email"
                  value={data.email}
                  onChange={(v) => updateField("email", v)}
                  placeholder="email@example.com"
                  className="text-[10px] text-slate-400"
                  focusRingClass="ring-2 ring-indigo-400/50"
                />
              </div>
              
              {/* Phone */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", fontSize: "10px", color: COLORS.sidebarMuted }}>
                <span style={{ color: COLORS.sidebarAccent, flexShrink: 0, marginTop: "1px" }}>
                  <Icons.Phone />
                </span>
                <EditableField
                  id="contact-phone"
                  value={data.phone}
                  onChange={(v) => updateField("phone", v)}
                  placeholder="+1 234 567 8900"
                  className="text-[10px] text-slate-400"
                  focusRingClass="ring-2 ring-indigo-400/50"
                />
              </div>
              
              {/* Location */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", fontSize: "10px", color: COLORS.sidebarMuted }}>
                <span style={{ color: COLORS.sidebarAccent, flexShrink: 0, marginTop: "1px" }}>
                  <Icons.Location />
                </span>
                <EditableField
                  id="contact-location"
                  value={data.location}
                  onChange={(v) => updateField("location", v)}
                  placeholder="City, Country"
                  className="text-[10px] text-slate-400"
                  focusRingClass="ring-2 ring-indigo-400/50"
                />
              </div>
              
              {/* LinkedIn */}
              {data.linkedin !== undefined && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", fontSize: "10px", color: COLORS.sidebarMuted }}>
                  <span style={{ color: COLORS.sidebarAccent, flexShrink: 0, marginTop: "1px" }}>
                    <Icons.LinkedIn />
                  </span>
                  <EditableField
                    id="contact-linkedin"
                    value={data.linkedin || ""}
                    onChange={(v) => updateField("linkedin", v)}
                    placeholder="linkedin.com/in/yourname"
                    className="text-[10px] text-slate-400"
                    focusRingClass="ring-2 ring-indigo-400/50"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Skills Section */}
          {data.skills.length > 0 && (
            <div style={{ marginBottom: "24px" }}>
              <SidebarSectionHeader>Skills</SidebarSectionHeader>
              {data.skills.map((skill, idx) => (
                <div key={idx} style={{ marginBottom: "8px" }}>
                  <EditableField
                    id={`skill-${idx}`}
                    value={skill}
                    onChange={(v) => updateSkill(idx, v)}
                    placeholder="Add skill..."
                    className="text-[10px] text-slate-200"
                    focusRingClass="ring-2 ring-indigo-400/50"
                  />
                  <div style={{
                    height: "4px",
                    backgroundColor: "rgba(255,255,255,0.1)",
                    borderRadius: "2px",
                    overflow: "hidden",
                    marginTop: "4px",
                  }}>
                    <div style={{
                      height: "100%",
                      width: `${70 + ((skill.length * 7) % 30)}%`,
                      backgroundColor: COLORS.sidebarAccent,
                      borderRadius: "2px",
                    }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Languages Section */}
          {data.languages.length > 0 && (
            <div style={{ marginBottom: "24px" }}>
              <SidebarSectionHeader>Languages</SidebarSectionHeader>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {data.languages.map((lang, idx) => (
                  <div key={idx} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      backgroundColor: COLORS.sidebarAccent,
                    }} />
                    <EditableField
                      id={`language-${idx}`}
                      value={lang}
                      onChange={(v) => updateLanguage(idx, v)}
                      placeholder="Add language..."
                      className="text-[10px] text-slate-400"
                      focusRingClass="ring-2 ring-indigo-400/50"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ flex: 1 }} />
        </aside>

        {/* ==========================================
            RIGHT MAIN CONTENT
            ========================================== */}
        <main style={{
          backgroundColor: COLORS.mainBg,
          color: COLORS.mainText,
          padding: "28px 32px",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          boxSizing: "border-box",
          overflow: "hidden",
        }}>
          {/* Header - Name & Title */}
          <header style={{ marginBottom: "20px", flexShrink: 0 }}>
            <EditableField
              id="header-name"
              value={data.name}
              onChange={(v) => updateField("name", v)}
              placeholder="Your Name"
              className="text-[28px] font-bold text-slate-800 tracking-tight leading-tight"
              focusRingClass="ring-2 ring-indigo-500/50"
            />
            <EditableField
              id="header-title"
              value={data.title}
              onChange={(v) => updateField("title", v)}
              placeholder="Professional Title"
              className="text-[13px] font-medium text-slate-500 uppercase tracking-widest mt-1"
              focusRingClass="ring-2 ring-indigo-500/50"
            />
          </header>

          {/* Summary Section */}
          {data.summary && (
            <section style={{ marginBottom: "18px" }}>
              <MainSectionHeader>Professional Summary</MainSectionHeader>
              <EditableParagraph
                id="summary"
                value={data.summary}
                onChange={(v) => updateField("summary", v)}
                placeholder="Write a brief professional summary..."
                className="text-[11px] text-slate-600 leading-relaxed"
                minHeight={40}
                focusRingClass="ring-2 ring-indigo-500/50"
              />
            </section>
          )}

          {/* Dynamic Sections */}
          <div style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: "18px",
            overflow: "hidden",
          }}>
            {data.sections.map((section, sIdx) => (
              <section key={section.id} style={{ flexShrink: 0 }}>
                <MainSectionHeader>{section.title}</MainSectionHeader>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {section.items.map((item, iIdx) => (
                    <div key={item.id} style={{ paddingLeft: "4px" }}>
                      {/* Item Title & Date Row */}
                      <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "baseline",
                        marginBottom: "2px",
                      }}>
                        <EditableField
                          id={`section-${sIdx}-item-${iIdx}-title`}
                          value={item.title || ""}
                          onChange={(v) => updateSectionItem(sIdx, iIdx, { title: v })}
                          placeholder="Position / Degree"
                          className="text-[11px] font-semibold text-slate-800"
                          focusRingClass="ring-2 ring-indigo-500/50"
                        />
                        {item.date !== undefined && (
                          <EditableField
                            id={`section-${sIdx}-item-${iIdx}-date`}
                            value={item.date || ""}
                            onChange={(v) => updateSectionItem(sIdx, iIdx, { date: v })}
                            placeholder="Date"
                            className="text-[10px] text-slate-500"
                            focusRingClass="ring-2 ring-indigo-500/50"
                          />
                        )}
                      </div>
                      
                      {/* Subtitle (Company/School) */}
                      {item.subtitle !== undefined && (
                        <EditableField
                          id={`section-${sIdx}-item-${iIdx}-subtitle`}
                          value={item.subtitle || ""}
                          onChange={(v) => updateSectionItem(sIdx, iIdx, { subtitle: v })}
                          placeholder="Company / Institution"
                          className="text-[10px] text-indigo-600 font-medium mb-1"
                          focusRingClass="ring-2 ring-indigo-500/50"
                        />
                      )}
                      
                      {/* Description */}
                      {item.description !== undefined && (
                        <EditableParagraph
                          id={`section-${sIdx}-item-${iIdx}-desc`}
                          value={item.description || ""}
                          onChange={(v) => updateSectionItem(sIdx, iIdx, { description: v })}
                          placeholder="Describe your responsibilities and achievements..."
                          className="text-[10px] text-slate-600 leading-relaxed"
                          minHeight={24}
                          focusRingClass="ring-2 ring-indigo-500/50"
                        />
                      )}
                      
                      {/* Bullets */}
                      {item.bullets && item.bullets.length > 0 && (
                        <div style={{ marginTop: "4px", display: "flex", flexDirection: "column", gap: "2px" }}>
                          {item.bullets.map((bullet, bIdx) => (
                            <div key={bIdx} style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                              <span style={{
                                color: COLORS.mainAccent,
                                fontSize: "8px",
                                marginTop: "4px",
                                flexShrink: 0,
                              }}>▸</span>
                              <EditableField
                                id={`section-${sIdx}-item-${iIdx}-bullet-${bIdx}`}
                                value={bullet}
                                onChange={(v) => {
                                  const newBullets = [...(item.bullets || [])];
                                  newBullets[bIdx] = v;
                                  updateSectionItem(sIdx, iIdx, { bullets: newBullets });
                                }}
                                placeholder="Achievement or responsibility..."
                                className="text-[10px] text-slate-600 leading-relaxed flex-1"
                                focusRingClass="ring-2 ring-indigo-500/50"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </main>
      </A4Grid>
    </A4PageWrapper>
  );
}

export default EditableModernSidebar;
