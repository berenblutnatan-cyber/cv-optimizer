"use client";

import React from "react";
import { A4PageWrapper } from "../A4PageWrapper";
import { getThemeColors, FONTS } from "../ThemeEngine";
import { TemplateProps } from "./TemplateProps";
import { formatName, formatJobTitle, formatBulletPoint, hasContent } from "@/utils/formatting";
import { useT } from "@/lib/i18n/LanguageProvider";
import { scaled, spaced, leading } from "@/lib/builder/density";

/**
 * Template 5: Techie
 * 
 * Developer-optimized with prominent skills grid.
 * Compact layout for maximum information density.
 */

export function TechieTemplate({ data, themeColor, className }: TemplateProps) {
  const colors = getThemeColors(themeColor);
  const { t } = useT();

  return (
    <A4PageWrapper className={className}>
      <div style={{
        backgroundColor: "#ffffff",
        minHeight: "100%",
        fontFamily: FONTS.mono.body,
      }}>
        {/* Terminal-style Header */}
        <header style={{
          backgroundColor: "#1e293b",
          padding: `${spaced(24)} ${spaced(32)}`,
          fontFamily: FONTS.mono.heading,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: spaced(8), marginBottom: spaced(12) }}>
            <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#ef4444" }} />
            <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#eab308" }} />
            <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#22c55e" }} />
            <span style={{ fontSize: scaled(10), color: "#64748b", marginLeft: spaced(8) }}>resume.exe</span>
          </div>
          
          <div style={{ color: "#94a3b8", fontSize: scaled(11), marginBottom: spaced(4) }}>
            <span style={{ color: colors.primary }}>$</span> whoami
          </div>
          <h1 style={{
            fontSize: scaled(28),
            fontWeight: 700,
            color: "#ffffff",
            fontFamily: FONTS.mono.heading,
          }}>
            {formatName(data.name)}
          </h1>
          {data.title && (
            <div style={{ color: "#94a3b8", fontSize: scaled(13), marginTop: spaced(6) }}>
              <span style={{ color: colors.primary }}>{">"}</span> {formatJobTitle(data.title)}
            </div>
          )}
        </header>

        {/* Contact Bar - Code style */}
        <div style={{
          backgroundColor: "#f1f5f9",
          padding: `${spaced(10)} ${spaced(32)}`,
          fontSize: scaled(10),
          color: "#475569",
          fontFamily: FONTS.mono.body,
          display: "flex",
          gap: spaced(20),
          flexWrap: "wrap",
        }}>
          {hasContent(data.contact.email) && (
            <span><span style={{ color: colors.primary }}>{t("email:")}</span> &quot;{data.contact.email}&quot;</span>
          )}
          {hasContent(data.contact.phone) && (
            <span><span style={{ color: colors.primary }}>{t("phone:")}</span> &quot;{data.contact.phone}&quot;</span>
          )}
          {hasContent(data.contact.location) && (
            <span><span style={{ color: colors.primary }}>{t("location:")}</span> &quot;{data.contact.location}&quot;</span>
          )}
          {hasContent(data.contact.github) && (
            <span><span style={{ color: colors.primary }}>{t("github:")}</span> &quot;{data.contact.github}&quot;</span>
          )}
          {hasContent(data.contact.linkedin) && (
            <span><span style={{ color: colors.primary }}>{t("linkedin:")}</span> &quot;{data.contact.linkedin}&quot;</span>
          )}
        </div>

        {/* Main Content */}
        <div style={{ padding: `${spaced(24)} ${spaced(32)}` }}>
          {/* Skills Grid - Prominent */}
          {data.skills && data.skills.length > 0 && (
            <section style={{ marginBottom: spaced(24) }}>
              <TechHeader title={t("tech_stack")} color={colors.primary} />
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
                gap: spaced(8),
              }}>
                {data.skills.filter(hasContent).map((skill, idx) => (
                  <div key={idx} style={{
                    backgroundColor: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "4px",
                    padding: `${spaced(8)} ${spaced(12)}`,
                    fontSize: scaled(10),
                    fontWeight: 500,
                    color: "#334155",
                    display: "flex",
                    alignItems: "center",
                    gap: spaced(6),
                  }}>
                    <span style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "2px",
                      backgroundColor: colors.primary,
                    }} />
                    {skill}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Summary */}
          {hasContent(data.summary) && (
            <section style={{ marginBottom: spaced(20) }}>
              <TechHeader title={t("about_me")} color={colors.primary} />
              <p style={{
                fontSize: scaled(10),
                color: "#475569",
                lineHeight: leading(1.7),
                backgroundColor: "#fafafa",
                padding: `${spaced(12)} ${spaced(16)}`,
                borderRadius: "4px",
                borderLeft: `3px solid ${colors.primary}`,
              }}>
                {data.summary}
              </p>
            </section>
          )}

          {/* Sections */}
          {data.sections.map((section) => (
            <section key={section.id} style={{ marginBottom: spaced(20) }}>
              <TechHeader title={section.title.toLowerCase().replace(/\s/g, "_")} color={colors.primary} />
              {section.items.map((item) => (
                <TechSectionItem key={item.id} item={item} color={colors.primary} />
              ))}
            </section>
          ))}

          {/* Languages */}
          {data.languages && data.languages.length > 0 && (
            <section>
              <TechHeader title={t("languages")} color={colors.primary} />
              <div style={{ display: "flex", gap: spaced(12), flexWrap: "wrap" }}>
                {data.languages.filter(hasContent).map((lang, idx) => (
                  <span key={idx} style={{
                    fontSize: scaled(10),
                    color: "#475569",
                    padding: `${spaced(4)} ${spaced(10)}`,
                    backgroundColor: "#f1f5f9",
                    borderRadius: "4px",
                  }}>
                    {lang}
                  </span>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </A4PageWrapper>
  );
}

// Helper Components
function TechHeader({ title, color }: { title: string; color: string }) {
  return (
    <h2 style={{
      fontSize: scaled(11),
      fontWeight: 700,
      color: "#1e293b",
      marginBottom: spaced(12),
      fontFamily: FONTS.mono.heading,
      display: "flex",
      alignItems: "center",
      gap: spaced(8),
    }}>
      <span style={{ color }}>{"#"}</span>
      {title}
      <span style={{ flex: 1, height: "1px", backgroundColor: "#e2e8f0", marginLeft: spaced(8) }} />
    </h2>
  );
}

function TechSectionItem({ item, color }: { item: { title?: string; subtitle?: string; date?: string; location?: string; description?: string; bullets?: string[] }; color: string }) {
  return (
    <div className="cv-item" style={{
      marginBottom: spaced(14),
      padding: `${spaced(12)} ${spaced(16)}`,
      backgroundColor: "#fafafa",
      borderRadius: "4px",
      border: "1px solid #e2e8f0",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div>
          <h3 style={{
            fontSize: scaled(12),
            fontWeight: 600,
            color: "#1e293b",
            fontFamily: FONTS.mono.heading,
          }}>
            {formatJobTitle(item.title || "")}
          </h3>
          {item.subtitle && (
            <p style={{ fontSize: scaled(10), color: "#64748b", marginTop: spaced(2) }}>
              @ {item.subtitle}
            </p>
          )}
        </div>
        {item.date && (
          <span style={{
            fontSize: scaled(9),
            fontWeight: 500,
            color,
            backgroundColor: `${color}15`,
            padding: `${spaced(3)} ${spaced(8)}`,
            borderRadius: "3px",
            fontFamily: FONTS.mono.body,
          }}>
            {item.date}
          </span>
        )}
      </div>

      {item.description && (
        <p style={{ fontSize: scaled(10), color: "#475569", marginTop: spaced(8), lineHeight: leading(1.6) }}>
          {item.description}
        </p>
      )}

      {item.bullets && item.bullets.length > 0 && (
        <ul style={{ marginTop: spaced(8), paddingLeft: "0", listStyle: "none" }}>
          {item.bullets.filter(hasContent).map((bullet, idx) => (
            <li key={idx} style={{
              display: "flex",
              alignItems: "flex-start",
              gap: spaced(8),
              marginBottom: spaced(3),
            }}>
              <span style={{ color, fontSize: scaled(10), fontFamily: FONTS.mono.body }}>→</span>
              <span style={{ fontSize: scaled(10), color: "#334155", lineHeight: leading(1.5) }}>
                {formatBulletPoint(bullet)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
