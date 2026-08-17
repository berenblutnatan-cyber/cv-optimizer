"use client";

import React from "react";
import { A4PageWrapper } from "../A4PageWrapper";
import { getThemeColors, FONTS } from "../ThemeEngine";
import { TemplateProps } from "./TemplateProps";
import { formatName, formatJobTitle, formatBulletPoint, hasContent } from "@/utils/formatting";
import { useT } from "@/lib/i18n/LanguageProvider";
import { scaled, spaced, leading } from "@/lib/builder/density";

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
        <aside style={{ width: "34%", flexShrink: 0, background: `linear-gradient(165deg, ${colors.primary} 0%, ${colors.dark} 100%)`, color: "#ffffff", padding: `${spaced(26)} ${spaced(20)}`, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", left: "-30px", bottom: "60px", width: "120px", height: "120px", borderRadius: "50%", border: "12px solid rgba(255,255,255,0.08)" }} />

          {/* photo / initials */}
          <div style={{ width: "84px", height: "84px", borderRadius: "50%", overflow: "hidden", border: "3px solid rgba(255,255,255,0.45)", margin: `0 auto ${spaced(18)}`, backgroundColor: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
            {data.photo ? (
              <img src={data.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <span style={{ fontSize: scaled(30), fontWeight: 800, fontFamily: FONTS.sans.heading }}>{initials}</span>
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
              <div style={{ display: "flex", flexWrap: "wrap", gap: spaced(4) }}>
                {data.skills.filter(hasContent).map((s, i) => (
                  <span key={i} style={{ fontSize: scaled(8), fontWeight: 600, color: "#ffffff", backgroundColor: "rgba(255,255,255,0.18)", padding: `${spaced(2)} ${spaced(7)}`, borderRadius: "10px" }}>{s}</span>
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
        <div style={{ flex: 1, minWidth: 0, padding: `${spaced(30)} ${spaced(28)}` }}>
          <header style={{ marginBottom: spaced(16) }}>
            <h1 style={{ fontSize: scaled(33), fontWeight: 800, color: "#0f172a", fontFamily: FONTS.sans.heading, lineHeight: leading(0.98), letterSpacing: "-0.02em" }}>
              {formatName(data.name)}
            </h1>
            {hasContent(data.title) && (
              <p style={{ fontSize: scaled(12), fontWeight: 700, color: colors.primary, marginTop: spaced(5), textTransform: "uppercase", letterSpacing: "0.1em" }}>
                {formatJobTitle(data.title!)}
              </p>
            )}
          </header>

          {hasContent(data.summary) && (
            <p style={{ fontSize: scaled(9.5), color: "#475569", lineHeight: leading(1.55), marginBottom: spaced(16), paddingLeft: spaced(12), borderLeft: `3px solid ${colors.light}` }}>
              {data.summary}
            </p>
          )}

          {data.sections.map((section) => (
            <section key={section.id} style={{ marginBottom: spaced(13) }}>
              <h2 style={{ fontSize: scaled(12), fontWeight: 800, color: "#0f172a", marginBottom: spaced(8), display: "flex", alignItems: "center", gap: spaced(8) }}>
                <span style={{ width: "16px", height: "3px", borderRadius: "2px", backgroundColor: colors.primary }} />
                {section.title}
              </h2>
              {section.items.map((item) => (
                <div key={item.id} className="cv-item" style={{ marginBottom: spaced(9) }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: spaced(8) }}>
                    <h3 style={{ fontSize: scaled(10.5), fontWeight: 700, color: "#1e293b" }}>{formatJobTitle(item.title || "")}</h3>
                    {item.date && <span style={{ fontSize: scaled(8.5), fontWeight: 600, color: colors.primary, whiteSpace: "nowrap" }}>{item.date}</span>}
                  </div>
                  {(item.subtitle || item.location) && (
                    <p style={{ fontSize: scaled(9), color: "#64748b", marginTop: spaced(1) }}>{[item.subtitle, item.location].filter(Boolean).join(" · ")}</p>
                  )}
                  {item.bullets && item.bullets.length > 0 && (
                    <ul style={{ marginTop: spaced(4), paddingLeft: 0, listStyle: "none" }}>
                      {item.bullets.filter(hasContent).map((b, i) => (
                        <li key={i} style={{ fontSize: scaled(9), color: "#374151", lineHeight: leading(1.45), marginBottom: spaced(2), paddingLeft: spaced(12), position: "relative" }}>
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
    <div style={{ marginBottom: spaced(16), position: "relative" }}>
      <h3 style={{ fontSize: scaled(9), fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.18em", color: "rgba(255,255,255,0.95)", marginBottom: spaced(7), paddingBottom: spaced(4), borderBottom: "1px solid rgba(255,255,255,0.25)" }}>{title}</h3>
      {children}
    </div>
  );
}

function SideLine({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: scaled(8.5), color: "rgba(255,255,255,0.9)", lineHeight: leading(1.5), marginBottom: spaced(3), wordBreak: "break-word" }}>{children}</p>;
}
