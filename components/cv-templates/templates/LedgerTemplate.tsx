"use client";

import React from "react";
import { A4PageWrapper } from "../A4PageWrapper";
import { getThemeColors, FONTS } from "../ThemeEngine";
import { TemplateProps } from "./TemplateProps";
import { formatName, formatJobTitle, formatBulletPoint, hasContent } from "@/utils/formatting";
import { useT } from "@/lib/i18n/LanguageProvider";

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
      <div style={{ minHeight: "100%", backgroundColor: "#ffffff", fontFamily: FONTS.serif.body, padding: "30px 34px" }}>
        {/* Header */}
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "16px", paddingBottom: "10px", borderBottom: `3px double ${colors.dark}` }}>
          <div>
            <h1 style={{ fontSize: "26px", fontWeight: 700, color: "#1c1917", fontFamily: FONTS.serif.heading, lineHeight: 1.05 }}>
              {formatName(data.name)}
            </h1>
            {hasContent(data.title) && (
              <p style={{ fontSize: "11.5px", fontStyle: "italic", color: colors.dark, marginTop: "3px" }}>{formatJobTitle(data.title!)}</p>
            )}
          </div>
          <div style={{ textAlign: "right", fontSize: "8.5px", color: "#57534e", lineHeight: 1.6, flexShrink: 0 }}>
            {hasContent(data.contact.email) && <div>{data.contact.email}</div>}
            {hasContent(data.contact.phone) && <div>{data.contact.phone}</div>}
            {hasContent(data.contact.location) && <div>{data.contact.location}</div>}
            {hasContent(data.contact.linkedin) && <div>{data.contact.linkedin!.replace(/^https?:\/\//, "")}</div>}
          </div>
        </header>

        {hasContent(data.summary) && (
          <LedgerRow meta={null} colors={colors}>
            <p style={{ fontSize: "9.5px", color: "#292524", lineHeight: 1.55, textAlign: "justify", paddingTop: "12px" }}>{data.summary}</p>
          </LedgerRow>
        )}

        {data.sections.map((section) => (
          <section key={section.id} style={{ marginTop: "14px" }}>
            <h2 style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", color: colors.dark, fontFamily: FONTS.serif.heading, marginBottom: "8px" }}>
              {section.title}
            </h2>
            {section.items.map((item) => (
              <LedgerRow
                key={item.id}
                colors={colors}
                meta={
                  <>
                    {item.date && <div style={{ fontSize: "8.5px", fontWeight: 700, color: "#1c1917" }}>{item.date}</div>}
                    {item.location && <div style={{ fontSize: "8px", fontStyle: "italic", color: "#78716c", marginTop: "2px" }}>{item.location}</div>}
                  </>
                }
              >
                <h3 style={{ fontSize: "10.5px", fontWeight: 700, color: "#1c1917", fontFamily: FONTS.serif.heading }}>{formatJobTitle(item.title || "")}</h3>
                {item.subtitle && <p style={{ fontSize: "9.5px", fontStyle: "italic", color: "#57534e", marginTop: "1px" }}>{item.subtitle}</p>}
                {item.description && <p style={{ fontSize: "9px", color: "#292524", marginTop: "3px", lineHeight: 1.45 }}>{item.description}</p>}
                {item.bullets && item.bullets.length > 0 && (
                  <ul style={{ marginTop: "3px", paddingLeft: "13px", marginBottom: 0 }}>
                    {item.bullets.filter(hasContent).map((b, i) => (
                      <li key={i} style={{ fontSize: "9px", color: "#292524", lineHeight: 1.45, marginBottom: "2px" }}>{formatBulletPoint(b)}</li>
                    ))}
                  </ul>
                )}
              </LedgerRow>
            ))}
          </section>
        ))}

        {data.skills && data.skills.length > 0 && (
          <section style={{ marginTop: "14px" }}>
            <h2 style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", color: colors.dark, fontFamily: FONTS.serif.heading, marginBottom: "8px" }}>{t("Skills")}</h2>
            <LedgerRow meta={null} colors={colors}>
              <p style={{ fontSize: "9px", color: "#292524", lineHeight: 1.5 }}>{data.skills.filter(hasContent).join("  ·  ")}</p>
            </LedgerRow>
          </section>
        )}

        {data.languages && data.languages.length > 0 && (
          <section style={{ marginTop: "10px" }}>
            <LedgerRow meta={<div style={{ fontSize: "8.5px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: colors.dark }}>{t("Languages")}</div>} colors={colors}>
              <p style={{ fontSize: "9px", color: "#292524", lineHeight: 1.5 }}>{data.languages.filter(hasContent).join("  ·  ")}</p>
            </LedgerRow>
          </section>
        )}
      </div>
    </A4PageWrapper>
  );
}

function LedgerRow({ meta, colors, children }: { meta: React.ReactNode; colors: { primary: string }; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "94px 1fr", gap: "16px", marginBottom: "9px", position: "relative" }}>
      <div style={{ textAlign: "right", paddingTop: "1px" }}>{meta}</div>
      <div style={{ borderLeft: `1px solid #e7e5e4`, paddingLeft: "16px" }}>{children}</div>
    </div>
  );
}
