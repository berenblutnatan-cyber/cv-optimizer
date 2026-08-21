"use client";

import React from "react";
import { A4PageWrapper } from "../A4PageWrapper";
import { getThemeColors, FONTS } from "../ThemeEngine";
import { TemplateProps, ResumeSection, ResumeSectionItem } from "./TemplateProps";
import { formatName, formatJobTitle, formatBulletPoint, hasContent } from "@/utils/formatting";
import { useT } from "@/lib/i18n/LanguageProvider";
import { scaled, spaced, leading } from "@/lib/builder/density";

/**
 * Template 10: Double Column
 *
 * A full-width header over two balanced light columns — the wide left column
 * carries the narrative (summary + experience), the right rail carries the
 * scannable facts (skills, education, languages). No heavy sidebar.
 */
const SIDE_TYPES = new Set(["education", "certifications"]);

export function DoubleColumnTemplate({ data, themeColor, className }: TemplateProps) {
  const { t } = useT();
  const colors = getThemeColors(themeColor);
  const mainSections = data.sections.filter((s) => !SIDE_TYPES.has(s.type ?? ""));
  const sideSections = data.sections.filter((s) => SIDE_TYPES.has(s.type ?? ""));

  return (
    <A4PageWrapper className={className}>
      <div style={{ backgroundColor: "#ffffff", minHeight: "100%", fontFamily: FONTS.sans.body, color: "#1f2937" }}>
        {/* Full-width header */}
        <header style={{ padding: `${spaced(38)} ${spaced(48)} ${spaced(18)}`, borderBottom: `3px solid ${colors.primary}` }}>
          <h1 style={{ fontSize: scaled(32), fontWeight: 700, color: "#111827", fontFamily: FONTS.sans.heading, letterSpacing: "-0.01em" }}>
            {formatName(data.name)}
          </h1>
          {data.title && (
            <p style={{ fontSize: scaled(13), color: colors.dark, marginTop: spaced(3), fontWeight: 600, letterSpacing: "0.04em" }}>
              {formatJobTitle(data.title)}
            </p>
          )}
          <div style={{ marginTop: spaced(10), fontSize: scaled(10), color: "#6b7280" }}>
            {[data.contact.email, data.contact.phone, data.contact.location, data.contact.linkedin, data.contact.website]
              .filter(hasContent)
              .join("   ·   ")}
          </div>
        </header>

        {/* Two columns */}
        <div style={{ display: "flex", gap: spaced(26), padding: `${spaced(22)} ${spaced(48)} ${spaced(40)}` }}>
          {/* Left — narrative */}
          <div style={{ flex: "1 1 62%", minWidth: 0 }}>
            {hasContent(data.summary) && (
              <section style={{ marginBottom: spaced(20) }}>
                <h2 style={heading(colors.primary)}>{t("Summary")}</h2>
                <p style={{ fontSize: scaled(10.5), color: "#4b5563", lineHeight: leading(1.7) }}>{data.summary}</p>
              </section>
            )}
            {mainSections.map((s) => (
              <SectionBlock key={s.id} section={s} colors={colors} />
            ))}
          </div>

          {/* Right — facts */}
          <div style={{ flex: "1 1 38%", minWidth: 0, borderLeft: `1px solid ${colors.light}`, paddingLeft: spaced(24) }}>
            {data.skills && data.skills.length > 0 && (
              <section style={{ marginBottom: spaced(20) }}>
                <h2 style={heading(colors.primary)}>{t("Skills")}</h2>
                <div style={{ display: "flex", flexWrap: "wrap", gap: spaced(5) }}>
                  {data.skills.filter(hasContent).map((s, i) => (
                    <span key={i} style={{ fontSize: scaled(9), color: colors.dark, padding: `${spaced(3)} ${spaced(8)}`, borderRadius: "4px", backgroundColor: colors.light }}>
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
                <h2 style={heading(colors.primary)}>{t("Languages")}</h2>
                {data.languages.filter(hasContent).map((l, i) => (
                  <p key={i} style={{ fontSize: scaled(10), color: "#4b5563", marginBottom: spaced(3) }}>{l}</p>
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
    <section style={{ marginBottom: spaced(18) }}>
      <h2 style={heading(colors.primary)}>{section.title}</h2>
      {section.items.map((item) => (
        <Item key={item.id} item={item} dark={colors.dark} compact={compact} />
      ))}
    </section>
  );
}

function Item({ item, dark, compact }: { item: ResumeSectionItem; dark: string; compact?: boolean }) {
  return (
    <div className="cv-item" style={{ marginBottom: compact ? spaced(10) : spaced(13) }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: spaced(10) }}>
        <h3 style={{ fontSize: compact ? scaled(11) : scaled(12), fontWeight: 700, color: "#111827" }}>{formatJobTitle(item.title || "")}</h3>
        {item.date && <span style={{ fontSize: scaled(9), color: "#9ca3af", whiteSpace: "nowrap" }}>{item.date}</span>}
      </div>
      {(item.subtitle || item.location) && (
        <p style={{ fontSize: scaled(10), color: dark, fontWeight: 600, marginTop: spaced(1) }}>
          {[item.subtitle, item.location].filter(hasContent).join(" · ")}
        </p>
      )}
      {item.bullets && item.bullets.length > 0 && (
        <ul style={{ marginTop: spaced(4), paddingLeft: spaced(14) }}>
          {item.bullets.filter(hasContent).map((b, i) => (
            <li key={i} style={{ fontSize: scaled(9.5), color: "#4b5563", lineHeight: leading(1.5), marginBottom: spaced(2) }}>{formatBulletPoint(b)}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function heading(color: string): React.CSSProperties {
  return { fontSize: scaled(10), fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", color, marginBottom: spaced(9) };
}
