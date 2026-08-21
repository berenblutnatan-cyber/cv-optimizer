"use client";

import React from "react";
import { A4PageWrapper } from "../A4PageWrapper";
import { getThemeColors, FONTS } from "../ThemeEngine";
import { TemplateProps } from "./TemplateProps";
import { formatName, formatJobTitle, formatBulletPoint, hasContent } from "@/utils/formatting";
import { useT } from "@/lib/i18n/LanguageProvider";
import { scaled, spaced, leading } from "@/lib/builder/density";

/**
 * Template 9: Timeline
 *
 * Single column with a vertical timeline rail down the experience — each role
 * marked by an accent dot on the line. Reads as a clean career story.
 */
export function TimelineTemplate({ data, themeColor, className }: TemplateProps) {
  const { t } = useT();
  const colors = getThemeColors(themeColor);

  return (
    <A4PageWrapper className={className}>
      <div style={{ backgroundColor: "#ffffff", padding: `${spaced(44)} ${spaced(52)}`, minHeight: "100%", fontFamily: FONTS.sans.body, color: "#1f2937" }}>
        {/* Header */}
        <header style={{ borderBottom: `2px solid ${colors.primary}`, paddingBottom: spaced(16), marginBottom: spaced(22) }}>
          <h1 style={{ fontSize: scaled(30), fontWeight: 700, color: "#111827", fontFamily: FONTS.sans.heading, letterSpacing: "-0.01em" }}>
            {formatName(data.name)}
          </h1>
          {data.title && (
            <p style={{ fontSize: scaled(12), color: colors.primary, marginTop: spaced(4), letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 600 }}>
              {formatJobTitle(data.title)}
            </p>
          )}
          <div style={{ marginTop: spaced(12), fontSize: scaled(10), color: "#6b7280" }}>
            {[data.contact.email, data.contact.phone, data.contact.location, data.contact.linkedin, data.contact.website]
              .filter(hasContent)
              .join("  ·  ")}
          </div>
        </header>

        {hasContent(data.summary) && (
          <p style={{ fontSize: scaled(11), color: "#4b5563", lineHeight: leading(1.7), marginBottom: spaced(24) }}>{data.summary}</p>
        )}

        {data.sections.map((section) => (
          <section key={section.id} style={{ marginBottom: spaced(22) }}>
            <h2 style={sectionHeading(colors.primary)}>{section.title}</h2>
            <div style={{ borderLeft: `2px solid ${colors.light}`, marginLeft: spaced(4), paddingLeft: spaced(22) }}>
              {section.items.map((item) => (
                <div key={item.id} className="cv-item" style={{ position: "relative", marginBottom: spaced(16) }}>
                  {/* Timeline dot */}
                  <span
                    style={{
                      position: "absolute",
                      left: "-29px",
                      top: "3px",
                      width: "9px",
                      height: "9px",
                      borderRadius: "50%",
                      backgroundColor: colors.primary,
                      border: "2px solid #ffffff",
                      boxShadow: `0 0 0 1.5px ${colors.primary}`,
                    }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: spaced(12) }}>
                    <h3 style={{ fontSize: scaled(12.5), fontWeight: 700, color: "#111827" }}>{formatJobTitle(item.title || "")}</h3>
                    {item.date && <span style={{ fontSize: scaled(9.5), color: "#9ca3af", whiteSpace: "nowrap" }}>{item.date}</span>}
                  </div>
                  {(item.subtitle || item.location) && (
                    <p style={{ fontSize: scaled(10.5), color: colors.dark, fontWeight: 600, marginTop: spaced(1) }}>
                      {[item.subtitle, item.location].filter(hasContent).join(" · ")}
                    </p>
                  )}
                  {item.description && (
                    <p style={{ fontSize: scaled(10), color: "#6b7280", marginTop: spaced(5), lineHeight: leading(1.6) }}>{item.description}</p>
                  )}
                  {item.bullets && item.bullets.length > 0 && (
                    <ul style={{ marginTop: spaced(5), paddingLeft: spaced(15) }}>
                      {item.bullets.filter(hasContent).map((b, i) => (
                        <li key={i} style={{ fontSize: scaled(10), color: "#4b5563", lineHeight: leading(1.55), marginBottom: spaced(2) }}>
                          {formatBulletPoint(b)}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}

        {data.skills && data.skills.length > 0 && (
          <section style={{ marginBottom: spaced(18) }}>
            <h2 style={sectionHeading(colors.primary)}>{t("Skills")}</h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: spaced(6) }}>
              {data.skills.filter(hasContent).map((s, i) => (
                <span key={i} style={{ fontSize: scaled(9.5), color: colors.dark, padding: `${spaced(3)} ${spaced(10)}`, borderRadius: "4px", backgroundColor: colors.light }}>
                  {s}
                </span>
              ))}
            </div>
          </section>
        )}

        {data.languages && data.languages.length > 0 && (
          <section>
            <h2 style={sectionHeading(colors.primary)}>{t("Languages")}</h2>
            <p style={{ fontSize: scaled(10), color: "#4b5563" }}>{data.languages.filter(hasContent).join("  ·  ")}</p>
          </section>
        )}
      </div>
    </A4PageWrapper>
  );
}

function sectionHeading(color: string): React.CSSProperties {
  return {
    fontSize: scaled(10),
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.16em",
    color,
    marginBottom: spaced(12),
  };
}
