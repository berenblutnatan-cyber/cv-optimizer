"use client";

import React from "react";
import { A4PageWrapper, A4Grid } from "./A4PageWrapper";
import { parseCV, isBulletLine, isJobTitleLine, splitSections } from "@/hooks/useCVDensity";

/**
 * ModernSidebar Template - "The Modern Professional"
 * 
 * DESIGN PHILOSOPHY:
 * A premium two-column layout combining a dark sidebar with a clean
 * white main area. Perfect for tech professionals, designers, and
 * modern business roles.
 * 
 * SPECIFICATIONS:
 * - Layout: CSS Grid with 2 columns [32% | 68%]
 * - Sidebar: Dark Slate (bg-slate-900) with white/gray text
 * - Main: White background with generous whitespace
 * - Typography: 11-12px body, Inter font family
 * - Accents: Emerald (#10b981) for highlights
 * 
 * SIDEBAR CONTENT:
 * - Contact Information (icons + text)
 * - Skills (visual progress bars)
 * - Languages
 * - Certifications
 * 
 * MAIN CONTENT:
 * - Name & Title (large, bold)
 * - Professional Summary
 * - Experience (timeline style)
 * - Education
 */

interface ModernSidebarProps {
  data: string;
  photo?: string;
}

// Color constants
const COLORS = {
  // Sidebar
  sidebarBg: "#0f172a",      // slate-900
  sidebarText: "#e2e8f0",    // slate-200
  sidebarMuted: "#94a3b8",   // slate-400
  sidebarAccent: "#10b981",  // indigo-500
  sidebarAccentLight: "#34d399", // indigo-400
  
  // Main
  mainBg: "#ffffff",
  mainText: "#1e293b",       // slate-800
  mainMuted: "#64748b",      // slate-500
  mainAccent: "#059669",     // indigo-600
  mainBorder: "#e2e8f0",     // slate-200
};

// Typography constants
const TYPOGRAPHY = {
  name: {
    size: "28px",
    weight: 700,
    tracking: "-0.02em",
    lineHeight: 1.1,
  },
  title: {
    size: "13px",
    weight: 500,
    tracking: "0.08em",
    lineHeight: 1.4,
  },
  sectionHeader: {
    size: "10px",
    weight: 700,
    tracking: "0.1em",
    lineHeight: 1.4,
  },
  body: {
    size: "11px",
    weight: 400,
    lineHeight: 1.55,
  },
  small: {
    size: "10px",
    weight: 400,
    lineHeight: 1.5,
  },
};

// Icon components for sidebar
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

// Helper to detect contact type and return appropriate icon
function getContactIcon(contact: string): React.ReactNode {
  const lower = contact.toLowerCase();
  if (lower.includes("@")) return <Icons.Email />;
  if (lower.match(/^\+?[\d\s\-()]+$/)) return <Icons.Phone />;
  if (lower.includes("linkedin")) return <Icons.LinkedIn />;
  if (lower.includes("http") || lower.includes("www") || lower.includes(".com")) return <Icons.Globe />;
  return <Icons.Location />;
}

// Skill progress bar component
function SkillBar({ skill, level = 80 }: { skill: string; level?: number }) {
  return (
    <div style={{ marginBottom: "8px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "4px",
          fontSize: TYPOGRAPHY.small.size,
          color: COLORS.sidebarText,
        }}
      >
        <span>{skill}</span>
      </div>
      <div
        style={{
          height: "4px",
          backgroundColor: "rgba(255,255,255,0.1)",
          borderRadius: "2px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${level}%`,
            backgroundColor: COLORS.sidebarAccent,
            borderRadius: "2px",
            transition: "width 0.3s ease",
          }}
        />
      </div>
    </div>
  );
}

// Section header component
function SectionHeader({ 
  children, 
  variant = "main" 
}: { 
  children: React.ReactNode; 
  variant?: "main" | "sidebar" 
}) {
  const isSidebar = variant === "sidebar";
  
  return (
    <h3
      style={{
        fontSize: TYPOGRAPHY.sectionHeader.size,
        fontWeight: TYPOGRAPHY.sectionHeader.weight,
        textTransform: "uppercase",
        letterSpacing: TYPOGRAPHY.sectionHeader.tracking,
        color: isSidebar ? COLORS.sidebarAccentLight : COLORS.mainAccent,
        marginBottom: "12px",
        paddingBottom: isSidebar ? "0" : "6px",
        borderBottom: isSidebar ? "none" : `1px solid ${COLORS.mainBorder}`,
        display: "flex",
        alignItems: "center",
        gap: "8px",
      }}
    >
      {!isSidebar && (
        <span
          style={{
            width: "16px",
            height: "2px",
            backgroundColor: COLORS.mainAccent,
          }}
        />
      )}
      {children}
    </h3>
  );
}

