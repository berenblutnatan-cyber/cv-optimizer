"use client";

import React from "react";
import { A4PageWrapper } from "../A4PageWrapper";
import { getThemeColors, FONTS } from "../ThemeEngine";
import { TemplateProps } from "./TemplateProps";
import { formatName, formatJobTitle, formatBulletPoint, hasContent } from "@/utils/formatting";

/**
 * Template 11: Compact
 *
 * A dense, ATS-friendly single column with a thin accent top bar and underlined
 * section rules. Small type and tight spacing fit more onto one page — built
 * for senior candidates with a lot to say.
 */
export function CompactTemplate({ data, themeColor, className }: TemplateProps) {
  const colors = getThemeColors(themeColor);

  return (
    <A4PageWrapper className={className}>
      <div style={{ backgroundColor: "#ffffff", minHeight: "100%", fontFamily: FONTS.sans.body, color: "#1f2937" }}>
        <div style={{ height: "5px", backgroundColor: colors.primary }} />
        <div style={{ padding: "26px 46px 40px" }}>
          {/* Header */}
          <header style={{ marginBottom: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "16px", flexWrap: "wrap" }}>
              <h1 style={{ fontSize: "26px", fontWeight: 800, color: "#111827", fontFamily: FONTS.sans.heading, letterSpacing: "-0.01em" }}>
                {formatName(data.name)}
              </h1>
              {data.title && (
                <p style={{ fontSize: "11px", color: colors.dark, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  {formatJobTitle(data.title)}
                </p>
              )}
            </div>
            <div style={{ marginTop: "7px", fontSize: "9.5px", color: "#6b7280" }}>
              {[data.contact.email, data.contact.phone, data.contact.location, data.contact.linkedin, data.contact.website, data.contact.github]
                .filter(hasContent)
                .join("   |   ")}
            </div>
          </header>

          {hasContent(data.summary) && (
            <Section title="Summary" color={colors.primary} light={colors.light}>
              <p style={{ fontSize: "9.5px", color: "#4b5563", lineHeight: 1.55 }}>{data.summary}</p>
            </Section>
          )}

          {data.sections.map((section) => (
            <Section key={section.id} title={section.title} color={colors.primary} light={colors.light}>
              {section.items.map((item) => (
                <div key={item.id} style={{ marginBottom: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "10px" }}>
                    <span style={{ fontSize: "10.5px", fontWeight: 700, color: "#111827" }}>
                      {formatJobTitle(item.title || "")}
                      {item.subtitle ? <span style={{ fontWeight: 600, color: colors.dark }}>{`  —  ${item.subtitle}`}</span> : null}
                    </span>
                    {item.date && <span style={{ fontSize: "9px", color: "#9ca3af", whiteSpace: "nowrap" }}>{item.date}</span>}
                  </div>
                  {item.location && <p style={{ fontSize: "9px", color: "#9ca3af", marginTop: "1px" }}>{item.location}</p>}
                  {item.bullets && item.bullets.length > 0 && (
                    <ul style={{ marginTop: "3px", paddingLeft: "14px" }}>
                      {item.bullets.filter(hasContent).map((b, i) => (
                        <li key={i} style={{ fontSize: "9.5px", color: "#4b5563", lineHeight: 1.45, marginBottom: "1px" }}>
                          {formatBulletPoint(b)}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </Section>
          ))}

          {data.skills && data.skills.length > 0 && (
            <Section title="Skills" color={colors.primary} light={colors.light}>
              <p style={{ fontSize: "9.5px", color: "#374151", lineHeight: 1.6 }}>{data.skills.filter(hasContent).join("  ·  ")}</p>
            </Section>
          )}

          {data.languages && data.languages.length > 0 && (
            <Section title="Languages" color={colors.primary} light={colors.light}>
              <p style={{ fontSize: "9.5px", color: "#374151" }}>{data.languages.filter(hasContent).join("  ·  ")}</p>
            </Section>
          )}
        </div>
      </div>
    </A4PageWrapper>
  );
}

function Section({ title, color, light, children }: { title: string; color: string; light: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: "12px" }}>
      <h2
        style={{
          fontSize: "10px",
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          color,
          borderBottom: `1.5px solid ${light}`,
          paddingBottom: "3px",
          marginBottom: "7px",
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}
