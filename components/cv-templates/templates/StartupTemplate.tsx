"use client";

import React from "react";
import { A4PageWrapper } from "../A4PageWrapper";
import { getThemeColors, FONTS } from "../ThemeEngine";
import { TemplateProps } from "./TemplateProps";
import { formatName, formatJobTitle, formatBulletPoint, hasContent } from "@/utils/formatting";

/**
 * Template 7: Startup
 * 
 * Punchy, large typography, modern icons, heavy accent usage.
 * Perfect for startups and innovative companies.
 */

export function StartupTemplate({ data, themeColor, className }: TemplateProps) {
  const colors = getThemeColors(themeColor);

  return (
    <A4PageWrapper className={className}>
      <div style={{
        backgroundColor: "#ffffff",
        minHeight: "100%",
        fontFamily: FONTS.sans.body,
        padding: "40px 48px",
      }}>
        {/* Big Bold Header */}
        <header style={{ marginBottom: "32px" }}>
          <div style={{
            display: "inline-block",
            padding: "4px 12px",
            backgroundColor: colors.light,
            borderRadius: "4px",
            marginBottom: "8px",
          }}>
            <span style={{ fontSize: "10px", fontWeight: 600, color: colors.primary, textTransform: "uppercase", letterSpacing: "0.1em" }}>
              {formatJobTitle(data.title || "Professional")}
            </span>
          </div>
          
          <h1 style={{
            fontSize: "42px",
            fontWeight: 800,
            color: "#111827",
            fontFamily: FONTS.sans.heading,
            letterSpacing: "-0.03em",
            lineHeight: 1,
          }}>
            {formatName(data.name)}
          </h1>

          {/* Contact Pills */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "16px" }}>
            {hasContent(data.contact.email) && (
              <ContactPill icon="✉" value={data.contact.email!} color={colors.primary} />
            )}
            {hasContent(data.contact.phone) && (
              <ContactPill icon="☎" value={data.contact.phone!} color={colors.primary} />
            )}
            {hasContent(data.contact.location) && (
              <ContactPill icon="📍" value={data.contact.location!} color={colors.primary} />
            )}
            {hasContent(data.contact.linkedin) && (
              <ContactPill icon="in" value={data.contact.linkedin!} color={colors.primary} />
            )}
            {hasContent(data.contact.github) && (
              <ContactPill icon="⌨" value={data.contact.github!} color={colors.primary} />
            )}
          </div>
        </header>

        {/* Summary - Big Quote Style */}
        {hasContent(data.summary) && (
          <section style={{
            marginBottom: "32px",
            padding: "24px 0",
            borderTop: `3px solid ${colors.primary}`,
            borderBottom: `1px solid #e5e7eb`,
          }}>
            <p style={{
              fontSize: "14px",
              color: "#374151",
              lineHeight: 1.7,
              fontWeight: 400,
            }}>
              {data.summary}
            </p>
          </section>
        )}

        {/* Skills - Horizontal Badges */}
        {data.skills && data.skills.length > 0 && (
          <section style={{ marginBottom: "28px" }}>
            <StartupSectionHeader title="What I Bring" color={colors.primary} />
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {data.skills.filter(hasContent).map((skill, idx) => (
                <span key={idx} style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "10px",
                  fontWeight: 600,
                  color: "#374151",
                  backgroundColor: "#f3f4f6",
                  padding: "6px 14px",
                  borderRadius: "20px",
                }}>
                  <span style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    backgroundColor: colors.primary,
                  }} />
                  {skill}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Main Sections */}
        {data.sections.map((section) => (
          <section key={section.id} style={{ marginBottom: "24px" }}>
            <StartupSectionHeader title={section.title} color={colors.primary} />
            {section.items.map((item, idx) => (
              <StartupSectionItem key={item.id} item={item} color={colors.primary} lightColor={colors.light} isLast={idx === section.items.length - 1} />
            ))}
          </section>
        ))}

        {/* Languages - Footer style */}
        {data.languages && data.languages.length > 0 && (
          <footer style={{
            marginTop: "24px",
            paddingTop: "16px",
            borderTop: "1px solid #e5e7eb",
            display: "flex",
            alignItems: "center",
            gap: "16px",
          }}>
            <span style={{ fontSize: "10px", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Languages:
            </span>
            <div style={{ display: "flex", gap: "12px" }}>
              {data.languages.filter(hasContent).map((lang, idx) => (
                <span key={idx} style={{ fontSize: "11px", color: "#374151" }}>
                  {lang}
                </span>
              ))}
            </div>
          </footer>
        )}
      </div>
    </A4PageWrapper>
  );
}

// Helper Components
function ContactPill({ icon, value, color }: { icon: string; value: string; color: string }) {
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
      fontSize: "10px",
      color: "#4b5563",
      backgroundColor: "#f9fafb",
      padding: "6px 12px",
      borderRadius: "20px",
      border: "1px solid #e5e7eb",
    }}>
      <span style={{ color }}>{icon}</span>
      {value}
    </span>
  );
}

function StartupSectionHeader({ title, color }: { title: string; color: string }) {
  return (
    <h2 style={{
      fontSize: "18px",
      fontWeight: 700,
      color: "#111827",
      marginBottom: "16px",
      fontFamily: FONTS.sans.heading,
      display: "flex",
      alignItems: "center",
      gap: "12px",
    }}>
      <span style={{
        width: "4px",
        height: "24px",
        backgroundColor: color,
        borderRadius: "2px",
      }} />
      {title}
    </h2>
  );
}

function StartupSectionItem({ item, color, lightColor, isLast }: { item: { title?: string; subtitle?: string; date?: string; location?: string; description?: string; bullets?: string[] }; color: string; lightColor: string; isLast: boolean }) {
  return (
    <div style={{
      marginBottom: isLast ? 0 : "18px",
      paddingBottom: isLast ? 0 : "18px",
      borderBottom: isLast ? "none" : "1px solid #f3f4f6",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <h3 style={{
            fontSize: "14px",
            fontWeight: 700,
            color: "#111827",
            fontFamily: FONTS.sans.heading,
          }}>
            {formatJobTitle(item.title || "")}
          </h3>
          {item.subtitle && (
            <p style={{
              fontSize: "11px",
              fontWeight: 500,
              color,
              marginTop: "2px",
            }}>
              {item.subtitle}
            </p>
          )}
        </div>
        {item.date && (
          <span style={{
            fontSize: "11px",
            fontWeight: 600,
            color: "#6b7280",
            backgroundColor: "#f3f4f6",
            padding: "4px 10px",
            borderRadius: "4px",
            whiteSpace: "nowrap",
          }}>
            {item.date}
          </span>
        )}
      </div>

      {item.description && (
        <p style={{
          fontSize: "11px",
          color: "#4b5563",
          marginTop: "10px",
          lineHeight: 1.6,
        }}>
          {item.description}
        </p>
      )}

      {item.bullets && item.bullets.length > 0 && (
        <ul style={{ marginTop: "10px", paddingLeft: "0", listStyle: "none" }}>
          {item.bullets.filter(hasContent).map((bullet, idx) => (
            <li key={idx} style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
              marginBottom: "6px",
            }}>
              <span style={{
                width: "20px",
                height: "20px",
                borderRadius: "50%",
                backgroundColor: lightColor,
                color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "10px",
                fontWeight: 700,
                flexShrink: 0,
                marginTop: "1px",
              }}>
                {idx + 1}
              </span>
              <span style={{ fontSize: "11px", color: "#374151", lineHeight: 1.5 }}>
                {formatBulletPoint(bullet)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
