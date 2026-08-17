"use client";

import React from "react";
import { A4PageWrapper } from "../A4PageWrapper";
import { getThemeColors, FONTS } from "../ThemeEngine";
import { TemplateProps } from "./TemplateProps";
import { formatName, formatJobTitle, formatBulletPoint, hasContent } from "@/utils/formatting";
import { useT } from "@/lib/i18n/LanguageProvider";
import { scaled, spaced, leading } from "@/lib/builder/density";

/**
 * Ledger
 *
 * Editorial serif with a left meta column: dates and locations sit in a quiet
 * rail to the left, content to the right, separated by a hairline — like a
 * well-set ledger. Conservative and elegant for finance / law / consulting.
 */
export function LedgerTemplate({ data, themeColor, className }: TemplateProps) {
  const { t } = useT();
  const colors = getThemeColors(themeColor);

  return (
    <A4PageWrapper className={className}>
      <div style={{ minHeight: "100%", backgroundColor: "#ffffff", fontFamily: FONTS.serif.body, padding: `${spaced(30)} ${spaced(34)}` }}>
        {/* Header */}
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: spaced(16), paddingBottom: spaced(10), borderBottom: `3px double ${colors.dark}` }}>
          <div>
            <h1 style={{ fontSize: scaled(26), fontWeight: 700, color: "#1c1917", fontFamily: FONTS.serif.heading, lineHeight: leading(1.05) }}>
              {formatName(data.name)}
            </h1>
            {hasContent(data.title) && (
              <p style={{ fontSize: scaled(11.5), fontStyle: "italic", color: colors.dark, marginTop: spaced(3) }}>{formatJobTitle(data.title!)}</p>
            )}
          </div>
          <div style={{ textAlign: "right", fontSize: scaled(8.5), color: "#57534e", lineHeight: leading(1.6), flexShrink: 0 }}>
            {hasContent(data.contact.email) && <div>{data.contact.email}</div>}
            {hasContent(data.contact.phone) && <div>{data.contact.phone}</div>}
            {hasContent(data.contact.location) && <div>{data.contact.location}</div>}
            {hasContent(data.contact.linkedin) && <div>{data.contact.linkedin!.replace(/^https?:\/\//, "")}</div>}
          </div>
        </header>

        {hasContent(data.summary) && (
          <LedgerRow meta={null} colors={colors}>
            <p style={{ fontSize: scaled(9.5), color: "#292524", lineHeight: leading(1.55), textAlign: "justify", paddingTop: spaced(12) }}>{data.summary}</p>
          </LedgerRow>
        )}

        {data.sections.map((section) => (
          <section key={section.id} style={{ marginTop: spaced(14) }}>
            <h2 style={{ fontSize: scaled(11), fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", color: colors.dark, fontFamily: FONTS.serif.heading, marginBottom: spaced(8) }}>
              {section.title}
            </h2>
            {section.items.map((item) => (
              <LedgerRow
                key={item.id}
                colors={colors}
                meta={
                  <>
                    {item.date && <div style={{ fontSize: scaled(8.5), fontWeight: 700, color: "#1c1917" }}>{item.date}</div>}
                    {item.location && <div style={{ fontSize: scaled(8), fontStyle: "italic", color: "#78716c", marginTop: spaced(2) }}>{item.location}</div>}
                  </>
                }
              >
                <h3 style={{ fontSize: scaled(10.5), fontWeight: 700, color: "#1c1917", fontFamily: FONTS.serif.heading }}>{formatJobTitle(item.title || "")}</h3>
                {item.subtitle && <p style={{ fontSize: scaled(9.5), fontStyle: "italic", color: "#57534e", marginTop: spaced(1) }}>{item.subtitle}</p>}
                {item.description && <p style={{ fontSize: scaled(9), color: "#292524", marginTop: spaced(3), lineHeight: leading(1.45) }}>{item.description}</p>}
                {item.bullets && item.bullets.length > 0 && (
                  <ul style={{ marginTop: spaced(3), paddingLeft: spaced(13), marginBottom: 0 }}>
                    {item.bullets.filter(hasContent).map((b, i) => (
                      <li key={i} style={{ fontSize: scaled(9), color: "#292524", lineHeight: leading(1.45), marginBottom: spaced(2) }}>{formatBulletPoint(b)}</li>
                    ))}
                  </ul>
                )}
              </LedgerRow>
            ))}
          </section>
        ))}

        {data.skills && data.skills.length > 0 && (
          <section style={{ marginTop: spaced(14) }}>
            <h2 style={{ fontSize: scaled(11), fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", color: colors.dark, fontFamily: FONTS.serif.heading, marginBottom: spaced(8) }}>{t("Skills")}</h2>
            <LedgerRow meta={null} colors={colors}>
              <p style={{ fontSize: scaled(9), color: "#292524", lineHeight: leading(1.5) }}>{data.skills.filter(hasContent).join("  ·  ")}</p>
            </LedgerRow>
          </section>
        )}

        {data.languages && data.languages.length > 0 && (
          <section style={{ marginTop: spaced(10) }}>
            <LedgerRow meta={<div style={{ fontSize: scaled(8.5), fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: colors.dark }}>{t("Languages")}</div>} colors={colors}>
              <p style={{ fontSize: scaled(9), color: "#292524", lineHeight: leading(1.5) }}>{data.languages.filter(hasContent).join("  ·  ")}</p>
            </LedgerRow>
          </section>
        )}
      </div>
    </A4PageWrapper>
  );
}

function LedgerRow({ meta, colors, children }: { meta: React.ReactNode; colors: { primary: string }; children: React.ReactNode }) {
  return (
    <div className="cv-item" style={{ display: "grid", gridTemplateColumns: "94px 1fr", gap: spaced(16), marginBottom: spaced(9), position: "relative" }}>
      <div style={{ textAlign: "right", paddingTop: spaced(1) }}>{meta}</div>
      <div style={{ borderLeft: `1px solid #e7e5e4`, paddingLeft: spaced(16) }}>{children}</div>
    </div>
  );
}
