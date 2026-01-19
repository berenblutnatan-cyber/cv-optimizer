"use client";

import React from "react";
import { parseCV, isBulletLine, isJobTitleLine } from "@/hooks/useCVDensity";

interface HarvardTemplateProps {
  data: string;
  photo?: string; // Not used in this template, but included for consistency
}

/**
 * Harvard Template - "The Ivy"
 * 
 * DESIGN PHILOSOPHY:
 * - Classical, academic, and timeless
 * - Serif typography (Georgia)
 * - Black and white only - no colors
 * - Horizontal rule separators
 * - Centered header, left-aligned body
 * 
 * PIXEL-PERFECT SPECS:
 * - A4: 210mm x 297mm
 * - Margins: 20mm all sides
 * - Name: 24pt, bold, uppercase, letter-spacing: 0.15em
 * - Section Headers: 12pt, bold, uppercase, with underline
 * - Body: 10.5pt, leading: 1.4
 * - Contact: 10pt, centered, pipe-separated
 */
export function HarvardTemplate({ data }: HarvardTemplateProps) {
  const parsed = parseCV(data);
  const { name, contact, sections } = parsed;

  // Calculate content density for adaptive spacing
  const totalLines = sections.reduce((acc, s) => acc + s.content.length, 0);
  const isCompact = totalLines > 35;
  const isVeryCompact = totalLines > 50;

  // Adaptive spacing based on content density
  const spacing = {
    sectionGap: isVeryCompact ? "12px" : isCompact ? "16px" : "20px",
    lineGap: isVeryCompact ? "2px" : isCompact ? "3px" : "4px",
    headerMargin: isVeryCompact ? "6px" : isCompact ? "8px" : "10px",
    bodySize: isVeryCompact ? "9.5px" : isCompact ? "10px" : "10.5px",
    lineHeight: isVeryCompact ? 1.35 : isCompact ? 1.4 : 1.5,
  };

  return (
    <div
      className="a4-page cv-text cv-text-serif"
      style={{
        padding: "20mm",
        display: "flex",
        flexDirection: "column",
        color: "#000000",
      }}
    >
      {/* Header - Centered, Classic Style */}
      <header
        className="cv-header"
        style={{
          textAlign: "center",
          borderBottom: "2px solid #000000",
          paddingBottom: "12px",
          marginBottom: "16px",
          flexShrink: 0,
        }}
      >
        <h1
          style={{
            fontSize: "24px",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.15em",
            margin: 0,
            marginBottom: "8px",
            color: "#000000",
          }}
        >
          {name}
        </h1>
        {contact.length > 0 && (
          <p
            style={{
              fontSize: "10px",
              color: "#444444",
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            {contact.join("  |  ")}
          </p>
        )}
      </header>

      {/* Sections Container - Flex grow to fill space */}
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
            {/* Section Header */}
            <h2
              style={{
                fontSize: "11px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                borderBottom: "1px solid #999999",
                paddingBottom: "4px",
                marginBottom: spacing.headerMargin,
                color: "#000000",
              }}
            >
              {section.title}
            </h2>

            {/* Section Content */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: spacing.lineGap,
              }}
            >
              {section.content.map((line, lineIdx) => {
                const isBullet = isBulletLine(line);
                const isJobTitle = isJobTitleLine(line, lineIdx);

                // Bullet point
                if (isBullet) {
                  return (
                    <p
                      key={lineIdx}
                      style={{
                        fontSize: spacing.bodySize,
                        lineHeight: spacing.lineHeight,
                        color: "#333333",
                        margin: 0,
                        paddingLeft: "16px",
                        textIndent: "-8px",
                      }}
                    >
                      {line}
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
                        color: "#000000",
                        margin: 0,
                        marginTop: lineIdx > 0 ? "8px" : 0,
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
                      color: "#333333",
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
