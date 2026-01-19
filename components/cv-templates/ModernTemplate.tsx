"use client";

import React from "react";
import { parseCV, isBulletLine, isJobTitleLine } from "@/hooks/useCVDensity";

interface ModernTemplateProps {
  data: string;
  photo?: string; // Not used in this template, but included for consistency
}

/**
 * Modern Template - "The Modern"
 * 
 * DESIGN PHILOSOPHY:
 * - Clean, contemporary tech aesthetic
 * - Sans-serif typography (Inter/System)
 * - Emerald accent color (#059669)
 * - Left accent bar on header
 * - Geometric bullet markers
 * 
 * PIXEL-PERFECT SPECS:
 * - A4: 210mm x 297mm
 * - Margins: 18mm all sides
 * - Name: 22px, bold, tight tracking
 * - Section Headers: 11px, bold, uppercase, emerald color
 * - Body: 10px, leading: 1.45
 * - Accent: 4px emerald left border on header
 */
export function ModernTemplate({ data }: ModernTemplateProps) {
  const parsed = parseCV(data);
  const { name, contact, sections } = parsed;

  // Emerald brand color
  const EMERALD = "#059669";
  const EMERALD_LIGHT = "#10b981";

  // Calculate content density for adaptive spacing
  const totalLines = sections.reduce((acc, s) => acc + s.content.length, 0);
  const isCompact = totalLines > 35;
  const isVeryCompact = totalLines > 50;

  // Adaptive spacing
  const spacing = {
    sectionGap: isVeryCompact ? "12px" : isCompact ? "14px" : "18px",
    lineGap: isVeryCompact ? "2px" : isCompact ? "3px" : "4px",
    headerMargin: isVeryCompact ? "5px" : isCompact ? "7px" : "10px",
    bodySize: isVeryCompact ? "9px" : isCompact ? "9.5px" : "10px",
    lineHeight: isVeryCompact ? 1.35 : isCompact ? 1.4 : 1.45,
  };

  return (
    <div
      className="a4-page cv-text cv-text-sans"
      style={{
        padding: "18mm",
        display: "flex",
        flexDirection: "column",
        color: "#374151",
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* Header with Emerald Accent Bar */}
      <header
        className="cv-header"
        style={{
          borderLeft: `4px solid ${EMERALD}`,
          paddingLeft: "16px",
          marginBottom: "18px",
          flexShrink: 0,
        }}
      >
        <h1
          style={{
            fontSize: "22px",
            fontWeight: 700,
            color: "#111827",
            letterSpacing: "-0.02em",
            margin: 0,
            marginBottom: "6px",
          }}
        >
          {name}
        </h1>
        {contact.length > 0 && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "12px",
              fontSize: "9.5px",
              color: "#6b7280",
            }}
          >
            {contact.map((c, idx) => (
              <span
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span
                  style={{
                    width: "5px",
                    height: "5px",
                    borderRadius: "50%",
                    backgroundColor: EMERALD_LIGHT,
                    flexShrink: 0,
                  }}
                />
                {c}
              </span>
            ))}
          </div>
        )}
      </header>

      {/* Sections Container */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: spacing.sectionGap,
          overflow: "hidden",
        }}
      >
        {sections.map((section, sectionIdx) => (
          <section
            key={sectionIdx}
            style={{
              flexShrink: 0,
            }}
          >
            {/* Section Header with Dash Icon */}
            <h2
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "10px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: EMERALD,
                marginBottom: spacing.headerMargin,
              }}
            >
              <span
                style={{
                  width: "16px",
                  height: "2px",
                  backgroundColor: EMERALD,
                  flexShrink: 0,
                }}
              />
              {section.title}
            </h2>

            {/* Section Content */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: spacing.lineGap,
                paddingLeft: "8px",
              }}
            >
              {section.content.map((line, lineIdx) => {
                const isBullet = isBulletLine(line);
                const isJobTitle = isJobTitleLine(line, lineIdx);

                // Bullet point with arrow marker
                if (isBullet) {
                  const cleanLine = line.replace(/^[•\-*]\s*/, "");
                  return (
                    <p
                      key={lineIdx}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "8px",
                        fontSize: spacing.bodySize,
                        lineHeight: spacing.lineHeight,
                        color: "#4b5563",
                        margin: 0,
                      }}
                    >
                      <span
                        style={{
                          color: EMERALD_LIGHT,
                          fontSize: "8px",
                          marginTop: "3px",
                          flexShrink: 0,
                        }}
                      >
                        ▸
                      </span>
                      <span>{cleanLine}</span>
                    </p>
                  );
                }

                // Job title / Company line
                if (isJobTitle) {
                  return (
                    <p
                      key={lineIdx}
                      style={{
                        fontSize: spacing.bodySize,
                        lineHeight: spacing.lineHeight,
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
                      fontSize: spacing.bodySize,
                      lineHeight: spacing.lineHeight,
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
    </div>
  );
}
