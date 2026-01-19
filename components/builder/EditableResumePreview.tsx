"use client";

import React, { useCallback } from "react";
import { A4PageWrapper, A4Grid } from "@/components/cv-templates/A4PageWrapper";
import { BuilderTemplateId, ThemeColor } from "@/context/BuilderContext";
import { EditableField } from "./EditableField";
import { 
  formatText, 
  formatName, 
  formatJobTitle, 
  formatBulletPoint,
  hasContent,
  shouldShowField,
  FONTS,
} from "@/utils/formatting";
import { ResumePreviewData, ResumeSection, ResumeSectionItem, ResumeContact } from "./ResumePreview";

/**
 * EditableResumePreview Component
 * 
 * Interactive WYSIWYG version of ResumePreview.
 * All text fields are inline editable when in edit mode.
 * 
 * Used in:
 * - Resume Builder (primary editor)
 * - Optimizer Results (for editing optimized CV)
 */

// ==========================================
// PROPS
// ==========================================

export interface EditableResumePreviewProps {
  data: ResumePreviewData;
  onChange: (data: ResumePreviewData) => void;
  templateId?: BuilderTemplateId;
  themeColor?: ThemeColor;
  photo?: string;
  /** Read-only mode (no editing) */
  readOnly?: boolean;
}

// ==========================================
// THEME COLORS
// ==========================================

// Updated THEME_COLORS to match global rebrand (Indigo/Violet theme)
const THEME_COLORS: Record<ThemeColor, { primary: string; light: string; dark: string }> = {
  indigo: { primary: "#6366f1", light: "#e0e7ff", dark: "#4f46e5" },
  violet: { primary: "#8b5cf6", light: "#ede9fe", dark: "#7c3aed" },
  blue: { primary: "#3b82f6", light: "#dbeafe", dark: "#2563eb" },
  purple: { primary: "#8b5cf6", light: "#ede9fe", dark: "#7c3aed" },
  rose: { primary: "#f43f5e", light: "#ffe4e6", dark: "#e11d48" },
  amber: { primary: "#f59e0b", light: "#fef3c7", dark: "#d97706" },
  slate: { primary: "#475569", light: "#f1f5f9", dark: "#334155" },
  navy: { primary: "#1e3a8a", light: "#dbeafe", dark: "#1e40af" },
  orange: { primary: "#f97316", light: "#ffedd5", dark: "#ea580c" },
  black: { primary: "#18181b", light: "#f4f4f5", dark: "#09090b" },
};

// Default fallback color (Indigo brand)
const DEFAULT_COLORS = { primary: "#6366f1", light: "#e0e7ff", dark: "#4f46e5" };

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
// MAIN COMPONENT
// ==========================================

export function EditableResumePreview({
  data,
  onChange,
  templateId = "modern-sidebar",
  themeColor = "indigo",
  photo,
  readOnly = false,
}: EditableResumePreviewProps) {
  // Safe access with fallback to prevent "Cannot read properties of undefined" errors
  const colors = THEME_COLORS[themeColor] || DEFAULT_COLORS;

  // Update helpers
  const updateField = useCallback(<K extends keyof ResumePreviewData>(
    field: K,
    value: ResumePreviewData[K]
  ) => {
    onChange({ ...data, [field]: value });
  }, [data, onChange]);

  const updateContact = useCallback((field: keyof ResumeContact, value: string) => {
    onChange({ ...data, contact: { ...data.contact, [field]: value } });
  }, [data, onChange]);

  const updateSkill = useCallback((index: number, value: string) => {
    const newSkills = [...(data.skills || [])];
    newSkills[index] = value;
    onChange({ ...data, skills: newSkills });
  }, [data, onChange]);

  const updateLanguage = useCallback((index: number, value: string) => {
    const newLanguages = [...(data.languages || [])];
    newLanguages[index] = value;
    onChange({ ...data, languages: newLanguages });
  }, [data, onChange]);

  const updateSectionItem = useCallback((
    sectionIndex: number,
    itemIndex: number,
    updates: Partial<ResumeSectionItem>
  ) => {
    const newSections = [...data.sections];
    const newItems = [...newSections[sectionIndex].items];
    newItems[itemIndex] = { ...newItems[itemIndex], ...updates };
    newSections[sectionIndex] = { ...newSections[sectionIndex], items: newItems };
    onChange({ ...data, sections: newSections });
  }, [data, onChange]);

  const updateBullet = useCallback((
    sectionIndex: number,
    itemIndex: number,
    bulletIndex: number,
    value: string
  ) => {
    const newSections = [...data.sections];
    const newItems = [...newSections[sectionIndex].items];
    const newBullets = [...(newItems[itemIndex].bullets || [])];
    newBullets[bulletIndex] = value;
    newItems[itemIndex] = { ...newItems[itemIndex], bullets: newBullets };
    newSections[sectionIndex] = { ...newSections[sectionIndex], items: newItems };
    onChange({ ...data, sections: newSections });
  }, [data, onChange]);

  // Choose template
  switch (templateId) {
    case "modern-sidebar":
      return (
        <ModernSidebarEditable
          data={data}
          colors={colors}
          photo={photo}
          readOnly={readOnly}
          updateField={updateField}
          updateContact={updateContact}
          updateSkill={updateSkill}
          updateLanguage={updateLanguage}
          updateSectionItem={updateSectionItem}
          updateBullet={updateBullet}
        />
      );
    case "ivy-league":
      return (
        <IvyLeagueEditable
          data={data}
          colors={colors}
          readOnly={readOnly}
          updateField={updateField}
          updateContact={updateContact}
          updateSkill={updateSkill}
          updateSectionItem={updateSectionItem}
          updateBullet={updateBullet}
        />
      );
    case "minimalist":
      return (
        <MinimalistEditable
          data={data}
          colors={colors}
          readOnly={readOnly}
          updateField={updateField}
          updateContact={updateContact}
          updateSectionItem={updateSectionItem}
          updateBullet={updateBullet}
        />
      );
    case "creative":
      return (
        <CreativeEditable
          data={data}
          colors={colors}
          photo={photo}
          readOnly={readOnly}
          updateField={updateField}
          updateContact={updateContact}
          updateSkill={updateSkill}
          updateLanguage={updateLanguage}
          updateSectionItem={updateSectionItem}
          updateBullet={updateBullet}
        />
      );
    case "executive":
      return (
        <ExecutiveEditable
          data={data}
          colors={colors}
          photo={photo}
          readOnly={readOnly}
          updateField={updateField}
          updateContact={updateContact}
          updateSkill={updateSkill}
          updateLanguage={updateLanguage}
          updateSectionItem={updateSectionItem}
          updateBullet={updateBullet}
        />
      );
    case "techie":
      return (
        <TechieEditable
          data={data}
          colors={colors}
          readOnly={readOnly}
          updateField={updateField}
          updateContact={updateContact}
          updateSkill={updateSkill}
          updateSectionItem={updateSectionItem}
          updateBullet={updateBullet}
        />
      );
    case "startup":
      return (
        <StartupEditable
          data={data}
          colors={colors}
          readOnly={readOnly}
          updateField={updateField}
          updateContact={updateContact}
          updateSkill={updateSkill}
          updateLanguage={updateLanguage}
          updateSectionItem={updateSectionItem}
          updateBullet={updateBullet}
        />
      );
    case "international":
      return (
        <InternationalEditable
          data={data}
          colors={colors}
          photo={photo}
          readOnly={readOnly}
          updateField={updateField}
          updateContact={updateContact}
          updateSkill={updateSkill}
          updateLanguage={updateLanguage}
          updateSectionItem={updateSectionItem}
          updateBullet={updateBullet}
        />
      );
    default:
      return (
        <ModernSidebarEditable
          data={data}
          colors={colors}
          photo={photo}
          readOnly={readOnly}
          updateField={updateField}
          updateContact={updateContact}
          updateSkill={updateSkill}
          updateLanguage={updateLanguage}
          updateSectionItem={updateSectionItem}
          updateBullet={updateBullet}
        />
      );
  }
}

// ==========================================
// TEMPLATE PROPS
// ==========================================

interface EditableTemplateProps {
  data: ResumePreviewData;
  colors: { primary: string; light: string; dark: string };
  photo?: string;
  readOnly: boolean;
  updateField: <K extends keyof ResumePreviewData>(field: K, value: ResumePreviewData[K]) => void;
  updateContact: (field: keyof ResumeContact, value: string) => void;
  updateSkill?: (index: number, value: string) => void;
  updateLanguage?: (index: number, value: string) => void;
  updateSectionItem: (sectionIndex: number, itemIndex: number, updates: Partial<ResumeSectionItem>) => void;
  updateBullet: (sectionIndex: number, itemIndex: number, bulletIndex: number, value: string) => void;
}


// ==========================================
// MODERN SIDEBAR TEMPLATE (EDITABLE) - PREMIUM
// ==========================================

