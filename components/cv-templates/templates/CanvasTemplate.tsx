"use client";

import React from "react";
import { A4PageWrapper } from "../A4PageWrapper";
import { getThemeColors, FONTS } from "../ThemeEngine";
import { TemplateProps } from "./TemplateProps";
import { formatName, formatJobTitle, formatBulletPoint, hasContent } from "@/utils/formatting";
import { useT } from "@/lib/i18n/LanguageProvider";

/**
 * Canvas
 *
 * Creative / portfolio energy: a saturated accent sidebar (photo, contact,
 * skills) against an oversized name and airy main column. Visual personality
 * for designers and marketers — bold, not ATS-tuned.
 */
export function CanvasTemplate({ data, themeColor, className }: TemplateProps) {
  const colors = getThemeColors(themeColor);
  const { t } = useT();
  const initials = formatName(data.name).split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("");

  return (
    <A4PageWrapper className={className}>
      <div style={{ display: "flex", minHeight: "100%", backgroundColor: "#ffffff", fontFamily: FONTS.sans.body }}>
        {/* Sidebar */}
        <aside style={{ width: "34%", flexShrink: 0, background: `linear-gradient(165deg, ${colors.primary} 0%, ${colors.dark} 100%)`, color: "#ffffff", padding: "26px 20px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", left: "-30px", bottom: "60px", width: "120px", height: "120px", borderRadius: "50%", border: "12px solid rgba(255,255,255,0.08)" }} />

          {/* photo / initials */}
          <div style={{ width: "84px", height: "84px", borderRadius: "50%", overflow: "hidden", border: "3px solid rgba(255,255,255,0.45)", margin: "0 auto 18px", backgroundColor: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
            {data.photo ? (
              <img src={data.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <span style={{ fontSize: "30px", fontWeight: 800, fontFamily: FONTS.sans.heading }}>{initials}</span>
            )}
          </div>

          <CanvasSideBlock title={t("Contact")}>
            {hasContent(data.contact.email) && <SideLine>{data.contact.email}</SideLine>}
            {hasContent(data.contact.phone) && <SideLine>{data.contact.phone}</SideLine>}
            {hasContent(data.contact.location) && <SideLine>{data.contact.location}</SideLine>}
            {hasContent(data.contact.linkedin) && <SideLine>{data.contact.linkedin!.replace(/^https?:\/\//, "")}</SideLine>}
            {hasContent(data.contact.website) && <SideLine>{data.contact.website!.replace(/^https?:\/\//, "")}</SideLine>}
          </CanvasSideBlock>

          {data.skills && data.skills.length > 0 && (
            <CanvasSideBlock title={t("Skills")}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                {data.skills.filter(hasContent).map((s, i) => (
                  <span key={i} style={{ fontSize: "8px", fontWeight: 600, color: "#ffffff", backgroundColor: "rgba(255,255,255,0.18)", padding: "2px 7px", borderRadius: "10px" }}>{s}</span>
                ))}
              </div>
            </CanvasSideBlock>
          )}

          {data.languages && data.languages.length > 0 && (
            <CanvasSideBlock title={t("Languages")}>
              {data.languages.filter(hasContent).map((l, i) => <SideLine key={i}>{l}</SideLine>)}
            </CanvasSideBlock>
          )}
        </aside>

        {/* Main */}
        <div style={{ flex: 1, minWidth: 0, padding: "30px 28px" }}>
          <header style={{ marginBottom: "16px" }}>
            <h1 style={{ fontSize: "33px", fontWeight: 800, color: "#0f172a", fontFamily: FONTS.sans.heading, lineHeight: 0.98, letterSpacing: "-0.02em" }}>
              {formatName(data.name)}
            </h1>
            {hasContent(data.title) && (
              <p style={{ fontSize: "12px", fontWeight: 700, color: colors.primary, marginTop: "5px", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                {formatJobTitle(data.title!)}
              </p>
            )}
          </header>

          {hasContent(data.summary) && (
            <p style={{ fontSize: "9.5px", color: "#475569", lineHeight: 1.55, marginBottom: "16px", paddingLeft: "12px", borderLeft: `3px solid ${colors.light}` }}>
              {data.summary}
            </p>
          )}

          {data.sections.map((section) => (
            <section key={section.id} style={{ marginBottom: "13px" }}>
              <h2 style={{ fontSize: "12px", fontWeight: 800, color: "#0f172a", marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ width: "16px", height: "3px", borderRadius: "2px", backgroundColor: colors.primary }} />
                {section.title}
              </h2>
              {section.items.map((item) => (
                <div key={item.id} style={{ marginBottom: "9px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "8px" }}>
                    <h3 style={{ fontSize: "10.5px", fontWeight: 700, color: "#1e293b" }}>{formatJobTitle(item.title || "")}</h3>
                    {item.date && <span style={{ fontSize: "8.5px", fontWeight: 600, color: colors.primary, whiteSpace: "nowrap" }}>{item.date}</span>}
                  </div>
                  {(item.subtitle || item.location) && (
                    <p style={{ fontSize: "9px", color: "#64748b", marginTop: "1px" }}>{[item.subtitle, item.location].filter(Boolean).join(" · ")}</p>
                  )}
                  {item.bullets && item.bullets.length > 0 && (
                    <ul style={{ marginTop: "4px", paddingLeft: 0, listStyle: "none" }}>
                      {item.bullets.filter(hasContent).map((b, i) => (
                        <li key={i} style={{ fontSize: "9px", color: "#374151", lineHeight: 1.45, marginBottom: "2px", paddingLeft: "12px", position: "relative" }}>
                          <span style={{ position: "absolute", left: 0, top: "4px", width: "5px", height: "5px", borderRadius: "50%", backgroundColor: colors.primary }} />
                          {formatBulletPoint(b)}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </section>
          ))}
        </div>
      </div>
    </A4PageWrapper>
  );
}

function CanvasSideBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "16px", position: "relative" }}>
      <h3 style={{ fontSize: "9px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.18em", color: "rgba(255,255,255,0.95)", marginBottom: "7px", paddingBottom: "4px", borderBottom: "1px solid rgba(255,255,255,0.25)" }}>{title}</h3>
      {children}
    </div>
  );
}

function SideLine({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: "8.5px", color: "rgba(255,255,255,0.9)", lineHeight: 1.5, marginBottom: "3px", wordBreak: "break-word" }}>{children}</p>;
}
