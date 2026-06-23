"use client";

import React from "react";
import { A4PageWrapper } from "../A4PageWrapper";
import { getThemeColors, FONTS } from "../ThemeEngine";
import { TemplateProps } from "./TemplateProps";
import { formatName, formatJobTitle, formatBulletPoint, hasContent } from "@/utils/formatting";

/**
 * Devfolio
 *
 * Developer-forward: monospace section markers (## Experience), a top accent
 * bar, and skills rendered as a tag grid. Reads like a clean README while
 * staying a true one-page A4 résumé. A modern upgrade to "Techie".
 */
export function DevfolioTemplate({ data, themeColor, className }: TemplateProps) {
  const colors = getThemeColors(themeColor);
  const mono = FONTS.mono.heading;

  return (
    <A4PageWrapper className={className}>
      <div style={{ minHeight: "100%", backgroundColor: "#ffffff", fontFamily: FONTS.mono.body }}>
        <div style={{ height: "6px", background: `linear-gradient(90deg, ${colors.primary}, ${colors.dark})` }} />

        <div style={{ padding: "24px 32px" }}>
          {/* Header */}
          <header style={{ marginBottom: "16px" }}>
            <div style={{ fontFamily: mono, fontSize: "9px", color: colors.primary, marginBottom: "4px" }}>{"// "}{(data.contact.location || "résumé").toString().toLowerCase()}</div>
            <h1 style={{ fontSize: "25px", fontWeight: 700, color: "#0f172a", fontFamily: mono, letterSpacing: "-0.02em", lineHeight: 1.05 }}>
              {formatName(data.name)}
            </h1>
            {hasContent(data.title) && (
              <p style={{ fontFamily: mono, fontSize: "11px", color: "#475569", marginTop: "4px" }}>
                <span style={{ color: colors.primary }}>role</span>: {formatJobTitle(data.title!)}
              </p>
            )}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", marginTop: "10px", fontFamily: mono, fontSize: "8.5px", color: "#64748b" }}>
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
            <DevSection title="about" mono={mono} colors={colors}>
              <p style={{ fontSize: "9.5px", color: "#374151", lineHeight: 1.5, fontFamily: FONTS.mono.body }}>{data.summary}</p>
            </DevSection>
          )}

          {data.skills && data.skills.length > 0 && (
            <DevSection title="stack" mono={mono} colors={colors}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                {data.skills.filter(hasContent).map((s, i) => (
                  <span key={i} style={{ fontFamily: mono, fontSize: "8.5px", color: colors.dark, border: `1px solid ${colors.primary}`, backgroundColor: colors.light, padding: "2px 7px", borderRadius: "3px" }}>{s}</span>
                ))}
              </div>
            </DevSection>
          )}

          {data.sections.map((section) => (
            <DevSection key={section.id} title={section.title.toLowerCase()} mono={mono} colors={colors}>
              {section.items.map((item) => (
                <div key={item.id} style={{ marginBottom: "9px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "8px" }}>
                    <h3 style={{ fontFamily: mono, fontSize: "10px", fontWeight: 700, color: "#0f172a" }}>{formatJobTitle(item.title || "")}</h3>
                    {item.date && <span style={{ fontFamily: mono, fontSize: "8px", color: "#94a3b8", whiteSpace: "nowrap" }}>{item.date}</span>}
                  </div>
                  {(item.subtitle || item.location) && (
                    <p style={{ fontFamily: mono, fontSize: "8.5px", color: colors.primary, marginTop: "1px" }}>@ {[item.subtitle, item.location].filter(Boolean).join(" · ")}</p>
                  )}
                  {item.bullets && item.bullets.length > 0 && (
                    <ul style={{ marginTop: "4px", paddingLeft: 0, listStyle: "none" }}>
                      {item.bullets.filter(hasContent).map((b, i) => (
                        <li key={i} style={{ fontSize: "9px", color: "#374151", lineHeight: 1.45, marginBottom: "2px", paddingLeft: "13px", position: "relative", fontFamily: FONTS.mono.body }}>
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
            <DevSection title="lang" mono={mono} colors={colors}>
              <p style={{ fontFamily: FONTS.mono.body, fontSize: "9px", color: "#374151" }}>{data.languages.filter(hasContent).join("  ·  ")}</p>
            </DevSection>
          )}
        </div>
      </div>
    </A4PageWrapper>
  );
}

function DevSection({ title, mono, colors, children }: { title: string; mono: string; colors: { primary: string }; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: "13px" }}>
      <h2 style={{ fontFamily: mono, fontSize: "10px", fontWeight: 700, color: colors.primary, marginBottom: "7px" }}>
        <span style={{ color: "#cbd5e1" }}>## </span>{title}
      </h2>
      {children}
    </section>
  );
}