function ModernSidebarEditable({
  data,
  colors,
  photo,
  readOnly,
  updateField,
  updateContact,
  updateSkill,
  updateLanguage,
  updateSectionItem,
  updateBullet,
}: EditableTemplateProps) {
  const sidebarBg = "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)";
  const ringClass = "ring-2 ring-indigo-400/50";

  return (
    <A4PageWrapper className="cv-text">
      <A4Grid columns="34% 66%">
        {/* Sidebar - Premium Dark Design */}
        <aside style={{
          background: sidebarBg,
          color: "#e2e8f0",
          padding: "0",
          height: "100%",
          fontFamily: "var(--font-montserrat), Montserrat, var(--font-sans), system-ui, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}>
          {/* Decorative Accent Line */}
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "4px",
            height: "100%",
            background: `linear-gradient(180deg, ${colors.primary} 0%, ${colors.dark} 100%)`,
          }} />

          {/* Profile Section */}
          <div style={{
            padding: "28px 20px 20px 24px",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
          }}>
            {/* Photo with premium frame */}
            {photo ? (
              <div style={{
                width: "90px",
                height: "90px",
                borderRadius: "50%",
                overflow: "hidden",
                margin: "0 auto 16px",
                border: `3px solid ${colors.primary}`,
                boxShadow: `0 0 20px ${colors.primary}40`,
              }}>
                <img src={photo} alt={data.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
            ) : (
              <div style={{
                width: "90px",
                height: "90px",
                borderRadius: "50%",
                margin: "0 auto 16px",
                background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.dark} 100%)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "32px",
                fontWeight: 700,
                color: "white",
                textTransform: "uppercase",
              }}>
                {data.name?.charAt(0)?.toUpperCase() || "?"}
              </div>
            )}
          </div>

          {/* Contact Section */}
          <div style={{ padding: "16px 20px 16px 24px" }}>
            <SidebarSectionPremium title="Contact" color={colors.primary}>
              <ContactFieldPremium
                icon={<Icons.Email />}
                value={data.contact.email || ""}
                onChange={(v) => updateContact("email", v)}
                placeholder="email@example.com"
                color={colors.primary}
                readOnly={readOnly}
                ringClass={ringClass}
              />
              <ContactFieldPremium
                icon={<Icons.Phone />}
                value={data.contact.phone || ""}
                onChange={(v) => updateContact("phone", v)}
                placeholder="+972 54-XXX-XXXX"
                color={colors.primary}
                readOnly={readOnly}
                ringClass={ringClass}
              />
              <ContactFieldPremium
                icon={<Icons.Location />}
                value={data.contact.location || ""}
                onChange={(v) => updateContact("location", v)}
                placeholder="Tel Aviv, Israel"
                color={colors.primary}
                readOnly={readOnly}
                ringClass={ringClass}
              />
              {(data.contact.linkedin || !readOnly) && (
                <ContactFieldPremium
                  icon={<Icons.LinkedIn />}
                  value={data.contact.linkedin || ""}
                  onChange={(v) => updateContact("linkedin", v)}
                  placeholder="linkedin.com/in/name"
                  color={colors.primary}
                  readOnly={readOnly}
                  ringClass={ringClass}
                />
              )}
            </SidebarSectionPremium>
          </div>

          {/* Skills Section with Premium Bars */}
          {(data.skills && data.skills.length > 0) && (
            <div style={{ padding: "0 20px 16px 24px" }}>
              <SidebarSectionPremium title="Expertise" color={colors.primary}>
                {data.skills.map((skill, idx) => (
                  <div key={idx} style={{ marginBottom: "10px" }}>
                    <EditableField
                      id={`skill-${idx}`}
                      value={skill}
                      onChange={(v) => updateSkill?.(idx, v)}
                      placeholder="Add skill..."
                      className="text-[10px] text-slate-300 font-medium"
                      focusRingClass={ringClass}
                      disabled={readOnly}
                    />
                    <SkillBarPremium color={colors.primary} level={75 + ((skill.length * 5) % 25)} />
                  </div>
                ))}
              </SidebarSectionPremium>
            </div>
          )}

          {/* Languages Section */}
          {(data.languages && data.languages.length > 0) && (
            <div style={{ padding: "0 20px 20px 24px" }}>
              <SidebarSectionPremium title="Languages" color={colors.primary}>
                {data.languages.map((lang, idx) => (
                  <div key={idx} style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: "10px", 
                    marginBottom: "8px",
                    padding: "6px 10px",
                    background: "rgba(255,255,255,0.05)",
                    borderRadius: "6px",
                  }}>
                    <span style={{ 
                      width: "8px", 
                      height: "8px", 
                      borderRadius: "50%", 
                      backgroundColor: colors.primary,
                      boxShadow: `0 0 6px ${colors.primary}`,
                    }} />
                    <EditableField
                      id={`language-${idx}`}
                      value={lang}
                      onChange={(v) => updateLanguage?.(idx, v)}
                      placeholder="Language - Level"
                      className="text-[10px] text-slate-300"
                      focusRingClass={ringClass}
                      disabled={readOnly}
                    />
                  </div>
                ))}
              </SidebarSectionPremium>
            </div>
          )}
        </aside>

        {/* Main Content - Clean White Design */}
        <main style={{
          backgroundColor: "#ffffff",
          padding: "28px 36px",
          height: "100%",
          fontFamily: "var(--font-sans), Inter, system-ui, sans-serif",
        }}>
          {/* Header with Name & Title */}
          <header style={{ 
            marginBottom: "24px",
            paddingBottom: "20px",
            borderBottom: `2px solid ${colors.light}`,
          }}>
            <EditableField
              id="header-name"
              value={data.name}
              onChange={(v) => updateField("name", v)}
              placeholder="Your Full Name"
              className="text-[32px] font-bold text-slate-900 tracking-tight leading-none capitalize"
              style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}
              focusRingClass="ring-2 ring-indigo-500/50"
              disabled={readOnly}
            />
            <div style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: "8px", 
              marginTop: "8px" 
            }}>
              <span style={{ 
                width: "24px", 
                height: "3px", 
                backgroundColor: colors.primary,
                borderRadius: "2px",
              }} />
              <EditableField
                id="header-title"
                value={data.title || ""}
                onChange={(v) => updateField("title", v)}
                placeholder="PROFESSIONAL TITLE"
                className="text-[12px] font-semibold tracking-[0.2em] uppercase"
                style={{ color: colors.primary }}
                focusRingClass="ring-2 ring-indigo-500/50"
                disabled={readOnly}
              />
            </div>
          </header>

          {/* Professional Summary */}
          {(hasContent(data.summary) || !readOnly) && (
            <MainSectionPremium title="Profile" color={colors.primary} icon="◉">
              <EditableField
                id="summary"
                value={data.summary || ""}
                onChange={(v) => updateField("summary", v)}
                placeholder="Write a compelling professional summary that highlights your key strengths and career objectives..."
                className="text-[11px] text-slate-600 leading-[1.7]"
                type="textarea"
                multiline
                minHeight={50}
                focusRingClass="ring-2 ring-indigo-500/50"
                disabled={readOnly}
              />
            </MainSectionPremium>
          )}

          {/* Experience & Education Sections */}
          {data.sections.map((section, sIdx) => (
            <MainSectionPremium 
              key={section.id} 
              title={section.title} 
              color={colors.primary}
              icon={section.type === "experience" ? "◆" : section.type === "education" ? "◈" : "◇"}
            >
              {section.items.map((item, iIdx) => (
                <EditableSectionItemPremium
                  key={item.id}
                  item={item}
                  color={colors.primary}
                  readOnly={readOnly}
                  onUpdate={(updates) => updateSectionItem(sIdx, iIdx, updates)}
                  onBulletUpdate={(bIdx, value) => updateBullet(sIdx, iIdx, bIdx, value)}
                />
              ))}
            </MainSectionPremium>
          ))}
        </main>
      </A4Grid>
    </A4PageWrapper>
  );
}

// ==========================================
// IVY LEAGUE TEMPLATE (EDITABLE)
// ==========================================

