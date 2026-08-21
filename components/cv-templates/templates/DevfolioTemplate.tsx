"use client";

import React from "react";
import { A4PageWrapper } from "../A4PageWrapper";
import { getThemeColors, FONTS } from "../ThemeEngine";
import { TemplateProps } from "./TemplateProps";
import { formatName, formatJobTitle, formatBulletPoint, hasContent } from "@/utils/formatting";
import { useT } from "@/lib/i18n/LanguageProvider";
import { scaled, spaced, leading } from "@/lib/builder/density";

/**
 * Devfolio
 *
 * Developer-forward: monospace section markers (## Experience), a top accent
 * bar, and skills rendered as a tag grid. Reads like a clean README while
 * staying a true one-page A4 résumé. A modern upgrade to "Techie".
 */
export function DevfolioTemplate({ data, themeColor, className }: TemplateProps) {
  const { t } = useT();
  const colors = getThemeColors(themeColor);
  const mono = FONTS.mono.heading;

  return (
    <A4PageWrapper className={className}>
      <div style={{ minHeight: "100%", backgroundColor: "#ffffff", fontFamily: FONTS.mono.body }}>
        <div style={{ height: "6px", background: `linear-gradient(90deg, ${colors.primary}, ${colors.dark})` }} />

        <div style={{ padding: `${spaced(24)} ${spaced(32)}` }}>
          {/* Header */}
          <header style={{ marginBottom: spaced(16) }}>
            <div style={{ fontFamily: mono, fontSize: scaled(9), color: colors.primary, marginBottom: spaced(4) }}>{"// "}{(data.contact.location || "résumé").toString().toLowerCase()}</div>
            <h1 style={{ fontSize: scaled(25), fontWeight: 700, color: "#0f172a", fontFamily: mono, letterSpacing: "-0.02em", lineHeight: leading(1.05) }}>
              {formatName(data.name)}
            </h1>
            {hasContent(data.title) && (
              <p style={{ fontFamily: mono, fontSize: scaled(11), color: "#475569", marginTop: spaced(4) }}>
                <span style={{ color: colors.primary }}>role</span>: {formatJobTitle(data.title!)}
              </p>
            )}
            <div style={{ display: "flex", flexWrap: "wrap", gap: `${spaced(4)} ${spaced(14)}`, marginTop: spaced(10), fontFamily: mono, fontSize: scaled(8.5), color: "#64748b" }}>
              {[
                hasContent(data.contact.email) && data.contact.email,
                hasContent(data.contact.github) && data.contact.github!.replace(/^https?:\/\//, ""),
                hasContent(data.contact.linkedin) && data.contact.linkedin!.replace(/^https?:\/\//, ""),
                hasContent(data.contact.website) && data.contact.website!.replace(/^https?:\/\//, ""),
                hasContent(data.contact.phone) && data.contact.phone,
              ].filter(Boolean).map((v, i) => (
                <span key={i}><span style={{ color: colors.primary }}>↳</span> {v}</span>
              ))}
            </div>
          </header>

          {hasContent(data.summary) && (
            <DevSection title={t("about")} mono={mono} colors={colors}>
              <p style={{ fontSize: scaled(9.5), color: "#374151", lineHeight: leading(1.5), fontFamily: FONTS.mono.body }}>{data.summary}</p>
            </DevSection>
          )}

          {data.skills && data.skills.length > 0 && (
            <DevSection title={t("stack")} mono={mono} colors={colors}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: spaced(5) }}>
                {data.skills.filter(hasContent).map((s, i) => (
                  <span key={i} style={{ fontFamily: mono, fontSize: scaled(8.5), color: colors.dark, border: `1px solid ${colors.primary}`, backgroundColor: colors.light, padding: `${spaced(2)} ${spaced(7)}`, borderRadius: "3px" }}>{s}</span>
                ))}
              </div>
            </DevSection>
          )}

          {data.sections.map((section) => (
            <DevSection key={section.id} title={section.title.toLowerCase()} mono={mono} colors={colors}>
              {section.items.map((item) => (
                <div key={item.id} className="cv-item" style={{ marginBottom: spaced(9) }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: spaced(8) }}>
                    <h3 style={{ fontFamily: mono, fontSize: scaled(10), fontWeight: 700, color: "#0f172a" }}>{formatJobTitle(item.title || "")}</h3>
                    {item.date && <span style={{ fontFamily: mono, fontSize: scaled(8), color: "#94a3b8", whiteSpace: "nowrap" }}>{item.date}</span>}
                  </div>
                  {(item.subtitle || item.location) && (
                    <p style={{ fontFamily: mono, fontSize: scaled(8.5), color: colors.primary, marginTop: spaced(1) }}>@ {[item.subtitle, item.location].filter(Boolean).join(" · ")}</p>
                  )}
                  {item.bullets && item.bullets.length > 0 && (
                    <ul style={{ marginTop: spaced(4), paddingLeft: 0, listStyle: "none" }}>
                      {item.bullets.filter(hasContent).map((b, i) => (
                        <li key={i} style={{ fontSize: scaled(9), color: "#374151", lineHeight: leading(1.45), marginBottom: spaced(2), paddingLeft: spaced(13), position: "relative", fontFamily: FONTS.mono.body }}>
                          <span style={{ position: "absolute", left: 0, color: colors.primary, fontFamily: mono }}>-</span>
                          {formatBulletPoint(b)}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </DevSection>
          ))}

          {data.languages && data.languages.length > 0 && (
            <DevSection title={t("lang")} mono={mono} colors={colors}>
              <p style={{ fontFamily: FONTS.mono.body, fontSize: scaled(9), color: "#374151" }}>{data.languages.filter(hasContent).join("  ·  ")}</p>
            </DevSection>
          )}
        </div>
      </div>
    </A4PageWrapper>
  );
}

function DevSection({ title, mono, colors, children }: { title: string; mono: string; colors: { primary: string }; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: spaced(13) }}>
      <h2 style={{ fontFamily: mono, fontSize: scaled(10), fontWeight: 700, color: colors.primary, marginBottom: spaced(7) }}>
        <span style={{ color: "#cbd5e1" }}>## </span>{title}
      </h2>
      {children}
    </section>
  );
}
