"use client";

import React from "react";
import { A4PageWrapper } from "../A4PageWrapper";
import { getThemeColors, FONTS } from "../ThemeEngine";
import { TemplateProps } from "./TemplateProps";
import { formatName, formatJobTitle, formatBulletPoint, hasContent } from "@/utils/formatting";

/**
 * Template 9: Timeline
 *
 * Single column with a vertical timeline rail down the experience — each role
 * marked by an accent dot on the line. Reads as a clean career story.
 */
export function TimelineTemplate({ data, themeColor, className }: TemplateProps) {
  const colors = getThemeColors(themeColor);

  return (
    <A4PageWrapper className={className}>
      <div style={{ backgroundColor: "#ffffff", padding: "44px 52px", minHeight: "100%", fontFamily: FONTS.sans.body, color: "#1f2937" }}>
        {/* Header */}
        <header style={{ borderBottom: `2px solid ${colors.primary}`, paddingBottom: "16px", marginBottom: "22px" }}>
          <h1 style={{ fontSize: "30px", fontWeight: 700, color: "#111827", fontFamily: FONTS.sans.heading, letterSpacing: "-0.01em" }}>
            {formatName(data.name)}
          </h1>
          {data.title && (
            <p style={{ fontSize: "12px", color: colors.primary, marginTop: "4px", letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 600 }}>
              {formatJobTitle(data.title)}
            </p>
          )}
          <div style={{ marginTop: "12px", fontSize: "10px", color: "#6b7280" }}>
            {[data.contact.email, data.contact.phone, data.contact.location, data.contact.linkedin, data.contact.website]
              .filter(hasContent)
              .join("  ·  ")}
          </div>
        </header>

        {hasContent(data.summary) && (
          <p style={{ fontSize: "11px", color: "#4b5563", lineHeight: 1.7, marginBottom: "24px" }}>{data.summary}</p>
        )}

        {data.sections.map((section) => (
          <section key={section.id} style={{ marginBottom: "22px" }}>
            <h2 style={sectionHeading(colors.primary)}>{section.title}</h2>
            <div style={{ borderLeft: `2px solid ${colors.light}`, marginLeft: "4px", paddingLeft: "22px" }}>
              {section.items.map((item) => (
                <div key={item.id} style={{ position: "relative", marginBottom: "16px" }}>
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
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "12px" }}>
                    <h3 style={{ fontSize: "12.5px", fontWeight: 700, color: "#111827" }}>{formatJobTitle(item.title || "")}</h3>
                    {item.date && <span style={{ fontSize: "9.5px", color: "#9ca3af", whiteSpace: "nowrap" }}>{item.date}</span>}
                  </div>
                  {(item.subtitle || item.location) && (
                    <p style={{ fontSize: "10.5px", color: colors.dark, fontWeight: 600, marginTop: "1px" }}>
                      {[item.subtitle, item.location].filter(hasContent).join(" · ")}
                    </p>
                  )}
                  {item.description && (
                    <p style={{ fontSize: "10px", color: "#6b7280", marginTop: "5px", lineHeight: 1.6 }}>{item.description}</p>
                  )}
                  {item.bullets && item.bullets.length > 0 && (
                    <ul style={{ marginTop: "5px", paddingLeft: "15px" }}>
                      {item.bullets.filter(hasContent).map((b, i) => (
                        <li key={i} style={{ fontSize: "10px", color: "#4b5563", lineHeight: 1.55, marginBottom: "2px" }}>
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
          <section style={{ marginBottom: "18px" }}>
            <h2 style={sectionHeading(colors.primary)}>Skills</h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {data.skills.filter(hasContent).map((s, i) => (
                <span key={i} style={{ fontSize: "9.5px", color: colors.dark, padding: "3px 10px", borderRadius: "4px", backgroundColor: colors.light }}>
                  {s}
                </span>
              ))}
            </div>
          </section>
        )}

        {data.languages && data.languages.length > 0 && (
          <section>
            <h2 style={sectionHeading(colors.primary)}>Languages</h2>
            <p style={{ fontSize: "10px", color: "#4b5563" }}>{data.languages.filter(hasContent).join("  ·  ")}</p>
          </section>
        )}
      </div>
    </A4PageWrapper>
  );
}

function sectionHeading(color: string): React.CSSProperties {
  return {
    fontSize: "10px",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.16em",
    color,
    marginBottom: "12px",
  };
}
