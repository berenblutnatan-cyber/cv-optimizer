"use client";

import React from "react";
import { A4PageWrapper } from "../A4PageWrapper";
import { getThemeColors, FONTS } from "../ThemeEngine";
import { TemplateProps } from "./TemplateProps";
import { formatName, formatJobTitle, formatBulletPoint, hasContent } from "@/utils/formatting";
import { useT } from "@/lib/i18n/LanguageProvider";
import { scaled, spaced, leading } from "@/lib/builder/density";

/**
 * Template 11: Compact
 *
 * A dense, ATS-friendly single column with a thin accent top bar and underlined
 * section rules. Small type and tight spacing fit more onto one page — built
 * for senior candidates with a lot to say.
 */
export function CompactTemplate({ data, themeColor, className }: TemplateProps) {
  const { t } = useT();
  const colors = getThemeColors(themeColor);

  return (
    <A4PageWrapper className={className}>
      <div style={{ backgroundColor: "#ffffff", minHeight: "100%", fontFamily: FONTS.sans.body, color: "#1f2937" }}>
        <div style={{ height: "5px", backgroundColor: colors.primary }} />
        <div style={{ padding: `${spaced(26)} ${spaced(46)} ${spaced(40)}` }}>
          {/* Header */}
          <header style={{ marginBottom: spaced(16) }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: spaced(16), flexWrap: "wrap" }}>
              <h1 style={{ fontSize: scaled(26), fontWeight: 800, color: "#111827", fontFamily: FONTS.sans.heading, letterSpacing: "-0.01em" }}>
                {formatName(data.name)}
              </h1>
              {data.title && (
                <p style={{ fontSize: scaled(11), color: colors.dark, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  {formatJobTitle(data.title)}
                </p>
              )}
            </div>
            <div style={{ marginTop: spaced(7), fontSize: scaled(9.5), color: "#6b7280" }}>
              {[data.contact.email, data.contact.phone, data.contact.location, data.contact.linkedin, data.contact.website, data.contact.github]
                .filter(hasContent)
                .join("   |   ")}
            </div>
          </header>

          {hasContent(data.summary) && (
            <Section title={t("Summary")} color={colors.primary} light={colors.light}>
              <p style={{ fontSize: scaled(9.5), color: "#4b5563", lineHeight: leading(1.55) }}>{data.summary}</p>
            </Section>
          )}

          {data.sections.map((section) => (
            <Section key={section.id} title={section.title} color={colors.primary} light={colors.light}>
              {section.items.map((item) => (
                <div key={item.id} className="cv-item" style={{ marginBottom: spaced(8) }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: spaced(10) }}>
                    <span style={{ fontSize: scaled(10.5), fontWeight: 700, color: "#111827" }}>
                      {formatJobTitle(item.title || "")}
                      {item.subtitle ? <span style={{ fontWeight: 600, color: colors.dark }}>{`  —  ${item.subtitle}`}</span> : null}
                    </span>
                    {item.date && <span style={{ fontSize: scaled(9), color: "#9ca3af", whiteSpace: "nowrap" }}>{item.date}</span>}
                  </div>
                  {item.location && <p style={{ fontSize: scaled(9), color: "#9ca3af", marginTop: spaced(1) }}>{item.location}</p>}
                  {item.bullets && item.bullets.length > 0 && (
                    <ul style={{ marginTop: spaced(3), paddingLeft: spaced(14) }}>
                      {item.bullets.filter(hasContent).map((b, i) => (
                        <li key={i} style={{ fontSize: scaled(9.5), color: "#4b5563", lineHeight: leading(1.45), marginBottom: spaced(1) }}>
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
            <Section title={t("Skills")} color={colors.primary} light={colors.light}>
              <p style={{ fontSize: scaled(9.5), color: "#374151", lineHeight: leading(1.6) }}>{data.skills.filter(hasContent).join("  ·  ")}</p>
            </Section>
          )}

          {data.languages && data.languages.length > 0 && (
            <Section title={t("Languages")} color={colors.primary} light={colors.light}>
              <p style={{ fontSize: scaled(9.5), color: "#374151" }}>{data.languages.filter(hasContent).join("  ·  ")}</p>
            </Section>
          )}
        </div>
      </div>
    </A4PageWrapper>
  );
}

function Section({ title, color, light, children }: { title: string; color: string; light: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: spaced(12) }}>
      <h2
        style={{
          fontSize: scaled(10),
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          color,
          borderBottom: `1.5px solid ${light}`,
          paddingBottom: spaced(3),
          marginBottom: spaced(7),
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}
