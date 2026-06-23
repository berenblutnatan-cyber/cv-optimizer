"use client";

import React from "react";
import { A4PageWrapper } from "../A4PageWrapper";
import { getThemeColors, FONTS } from "../ThemeEngine";
import { TemplateProps, ResumeSection, ResumeSectionItem } from "./TemplateProps";
import { formatName, formatJobTitle, formatBulletPoint, hasContent } from "@/utils/formatting";

/**
 * Template 10: Double Column
 *
 * A full-width header over two balanced light columns — the wide left column
 * carries the narrative (summary + experience), the right rail carries the
 * scannable facts (skills, education, languages). No heavy sidebar.
 */
const SIDE_TYPES = new Set(["education", "certifications"]);

export function DoubleColumnTemplate({ data, themeColor, className }: TemplateProps) {
  const colors = getThemeColors(themeColor);
  const mainSections = data.sections.filter((s) => !SIDE_TYPES.has(s.type ?? ""));
  const sideSections = data.sections.filter((s) => SIDE_TYPES.has(s.type ?? ""));

  return (
    <A4PageWrapper className={className}>
      <div style={{ backgroundColor: "#ffffff", minHeight: "100%", fontFamily: FONTS.sans.body, color: "#1f2937" }}>
        {/* Full-width header */}
        <header style={{ padding: "38px 48px 18px", borderBottom: `3px solid ${colors.primary}` }}>
          <h1 style={{ fontSize: "32px", fontWeight: 700, color: "#111827", fontFamily: FONTS.sans.heading, letterSpacing: "-0.01em" }}>
            {formatName(data.name)}
          </h1>
          {data.title && (
            <p style={{ fontSize: "13px", color: colors.dark, marginTop: "3px", fontWeight: 600, letterSpacing: "0.04em" }}>
              {formatJobTitle(data.title)}
            </p>
          )}
          <div style={{ marginTop: "10px", fontSize: "10px", color: "#6b7280" }}>
            {[data.contact.email, data.contact.phone, data.contact.location, data.contact.linkedin, data.contact.website]
              .filter(hasContent)
              .join("   ·   ")}
          </div>
        </header>

        {/* Two columns */}
        <div style={{ display: "flex", gap: "26px", padding: "22px 48px 40px" }}>
          {/* Left — narrative */}
          <div style={{ flex: "1 1 62%", minWidth: 0 }}>
            {hasContent(data.summary) && (
              <section style={{ marginBottom: "20px" }}>
                <h2 style={heading(colors.primary)}>Summary</h2>
                <p style={{ fontSize: "10.5px", color: "#4b5563", lineHeight: 1.7 }}>{data.summary}</p>
              </section>
            )}
            {mainSections.map((s) => (
              <SectionBlock key={s.id} section={s} colors={colors} />
            ))}
          </div>

          {/* Right — facts */}
          <div style={{ flex: "1 1 38%", minWidth: 0, borderLeft: `1px solid ${colors.light}`, paddingLeft: "24px" }}>
            {data.skills && data.skills.length > 0 && (
              <section style={{ marginBottom: "20px" }}>
                <h2 style={heading(colors.primary)}>Skills</h2>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                  {data.skills.filter(hasContent).map((s, i) => (
                    <span key={i} style={{ fontSize: "9px", color: colors.dark, padding: "3px 8px", borderRadius: "4px", backgroundColor: colors.light }}>
                      {s}
                    </span>
                  ))}
                </div>
              </section>
            )}
            {sideSections.map((s) => (
              <SectionBlock key={s.id} section={s} colors={colors} compact />
            ))}
            {data.languages && data.languages.length > 0 && (
              <section>
                <h2 style={heading(colors.primary)}>Languages</h2>
                {data.languages.filter(hasContent).map((l, i) => (
                  <p key={i} style={{ fontSize: "10px", color: "#4b5563", marginBottom: "3px" }}>{l}</p>
                ))}
              </section>
            )}
          </div>
        </div>
      </div>
    </A4PageWrapper>
  );
}

function SectionBlock({ section, colors, compact }: { section: ResumeSection; colors: { primary: string; dark: string; light: string }; compact?: boolean }) {
  return (
    <section style={{ marginBottom: "18px" }}>
      <h2 style={heading(colors.primary)}>{section.title}</h2>
      {section.items.map((item) => (
        <Item key={item.id} item={item} dark={colors.dark} compact={compact} />
      ))}
    </section>
  );
}

function Item({ item, dark, compact }: { item: ResumeSectionItem; dark: string; compact?: boolean }) {
  return (
    <div style={{ marginBottom: compact ? "10px" : "13px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "10px" }}>
        <h3 style={{ fontSize: compact ? "11px" : "12px", fontWeight: 700, color: "#111827" }}>{formatJobTitle(item.title || "")}</h3>
        {item.date && <span style={{ fontSize: "9px", color: "#9ca3af", whiteSpace: "nowrap" }}>{item.date}</span>}
      </div>
      {(item.subtitle || item.location) && (
        <p style={{ fontSize: "10px", color: dark, fontWeight: 600, marginTop: "1px" }}>
          {[item.subtitle, item.location].filter(hasContent).join(" · ")}
        </p>
      )}
      {item.bullets && item.bullets.length > 0 && (
        <ul style={{ marginTop: "4px", paddingLeft: "14px" }}>
          {item.bullets.filter(hasContent).map((b, i) => (
            <li key={i} style={{ fontSize: "9.5px", color: "#4b5563", lineHeight: 1.5, marginBottom: "2px" }}>{formatBulletPoint(b)}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function heading(color: string): React.CSSProperties {
  return { fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", color, marginBottom: "9px" };
}