export function ModernSidebar({ data, photo }: ModernSidebarProps) {
  const parsed = parseCV(data);
  const { name, contact, sections } = parsed;
  const { sidebar: sidebarSections, main: mainSections } = splitSections(sections);

  // Calculate content density for adaptive spacing
  const totalLines = sections.reduce((acc, s) => acc + s.content.length, 0);
  const isCompact = totalLines > 35;
  const bodySize = isCompact ? "10px" : TYPOGRAPHY.body.size;
  const lineHeight = isCompact ? 1.45 : TYPOGRAPHY.body.lineHeight;

  // Extract skills from sidebar sections
  const skillsSection = sidebarSections.find(s => 
    s.title.toLowerCase().includes("skill") || 
    s.title.toLowerCase().includes("expertise") ||
    s.title.toLowerCase().includes("competenc")
  );
  
  const languagesSection = sidebarSections.find(s => 
    s.title.toLowerCase().includes("language")
  );

  const otherSidebarSections = sidebarSections.filter(s => 
    s !== skillsSection && s !== languagesSection
  );

  return (
    <A4PageWrapper className="cv-text cv-text-sans">
      <A4Grid columns="32% 68%">
        {/* ==========================================
            LEFT SIDEBAR - Dark Slate
            ========================================== */}
        <aside
          style={{
            backgroundColor: COLORS.sidebarBg,
            color: COLORS.sidebarText,
            padding: "24px 20px",
            display: "flex",
            flexDirection: "column",
            height: "100%",
            boxSizing: "border-box",
          }}
        >
          {/* Photo (optional) */}
          {photo && (
            <div
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                overflow: "hidden",
                margin: "0 auto 16px auto",
                border: `3px solid ${COLORS.sidebarAccent}`,
              }}
            >
              <img
                src={photo}
                alt={name}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            </div>
          )}

          {/* Contact Section */}
          {contact.length > 0 && (
            <div style={{ marginBottom: "24px" }}>
              <SectionHeader variant="sidebar">Contact</SectionHeader>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {contact.map((c, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "10px",
                      fontSize: TYPOGRAPHY.small.size,
                      color: COLORS.sidebarMuted,
                      lineHeight: 1.4,
                    }}
                  >
                    <span style={{ color: COLORS.sidebarAccent, flexShrink: 0, marginTop: "1px" }}>
                      {getContactIcon(c)}
                    </span>
                    <span style={{ wordBreak: "break-word" }}>{c}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skills Section with Progress Bars */}
          {skillsSection && skillsSection.content.length > 0 && (
            <div style={{ marginBottom: "24px" }}>
              <SectionHeader variant="sidebar">{skillsSection.title}</SectionHeader>
              {skillsSection.content.map((skill, idx) => {
                const cleanSkill = skill.replace(/^[•\-*]\s*/, "").trim();
                // Generate pseudo-random skill level based on skill name
                const level = 70 + ((cleanSkill.length * 7) % 30);
                return <SkillBar key={idx} skill={cleanSkill} level={level} />;
              })}
            </div>
          )}

          {/* Languages Section */}
          {languagesSection && languagesSection.content.length > 0 && (
            <div style={{ marginBottom: "24px" }}>
              <SectionHeader variant="sidebar">{languagesSection.title}</SectionHeader>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {languagesSection.content.map((lang, idx) => {
                  const cleanLang = lang.replace(/^[•\-*]\s*/, "").trim();
                  return (
                    <div
                      key={idx}
                      style={{
                        fontSize: TYPOGRAPHY.small.size,
                        color: COLORS.sidebarMuted,
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <span
                        style={{
                          width: "6px",
                          height: "6px",
                          borderRadius: "50%",
                          backgroundColor: COLORS.sidebarAccent,
                        }}
                      />
                      {cleanLang}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Other Sidebar Sections */}
          {otherSidebarSections.map((section, sIdx) => (
            <div key={sIdx} style={{ marginBottom: "24px" }}>
              <SectionHeader variant="sidebar">{section.title}</SectionHeader>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {section.content.map((line, idx) => {
                  const cleanLine = line.replace(/^[•\-*]\s*/, "").trim();
                  return (
                    <div
                      key={idx}
                      style={{
                        fontSize: TYPOGRAPHY.small.size,
                        color: COLORS.sidebarMuted,
                        lineHeight: 1.4,
                      }}
                    >
                      {cleanLine}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Spacer to push content up */}
          <div style={{ flex: 1 }} />
        </aside>

        {/* ==========================================
            RIGHT MAIN CONTENT - White
            ========================================== */}
        <main
          style={{
            backgroundColor: COLORS.mainBg,
            color: COLORS.mainText,
            padding: "28px 32px",
            display: "flex",
            flexDirection: "column",
            height: "100%",
            boxSizing: "border-box",
            overflow: "hidden",
          }}
        >
          {/* Header - Name & Title */}
          <header style={{ marginBottom: "20px", flexShrink: 0 }}>
            <h1
              style={{
                fontSize: TYPOGRAPHY.name.size,
                fontWeight: TYPOGRAPHY.name.weight,
                letterSpacing: TYPOGRAPHY.name.tracking,
                lineHeight: TYPOGRAPHY.name.lineHeight,
                color: COLORS.mainText,
                margin: 0,
                marginBottom: "6px",
              }}
            >
              {name}
            </h1>
            {/* If first section looks like a title/role, show it here */}
            {mainSections.length > 0 && mainSections[0].title.toLowerCase().includes("summary") && (
              <p
                style={{
                  fontSize: TYPOGRAPHY.title.size,
                  fontWeight: TYPOGRAPHY.title.weight,
                  textTransform: "uppercase",
                  letterSpacing: TYPOGRAPHY.title.tracking,
                  color: COLORS.mainMuted,
                  margin: 0,
                }}
              >
                Professional Summary
              </p>
            )}
          </header>

          {/* Main Sections */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: isCompact ? "14px" : "18px",
              overflow: "hidden",
            }}
          >
            {mainSections.map((section, sIdx) => {
              // Don't render empty sections
              if (section.content.length === 0) return null;

              return (
                <section key={sIdx} style={{ flexShrink: 0 }}>
                  <SectionHeader variant="main">{section.title}</SectionHeader>
                  
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: isCompact ? "3px" : "4px",
                    }}
                  >
                    {section.content.map((line, lineIdx) => {
                      const isBullet = isBulletLine(line);
                      const isJobTitle = isJobTitleLine(line, lineIdx);

                      // Bullet point with emerald arrow
                      if (isBullet) {
                        const cleanLine = line.replace(/^[•\-*]\s*/, "");
                        return (
                          <p
                            key={lineIdx}
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: "8px",
                              fontSize: bodySize,
                              lineHeight,
                              color: COLORS.mainMuted,
                              margin: 0,
                              paddingLeft: "4px",
                            }}
                          >
                            <span
                              style={{
                                color: COLORS.mainAccent,
                                fontSize: "8px",
                                marginTop: "4px",
                                flexShrink: 0,
                              }}
                            >
                              ▸
                            </span>
                            <span>{cleanLine}</span>
                          </p>
                        );
                      }

                      // Job title / Company line (bold, timeline style)
                      if (isJobTitle) {
                        return (
                          <p
                            key={lineIdx}
                            style={{
                              fontSize: bodySize,
                              lineHeight,
                              fontWeight: 600,
                              color: COLORS.mainText,
                              margin: 0,
                              marginTop: lineIdx > 0 ? "8px" : 0,
                              paddingLeft: "4px",
                              borderLeft: `2px solid ${COLORS.mainAccent}`,
                              paddingBottom: "2px",
                            }}
                          >
                            {line}
                          </p>
                        );
                      }

                      // Regular paragraph
                      return (
                        <p
                          key={lineIdx}
                          style={{
                            fontSize: bodySize,
                            lineHeight,
                            color: COLORS.mainMuted,
                            margin: 0,
                            paddingLeft: "4px",
                          }}
                        >
                          {line}
                        </p>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </main>
      </A4Grid>
    </A4PageWrapper>
  );
}

export default ModernSidebar;
