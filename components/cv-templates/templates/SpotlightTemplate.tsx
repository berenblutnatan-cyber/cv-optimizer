"use client";

import React from "react";
import { A4PageWrapper } from "../A4PageWrapper";
import { getThemeColors, FONTS } from "../ThemeEngine";
import { TemplateProps } from "./TemplateProps";
import { formatName, formatJobTitle, formatBulletPoint, hasContent } from "@/utils/formatting";
import { useT } from "@/lib/i18n/LanguageProvider";
import { scaled, spaced, leading } from "@/lib/builder/density";

/**
 * Spotlight
 *
 * Fresh but maximally ATS-safe: a centered header, hairline rules, and
 * small-caps section labels with a short accent underline. Lots of whitespace,
 * one clean column. The "default you'd actually be proud to send."
 */
export function SpotlightTemplate({ data, themeColor, className }: TemplateProps) {
  const { t } = useT();
  const colors = getThemeColors(themeColor);

  const contacts = [
    hasContent(data.contact.email) && data.contact.email,
    hasContent(data.contact.phone) && data.contact.phone,
    hasContent(data.contact.location) && data.contact.location,
    hasContent(data.contact.linkedin) && data.contact.linkedin!.replace(/^https?:\/\//, ""),
    hasContent(data.contact.website) && data.contact.website!.replace(/^https?:\/\//, ""),
  ].filter(Boolean) as string[];

  return (
    <A4PageWrapper className={className}>
      <div style={{ minHeight: "100%", backgroundColor: "#ffffff", fontFamily: FONTS.clean.body, padding: `${spaced(34)} ${spaced(44)}` }}>
        {/* Centered header */}
        <header style={{ textAlign: "center", marginBottom: spaced(8) }}>
          <h1 style={{
            fontSize: scaled(26),
            fontWeight: 700,
            color: "#18181b",
            fontFamily: FONTS.clean.heading,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
          }}>
            {formatName(data.name)}
          </h1>
          {hasContent(data.title) && (
            <p style={{ fontSize: scaled(11), color: colors.primary, marginTop: spaced(5), letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 600 }}>
              {formatJobTitle(data.title!)}
            </p>
          )}
          <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: `${spaced(3)} ${spaced(10)}`, marginTop: spaced(9), fontSize: scaled(9), color: "#52525b" }}>
            {contacts.map((c, i) => (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: spaced(10) }}>
                {i > 0 && <span style={{ color: "#d4d4d8" }}>|</span>}
                {c}
              </span>
            ))}
          </div>
        </header>

        <div style={{ height: "1px", backgroundColor: "#e4e4e7", margin: `${spaced(14)} 0 ${spaced(18)}` }} />

        {hasContent(data.summary) && (
          <SpotlightSection title={t("Summary")} colors={colors}>
            <p style={{ fontSize: scaled(9.5), color: "#3f3f46", lineHeight: leading(1.6), textAlign: "center", maxWidth: "560px", margin: "0 auto" }}>{data.summary}</p>
          </SpotlightSection>
        )}

        {data.sections.map((section) => (
          <SpotlightSection key={section.id} title={section.title} colors={colors}>
            {section.items.map((item) => (
              <div key={item.id} className="cv-item" style={{ marginBottom: spaced(10) }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: spaced(8) }}>
                  <h3 style={{ fontSize: scaled(10.5), fontWeight: 700, color: "#18181b" }}>{formatJobTitle(item.title || "")}</h3>
                  {item.date && <span style={{ fontSize: scaled(8.5), color: "#71717a", whiteSpace: "nowrap" }}>{item.date}</span>}
                </div>
                {(item.subtitle || item.location) && (
                  <p style={{ fontSize: scaled(9), fontStyle: "italic", color: "#52525b", marginTop: spaced(1) }}>
                    {[item.subtitle, item.location].filter(Boolean).join(", ")}
                  </p>
                )}
                {item.bullets && item.bullets.length > 0 && (
                  <ul style={{ marginTop: spaced(4), paddingLeft: spaced(15), marginBottom: 0 }}>
                    {item.bullets.filter(hasContent).map((b, i) => (
                      <li key={i} style={{ fontSize: scaled(9), color: "#3f3f46", lineHeight: leading(1.5), marginBottom: spaced(2) }}>{formatBulletPoint(b)}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </SpotlightSection>
        ))}

        {data.skills && data.skills.length > 0 && (
          <SpotlightSection title={t("Skills")} colors={colors}>
            <p style={{ fontSize: scaled(9), color: "#3f3f46", textAlign: "center", lineHeight: leading(1.6) }}>{data.skills.filter(hasContent).join("   ·   ")}</p>
          </SpotlightSection>
        )}

        {data.languages && data.languages.length > 0 && (
          <SpotlightSection title={t("Languages")} colors={colors}>
            <p style={{ fontSize: scaled(9), color: "#3f3f46", textAlign: "center" }}>{data.languages.filter(hasContent).join("   ·   ")}</p>
          </SpotlightSection>
        )}
      </div>
    </A4PageWrapper>
  );
}

function SpotlightSection({ title, colors, children }: { title: string; colors: { primary: string }; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: spaced(15) }}>
      <div style={{ textAlign: "center", marginBottom: spaced(9) }}>
        <h2 style={{ fontSize: scaled(10), fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.22em", color: "#27272a" }}>{title}</h2>
        <div style={{ width: "28px", height: "2px", backgroundColor: colors.primary, margin: `${spaced(5)} auto 0`, borderRadius: "1px" }} />
      </div>
      {children}
    </section>
  );
}
