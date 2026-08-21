"use client";

import React from "react";
import { A4PageWrapper } from "../A4PageWrapper";
import { getThemeColors, FONTS } from "../ThemeEngine";
import { TemplateProps } from "./TemplateProps";
import { formatName, formatJobTitle, formatBulletPoint, hasContent } from "@/utils/formatting";
import { useT } from "@/lib/i18n/LanguageProvider";
import { scaled, spaced, leading } from "@/lib/builder/density";

/**
 * Template 3: Minimalist
 * 
 * Clean whitespace, centered header, very simple typography.
 * Focuses on content without visual distractions.
 */

export function MinimalistTemplate({ data, themeColor, className }: TemplateProps) {
  const colors = getThemeColors(themeColor);
  const { t } = useT();

  return (
    <A4PageWrapper className={className}>
      <div style={{
        backgroundColor: "#ffffff",
        padding: `${spaced(48)} ${spaced(56)}`,
        minHeight: "100%",
        fontFamily: FONTS.clean.body,
      }}>
        {/* Header - Centered & Minimal */}
        <header style={{ textAlign: "center", marginBottom: spaced(36) }}>
          <h1 style={{
            fontSize: scaled(32),
            fontWeight: 300,
            color: "#111827",
            fontFamily: FONTS.clean.heading,
            letterSpacing: "-0.02em",
          }}>
            {formatName(data.name)}
          </h1>
          {data.title && (
            <p style={{ fontSize: scaled(12), color: "#6b7280", marginTop: spaced(8), letterSpacing: "0.1em", textTransform: "uppercase" }}>
              {formatJobTitle(data.title)}
            </p>
          )}
          
          {/* Contact - Simple line */}
          <div style={{ marginTop: spaced(16), fontSize: scaled(10), color: "#9ca3af" }}>
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
            margin: `${spaced(24)} auto 0`,
          }} />
        </header>

        {/* Summary */}
        {hasContent(data.summary) && (
          <section style={{ marginBottom: spaced(32), maxWidth: "480px", margin: `0 auto ${spaced(32)}` }}>
            <p style={{
              fontSize: scaled(11),
              color: "#4b5563",
              lineHeight: leading(1.8),
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
          <MinimalSection title={t("Skills")} color={colors.primary}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: spaced(8), justifyContent: "center" }}>
              {data.skills.filter(hasContent).map((skill, idx) => (
                <span key={idx} style={{
                  fontSize: scaled(10),
                  color: "#374151",
                  padding: `${spaced(4)} ${spaced(12)}`,
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
          <MinimalSection title={t("Languages")} color={colors.primary}>
            <div style={{ textAlign: "center", fontSize: scaled(10), color: "#6b7280" }}>
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
    <section style={{ marginBottom: spaced(28) }}>
      <h2 style={{
        fontSize: scaled(10),
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.15em",
        color: "#9ca3af",
        marginBottom: spaced(16),
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
    <div className="cv-item" style={{ marginBottom: spaced(20) }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div>
          <h3 style={{ fontSize: scaled(12), fontWeight: 600, color: "#111827" }}>
            {formatJobTitle(item.title || "")}
          </h3>
          {item.subtitle && (
            <p style={{ fontSize: scaled(11), color: "#6b7280", marginTop: spaced(2) }}>
              {item.subtitle}
            </p>
          )}
        </div>
        {item.date && (
          <span style={{ fontSize: scaled(10), color: "#9ca3af", textAlign: "right", whiteSpace: "nowrap" }}>
            {item.date}
          </span>
        )}
      </div>

      {item.description && (
        <p style={{ fontSize: scaled(10), color: "#6b7280", marginTop: spaced(8), lineHeight: leading(1.7) }}>
          {item.description}
        </p>
      )}

      {item.bullets && item.bullets.length > 0 && (
        <ul style={{ marginTop: spaced(8), paddingLeft: spaced(16) }}>
          {item.bullets.filter(hasContent).map((bullet, idx) => (
            <li key={idx} style={{ fontSize: scaled(10), color: "#4b5563", lineHeight: leading(1.6), marginBottom: spaced(3) }}>
              {formatBulletPoint(bullet)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
