"use client";

import React from "react";
import { A4PageWrapper } from "../A4PageWrapper";
import { getThemeColors, FONTS } from "../ThemeEngine";
import { TemplateProps } from "./TemplateProps";
import { formatName, formatJobTitle, formatBulletPoint, hasContent } from "@/utils/formatting";

/**
 * Banner
 *
 * A full-width color banner reverses the name out in white, with the contact
 * row living inside the band. The body below stays a clean single column with
 * accent section rules. Confident and modern; still one-page A4 + ATS-readable.
 */
export function BannerTemplate({ data, themeColor, className }: TemplateProps) {
  const colors = getThemeColors(themeColor);

  return (
    <A4PageWrapper className={className}>
      <div style={{ minHeight: "100%", backgroundColor: "#ffffff", fontFamily: FONTS.sans.body }}>
        {/* Banner */}
        <header
          style={{
            background: `linear-gradient(110deg, ${colors.dark} 0%, ${colors.primary} 100%)`,
            padding: "26px 34px 22px",
            color: "#ffffff",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* geometric accent */}
          <div style={{ position: "absolute", right: "-40px", top: "-40px", width: "160px", height: "160px", borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
          <div style={{ position: "absolute", right: "30px", bottom: "-50px", width: "110px", height: "110px", borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />

          <h1 style={{ fontSize: "30px", fontWeight: 800, fontFamily: FONTS.sans.heading, letterSpacing: "-0.01em", lineHeight: 1.02, position: "relative" }}>
            {formatName(data.name)}
          </h1>
          {hasContent(data.title) && (
            <p style={{ fontSize: "12.5px", fontWeight: 500, color: "rgba(255,255,255,0.88)", marginTop: "4px", letterSpacing: "0.04em", position: "relative" }}>
              {formatJobTitle(data.title!)}
            </p>
          )}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px", marginTop: "12px", fontSize: "9px", color: "rgba(255,255,255,0.92)", position: "relative" }}>
            {[
              hasContent(data.contact.email) && data.contact.email,
              hasContent(data.contact.phone) && data.contact.phone,
              hasContent(data.contact.location) && data.contact.location,
              hasContent(data.contact.linkedin) && data.contact.linkedin!.replace(/^https?:\/\//, ""),
              hasContent(data.contact.github) && data.contact.github!.replace(/^https?:\/\//, ""),
            ].filter(Boolean).map((v, i) => (
              <span key={i}>{v}</span>
            ))}
          </div>
        </header>

        <div style={{ padding: "20px 34px" }}>
          {hasContent(data.summary) && (
            <BannerSection title="Summary" colors={colors}>
              <p style={{ fontSize: "9.5px", color: "#374151", lineHeight: 1.5 }}>{data.summary}</p>
            </BannerSection>
          )}

          {data.sections.map((section) => (
            <BannerSection key={section.id} title={section.title} colors={colors}>
              {section.items.map((item) => (
                <div key={item.id} style={{ marginBottom: "9px", paddingLeft: "11px", borderLeft: `2px solid ${colors.light}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "8px" }}>
                    <h3 style={{ fontSize: "10.5px", fontWeight: 700, color: "#111827" }}>{formatJobTitle(item.title || "")}</h3>
                    {item.date && <span style={{ fontSize: "8.5px", fontWeight: 600, color: colors.dark, whiteSpace: "nowrap" }}>{item.date}</span>}
                  </div>
                  {(item.subtitle || item.location) && (
                    <p style={{ fontSize: "9px", fontWeight: 600, color: colors.primary, marginTop: "1px" }}>
                      {[item.subtitle, item.location].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  {item.bullets && item.bullets.length > 0 && (
                    <ul style={{ marginTop: "4px", paddingLeft: "14px", marginBottom: 0 }}>
                      {item.bullets.filter(hasContent).map((b, i) => (
                        <li key={i} style={{ fontSize: "9px", color: "#374151", lineHeight: 1.45, marginBottom: "2px" }}>{formatBulletPoint(b)}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </BannerSection>
          ))}

          {data.skills && data.skills.length > 0 && (
            <BannerSection title="Skills" colors={colors}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                {data.skills.filter(hasContent).map((s, i) => (
                  <span key={i} style={{ fontSize: "8.5px", fontWeight: 600, color: "#ffffff", backgroundColor: colors.primary, padding: "3px 9px", borderRadius: "4px" }}>{s}</span>
                ))}
              </div>
            </BannerSection>
          )}

          {data.languages && data.languages.length > 0 && (
            <BannerSection title="Languages" colors={colors}>
              <p style={{ fontSize: "9px", color: "#374151" }}>{data.languages.filter(hasContent).join("  ·  ")}</p>
            </BannerSection>
          )}
        </div>
      </div>
    </A4PageWrapper>
  );
}

function BannerSection({ title, colors, children }: { title: string; colors: { primary: string; dark: string }; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: "13px" }}>
      <h2 style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: colors.dark, marginBottom: "7px", paddingBottom: "3px", borderBottom: `2px solid ${colors.primary}` }}>
        {title}
      </h2>
      {children}
    </section>
  );
}