function IvyLeagueEditable({
  data,
  colors,
  readOnly,
  updateField,
  updateContact,
  updateSkill,
  updateSectionItem,
  updateBullet,
}: EditableTemplateProps) {
  const ringClass = "ring-2 ring-slate-400/50";

  return (
    <A4PageWrapper className="cv-text">
      <div style={{
        padding: "20mm",
        height: "100%",
        fontFamily: "var(--font-serif), Merriweather, Georgia, serif",
        color: "#1a1a1a",
      }}>
        {/* Header */}
        <header style={{ textAlign: "center", marginBottom: "20px", borderBottom: "2px solid #1a1a1a", paddingBottom: "16px" }}>
          <EditableField
            id="ivy-name"
            value={data.name}
            onChange={(v) => updateField("name", v)}
            placeholder="Your Name"
            className="text-[26px] font-bold tracking-wide uppercase text-center"
            focusRingClass={ringClass}
            disabled={readOnly}
          />
          <EditableField
            id="ivy-title"
            value={data.title || ""}
            onChange={(v) => updateField("title", v)}
            placeholder="Professional Title"
            className="text-[12px] text-slate-600 italic mt-2 text-center"
            focusRingClass={ringClass}
            disabled={readOnly}
          />
          {/* Contact Line */}
          <div style={{ fontSize: "10px", color: "#666", marginTop: "10px", display: "flex", justifyContent: "center", gap: "16px", flexWrap: "wrap" }}>
            <EditableField
              id="ivy-email"
              value={data.contact.email || ""}
              onChange={(v) => updateContact("email", v)}
              placeholder="email@example.com"
              className="text-[10px] text-slate-600"
              focusRingClass={ringClass}
              disabled={readOnly}
            />
            <EditableField
              id="ivy-phone"
              value={data.contact.phone || ""}
              onChange={(v) => updateContact("phone", v)}
              placeholder="Phone"
              className="text-[10px] text-slate-600"
              focusRingClass={ringClass}
              disabled={readOnly}
            />
            <EditableField
              id="ivy-location"
              value={data.contact.location || ""}
              onChange={(v) => updateContact("location", v)}
              placeholder="Location"
              className="text-[10px] text-slate-600"
              focusRingClass={ringClass}
              disabled={readOnly}
            />
          </div>
        </header>

        {/* Summary */}
        {(hasContent(data.summary) || !readOnly) && (
          <section style={{ marginBottom: "16px" }}>
            <h2 style={ivySectionHeader}>Summary</h2>
            <EditableField
              id="ivy-summary"
              value={data.summary || ""}
              onChange={(v) => updateField("summary", v)}
              placeholder="Professional summary..."
              className="text-[11px] leading-relaxed text-slate-700 text-justify"
              type="textarea"
              multiline
              focusRingClass={ringClass}
              disabled={readOnly}
            />
          </section>
        )}

        {/* Sections */}
        {data.sections.map((section, sIdx) => (
          <section key={section.id} style={{ marginBottom: "16px" }}>
            <h2 style={ivySectionHeader}>{section.title}</h2>
            {section.items.map((item, iIdx) => (
              <div key={item.id} style={{ marginBottom: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <EditableField
                    id={`ivy-${sIdx}-${iIdx}-title`}
                    value={item.title || ""}
                    onChange={(v) => updateSectionItem(sIdx, iIdx, { title: v })}
                    placeholder="Position / Degree"
                    className="text-[11px] font-bold text-slate-900"
                    focusRingClass={ringClass}
                    disabled={readOnly}
                  />
                  <EditableField
                    id={`ivy-${sIdx}-${iIdx}-date`}
                    value={item.date || ""}
                    onChange={(v) => updateSectionItem(sIdx, iIdx, { date: v })}
                    placeholder="Date"
                    className="text-[10px] text-slate-500 italic"
                    focusRingClass={ringClass}
                    disabled={readOnly}
                  />
                </div>
                <EditableField
                  id={`ivy-${sIdx}-${iIdx}-subtitle`}
                  value={item.subtitle || ""}
                  onChange={(v) => updateSectionItem(sIdx, iIdx, { subtitle: v })}
                  placeholder="Company / Institution"
                  className="text-[10px] text-slate-600 italic"
                  focusRingClass={ringClass}
                  disabled={readOnly}
                />
                {item.bullets?.map((bullet, bIdx) => (
                  <div key={bIdx} style={{ display: "flex", gap: "8px", marginTop: "4px", marginLeft: "12px" }}>
                    <span style={{ color: "#666" }}>•</span>
                    <EditableField
                      id={`ivy-${sIdx}-${iIdx}-bullet-${bIdx}`}
                      value={bullet}
                      onChange={(v) => updateBullet(sIdx, iIdx, bIdx, v)}
                      placeholder="Achievement..."
                      className="text-[10px] text-slate-600 leading-relaxed flex-1"
                      focusRingClass={ringClass}
                      disabled={readOnly}
                    />
                  </div>
                ))}
              </div>
            ))}
          </section>
        ))}

        {/* Skills */}
        {data.skills && data.skills.length > 0 && (
          <section>
            <h2 style={ivySectionHeader}>Skills</h2>
            <p style={{ fontSize: "10px", color: "#444" }}>
              {data.skills.filter(hasContent).join(" • ")}
            </p>
          </section>
        )}
      </div>
    </A4PageWrapper>
  );
}

const ivySectionHeader: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  borderBottom: "1px solid #ccc",
  paddingBottom: "4px",
  marginBottom: "10px",
  color: "#1a1a1a",
};

// ==========================================
// MINIMALIST TEMPLATE (EDITABLE)
// ==========================================

function MinimalistEditable({
  data,
  colors,
  readOnly,
  updateField,
  updateContact,
  updateSectionItem,
  updateBullet,
}: EditableTemplateProps) {
  const ringClass = "ring-2 ring-slate-400/50";

  return (
    <A4PageWrapper className="cv-text">
      <div style={{
        padding: "18mm",
        height: "100%",
        fontFamily: "var(--font-lato), Lato, sans-serif",
        color: "#333",
      }}>
        {/* Header */}
        <header style={{ marginBottom: "24px" }}>
          <EditableField
            id="min-name"
            value={data.name}
            onChange={(v) => updateField("name", v)}
            placeholder="Your Name"
            className="text-[32px] font-light text-slate-900"
            focusRingClass={ringClass}
            disabled={readOnly}
          />
          <div style={{ fontSize: "10px", color: "#888", marginTop: "8px", display: "flex", gap: "12px" }}>
            <EditableField
              id="min-email"
              value={data.contact.email || ""}
              onChange={(v) => updateContact("email", v)}
              placeholder="email"
              className="text-[10px] text-slate-500"
              focusRingClass={ringClass}
              disabled={readOnly}
            />
            <EditableField
              id="min-phone"
              value={data.contact.phone || ""}
              onChange={(v) => updateContact("phone", v)}
              placeholder="phone"
              className="text-[10px] text-slate-500"
              focusRingClass={ringClass}
              disabled={readOnly}
            />
            <EditableField
              id="min-location"
              value={data.contact.location || ""}
              onChange={(v) => updateContact("location", v)}
              placeholder="location"
              className="text-[10px] text-slate-500"
              focusRingClass={ringClass}
              disabled={readOnly}
            />
          </div>
        </header>

        {/* Summary */}
        {(hasContent(data.summary) || !readOnly) && (
          <section style={{ marginBottom: "20px" }}>
            <EditableField
              id="min-summary"
              value={data.summary || ""}
              onChange={(v) => updateField("summary", v)}
              placeholder="Professional summary..."
              className="text-[11px] text-slate-600 leading-relaxed"
              type="textarea"
              multiline
              focusRingClass={ringClass}
              disabled={readOnly}
            />
          </section>
        )}

        {/* Sections */}
        {data.sections.map((section, sIdx) => (
          <section key={section.id} style={{ marginBottom: "18px" }}>
            <h2 style={{
              fontSize: "10px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              color: colors.primary,
              marginBottom: "10px",
            }}>
              {section.title}
            </h2>
            {section.items.map((item, iIdx) => (
              <div key={item.id} style={{ marginBottom: "10px", paddingLeft: "8px", borderLeft: `2px solid ${colors.light}` }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <EditableField
                    id={`min-${sIdx}-${iIdx}-title`}
                    value={item.title || ""}
                    onChange={(v) => updateSectionItem(sIdx, iIdx, { title: v })}
                    placeholder="Position"
                    className="text-[11px] font-semibold text-slate-800"
                    focusRingClass={ringClass}
                    disabled={readOnly}
                  />
                  <EditableField
                    id={`min-${sIdx}-${iIdx}-date`}
                    value={item.date || ""}
                    onChange={(v) => updateSectionItem(sIdx, iIdx, { date: v })}
                    placeholder="Date"
                    className="text-[9px] text-slate-400"
                    focusRingClass={ringClass}
                    disabled={readOnly}
                  />
                </div>
                <EditableField
                  id={`min-${sIdx}-${iIdx}-subtitle`}
                  value={item.subtitle || ""}
                  onChange={(v) => updateSectionItem(sIdx, iIdx, { subtitle: v })}
                  placeholder="Company"
                  className="text-[10px] text-slate-500"
                  focusRingClass={ringClass}
                  disabled={readOnly}
                />
                {item.bullets?.map((bullet, bIdx) => (
                  <EditableField
                    key={bIdx}
                    id={`min-${sIdx}-${iIdx}-bullet-${bIdx}`}
                    value={bullet}
                    onChange={(v) => updateBullet(sIdx, iIdx, bIdx, v)}
                    placeholder="Achievement..."
                    className="text-[10px] text-slate-600 leading-relaxed mt-1"
                    focusRingClass={ringClass}
                    disabled={readOnly}
                  />
                ))}
              </div>
            ))}
          </section>
        ))}
      </div>
    </A4PageWrapper>
  );
}

// ==========================================
// CREATIVE TEMPLATE (EDITABLE)
// ==========================================

function CreativeEditable({
  data,
  colors,
  photo,
  readOnly,
  updateField,
  updateContact,
  updateSkill,
  updateLanguage,
  updateSectionItem,
  updateBullet,
}: EditableTemplateProps) {
  const ringClass = "ring-2 ring-white/50";

  return (
    <A4PageWrapper className="cv-text">
      <div style={{ height: "100%", fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}>
        {/* Header Banner */}
        <header style={{
          background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.dark} 100%)`,
          color: "white",
          padding: "24px 28px",
          display: "flex",
          alignItems: "center",
          gap: "20px",
        }}>
          {photo && (
            <img src={photo} alt={data.name} style={{
              width: "70px",
              height: "70px",
              borderRadius: "50%",
              border: "3px solid white",
              objectFit: "cover",
            }} />
          )}
          <div>
            <EditableField
              id="creative-name"
              value={data.name}
              onChange={(v) => updateField("name", v)}
              placeholder="Your Name"
              className="text-[24px] font-bold text-white"
              focusRingClass={ringClass}
              disabled={readOnly}
            />
            <EditableField
              id="creative-title"
              value={data.title || ""}
              onChange={(v) => updateField("title", v)}
              placeholder="Professional Title"
              className="text-[12px] text-white/90 mt-1"
              focusRingClass={ringClass}
              disabled={readOnly}
            />
          </div>
        </header>

        {/* Main Content */}
        <div style={{ padding: "20px 28px" }}>
          {/* Contact Bar */}
          <div style={{ display: "flex", gap: "16px", fontSize: "9px", color: "#666", marginBottom: "20px", flexWrap: "wrap" }}>
            <span>✉ <EditableField id="cr-email" value={data.contact.email || ""} onChange={(v) => updateContact("email", v)} placeholder="email" className="text-[9px] text-slate-600 inline" disabled={readOnly} focusRingClass="ring-1 ring-indigo-400/50" /></span>
            <span>☎ <EditableField id="cr-phone" value={data.contact.phone || ""} onChange={(v) => updateContact("phone", v)} placeholder="phone" className="text-[9px] text-slate-600 inline" disabled={readOnly} focusRingClass="ring-1 ring-indigo-400/50" /></span>
            <span>📍 <EditableField id="cr-location" value={data.contact.location || ""} onChange={(v) => updateContact("location", v)} placeholder="location" className="text-[9px] text-slate-600 inline" disabled={readOnly} focusRingClass="ring-1 ring-indigo-400/50" /></span>
          </div>

          {/* Summary */}
          {(hasContent(data.summary) || !readOnly) && (
            <section style={{ marginBottom: "18px" }}>
              <h2 style={creativeSectionHeader(colors.primary)}>About Me</h2>
              <EditableField
                id="creative-summary"
                value={data.summary || ""}
                onChange={(v) => updateField("summary", v)}
                placeholder="About yourself..."
                className="text-[11px] text-slate-600 leading-relaxed"
                type="textarea"
                multiline
                focusRingClass="ring-2 ring-indigo-500/50"
                disabled={readOnly}
              />
            </section>
          )}

          {/* Two Column Layout */}
          <div style={{ display: "grid", gridTemplateColumns: "65% 35%", gap: "24px" }}>
            {/* Left */}
            <div>
              {data.sections.map((section, sIdx) => (
                <section key={section.id} style={{ marginBottom: "16px" }}>
                  <h2 style={creativeSectionHeader(colors.primary)}>{section.title}</h2>
                  {section.items.map((item, iIdx) => (
                    <div key={item.id} style={{ marginBottom: "12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <EditableField
                          id={`cr-${sIdx}-${iIdx}-title`}
                          value={item.title || ""}
                          onChange={(v) => updateSectionItem(sIdx, iIdx, { title: v })}
                          placeholder="Position"
                          className="text-[11px] font-semibold text-slate-800"
                          focusRingClass="ring-2 ring-indigo-500/50"
                          disabled={readOnly}
                        />
                        <EditableField
                          id={`cr-${sIdx}-${iIdx}-date`}
                          value={item.date || ""}
                          onChange={(v) => updateSectionItem(sIdx, iIdx, { date: v })}
                          placeholder="Date"
                          className="text-[9px] font-semibold"
                          style={{ color: colors.primary }}
                          focusRingClass="ring-2 ring-indigo-500/50"
                          disabled={readOnly}
                        />
                      </div>
                      <EditableField
                        id={`cr-${sIdx}-${iIdx}-subtitle`}
                        value={item.subtitle || ""}
                        onChange={(v) => updateSectionItem(sIdx, iIdx, { subtitle: v })}
                        placeholder="Company"
                        className="text-[10px]"
                        style={{ color: colors.dark }}
                        focusRingClass="ring-2 ring-indigo-500/50"
                        disabled={readOnly}
                      />
                      {item.bullets?.map((bullet, bIdx) => (
                        <div key={bIdx} style={{ display: "flex", gap: "8px", marginTop: "3px", marginLeft: "8px" }}>
                          <span style={{ color: colors.primary }}>▸</span>
                          <EditableField
                            id={`cr-${sIdx}-${iIdx}-bullet-${bIdx}`}
                            value={bullet}
                            onChange={(v) => updateBullet(sIdx, iIdx, bIdx, v)}
                            placeholder="Achievement..."
                            className="text-[10px] text-slate-600 flex-1"
                            focusRingClass="ring-2 ring-indigo-500/50"
                            disabled={readOnly}
                          />
                        </div>
                      ))}
                    </div>
                  ))}
                </section>
              ))}
            </div>

            {/* Right */}
            <div>
              {data.skills && data.skills.length > 0 && (
                <section style={{ marginBottom: "16px" }}>
                  <h2 style={creativeSectionHeader(colors.primary)}>Skills</h2>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {data.skills.filter(hasContent).map((skill, idx) => (
                      <span key={idx} style={{
                        fontSize: "9px",
                        padding: "4px 8px",
                        backgroundColor: colors.light,
                        color: colors.dark,
                        borderRadius: "4px",
                        fontWeight: 500,
                      }}>
                        {skill}
                      </span>
                    ))}
                  </div>
                </section>
              )}
              {data.languages && data.languages.length > 0 && (
                <section>
                  <h2 style={creativeSectionHeader(colors.primary)}>Languages</h2>
                  {data.languages.filter(hasContent).map((lang, idx) => (
                    <p key={idx} style={{ fontSize: "10px", color: "#555", margin: "4px 0" }}>• {lang}</p>
                  ))}
                </section>
              )}
            </div>
          </div>
        </div>
      </div>
    </A4PageWrapper>
  );
}

const creativeSectionHeader = (color: string): React.CSSProperties => ({
  fontSize: "11px",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color,
  marginBottom: "10px",
  paddingBottom: "4px",
  borderBottom: `2px solid ${color}`,
});

// ==========================================
// HELPER COMPONENTS
// ==========================================

function SidebarSection({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "24px" }}>
      <h3 style={{
        fontSize: "10px",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        color,
        marginBottom: "12px",
      }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function MainSection({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: "18px" }}>
      <h2 style={{
        fontSize: "10px",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        color,
        marginBottom: "12px",
        paddingBottom: "6px",
        borderBottom: "1px solid #e2e8f0",
        display: "flex",
        alignItems: "center",
        gap: "8px",
      }}>
        <span style={{ width: "16px", height: "2px", backgroundColor: color }} />
        {title}
      </h2>
      {children}
    </section>
  );
}

function ContactField({
  icon,
  value,
  onChange,
  placeholder,
  color,
  readOnly,
  ringClass,
}: {
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  color: string;
  readOnly: boolean;
  ringClass: string;
}) {
  if (!value && readOnly) return null;
  
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: "10px", fontSize: "10px", color: "#94a3b8" }}>
      <span style={{ color, flexShrink: 0, marginTop: "1px" }}>{icon}</span>
      <EditableField
        id={`contact-${placeholder}`}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="text-[10px] text-slate-400"
        focusRingClass={ringClass}
        disabled={readOnly}
      />
    </div>
  );
}

function SkillBar({ color, level }: { color: string; level: number }) {
  return (
    <div style={{ height: "4px", backgroundColor: "rgba(255,255,255,0.1)", borderRadius: "2px", overflow: "hidden", marginTop: "4px" }}>
      <div style={{ height: "100%", width: `${level}%`, backgroundColor: color, borderRadius: "2px" }} />
    </div>
  );
}

// ==========================================
// PREMIUM HELPER COMPONENTS
// ==========================================

function SidebarSectionPremium({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "20px" }}>
      <h3 style={{
        fontSize: "9px",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.15em",
        color: "#94a3b8",
        marginBottom: "14px",
        display: "flex",
        alignItems: "center",
        gap: "8px",
      }}>
        <span style={{ 
          width: "8px", 
          height: "8px", 
          backgroundColor: color,
          borderRadius: "2px",
        }} />
        {title}
      </h3>
      {children}
    </div>
  );
}

function ContactFieldPremium({
  icon,
  value,
  onChange,
  placeholder,
  color,
  readOnly,
  ringClass,
}: {
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  color: string;
  readOnly: boolean;
  ringClass: string;
}) {
  if (!value && readOnly) return null;
  
  return (
    <div style={{ 
      display: "flex", 
      alignItems: "center", 
      gap: "12px", 
      marginBottom: "10px", 
      padding: "8px 10px",
      background: "rgba(255,255,255,0.03)",
      borderRadius: "8px",
      transition: "all 0.2s",
    }}>
      <span style={{ 
        color, 
        flexShrink: 0,
        width: "18px",
        height: "18px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: `${color}20`,
        borderRadius: "4px",
        fontSize: "10px",
      }}>{icon}</span>
      <EditableField
        id={`contact-${placeholder}`}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="text-[10px] text-slate-300"
        focusRingClass={ringClass}
        disabled={readOnly}
      />
    </div>
  );
}

function SkillBarPremium({ color, level }: { color: string; level: number }) {
  return (
    <div style={{ 
      height: "6px", 
      backgroundColor: "rgba(255,255,255,0.08)", 
      borderRadius: "3px", 
      overflow: "hidden", 
      marginTop: "6px",
    }}>
      <div style={{ 
        height: "100%", 
        width: `${level}%`, 
        background: `linear-gradient(90deg, ${color} 0%, ${color}cc 100%)`,
        borderRadius: "3px",
        boxShadow: `0 0 8px ${color}40`,
      }} />
    </div>
  );
}

function MainSectionPremium({ title, color, icon, children }: { 
  title: string; 
  color: string; 
  icon?: string;
  children: React.ReactNode 
}) {
  return (
    <section style={{ marginBottom: "22px" }}>
      <h2 style={{
        fontSize: "11px",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.12em",
        color: "#1e293b",
        marginBottom: "14px",
        paddingBottom: "8px",
        borderBottom: "2px solid #f1f5f9",
        display: "flex",
        alignItems: "center",
        gap: "10px",
      }}>
        <span style={{ 
          color, 
          fontSize: "14px",
          lineHeight: 1,
        }}>{icon || "◆"}</span>
        {title}
        <span style={{ 
          flex: 1, 
          height: "2px", 
          background: `linear-gradient(90deg, ${color}30 0%, transparent 100%)`,
          marginLeft: "4px",
        }} />
      </h2>
      {children}
    </section>
  );
}

function EditableSectionItemPremium({
  item,
  color,
  readOnly,
  onUpdate,
  onBulletUpdate,
}: {
  item: ResumeSectionItem;
  color: string;
  readOnly: boolean;
  onUpdate: (updates: Partial<ResumeSectionItem>) => void;
  onBulletUpdate: (bulletIndex: number, value: string) => void;
}) {
  const ringClass = "ring-2 ring-indigo-500/50";

  return (
    <div style={{ 
      marginBottom: "16px", 
      paddingLeft: "8px",
      borderLeft: `3px solid ${color}20`,
      paddingBottom: "4px",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "2px" }}>
        <EditableField
          id={`item-${item.id}-title`}
          value={item.title || ""}
          onChange={(v) => onUpdate({ title: v })}
          placeholder="Position / Role"
          className="text-[12px] font-bold text-slate-900"
          style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}
          focusRingClass={ringClass}
          disabled={readOnly}
        />
        <EditableField
          id={`item-${item.id}-date`}
          value={item.date || ""}
          onChange={(v) => onUpdate({ date: v })}
          placeholder="2020 - Present"
          className="text-[10px] font-medium"
          style={{ 
            color,
            backgroundColor: `${color}10`,
            padding: "2px 8px",
            borderRadius: "4px",
          }}
          focusRingClass={ringClass}
          disabled={readOnly}
        />
      </div>
      <EditableField
        id={`item-${item.id}-subtitle`}
        value={item.subtitle || ""}
        onChange={(v) => onUpdate({ subtitle: v })}
        placeholder="Company Name"
        className="text-[11px] font-semibold text-slate-600 mb-2"
        focusRingClass={ringClass}
        disabled={readOnly}
      />
      {item.description && (
        <EditableField
          id={`item-${item.id}-desc`}
          value={item.description}
          onChange={(v) => onUpdate({ description: v })}
          placeholder="Brief description..."
          className="text-[10px] text-slate-500 leading-relaxed mt-1"
          type="textarea"
          multiline
          focusRingClass={ringClass}
          disabled={readOnly}
        />
      )}
      {item.bullets && item.bullets.length > 0 && (
        <div style={{ marginTop: "8px" }}>
          {item.bullets.map((bullet, bIdx) => (
            <div key={bIdx} style={{ 
              display: "flex", 
              alignItems: "flex-start", 
              gap: "10px", 
              marginBottom: "6px",
              padding: "4px 0",
            }}>
              <span style={{ 
                color, 
                fontSize: "10px", 
                marginTop: "3px",
                fontWeight: 700,
              }}>▹</span>
              <EditableField
                id={`item-${item.id}-bullet-${bIdx}`}
                value={bullet}
                onChange={(v) => onBulletUpdate(bIdx, v)}
                placeholder="Key achievement or responsibility..."
                className="text-[10px] text-slate-600 leading-[1.6] flex-1"
                focusRingClass={ringClass}
                disabled={readOnly}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EditableSectionItem({
  item,
  color,
  readOnly,
  onUpdate,
  onBulletUpdate,
}: {
  item: ResumeSectionItem;
  color: string;
  readOnly: boolean;
  onUpdate: (updates: Partial<ResumeSectionItem>) => void;
  onBulletUpdate: (bulletIndex: number, value: string) => void;
}) {
  const ringClass = "ring-2 ring-indigo-500/50";

  return (
    <div style={{ marginBottom: "12px", paddingLeft: "4px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <EditableField
          id={`item-${item.id}-title`}
          value={item.title || ""}
          onChange={(v) => onUpdate({ title: v })}
          placeholder="Position / Degree"
          className="text-[11px] font-semibold text-slate-800"
          focusRingClass={ringClass}
          disabled={readOnly}
        />
        <EditableField
          id={`item-${item.id}-date`}
          value={item.date || ""}
          onChange={(v) => onUpdate({ date: v })}
          placeholder="Date"
          className="text-[10px] text-slate-500 italic"
          focusRingClass={ringClass}
          disabled={readOnly}
        />
      </div>
      <EditableField
        id={`item-${item.id}-subtitle`}
        value={item.subtitle || ""}
        onChange={(v) => onUpdate({ subtitle: v })}
        placeholder="Company / Institution"
        className="text-[10px] font-medium"
        style={{ color }}
        focusRingClass={ringClass}
        disabled={readOnly}
      />
      {item.description && (
        <EditableField
          id={`item-${item.id}-desc`}
          value={item.description}
          onChange={(v) => onUpdate({ description: v })}
          placeholder="Description..."
          className="text-[10px] text-slate-600 leading-relaxed mt-1"
          type="textarea"
          multiline
          focusRingClass={ringClass}
          disabled={readOnly}
        />
      )}
      {item.bullets && item.bullets.length > 0 && (
        <div style={{ marginTop: "4px" }}>
          {item.bullets.map((bullet, bIdx) => (
            <div key={bIdx} style={{ display: "flex", alignItems: "flex-start", gap: "8px", marginBottom: "3px" }}>
              <span style={{ color, fontSize: "8px", marginTop: "4px" }}>▸</span>
              <EditableField
                id={`item-${item.id}-bullet-${bIdx}`}
                value={bullet}
                onChange={(v) => onBulletUpdate(bIdx, v)}
                placeholder="Achievement..."
                className="text-[10px] text-slate-600 leading-relaxed flex-1"
                focusRingClass={ringClass}
                disabled={readOnly}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ==========================================
// EXECUTIVE TEMPLATE (EDITABLE)
// ==========================================

function ExecutiveEditable({
  data,
  colors,
  photo,
  readOnly,
  updateField,
  updateContact,
  updateSkill,
  updateLanguage,
  updateSectionItem,
  updateBullet,
}: EditableTemplateProps) {
  const ringClass = "ring-2 ring-indigo-500/50";

  return (
    <A4PageWrapper>
      <div style={{ backgroundColor: "#ffffff", minHeight: "100%", fontFamily: FONTS.sans }}>
        {/* Dark Header Block */}
        <header style={{
          backgroundColor: "#111827",
          padding: "32px 40px",
          display: "flex",
          alignItems: "center",
          gap: "20px",
        }}>
          <div style={{
            width: "80px",
            height: "80px",
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.dark} 100%)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "28px",
            fontWeight: 700,
            color: "white",
            flexShrink: 0,
          }}>
            {data.name?.charAt(0)?.toUpperCase() || "?"}
          </div>
          <div style={{ flex: 1 }}>
            <EditableField
              id="exec-name"
              value={data.name}
              onChange={(v) => updateField("name", v)}
              placeholder="Your Full Name"
              className="text-[28px] font-bold text-white"
              style={{ fontFamily: FONTS.heading }}
              focusRingClass={ringClass}
              disabled={readOnly}
            />
            <EditableField
              id="exec-title"
              value={data.title || ""}
              onChange={(v) => updateField("title", v)}
              placeholder="Professional Title"
              className="text-[12px] font-medium uppercase tracking-wider mt-1"
              style={{ color: colors.primary }}
              focusRingClass={ringClass}
              disabled={readOnly}
            />
          </div>
        </header>

        {/* Contact Bar */}
        <div style={{
          backgroundColor: colors.primary,
          padding: "10px 40px",
          display: "flex",
          justifyContent: "center",
          gap: "24px",
          flexWrap: "wrap",
        }}>
          {(hasContent(data.contact.email) || !readOnly) && (
            <EditableField
              id="exec-email"
              value={data.contact.email || ""}
              onChange={(v) => updateContact("email", v)}
              placeholder="email@example.com"
              className="text-[10px] font-medium text-white"
              focusRingClass={ringClass}
              disabled={readOnly}
            />
          )}
          {(hasContent(data.contact.phone) || !readOnly) && (
            <EditableField
              id="exec-phone"
              value={data.contact.phone || ""}
              onChange={(v) => updateContact("phone", v)}
              placeholder="+1 234 567 890"
              className="text-[10px] font-medium text-white"
              focusRingClass={ringClass}
              disabled={readOnly}
            />
          )}
          {(hasContent(data.contact.location) || !readOnly) && (
            <EditableField
              id="exec-location"
              value={data.contact.location || ""}
              onChange={(v) => updateContact("location", v)}
              placeholder="City, Country"
              className="text-[10px] font-medium text-white"
              focusRingClass={ringClass}
              disabled={readOnly}
            />
          )}
        </div>

        {/* Main Content */}
        <div style={{ padding: "24px 40px" }}>
          {/* Summary */}
          {(hasContent(data.summary) || !readOnly) && (
            <section style={{ marginBottom: "24px" }}>
              <h2 style={{
                fontSize: "11px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "#111827",
                marginBottom: "10px",
                paddingBottom: "6px",
                borderBottom: `2px solid ${colors.primary}`,
                display: "inline-block",
              }}>
                Executive Summary
              </h2>
              <EditableField
                id="exec-summary"
                value={data.summary || ""}
                onChange={(v) => updateField("summary", v)}
                placeholder="Write a compelling executive summary..."
                className="text-[11px] text-slate-700 leading-[1.7]"
                type="textarea"
                multiline
                minHeight={40}
                focusRingClass={ringClass}
                disabled={readOnly}
              />
            </section>
          )}

          {/* Two Column Layout */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 240px", gap: "28px" }}>
            {/* Left - Experience/Education */}
            <div>
              {data.sections.map((section, sIdx) => (
                <section key={section.id} style={{ marginBottom: "20px" }}>
                  <h2 style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    color: "#111827",
                    marginBottom: "12px",
                    paddingBottom: "4px",
                    borderBottom: `2px solid ${colors.primary}`,
                    display: "inline-block",
                  }}>
                    {section.title}
                  </h2>
                  {section.items.map((item, iIdx) => (
                    <EditableSectionItemPremium
                      key={item.id}
                      item={item}
                      color={colors.primary}
                      readOnly={readOnly}
                      onUpdate={(updates) => updateSectionItem(sIdx, iIdx, updates)}
                      onBulletUpdate={(bIdx, v) => updateBullet(sIdx, iIdx, bIdx, v)}
                    />
                  ))}
                </section>
              ))}
            </div>

            {/* Right - Skills/Languages */}
            <div>
              {data.skills && data.skills.length > 0 && (
                <section style={{ marginBottom: "20px" }}>
                  <h2 style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    color: "#111827",
                    marginBottom: "10px",
                  }}>
                    Core Competencies
                  </h2>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {data.skills.map((skill, idx) => (
                      <EditableField
                        key={idx}
                        id={`exec-skill-${idx}`}
                        value={skill}
                        onChange={(v) => updateSkill(idx, v)}
                        placeholder="Skill"
                        className="text-[10px] font-medium text-slate-700"
                        style={{
                          backgroundColor: "#f9fafb",
                          padding: "6px 10px",
                          borderRadius: "4px",
                          borderLeft: `3px solid ${colors.primary}`,
                        }}
                        focusRingClass={ringClass}
                        disabled={readOnly}
                      />
                    ))}
                  </div>
                </section>
              )}

              {data.languages && data.languages.length > 0 && (
                <section>
                  <h2 style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    color: "#111827",
                    marginBottom: "10px",
                  }}>
                    Languages
                  </h2>
                  {data.languages.map((lang, idx) => (
                    <div key={idx} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                      <span style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        backgroundColor: colors.primary,
                      }} />
                      <EditableField
                        id={`exec-lang-${idx}`}
                        value={lang}
                        onChange={(v) => updateLanguage(idx, v)}
                        placeholder="Language - Level"
                        className="text-[10px] text-slate-600"
                        focusRingClass={ringClass}
                        disabled={readOnly}
                      />
                    </div>
                  ))}
                </section>
              )}
            </div>
          </div>
        </div>
      </div>
    </A4PageWrapper>
  );
}

// ==========================================
// TECHIE TEMPLATE (EDITABLE)
// ==========================================

function TechieEditable({
  data,
  colors,
  readOnly,
  updateField,
  updateContact,
  updateSkill,
  updateSectionItem,
  updateBullet,
}: Omit<EditableTemplateProps, "updateLanguage" | "photo">) {
  const ringClass = "ring-2 ring-indigo-500/50";
  const monoFont = "var(--font-mono), 'JetBrains Mono', monospace";

  return (
    <A4PageWrapper>
      <div style={{ backgroundColor: "#ffffff", minHeight: "100%", fontFamily: FONTS.sans }}>
        {/* Terminal-style Header */}
        <header style={{
          backgroundColor: "#1e293b",
          padding: "20px 28px",
          fontFamily: monoFont,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
            <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#ef4444" }} />
            <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#eab308" }} />
            <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#22c55e" }} />
            <span style={{ fontSize: "10px", color: "#64748b", marginLeft: "8px" }}>resume.exe</span>
          </div>
          
          <div style={{ color: "#94a3b8", fontSize: "10px", marginBottom: "4px" }}>
            <span style={{ color: colors.primary }}>$</span> whoami
          </div>
          <EditableField
            id="tech-name"
            value={data.name}
            onChange={(v) => updateField("name", v)}
            placeholder="Your Name"
            className="text-[24px] font-bold text-white"
            style={{ fontFamily: monoFont }}
            focusRingClass={ringClass}
            disabled={readOnly}
          />
          <div style={{ color: "#94a3b8", fontSize: "12px", marginTop: "4px" }}>
            <span style={{ color: colors.primary }}>{">"}</span>
            <EditableField
              id="tech-title"
              value={data.title || ""}
              onChange={(v) => updateField("title", v)}
              placeholder="Developer Title"
              className="text-[12px] text-slate-400 ml-1"
              style={{ display: "inline-block" }}
              focusRingClass={ringClass}
              disabled={readOnly}
            />
          </div>
        </header>

        {/* Contact Bar */}
        <div style={{
          backgroundColor: "#f1f5f9",
          padding: "8px 28px",
          fontSize: "10px",
          color: "#475569",
          fontFamily: monoFont,
          display: "flex",
          gap: "16px",
          flexWrap: "wrap",
        }}>
          {(hasContent(data.contact.email) || !readOnly) && (
            <span>
              <span style={{ color: colors.primary }}>email:</span> &quot;
              <EditableField
                id="tech-email"
                value={data.contact.email || ""}
                onChange={(v) => updateContact("email", v)}
                placeholder="you@email.com"
                className="text-[10px] text-slate-700"
                style={{ display: "inline" }}
                focusRingClass={ringClass}
                disabled={readOnly}
              />
              &quot;
            </span>
          )}
          {(hasContent(data.contact.github) || !readOnly) && (
            <span>
              <span style={{ color: colors.primary }}>github:</span> &quot;
              <EditableField
                id="tech-github"
                value={data.contact.github || ""}
                onChange={(v) => updateContact("github", v)}
                placeholder="github.com/you"
                className="text-[10px] text-slate-700"
                style={{ display: "inline" }}
                focusRingClass={ringClass}
                disabled={readOnly}
              />
              &quot;
            </span>
          )}
        </div>

        {/* Main Content */}
        <div style={{ padding: "20px 28px" }}>
          {/* Skills Grid - Prominent */}
          {data.skills && data.skills.length > 0 && (
            <section style={{ marginBottom: "20px" }}>
              <h2 style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "#1e293b",
                marginBottom: "10px",
                fontFamily: monoFont,
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}>
                <span style={{ color: colors.primary }}>#</span>
                tech_stack
                <span style={{ flex: 1, height: "1px", backgroundColor: "#e2e8f0", marginLeft: "8px" }} />
              </h2>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
                gap: "6px",
              }}>
                {data.skills.map((skill, idx) => (
                  <EditableField
                    key={idx}
                    id={`tech-skill-${idx}`}
                    value={skill}
                    onChange={(v) => updateSkill(idx, v)}
                    placeholder="Skill"
                    className="text-[10px] font-medium text-slate-700"
                    style={{
                      backgroundColor: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: "4px",
                      padding: "6px 10px",
                    }}
                    focusRingClass={ringClass}
                    disabled={readOnly}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Summary */}
          {(hasContent(data.summary) || !readOnly) && (
            <section style={{ marginBottom: "18px" }}>
              <h2 style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "#1e293b",
                marginBottom: "10px",
                fontFamily: monoFont,
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}>
                <span style={{ color: colors.primary }}>#</span>
                about_me
                <span style={{ flex: 1, height: "1px", backgroundColor: "#e2e8f0", marginLeft: "8px" }} />
              </h2>
              <EditableField
                id="tech-summary"
                value={data.summary || ""}
                onChange={(v) => updateField("summary", v)}
                placeholder="Brief about yourself..."
                className="text-[10px] text-slate-600 leading-[1.6]"
                style={{
                  backgroundColor: "#fafafa",
                  padding: "10px 14px",
                  borderRadius: "4px",
                  borderLeft: `3px solid ${colors.primary}`,
                }}
                type="textarea"
                multiline
                focusRingClass={ringClass}
                disabled={readOnly}
              />
            </section>
          )}

          {/* Sections */}
          {data.sections.map((section, sIdx) => (
            <section key={section.id} style={{ marginBottom: "18px" }}>
              <h2 style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "#1e293b",
                marginBottom: "10px",
                fontFamily: monoFont,
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}>
                <span style={{ color: colors.primary }}>#</span>
                {section.title.toLowerCase().replace(/\s/g, "_")}
                <span style={{ flex: 1, height: "1px", backgroundColor: "#e2e8f0", marginLeft: "8px" }} />
              </h2>
              {section.items.map((item, iIdx) => (
                <div key={item.id} style={{
                  marginBottom: "12px",
                  padding: "10px 14px",
                  backgroundColor: "#fafafa",
                  borderRadius: "4px",
                  border: "1px solid #e2e8f0",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <EditableField
                      id={`tech-item-${item.id}-title`}
                      value={item.title || ""}
                      onChange={(v) => updateSectionItem(sIdx, iIdx, { title: v })}
                      placeholder="Position"
                      className="text-[12px] font-semibold text-slate-900"
                      style={{ fontFamily: monoFont }}
                      focusRingClass={ringClass}
                      disabled={readOnly}
                    />
                    <EditableField
                      id={`tech-item-${item.id}-date`}
                      value={item.date || ""}
                      onChange={(v) => updateSectionItem(sIdx, iIdx, { date: v })}
                      placeholder="Date"
                      className="text-[9px] font-medium"
                      style={{
                        color: colors.primary,
                        backgroundColor: `${colors.primary}15`,
                        padding: "2px 6px",
                        borderRadius: "3px",
                        fontFamily: monoFont,
                      }}
                      focusRingClass={ringClass}
                      disabled={readOnly}
                    />
                  </div>
                  <EditableField
                    id={`tech-item-${item.id}-subtitle`}
                    value={item.subtitle || ""}
                    onChange={(v) => updateSectionItem(sIdx, iIdx, { subtitle: v })}
                    placeholder="Company"
                    className="text-[10px] text-slate-500 mt-1"
                    focusRingClass={ringClass}
                    disabled={readOnly}
                  />
                  {item.bullets && item.bullets.length > 0 && (
                    <div style={{ marginTop: "8px" }}>
                      {item.bullets.map((bullet, bIdx) => (
                        <div key={bIdx} style={{ display: "flex", alignItems: "flex-start", gap: "8px", marginBottom: "3px" }}>
                          <span style={{ color: colors.primary, fontSize: "10px", fontFamily: monoFont }}>→</span>
                          <EditableField
                            id={`tech-item-${item.id}-bullet-${bIdx}`}
                            value={bullet}
                            onChange={(v) => updateBullet(sIdx, iIdx, bIdx, v)}
                            placeholder="Achievement..."
                            className="text-[10px] text-slate-600 leading-[1.5] flex-1"
                            focusRingClass={ringClass}
                            disabled={readOnly}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </section>
          ))}
        </div>
      </div>
    </A4PageWrapper>
  );
}

// ==========================================
// STARTUP TEMPLATE (EDITABLE)
// ==========================================

function StartupEditable({
  data,
  colors,
  readOnly,
  updateField,
  updateContact,
  updateSkill,
  updateLanguage,
  updateSectionItem,
  updateBullet,
}: Omit<EditableTemplateProps, "photo">) {
  const ringClass = "ring-2 ring-indigo-500/50";

  return (
    <A4PageWrapper>
      <div style={{
        backgroundColor: "#ffffff",
        minHeight: "100%",
        fontFamily: FONTS.sans,
        padding: "36px 44px",
      }}>
        {/* Big Bold Header */}
        <header style={{ marginBottom: "28px" }}>
          <div style={{
            display: "inline-block",
            padding: "4px 12px",
            backgroundColor: colors.light,
            borderRadius: "4px",
            marginBottom: "6px",
          }}>
            <EditableField
              id="startup-title"
              value={data.title || ""}
              onChange={(v) => updateField("title", v)}
              placeholder="Professional Title"
              className="text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: colors.primary }}
              focusRingClass={ringClass}
              disabled={readOnly}
            />
          </div>
          
          <EditableField
            id="startup-name"
            value={data.name}
            onChange={(v) => updateField("name", v)}
            placeholder="Your Name"
            className="text-[38px] font-extrabold text-slate-900 leading-none"
            style={{ fontFamily: FONTS.heading, letterSpacing: "-0.02em" }}
            focusRingClass={ringClass}
            disabled={readOnly}
          />

          {/* Contact Pills */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "14px" }}>
            {(hasContent(data.contact.email) || !readOnly) && (
              <div style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "10px",
                color: "#4b5563",
                backgroundColor: "#f9fafb",
                padding: "6px 12px",
                borderRadius: "20px",
                border: "1px solid #e5e7eb",
              }}>
                <span style={{ color: colors.primary }}>✉</span>
                <EditableField
                  id="startup-email"
                  value={data.contact.email || ""}
                  onChange={(v) => updateContact("email", v)}
                  placeholder="email@example.com"
                  className="text-[10px] text-slate-600"
                  focusRingClass={ringClass}
                  disabled={readOnly}
                />
              </div>
            )}
            {(hasContent(data.contact.phone) || !readOnly) && (
              <div style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "10px",
                color: "#4b5563",
                backgroundColor: "#f9fafb",
                padding: "6px 12px",
                borderRadius: "20px",
                border: "1px solid #e5e7eb",
              }}>
                <span style={{ color: colors.primary }}>☎</span>
                <EditableField
                  id="startup-phone"
                  value={data.contact.phone || ""}
                  onChange={(v) => updateContact("phone", v)}
                  placeholder="+1 234 567 890"
                  className="text-[10px] text-slate-600"
                  focusRingClass={ringClass}
                  disabled={readOnly}
                />
              </div>
            )}
          </div>
        </header>

        {/* Summary */}
        {(hasContent(data.summary) || !readOnly) && (
          <section style={{
            marginBottom: "28px",
            padding: "20px 0",
            borderTop: `3px solid ${colors.primary}`,
            borderBottom: "1px solid #e5e7eb",
          }}>
            <EditableField
              id="startup-summary"
              value={data.summary || ""}
              onChange={(v) => updateField("summary", v)}
              placeholder="Write an impactful summary..."
              className="text-[13px] text-slate-700 leading-[1.7]"
              type="textarea"
              multiline
              focusRingClass={ringClass}
              disabled={readOnly}
            />
          </section>
        )}

        {/* Skills Badges */}
        {data.skills && data.skills.length > 0 && (
          <section style={{ marginBottom: "24px" }}>
            <h2 style={{
              fontSize: "16px",
              fontWeight: 700,
              color: "#111827",
              marginBottom: "14px",
              fontFamily: FONTS.heading,
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}>
              <span style={{
                width: "4px",
                height: "22px",
                backgroundColor: colors.primary,
                borderRadius: "2px",
              }} />
              What I Bring
            </h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {data.skills.map((skill, idx) => (
                <div key={idx} style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "10px",
                  fontWeight: 600,
                  color: "#374151",
                  backgroundColor: "#f3f4f6",
                  padding: "5px 12px",
                  borderRadius: "18px",
                }}>
                  <span style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    backgroundColor: colors.primary,
                  }} />
                  <EditableField
                    id={`startup-skill-${idx}`}
                    value={skill}
                    onChange={(v) => updateSkill(idx, v)}
                    placeholder="Skill"
                    className="text-[10px] font-semibold text-slate-700"
                    focusRingClass={ringClass}
                    disabled={readOnly}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Sections */}
        {data.sections.map((section, sIdx) => (
          <section key={section.id} style={{ marginBottom: "22px" }}>
            <h2 style={{
              fontSize: "16px",
              fontWeight: 700,
              color: "#111827",
              marginBottom: "14px",
              fontFamily: FONTS.heading,
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}>
              <span style={{
                width: "4px",
                height: "22px",
                backgroundColor: colors.primary,
                borderRadius: "2px",
              }} />
              {section.title}
            </h2>
            {section.items.map((item, iIdx) => (
              <div key={item.id} style={{
                marginBottom: iIdx === section.items.length - 1 ? 0 : "16px",
                paddingBottom: iIdx === section.items.length - 1 ? 0 : "16px",
                borderBottom: iIdx === section.items.length - 1 ? "none" : "1px solid #f3f4f6",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <EditableField
                      id={`startup-item-${item.id}-title`}
                      value={item.title || ""}
                      onChange={(v) => updateSectionItem(sIdx, iIdx, { title: v })}
                      placeholder="Position"
                      className="text-[13px] font-bold text-slate-900"
                      style={{ fontFamily: FONTS.heading }}
                      focusRingClass={ringClass}
                      disabled={readOnly}
                    />
                    <EditableField
                      id={`startup-item-${item.id}-subtitle`}
                      value={item.subtitle || ""}
                      onChange={(v) => updateSectionItem(sIdx, iIdx, { subtitle: v })}
                      placeholder="Company"
                      className="text-[11px] font-medium mt-1"
                      style={{ color: colors.primary }}
                      focusRingClass={ringClass}
                      disabled={readOnly}
                    />
                  </div>
                  <EditableField
                    id={`startup-item-${item.id}-date`}
                    value={item.date || ""}
                    onChange={(v) => updateSectionItem(sIdx, iIdx, { date: v })}
                    placeholder="Date"
                    className="text-[10px] font-semibold text-slate-500"
                    style={{
                      backgroundColor: "#f3f4f6",
                      padding: "3px 8px",
                      borderRadius: "4px",
                    }}
                    focusRingClass={ringClass}
                    disabled={readOnly}
                  />
                </div>
                {item.bullets && item.bullets.length > 0 && (
                  <div style={{ marginTop: "10px" }}>
                    {item.bullets.map((bullet, bIdx) => (
                      <div key={bIdx} style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "10px",
                        marginBottom: "6px",
                      }}>
                        <span style={{
                          width: "18px",
                          height: "18px",
                          borderRadius: "50%",
                          backgroundColor: colors.light,
                          color: colors.primary,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "9px",
                          fontWeight: 700,
                          flexShrink: 0,
                          marginTop: "1px",
                        }}>
                          {bIdx + 1}
                        </span>
                        <EditableField
                          id={`startup-item-${item.id}-bullet-${bIdx}`}
                          value={bullet}
                          onChange={(v) => updateBullet(sIdx, iIdx, bIdx, v)}
                          placeholder="Achievement..."
                          className="text-[10px] text-slate-600 leading-[1.5] flex-1"
                          focusRingClass={ringClass}
                          disabled={readOnly}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </section>
        ))}

        {/* Languages Footer */}
        {data.languages && data.languages.length > 0 && (
          <footer style={{
            marginTop: "20px",
            paddingTop: "14px",
            borderTop: "1px solid #e5e7eb",
            display: "flex",
            alignItems: "center",
            gap: "14px",
          }}>
            <span style={{ fontSize: "10px", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Languages:
            </span>
            <div style={{ display: "flex", gap: "10px" }}>
              {data.languages.map((lang, idx) => (
                <EditableField
                  key={idx}
                  id={`startup-lang-${idx}`}
                  value={lang}
                  onChange={(v) => updateLanguage(idx, v)}
                  placeholder="Language"
                  className="text-[10px] text-slate-600"
                  focusRingClass={ringClass}
                  disabled={readOnly}
                />
              ))}
            </div>
          </footer>
        )}
      </div>
    </A4PageWrapper>
  );
}

// ==========================================
// INTERNATIONAL TEMPLATE (EDITABLE)
// ==========================================

function InternationalEditable({
  data,
  colors,
  photo,
  readOnly,
  updateField,
  updateContact,
  updateSkill,
  updateLanguage,
  updateSectionItem,
  updateBullet,
}: EditableTemplateProps) {
  const ringClass = "ring-2 ring-indigo-500/50";

  return (
    <A4PageWrapper>
      <div style={{
        backgroundColor: "#ffffff",
        minHeight: "100%",
        fontFamily: FONTS.clean,
        padding: "32px 36px",
      }}>
        {/* Header with optional photo */}
        <header style={{
          display: "flex",
          gap: "20px",
          marginBottom: "20px",
          paddingBottom: "16px",
          borderBottom: `2px solid ${colors.primary}`,
        }}>
          {/* Photo Placeholder */}
          {photo ? (
            <div style={{
              width: "90px",
              height: "115px",
              overflow: "hidden",
              border: `2px solid ${colors.light}`,
              flexShrink: 0,
            }}>
              <img src={photo} alt={data.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          ) : (
            <div style={{
              width: "90px",
              height: "115px",
              backgroundColor: colors.light,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "10px",
              color: colors.dark,
              fontWeight: 500,
              textAlign: "center",
              flexShrink: 0,
            }}>
              Photo
            </div>
          )}

          {/* Personal Info */}
          <div style={{ flex: 1 }}>
            <EditableField
              id="intl-name"
              value={data.name}
              onChange={(v) => updateField("name", v)}
              placeholder="Full Name"
              className="text-[24px] font-bold text-slate-800"
              style={{ fontFamily: FONTS.heading }}
              focusRingClass={ringClass}
              disabled={readOnly}
            />
            <EditableField
              id="intl-title"
              value={data.title || ""}
              onChange={(v) => updateField("title", v)}
              placeholder="Professional Title"
              className="text-[12px] font-medium mt-1"
              style={{ color: colors.primary }}
              focusRingClass={ringClass}
              disabled={readOnly}
            />

            {/* Contact Grid */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "4px 16px",
              marginTop: "10px",
            }}>
              {(hasContent(data.contact.email) || !readOnly) && (
                <div style={{ display: "flex", gap: "6px" }}>
                  <span style={{ fontSize: "10px", fontWeight: 600, color: "#6b7280", minWidth: "50px" }}>Email:</span>
                  <EditableField
                    id="intl-email"
                    value={data.contact.email || ""}
                    onChange={(v) => updateContact("email", v)}
                    placeholder="email@example.com"
                    className="text-[10px] text-slate-700"
                    focusRingClass={ringClass}
                    disabled={readOnly}
                  />
                </div>
              )}
              {(hasContent(data.contact.phone) || !readOnly) && (
                <div style={{ display: "flex", gap: "6px" }}>
                  <span style={{ fontSize: "10px", fontWeight: 600, color: "#6b7280", minWidth: "50px" }}>Phone:</span>
                  <EditableField
                    id="intl-phone"
                    value={data.contact.phone || ""}
                    onChange={(v) => updateContact("phone", v)}
                    placeholder="+1 234 567 890"
                    className="text-[10px] text-slate-700"
                    focusRingClass={ringClass}
                    disabled={readOnly}
                  />
                </div>
              )}
              {(hasContent(data.contact.location) || !readOnly) && (
                <div style={{ display: "flex", gap: "6px" }}>
                  <span style={{ fontSize: "10px", fontWeight: 600, color: "#6b7280", minWidth: "50px" }}>Address:</span>
                  <EditableField
                    id="intl-location"
                    value={data.contact.location || ""}
                    onChange={(v) => updateContact("location", v)}
                    placeholder="City, Country"
                    className="text-[10px] text-slate-700"
                    focusRingClass={ringClass}
                    disabled={readOnly}
                  />
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Two Column Layout */}
        <A4Grid columns="1fr 180px" gap={20}>
          {/* Left - Main Content */}
          <div>
            {/* Summary */}
            {(hasContent(data.summary) || !readOnly) && (
              <section style={{ marginBottom: "18px" }}>
                <h2 style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "#1e293b",
                  marginBottom: "10px",
                  paddingBottom: "4px",
                  borderBottom: `2px solid ${colors.primary}`,
                  display: "inline-block",
                }}>
                  Profile
                </h2>
                <EditableField
                  id="intl-summary"
                  value={data.summary || ""}
                  onChange={(v) => updateField("summary", v)}
                  placeholder="Professional summary..."
                  className="text-[10px] text-slate-600 leading-[1.7]"
                  type="textarea"
                  multiline
                  focusRingClass={ringClass}
                  disabled={readOnly}
                />
              </section>
            )}

            {/* Sections */}
            {data.sections.map((section, sIdx) => (
              <section key={section.id} style={{ marginBottom: "16px" }}>
                <h2 style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "#1e293b",
                  marginBottom: "10px",
                  paddingBottom: "4px",
                  borderBottom: `2px solid ${colors.primary}`,
                  display: "inline-block",
                }}>
                  {section.title}
                </h2>
                {section.items.map((item, iIdx) => (
                  <div key={item.id} style={{ marginBottom: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <div style={{ flex: 1 }}>
                        <EditableField
                          id={`intl-item-${item.id}-title`}
                          value={item.title || ""}
                          onChange={(v) => updateSectionItem(sIdx, iIdx, { title: v })}
                          placeholder="Position/Degree"
                          className="text-[11px] font-semibold text-slate-800"
                          focusRingClass={ringClass}
                          disabled={readOnly}
                        />
                        <EditableField
                          id={`intl-item-${item.id}-subtitle`}
                          value={item.subtitle || ""}
                          onChange={(v) => updateSectionItem(sIdx, iIdx, { subtitle: v })}
                          placeholder="Company/Institution"
                          className="text-[10px] text-slate-500 mt-1"
                          focusRingClass={ringClass}
                          disabled={readOnly}
                        />
                      </div>
                      <EditableField
                        id={`intl-item-${item.id}-date`}
                        value={item.date || ""}
                        onChange={(v) => updateSectionItem(sIdx, iIdx, { date: v })}
                        placeholder="Date"
                        className="text-[10px] font-medium"
                        style={{ color: colors.primary }}
                        focusRingClass={ringClass}
                        disabled={readOnly}
                      />
                    </div>
                    {item.bullets && item.bullets.length > 0 && (
                      <ul style={{ marginTop: "6px", paddingLeft: "14px" }}>
                        {item.bullets.map((bullet, bIdx) => (
                          <li key={bIdx} style={{ marginBottom: "3px" }}>
                            <EditableField
                              id={`intl-item-${item.id}-bullet-${bIdx}`}
                              value={bullet}
                              onChange={(v) => updateBullet(sIdx, iIdx, bIdx, v)}
                              placeholder="Achievement..."
                              className="text-[10px] text-slate-600 leading-[1.5]"
                              focusRingClass={ringClass}
                              disabled={readOnly}
                            />
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </section>
            ))}
          </div>

          {/* Right - Sidebar */}
          <div>
            {/* Skills */}
            {data.skills && data.skills.length > 0 && (
              <section style={{ marginBottom: "16px" }}>
                <h2 style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "#1e293b",
                  marginBottom: "10px",
                  paddingBottom: "4px",
                  borderBottom: `2px solid ${colors.primary}`,
                  display: "inline-block",
                }}>
                  Skills
                </h2>
                {data.skills.map((skill, idx) => (
                  <div key={idx} style={{ marginBottom: "6px" }}>
                    <EditableField
                      id={`intl-skill-${idx}`}
                      value={skill}
                      onChange={(v) => updateSkill(idx, v)}
                      placeholder="Skill"
                      className="text-[10px] text-slate-600"
                      focusRingClass={ringClass}
                      disabled={readOnly}
                    />
                    <div style={{
                      height: "4px",
                      backgroundColor: "#e5e7eb",
                      borderRadius: "2px",
                      marginTop: "3px",
                    }}>
                      <div style={{
                        height: "100%",
                        width: `${70 + ((skill.length * 5) % 30)}%`,
                        backgroundColor: colors.primary,
                        borderRadius: "2px",
                      }} />
                    </div>
                  </div>
                ))}
              </section>
            )}

            {/* Languages */}
            {data.languages && data.languages.length > 0 && (
              <section>
                <h2 style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "#1e293b",
                  marginBottom: "10px",
                  paddingBottom: "4px",
                  borderBottom: `2px solid ${colors.primary}`,
                  display: "inline-block",
                }}>
                  Languages
                </h2>
                {data.languages.map((lang, idx) => (
                  <div key={idx} style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "6px",
                    padding: "4px 0",
                    borderBottom: "1px solid #f3f4f6",
                  }}>
                    <EditableField
                      id={`intl-lang-${idx}`}
                      value={lang}
                      onChange={(v) => updateLanguage(idx, v)}
                      placeholder="Language - Level"
                      className="text-[10px] text-slate-600"
                      focusRingClass={ringClass}
                      disabled={readOnly}
                    />
                  </div>
                ))}
              </section>
            )}
          </div>
        </A4Grid>
      </div>
    </A4PageWrapper>
  );
}

export default EditableResumePreview;
