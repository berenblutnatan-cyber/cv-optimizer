"use client";

import React from "react";
import { A4PageWrapper } from "../A4PageWrapper";
import { getThemeColors, FONTS } from "../ThemeEngine";
import { TemplateProps } from "./TemplateProps";
import { formatName, formatJobTitle, formatBulletPoint, hasContent } from "@/utils/formatting";

/**
 * Template 13: Banner
 *
 * A bold, full-bleed accent banner header with the name in white, then a clean
 * single column. Colorful and confident — stands out for marketing, sales and
 * brand roles where personality helps.
 */
export function BannerTemplate({ data, themeColor, className }: TemplateProps) {
  const colors = getThemeColors(themeColor);

  return (
    <A4PageWrapper className={className}>
      <div style={{ backgroundColor: "#ffffff", minHeight: "100%", fontFamily: FONTS.sans.body, color: "#1f2937" }}>
        {/* Banner */}
        <header
          style={{
            background: `linear-gradient(120deg, ${colors.dark} 0%, ${colors.primary} 100%)`,
            color: "#ffffff",
            padding: "34px 48px 26px",
          }}
        >
          <h1 style={{ fontSize: "32px", fontWeight: 800, fontFamily: FONTS.sans.heading, letterSpacing: "-0.01em" }}>
            {formatName(data.name)}
          </h1>
          {data.title && (
            <p style={{ fontSize: "13px", marginTop: "4px", fontWeight: 500, letterSpacing: "0.06em", color: "rgba(255,255,255,0.9)" }}>
              {formatJobTitle(data.title)}
            </p>
          )}
          <div style={{ marginTop: "12px", fontSize: "10px", color: "rgba(255,255,255,0.85)" }}>
            {[data.contact.email, data.contact.phone, data.contact.location, data.contact.linkedin, data.contact.website, data.contact.github]
              .filter(hasContent)
              .join("   ·   ")}
          </div>
        </header>

        <div style={{ padding: "24px 48px 40px" }}>
          {hasContent(data.summary) && (
            <section style={{ marginBottom: "18px" }}>
              <Heading color={colors.primary}>Summary</Heading>
              <p style={{ fontSize: "10.5px", color: "#4b5563", lineHeight: 1.65 }}>{data.summary}</p>
            </section>
          )}

          {data.sections.map((section) => (
            <section key={section.id} style={{ marginBottom: "16px" }}>
              <Heading color={colors.primary}>{section.title}</Heading>
              {section.items.map((item) => (
                <div key={item.id} style={{ marginBottom: "11px", paddingLeft: "12px", borderLeft: `2px solid ${colors.light}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "10px" }}>
                    <h3 style={{ fontSize: "12px", fontWeight: 700, color: "#111827" }}>{formatJobTitle(item.title || "")}</h3>
                    {item.date && <span style={{ fontSize: "9px", color: "#9ca3af", whiteSpace: "nowrap" }}>{item.date}</span>}
                  </div>
                  {(item.subtitle || item.location) && (
                    <p style={{ fontSize: "10px", color: colors.dark, fontWeight: 600, marginTop: "1px" }}>
                      {[item.subtitle, item.location].filter(hasContent).join(" · ")}
                    </p>
                  )}
                  {item.bullets && item.bullets.length > 0 && (
                    <ul style={{ marginTop: "4px", paddingLeft: "15px" }}>
                      {item.bullets.filter(hasContent).map((b, i) => (
                        <li key={i} style={{ fontSize: "9.5px", color: "#4b5563", lineHeight: 1.5, marginBottom: "2px" }}>{formatBulletPoint(b)}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </section>
          ))}

          {data.skills && data.skills.length > 0 && (
            <section style={{ marginBottom: "16px" }}>
              <Heading color={colors.primary}>Skills</Heading>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {data.skills.filter(hasContent).map((s, i) => (
                  <span key={i} style={{ fontSize: "9.5px", color: "#ffffff", backgroundColor: colors.primary, padding: "3px 10px", borderRadius: "12px" }}>
                    {s}
                  </span>
                ))}
              </div>
            </section>
          )}

          {data.languages && data.languages.length > 0 && (
            <section>
              <Heading color={colors.primary}>Languages</Heading>
              <p style={{ fontSize: "10px", color: "#4b5563" }}>{data.languages.filter(hasContent).join("   ·   ")}</p>
            </section>
          )}
        </div>
      </div>
    </A4PageWrapper>
  );
}

function Heading({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <h2 style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", color, marginBottom: "8px" }}>{children}</h2>
  );
}
