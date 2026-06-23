"use client";

import React from "react";
import { A4PageWrapper } from "../A4PageWrapper";
import { getThemeColors, FONTS } from "../ThemeEngine";
import { TemplateProps } from "./TemplateProps";
import { formatName, formatJobTitle, formatBulletPoint, hasContent } from "@/utils/formatting";

/**
 * Template 12: Photo Left
 *
 * A photo-forward two-column CV: a tinted left rail carries the headshot,
 * contact, skills and languages; the right column carries the story. Common
 * for international / EU-style resumes that expect a photo.
 */
export function PhotoLeftTemplate({ data, themeColor, className }: TemplateProps) {
  const colors = getThemeColors(themeColor);
  const initial = (data.name || "?").trim().charAt(0).toUpperCase();

  return (
    <A4PageWrapper className={className}>
      <div style={{ display: "flex", minHeight: "100%", fontFamily: FONTS.sans.body, color: "#1f2937", backgroundColor: "#ffffff" }}>
        {/* Left rail */}
        <aside style={{ width: "34%", backgroundColor: colors.light, padding: "34px 22px" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px" }}>
            {data.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.photo} alt={data.name} style={{ width: "104px", height: "104px", borderRadius: "50%", objectFit: "cover", border: `3px solid #ffffff` }} />
            ) : (
              <div style={{ width: "104px", height: "104px", borderRadius: "50%", backgroundColor: colors.primary, color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "40px", fontWeight: 700, fontFamily: FONTS.sans.heading }}>
                {initial}
              </div>
            )}
          </div>

          <RailHeading color={colors.dark}>Contact</RailHeading>
          <div style={{ fontSize: "9.5px", color: "#374151", lineHeight: 1.9, marginBottom: "18px", wordBreak: "break-word" }}>
            {[data.contact.email, data.contact.phone, data.contact.location, data.contact.linkedin, data.contact.website, data.contact.github]
              .filter(hasContent)
              .map((c, i) => (
                <div key={i}>{c}</div>
              ))}
          </div>

          {data.skills && data.skills.length > 0 && (
            <>
              <RailHeading color={colors.dark}>Skills</RailHeading>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginBottom: "18px" }}>
                {data.skills.filter(hasContent).map((s, i) => (
                  <span key={i} style={{ fontSize: "9px", color: colors.dark, backgroundColor: "#ffffff", padding: "3px 8px", borderRadius: "4px" }}>
                    {s}
                  </span>
                ))}
              </div>
            </>
          )}

          {data.languages && data.languages.length > 0 && (
            <>
              <RailHeading color={colors.dark}>Languages</RailHeading>
              <div style={{ fontSize: "9.5px", color: "#374151", lineHeight: 1.8 }}>
                {data.languages.filter(hasContent).map((l, i) => (
                  <div key={i}>{l}</div>
                ))}
              </div>
            </>
          )}
        </aside>

        {/* Right column */}
        <main style={{ flex: 1, minWidth: 0, padding: "34px 30px" }}>
          <header style={{ marginBottom: "16px" }}>
            <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#111827", fontFamily: FONTS.sans.heading, letterSpacing: "-0.01em" }}>
              {formatName(data.name)}
            </h1>
            {data.title && (
              <p style={{ fontSize: "12px", color: colors.primary, marginTop: "3px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                {formatJobTitle(data.title)}
              </p>
            )}
          </header>

          {hasContent(data.summary) && (
            <section style={{ marginBottom: "16px" }}>
              <ColHeading color={colors.primary}>Profile</ColHeading>
              <p style={{ fontSize: "10.5px", color: "#4b5563", lineHeight: 1.65 }}>{data.summary}</p>
            </section>
          )}

          {data.sections.map((section) => (
            <section key={section.id} style={{ marginBottom: "15px" }}>
              <ColHeading color={colors.primary}>{section.title}</ColHeading>
              {section.items.map((item) => (
                <div key={item.id} style={{ marginBottom: "11px" }}>
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
        </main>
      </div>
    </A4PageWrapper>
  );
}

function RailHeading({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <h2 style={{ fontSize: "9px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.16em", color, marginBottom: "8px" }}>{children}</h2>
  );
}

function ColHeading({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <h2 style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", color, borderBottom: `2px solid ${color}`, paddingBottom: "3px", marginBottom: "8px", display: "inline-block" }}>
      {children}
    </h2>
  );
}
