"use client";

import React from "react";
import { A4PageWrapper } from "../A4PageWrapper";
import { getThemeColors, FONTS } from "../ThemeEngine";
import { TemplateProps } from "./TemplateProps";
import { formatName, formatJobTitle, formatBulletPoint, hasContent } from "@/utils/formatting";
import { useT } from "@/lib/i18n/LanguageProvider";
import { scaled, spaced, leading } from "@/lib/builder/density";

/**
 * Template 12: Photo Left
 *
 * A photo-forward two-column CV: a tinted left rail carries the headshot,
 * contact, skills and languages; the right column carries the story. Common
 * for international / EU-style resumes that expect a photo.
 */
export function PhotoLeftTemplate({ data, themeColor, className }: TemplateProps) {
  const { t } = useT();
  const colors = getThemeColors(themeColor);
  const initial = (data.name || "?").trim().charAt(0).toUpperCase();

  return (
    <A4PageWrapper className={className}>
      <div style={{ display: "flex", minHeight: "100%", fontFamily: FONTS.sans.body, color: "#1f2937", backgroundColor: "#ffffff" }}>
        {/* Left rail */}
        <aside style={{ width: "34%", backgroundColor: colors.light, padding: `${spaced(34)} ${spaced(22)}` }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: spaced(20) }}>
            {data.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.photo} alt={data.name} style={{ width: "104px", height: "104px", borderRadius: "50%", objectFit: "cover", border: `3px solid #ffffff` }} />
            ) : (
              <div style={{ width: "104px", height: "104px", borderRadius: "50%", backgroundColor: colors.primary, color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: scaled(40), fontWeight: 700, fontFamily: FONTS.sans.heading }}>
                {initial}
              </div>
            )}
          </div>

          <RailHeading color={colors.dark}>{t("Contact")}</RailHeading>
          <div style={{ fontSize: scaled(9.5), color: "#374151", lineHeight: leading(1.9), marginBottom: spaced(18), wordBreak: "break-word" }}>
            {[data.contact.email, data.contact.phone, data.contact.location, data.contact.linkedin, data.contact.website, data.contact.github]
              .filter(hasContent)
              .map((c, i) => (
                <div key={i}>{c}</div>
              ))}
          </div>

          {data.skills && data.skills.length > 0 && (
            <>
              <RailHeading color={colors.dark}>{t("Skills")}</RailHeading>
              <div style={{ display: "flex", flexWrap: "wrap", gap: spaced(5), marginBottom: spaced(18) }}>
                {data.skills.filter(hasContent).map((s, i) => (
                  <span key={i} style={{ fontSize: scaled(9), color: colors.dark, backgroundColor: "#ffffff", padding: `${spaced(3)} ${spaced(8)}`, borderRadius: "4px" }}>
                    {s}
                  </span>
                ))}
              </div>
            </>
          )}

          {data.languages && data.languages.length > 0 && (
            <>
              <RailHeading color={colors.dark}>{t("Languages")}</RailHeading>
              <div style={{ fontSize: scaled(9.5), color: "#374151", lineHeight: leading(1.8) }}>
                {data.languages.filter(hasContent).map((l, i) => (
                  <div key={i}>{l}</div>
                ))}
              </div>
            </>
          )}
        </aside>

        {/* Right column */}
        <main style={{ flex: 1, minWidth: 0, padding: `${spaced(34)} ${spaced(30)}` }}>
          <header style={{ marginBottom: spaced(16) }}>
            <h1 style={{ fontSize: scaled(28), fontWeight: 700, color: "#111827", fontFamily: FONTS.sans.heading, letterSpacing: "-0.01em" }}>
              {formatName(data.name)}
            </h1>
            {data.title && (
              <p style={{ fontSize: scaled(12), color: colors.primary, marginTop: spaced(3), fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                {formatJobTitle(data.title)}
              </p>
            )}
          </header>

          {hasContent(data.summary) && (
            <section style={{ marginBottom: spaced(16) }}>
              <ColHeading color={colors.primary}>{t("Profile")}</ColHeading>
              <p style={{ fontSize: scaled(10.5), color: "#4b5563", lineHeight: leading(1.65) }}>{data.summary}</p>
            </section>
          )}

          {data.sections.map((section) => (
            <section key={section.id} style={{ marginBottom: spaced(15) }}>
              <ColHeading color={colors.primary}>{section.title}</ColHeading>
              {section.items.map((item) => (
                <div key={item.id} className="cv-item" style={{ marginBottom: spaced(11) }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: spaced(10) }}>
                    <h3 style={{ fontSize: scaled(12), fontWeight: 700, color: "#111827" }}>{formatJobTitle(item.title || "")}</h3>
                    {item.date && <span style={{ fontSize: scaled(9), color: "#9ca3af", whiteSpace: "nowrap" }}>{item.date}</span>}
                  </div>
                  {(item.subtitle || item.location) && (
                    <p style={{ fontSize: scaled(10), color: colors.dark, fontWeight: 600, marginTop: spaced(1) }}>
                      {[item.subtitle, item.location].filter(hasContent).join(" · ")}
                    </p>
                  )}
                  {item.bullets && item.bullets.length > 0 && (
                    <ul style={{ marginTop: spaced(4), paddingLeft: spaced(15) }}>
                      {item.bullets.filter(hasContent).map((b, i) => (
                        <li key={i} style={{ fontSize: scaled(9.5), color: "#4b5563", lineHeight: leading(1.5), marginBottom: spaced(2) }}>{formatBulletPoint(b)}</li>
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
    <h2 style={{ fontSize: scaled(9), fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.16em", color, marginBottom: spaced(8) }}>{children}</h2>
  );
}

function ColHeading({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <h2 style={{ fontSize: scaled(10), fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", color, borderBottom: `2px solid ${color}`, paddingBottom: spaced(3), marginBottom: spaced(8), display: "inline-block" }}>
      {children}
    </h2>
  );
}
