"use client";

import React from "react";
import { A4PageWrapper } from "../A4PageWrapper";
import { getThemeColors, FONTS } from "../ThemeEngine";
import { TemplateProps } from "./TemplateProps";
import { formatName, formatJobTitle, formatBulletPoint, hasContent } from "@/utils/formatting";

/**
 * Template 3: Minimalist
 * 
 * Clean whitespace, centered header, very simple typography.
 * Focuses on content without visual distractions.
 */

export function MinimalistTemplate({ data, themeColor, className }: TemplateProps) {
  const colors = getThemeColors(themeColor);

  return (
    <A4PageWrapper className={className}>
      <div style={{
        backgroundColor: "#ffffff",
        padding: "48px 56px",
        minHeight: "100%",
        fontFamily: FONTS.clean.body,
      }}>
        {/* Header - Centered & Minimal */}
        <header style={{ textAlign: "center", marginBottom: "36px" }}>
          <h1 style={{
            fontSize: "32px",
            fontWeight: 300,
            color: "#111827",
            fontFamily: FONTS.clean.heading,
            letterSpacing: "-0.02em",
          }}>
            {formatName(data.name)}
          </h1>
          {data.title && (
            <p style={{ fontSize: "12px", color: "#6b7280", marginTop: "8px", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              {formatJobTitle(data.title)}
            </p>
          )}
          
          {/* Contact - Simple line */}
          <div style={{ marginTop: "16px", fontSize: "10px", color: "#9ca3af" }}>
            {[
              data.contact.email,
              data.contact.phone,
              data.contact.location,
              data.contact.linkedin,
            ].filter(hasContent).join("  ·  ")}
          </div>

          {/* Subtle divider */}
          <div style={{
            width: "40px",
            height: "2px",
            backgroundColor: colors.primary,
            margin: "24px auto 0",
          }} />
        </header>

        {/* Summary */}
        {hasContent(data.summary) && (
          <section style={{ marginBottom: "32px", maxWidth: "480px", margin: "0 auto 32px" }}>
            <p style={{
              fontSize: "11px",
              color: "#4b5563",
              lineHeight: 1.8,
              textAlign: "center",
            }}>
              {data.summary}
            </p>
          </section>
        )}

        {/* Main Sections */}
        {data.sections.map((section) => (
          <MinimalSection key={section.id} title={section.title} color={colors.primary}>
            {section.items.map((item) => (
              <MinimalSectionItem key={item.id} item={item} />
            ))}
          </MinimalSection>
        ))}

        {/* Skills - Horizontal Tags */}
        {data.skills && data.skills.length > 0 && (
          <MinimalSection title="Skills" color={colors.primary}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "center" }}>
              {data.skills.filter(hasContent).map((skill, idx) => (
                <span key={idx} style={{
                  fontSize: "10px",
                  color: "#374151",
                  padding: "4px 12px",
                  borderRadius: "16px",
                  border: "1px solid #e5e7eb",
                  backgroundColor: "#fafafa",
                }}>
                  {skill}
                </span>
              ))}
            </div>
          </MinimalSection>
        )}

        {/* Languages */}
        {data.languages && data.languages.length > 0 && (
          <MinimalSection title="Languages" color={colors.primary}>
            <div style={{ textAlign: "center", fontSize: "10px", color: "#6b7280" }}>
              {data.languages.filter(hasContent).join("  ·  ")}
            </div>
          </MinimalSection>
        )}
      </div>
    </A4PageWrapper>
  );
}

// Helper Components
function MinimalSection({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: "28px" }}>
      <h2 style={{
        fontSize: "10px",
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.15em",
        color: "#9ca3af",
        marginBottom: "16px",
        textAlign: "center",
      }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function MinimalSectionItem({ item }: { item: { title?: string; subtitle?: string; date?: string; location?: string; description?: string; bullets?: string[] } }) {
  return (
    <div style={{ marginBottom: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div>
          <h3 style={{ fontSize: "12px", fontWeight: 600, color: "#111827" }}>
            {formatJobTitle(item.title || "")}
          </h3>
          {item.subtitle && (
            <p style={{ fontSize: "11px", color: "#6b7280", marginTop: "2px" }}>
              {item.subtitle}
            </p>
          )}
        </div>
        {item.date && (
          <span style={{ fontSize: "10px", color: "#9ca3af", textAlign: "right", whiteSpace: "nowrap" }}>
            {item.date}
          </span>
        )}
      </div>

      {item.description && (
        <p style={{ fontSize: "10px", color: "#6b7280", marginTop: "8px", lineHeight: 1.7 }}>
          {item.description}
        </p>
      )}

      {item.bullets && item.bullets.length > 0 && (
        <ul style={{ marginTop: "8px", paddingLeft: "16px" }}>
          {item.bullets.filter(hasContent).map((bullet, idx) => (
            <li key={idx} style={{ fontSize: "10px", color: "#4b5563", lineHeight: 1.6, marginBottom: "3px" }}>
              {formatBulletPoint(bullet)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
