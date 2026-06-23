"use client";

import React from "react";
import { A4PageWrapper } from "../A4PageWrapper";
import { getThemeColors, FONTS } from "../ThemeEngine";
import { TemplateProps } from "./TemplateProps";
import { formatName, formatJobTitle, formatBulletPoint, hasContent } from "@/utils/formatting";

/**
 * Aurora
 *
 * Bold & colorful, still print-safe: a full-height accent rail down the left
 * edge and a softly tinted header card. Single-column body keeps it ATS-legible
 * while the color does the talking. Great for PM / business / marketing.
 */
export function AuroraTemplate({ data, themeColor, className }: TemplateProps) {
  const colors = getThemeColors(themeColor);

  return (
    <A4PageWrapper className={className}>
      <div style={{ display: "flex", minHeight: "100%", backgroundColor: "#ffffff", fontFamily: FONTS.sans.body }}>
        {/* Accent rail */}
        <div style={{ width: "10px", flexShrink: 0, background: `linear-gradient(180deg, ${colors.primary} 0%, ${colors.dark} 100%)` }} />

        <div style={{ flex: 1, minWidth: 0, padding: "26px 30px" }}>
          {/* Header card */}
          <header
            style={{
              backgroundColor: colors.light,
              borderRadius: "8px",
              padding: "18px 20px",
              marginBottom: "16px",
            }}
          >
            <h1 style={{
              fontSize: "27px",
              fontWeight: 800,
              color: "#0f172a",
              fontFamily: FONTS.sans.heading,
              letterSpacing: "-0.01em",
              lineHeight: 1.05,
            }}>
              {formatName(data.name)}
            </h1>
            {hasContent(data.title) && (
              <p style={{ fontSize: "12px", fontWeight: 600, color: colors.dark, marginTop: "3px", letterSpacing: "0.02em" }}>
                {formatJobTitle(data.title!)}
              </p>
            )}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "5px 12px", marginTop: "9px", fontSize: "9px", color: "#475569" }}>
              {[
                hasContent(data.contact.email) && data.contact.email,
                hasContent(data.contact.phone) && data.contact.phone,
                hasContent(data.contact.location) && data.contact.location,
                hasContent(data.contact.linkedin) && data.contact.linkedin!.replace(/^https?:\/\//, ""),
                hasContent(data.contact.website) && data.contact.website!.replace(/^https?:\/\//, ""),
              ].filter(Boolean).map((v, i) => (
                <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ width: "4px", height: "4px", borderRadius: "50%", backgroundColor: colors.primary }} />
                  {v}
                </span>
              ))}
            </div>
          </header>

          {hasContent(data.summary) && (
            <AuroraSection title="Profile" colors={colors}>
              <p style={{ fontSize: "9.5px", color: "#374151", lineHeight: 1.5 }}>{data.summary}</p>
            </AuroraSection>
          )}

          {data.sections.map((section) => (
            <AuroraSection key={section.id} title={section.title} colors={colors}>
              {section.items.map((item) => (
                <div key={item.id} style={{ marginBottom: "9px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "8px" }}>
                    <h3 style={{ fontSize: "10.5px", fontWeight: 700, color: "#0f172a" }}>{formatJobTitle(item.title || "")}</h3>
                    {item.date && <span style={{ fontSize: "8.5px", fontWeight: 600, color: colors.dark, whiteSpace: "nowrap" }}>{item.date}</span>}
                  </div>
                  {(item.subtitle || item.location) && (
                    <p style={{ fontSize: "9px", color: "#64748b", marginTop: "1px" }}>
                      {[item.subtitle, item.location].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  {item.bullets && item.bullets.length > 0 && (
                    <ul style={{ marginTop: "4px", paddingLeft: "0", listStyle: "none" }}>
                      {item.bullets.filter(hasContent).map((b, i) => (
                        <li key={i} style={{ fontSize: "9px", color: "#374151", lineHeight: 1.45, marginBottom: "2px", paddingLeft: "12px", position: "relative" }}>
                          <span style={{ position: "absolute", left: 0, top: "5px", width: "4px", height: "4px", borderRadius: "1px", backgroundColor: colors.primary }} />
                          {formatBulletPoint(b)}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </AuroraSection>
          ))}

          {data.skills && data.skills.length > 0 && (
            <AuroraSection title="Skills" colors={colors}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                {data.skills.filter(hasContent).map((s, i) => (
                  <span key={i} style={{ fontSize: "8.5px", fontWeight: 600, color: colors.dark, backgroundColor: colors.light, padding: "3px 9px", borderRadius: "11px" }}>{s}</span>
                ))}
              </div>
            </AuroraSection>
          )}

          {data.languages && data.languages.length > 0 && (
            <AuroraSection title="Languages" colors={colors}>
              <p style={{ fontSize: "9px", color: "#374151" }}>{data.languages.filter(hasContent).join("  ·  ")}</p>
            </AuroraSection>
          )}
        </div>
      </div>
    </A4PageWrapper>
  );
}

function AuroraSection({ title, colors, children }: { title: string; colors: { primary: string; dark: string }; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: "13px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "7px" }}>
        <h2 style={{ fontSize: "10px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.12em", color: colors.primary, whiteSpace: "nowrap" }}>{title}</h2>
        <div style={{ flex: 1, height: "2px", borderRadius: "1px", backgroundColor: colors.primary, opacity: 0.25 }} />
      </div>
      {children}
    </section>
  );
}
