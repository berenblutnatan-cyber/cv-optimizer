"use client";

import React from "react";
import { parseCV, isBulletLine, isJobTitleLine, splitSections } from "@/hooks/useCVDensity";

interface CreativeTemplateProps {
  data: string;
}

/**
 * Creative Template - "Executive"
 * 
 * DESIGN PHILOSOPHY:
 * - Two-column professional layout
 * - Dark sidebar for contact/skills
 * - Light main area for experience
 * - Emerald accent highlights
 * - Modern, senior professional aesthetic
 * 
 * PIXEL-PERFECT SPECS:
 * - A4: 210mm x 297mm
 * - Sidebar: 65mm width, dark slate (#1e293b)
 * - Main: 145mm width
 * - Sidebar padding: 16px
 * - Main padding: 20px
 * - Name: 16px, bold, white
 * - Headers: 9px uppercase, emerald accent
 */
export function CreativeTemplate({ data }: CreativeTemplateProps) {
  const parsed = parseCV(data);
  const { name, contact, sections } = parsed;
  const { sidebar: sidebarSections, main: mainSections } = splitSections(sections);

  // Colors
  const SLATE_DARK = "#1e293b";
  const SLATE_LIGHT = "#334155";
  const EMERALD = "#059669";
  const EMERALD_LIGHT = "#34d399";

  // Calculate content density
  const totalMainLines = mainSections.reduce((acc, s) => acc + s.content.length, 0);
  const isCompact = totalMainLines > 30;
  const isVeryCompact = totalMainLines > 45;

  // Adaptive spacing for main content
  const mainSpacing = {
    sectionGap: isVeryCompact ? "10px" : isCompact ? "12px" : "16px",
    lineGap: isVeryCompact ? "2px" : isCompact ? "2.5px" : "3px",
    headerMargin: isVeryCompact ? "5px" : isCompact ? "6px" : "8px",
    bodySize: isVeryCompact ? "9px" : isCompact ? "9.5px" : "10px",
    lineHeight: isVeryCompact ? 1.3 : isCompact ? 1.35 : 1.4,
  };

  // Get initials for avatar
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className="a4-page cv-text cv-text-sans"
      style={{
        display: "flex",
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        overflow: "hidden",
      }}
    >
      {/* Left Sidebar - Dark */}
      <aside
        style={{
          width: "65mm",
          backgroundColor: SLATE_DARK,
          color: "#ffffff",
          padding: "18px",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          overflow: "hidden",
        }}
      >
        {/* Avatar & Name */}
        <div
          style={{
            marginBottom: "20px",
            flexShrink: 0,
          }}
        >
          {/* Avatar Circle */}
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              background: `linear-gradient(135deg, ${EMERALD_LIGHT} 0%, ${EMERALD} 100%)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "12px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            }}
          >
            <span
              style={{
                fontSize: "18px",
                fontWeight: 700,
                color: "#ffffff",
              }}
            >
              {initials}
            </span>
          </div>

          {/* Name */}
          <h1
            style={{
              fontSize: "16px",
              fontWeight: 700,
              letterSpacing: "-0.01em",
              lineHeight: 1.2,
              margin: 0,
              color: "#ffffff",
            }}
          >
            {name}
          </h1>
        </div>

        {/* Contact Section */}
        <section
          style={{
            marginBottom: "18px",
            flexShrink: 0,
          }}
        >
          <h2
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "9px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: EMERALD_LIGHT,
              marginBottom: "8px",
            }}
          >
            <span
              style={{
                width: "3px",
                height: "12px",
                backgroundColor: EMERALD,
                borderRadius: "2px",
                flexShrink: 0,
              }}
            />
            Contact
          </h2>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            {contact.map((c, idx) => (
              <p
                key={idx}
                style={{
                  fontSize: "8.5px",
                  lineHeight: 1.4,
                  color: "#cbd5e1",
                  margin: 0,
                  wordBreak: "break-word",
                }}
              >
                {c}
              </p>
            ))}
          </div>
        </section>

        {/* Sidebar Sections (Skills, Languages, etc.) */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: "14px",
            overflow: "hidden",
          }}
        >
          {sidebarSections.map((section, sectionIdx) => (
            <section
              key={sectionIdx}
              style={{
                flexShrink: 0,
              }}
            >
              <h2
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "9px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: EMERALD_LIGHT,
                  marginBottom: "8px",
                }}
              >
                <span
                  style={{
                    width: "3px",
                    height: "12px",
                    backgroundColor: EMERALD,
                    borderRadius: "2px",
                    flexShrink: 0,
                  }}
                />
                {section.title}
              </h2>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "3px",
                }}
              >
                {section.content.map((line, lineIdx) => (
                  <p
                    key={lineIdx}
                    style={{
                      fontSize: "8.5px",
                      lineHeight: 1.35,
                      color: "#cbd5e1",
                      margin: 0,
                    }}
                  >
                    {line.replace(/^[•\-*]\s*/, "• ")}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </aside>

      {/* Main Content Area - Light */}
      <main
        style={{
          flex: 1,
          backgroundColor: "#ffffff",
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: mainSpacing.sectionGap,
            overflow: "hidden",
          }}
        >
          {mainSections.map((section, sectionIdx) => (
            <section
              key={sectionIdx}
              style={{
                flexShrink: 0,
              }}
            >
              {/* Section Header */}
              <h2
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "10px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "#111827",
                  marginBottom: mainSpacing.headerMargin,
                }}
              >
                <span
                  style={{
                    width: "14px",
                    height: "2px",
                    backgroundColor: EMERALD,
                    flexShrink: 0,
                  }}
                />
                {section.title}
              </h2>

              {/* Section Content with Left Border */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: mainSpacing.lineGap,
                  borderLeft: "2px solid #d1fae5",
                  paddingLeft: "12px",
                }}
              >
                {section.content.map((line, lineIdx) => {
                  const isBullet = isBulletLine(line);
                  const isJobTitle = isJobTitleLine(line, lineIdx);

                  // Bullet point
                  if (isBullet) {
                    const cleanLine = line.replace(/^[•\-*]\s*/, "");
                    return (
                      <p
                        key={lineIdx}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "6px",
                          fontSize: mainSpacing.bodySize,
                          lineHeight: mainSpacing.lineHeight,
                          color: "#4b5563",
                          margin: 0,
                        }}
                      >
                        <span
                          style={{
                            color: EMERALD,
                            fontSize: "6px",
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

                  // Job title line
                  if (isJobTitle) {
                    return (
                      <p
                        key={lineIdx}
                        style={{
                          fontSize: mainSpacing.bodySize,
                          lineHeight: mainSpacing.lineHeight,
                          fontWeight: 600,
                          color: "#111827",
                          margin: 0,
                          marginTop: lineIdx > 0 ? "6px" : 0,
                        }}
                      >
                        {line}
                      </p>
                    );
                  }

                  // Regular content
                  return (
                    <p
                      key={lineIdx}
                      style={{
                        fontSize: mainSpacing.bodySize,
                        lineHeight: mainSpacing.lineHeight,
                        color: "#4b5563",
                        margin: 0,
                      }}
                    >
                      {line}
                    </p>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
