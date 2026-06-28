"use client";

import React from "react";
import { A4PageWrapper } from "../A4PageWrapper";
import { getThemeColors, FONTS } from "../ThemeEngine";
import { TemplateProps } from "./TemplateProps";
import { formatName, formatJobTitle, formatBulletPoint, hasContent } from "@/utils/formatting";
import { useT } from "@/lib/i18n/LanguageProvider";

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
      <div style={{ minHeight: "100%", backgroundColor: "#ffffff", fontFamily: FONTS.clean.body, padding: "34px 44px" }}>
        {/* Centered header */}
        <header style={{ textAlign: "center", marginBottom: "8px" }}>
          <h1 style={{
            fontSize: "26px",
            fontWeight: 700,
            color: "#18181b",
            fontFamily: FONTS.clean.heading,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
          }}>
            {formatName(data.name)}
          </h1>
          {hasContent(data.title) && (
            <p style={{ fontSize: "11px", color: colors.primary, marginTop: "5px", letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 600 }}>
              {formatJobTitle(data.title!)}
            </p>
          )}
          <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "3px 10px", marginTop: "9px", fontSize: "9px", color: "#52525b" }}>
            {contacts.map((c, i) => (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: "10px" }}>
                {i > 0 && <span style={{ color: "#d4d4d8" }}>|</span>}
                {c}
              </span>
            ))}
          </div>
        </header>

        <div style={{ height: "1px", backgroundColor: "#e4e4e7", margin: "14px 0 18px" }} />

        {hasContent(data.summary) && (
          <SpotlightSection title={t("Summary")} colors={colors}>
            <p style={{ fontSize: "9.5px", color: "#3f3f46", lineHeight: 1.6, textAlign: "center", maxWidth: "560px", margin: "0 auto" }}>{data.summary}</p>
          </SpotlightSection>
        )}

        {data.sections.map((section) => (
          <SpotlightSection key={section.id} title={section.title} colors={colors}>
            {section.items.map((item) => (
              <div key={item.id} style={{ marginBottom: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "8px" }}>
                  <h3 style={{ fontSize: "10.5px", fontWeight: 700, color: "#18181b" }}>{formatJobTitle(item.title || "")}</h3>
                  {item.date && <span style={{ fontSize: "8.5px", color: "#71717a", whiteSpace: "nowrap" }}>{item.date}</span>}
                </div>
                {(item.subtitle || item.location) && (
                  <p style={{ fontSize: "9px", fontStyle: "italic", color: "#52525b", marginTop: "1px" }}>
                    {[item.subtitle, item.location].filter(Boolean).join(", ")}
                  </p>
                )}
                {item.bullets && item.bullets.length > 0 && (
                  <ul style={{ marginTop: "4px", paddingLeft: "15px", marginBottom: 0 }}>
                    {item.bullets.filter(hasContent).map((b, i) => (
                      <li key={i} style={{ fontSize: "9px", color: "#3f3f46", lineHeight: 1.5, marginBottom: "2px" }}>{formatBulletPoint(b)}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </SpotlightSection>
        ))}

        {data.skills && data.skills.length > 0 && (
          <SpotlightSection title={t("Skills")} colors={colors}>
            <p style={{ fontSize: "9px", color: "#3f3f46", textAlign: "center", lineHeight: 1.6 }}>{data.skills.filter(hasContent).join("   ·   ")}</p>
          </SpotlightSection>
        )}

        {data.languages && data.languages.length > 0 && (
          <SpotlightSection title={t("Languages")} colors={colors}>
            <p style={{ fontSize: "9px", color: "#3f3f46", textAlign: "center" }}>{data.languages.filter(hasContent).join("   ·   ")}</p>
          </SpotlightSection>
        )}
      </div>
    </A4PageWrapper>
  );
}

function SpotlightSection({ title, colors, children }: { title: string; colors: { primary: string }; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: "15px" }}>
      <div style={{ textAlign: "center", marginBottom: "9px" }}>
        <h2 style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.22em", color: "#27272a" }}>{title}</h2>
        <div style={{ width: "28px", height: "2px", backgroundColor: colors.primary, margin: "5px auto 0", borderRadius: "1px" }} />
      </div>
      {children}
    </section>
  );
}
