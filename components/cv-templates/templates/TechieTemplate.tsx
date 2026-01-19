"use client";

import React from "react";
import { A4PageWrapper } from "../A4PageWrapper";
import { getThemeColors, FONTS } from "../ThemeEngine";
import { TemplateProps } from "./TemplateProps";
import { formatName, formatJobTitle, formatBulletPoint, hasContent } from "@/utils/formatting";

/**
 * Template 5: Techie
 * 
 * Developer-optimized with prominent skills grid.
 * Compact layout for maximum information density.
 */

export function TechieTemplate({ data, themeColor, className }: TemplateProps) {
  const colors = getThemeColors(themeColor);

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
          padding: "24px 32px",
          fontFamily: FONTS.mono.heading,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
            <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#ef4444" }} />
            <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#eab308" }} />
            <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#22c55e" }} />
            <span style={{ fontSize: "10px", color: "#64748b", marginLeft: "8px" }}>resume.exe</span>
          </div>
          
          <div style={{ color: "#94a3b8", fontSize: "11px", marginBottom: "4px" }}>
            <span style={{ color: colors.primary }}>$</span> whoami
          </div>
          <h1 style={{
            fontSize: "28px",
            fontWeight: 700,
            color: "#ffffff",
            fontFamily: FONTS.mono.heading,
          }}>
            {formatName(data.name)}
          </h1>
          {data.title && (
            <div style={{ color: "#94a3b8", fontSize: "13px", marginTop: "6px" }}>
              <span style={{ color: colors.primary }}>{">"}</span> {formatJobTitle(data.title)}
            </div>
          )}
        </header>

        {/* Contact Bar - Code style */}
        <div style={{
          backgroundColor: "#f1f5f9",
          padding: "10px 32px",
          fontSize: "10px",
          color: "#475569",
          fontFamily: FONTS.mono.body,
          display: "flex",
          gap: "20px",
          flexWrap: "wrap",
        }}>
          {hasContent(data.contact.email) && (
            <span><span style={{ color: colors.primary }}>email:</span> &quot;{data.contact.email}&quot;</span>
          )}
          {hasContent(data.contact.phone) && (
            <span><span style={{ color: colors.primary }}>phone:</span> &quot;{data.contact.phone}&quot;</span>
          )}
          {hasContent(data.contact.location) && (
            <span><span style={{ color: colors.primary }}>location:</span> &quot;{data.contact.location}&quot;</span>
          )}
          {hasContent(data.contact.github) && (
            <span><span style={{ color: colors.primary }}>github:</span> &quot;{data.contact.github}&quot;</span>
          )}
          {hasContent(data.contact.linkedin) && (
            <span><span style={{ color: colors.primary }}>linkedin:</span> &quot;{data.contact.linkedin}&quot;</span>
          )}
        </div>

        {/* Main Content */}
        <div style={{ padding: "24px 32px" }}>
          {/* Skills Grid - Prominent */}
          {data.skills && data.skills.length > 0 && (
            <section style={{ marginBottom: "24px" }}>
              <TechHeader title="tech_stack" color={colors.primary} />
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
                gap: "8px",
              }}>
                {data.skills.filter(hasContent).map((skill, idx) => (
                  <div key={idx} style={{
                    backgroundColor: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "4px",
                    padding: "8px 12px",
                    fontSize: "10px",
                    fontWeight: 500,
                    color: "#334155",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
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
            <section style={{ marginBottom: "20px" }}>
              <TechHeader title="about_me" color={colors.primary} />
              <p style={{
                fontSize: "10px",
                color: "#475569",
                lineHeight: 1.7,
                backgroundColor: "#fafafa",
                padding: "12px 16px",
                borderRadius: "4px",
                borderLeft: `3px solid ${colors.primary}`,
              }}>
                {data.summary}
              </p>
            </section>
          )}

          {/* Sections */}
          {data.sections.map((section) => (
            <section key={section.id} style={{ marginBottom: "20px" }}>
              <TechHeader title={section.title.toLowerCase().replace(/\s/g, "_")} color={colors.primary} />
              {section.items.map((item) => (
                <TechSectionItem key={item.id} item={item} color={colors.primary} />
              ))}
            </section>
          ))}

          {/* Languages */}
          {data.languages && data.languages.length > 0 && (
            <section>
              <TechHeader title="languages" color={colors.primary} />
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                {data.languages.filter(hasContent).map((lang, idx) => (
                  <span key={idx} style={{
                    fontSize: "10px",
                    color: "#475569",
                    padding: "4px 10px",
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
      fontSize: "11px",
      fontWeight: 700,
      color: "#1e293b",
      marginBottom: "12px",
      fontFamily: FONTS.mono.heading,
      display: "flex",
      alignItems: "center",
      gap: "8px",
    }}>
      <span style={{ color }}>{"#"}</span>
      {title}
      <span style={{ flex: 1, height: "1px", backgroundColor: "#e2e8f0", marginLeft: "8px" }} />
    </h2>
  );
}

function TechSectionItem({ item, color }: { item: { title?: string; subtitle?: string; date?: string; location?: string; description?: string; bullets?: string[] }; color: string }) {
  return (
    <div style={{
      marginBottom: "14px",
      padding: "12px 16px",
      backgroundColor: "#fafafa",
      borderRadius: "4px",
      border: "1px solid #e2e8f0",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div>
          <h3 style={{
            fontSize: "12px",
            fontWeight: 600,
            color: "#1e293b",
            fontFamily: FONTS.mono.heading,
          }}>
            {formatJobTitle(item.title || "")}
          </h3>
          {item.subtitle && (
            <p style={{ fontSize: "10px", color: "#64748b", marginTop: "2px" }}>
              @ {item.subtitle}
            </p>
          )}
        </div>
        {item.date && (
          <span style={{
            fontSize: "9px",
            fontWeight: 500,
            color,
            backgroundColor: `${color}15`,
            padding: "3px 8px",
            borderRadius: "3px",
            fontFamily: FONTS.mono.body,
          }}>
            {item.date}
          </span>
        )}
      </div>

      {item.description && (
        <p style={{ fontSize: "10px", color: "#475569", marginTop: "8px", lineHeight: 1.6 }}>
          {item.description}
        </p>
      )}

      {item.bullets && item.bullets.length > 0 && (
        <ul style={{ marginTop: "8px", paddingLeft: "0", listStyle: "none" }}>
          {item.bullets.filter(hasContent).map((bullet, idx) => (
            <li key={idx} style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "8px",
              marginBottom: "3px",
            }}>
              <span style={{ color, fontSize: "10px", fontFamily: FONTS.mono.body }}>→</span>
              <span style={{ fontSize: "10px", color: "#334155", lineHeight: 1.5 }}>
                {formatBulletPoint(bullet)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
