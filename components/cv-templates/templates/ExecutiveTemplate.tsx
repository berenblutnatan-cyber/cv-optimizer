"use client";

import React from "react";
import { A4PageWrapper } from "../A4PageWrapper";
import { getThemeColors, FONTS } from "../ThemeEngine";
import { TemplateProps } from "./TemplateProps";
import { formatName, formatJobTitle, formatBulletPoint, hasContent } from "@/utils/formatting";

/**
 * Template 4: Executive
 * 
 * Bold dark header block with name in white.
 * Serious, commanding presence for senior roles.
 */

export function ExecutiveTemplate({ data, themeColor, className }: TemplateProps) {
  const colors = getThemeColors(themeColor);

  return (
    <A4PageWrapper className={className}>
      <div style={{
        backgroundColor: "#ffffff",
        minHeight: "100%",
        fontFamily: FONTS.sans.body,
      }}>
        {/* Dark Header Block */}
        <header style={{
          backgroundColor: "#111827",
          padding: "40px 48px",
          display: "flex",
          alignItems: "center",
          gap: "24px",
        }}>
          {/* Optional Photo */}
          {data.photo ? (
            <div style={{
              width: "90px",
              height: "90px",
              borderRadius: "50%",
              overflow: "hidden",
              border: `3px solid ${colors.primary}`,
              flexShrink: 0,
            }}>
              <img src={data.photo} alt={data.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          ) : (
            <div style={{
              width: "90px",
              height: "90px",
              borderRadius: "50%",
              background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.dark} 100%)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "32px",
              fontWeight: 700,
              color: "white",
              flexShrink: 0,
            }}>
              {data.name?.charAt(0)?.toUpperCase() || "?"}
            </div>
          )}

          {/* Name & Title */}
          <div style={{ flex: 1 }}>
            <h1 style={{
              fontSize: "34px",
              fontWeight: 700,
              color: "#ffffff",
              fontFamily: FONTS.sans.heading,
              letterSpacing: "-0.02em",
            }}>
              {formatName(data.name)}
            </h1>
            {data.title && (
              <p style={{
                fontSize: "14px",
                color: colors.primary,
                marginTop: "6px",
                fontWeight: 500,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}>
                {formatJobTitle(data.title)}
              </p>
            )}
          </div>
        </header>

        {/* Contact Bar */}
        <div style={{
          backgroundColor: colors.primary,
          padding: "12px 48px",
          display: "flex",
          justifyContent: "center",
          gap: "32px",
          flexWrap: "wrap",
        }}>
          {hasContent(data.contact.email) && (
            <span style={{ fontSize: "11px", color: "#ffffff", fontWeight: 500 }}>
              ✉ {data.contact.email}
            </span>
          )}
          {hasContent(data.contact.phone) && (
            <span style={{ fontSize: "11px", color: "#ffffff", fontWeight: 500 }}>
              ☎ {data.contact.phone}
            </span>
          )}
          {hasContent(data.contact.location) && (
            <span style={{ fontSize: "11px", color: "#ffffff", fontWeight: 500 }}>
              📍 {data.contact.location}
            </span>
          )}
          {hasContent(data.contact.linkedin) && (
            <a 
              href={data.contact.linkedin!.startsWith("http") ? data.contact.linkedin! : `https://${data.contact.linkedin}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: "11px", color: "#bfdbfe", fontWeight: 500, textDecoration: "none" }}
            >
              in {data.contact.linkedin!.replace(/^https?:\/\//, "").replace(/\/$/, "")}
            </a>
          )}
        </div>

        {/* Main Content */}
        <div style={{ padding: "32px 48px" }}>
          {/* Summary */}
          {hasContent(data.summary) && (
            <section style={{ marginBottom: "28px" }}>
              <h2 style={{
                fontSize: "12px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.15em",
                color: "#111827",
                marginBottom: "12px",
                paddingBottom: "8px",
                borderBottom: `3px solid ${colors.primary}`,
                display: "inline-block",
              }}>
                Executive Summary
              </h2>
              <p style={{ fontSize: "11px", color: "#374151", lineHeight: 1.8 }}>
                {data.summary}
              </p>
            </section>
          )}

          {/* Two Column Layout */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: "32px" }}>
            {/* Left - Experience/Education */}
            <div>
              {data.sections.map((section) => (
                <ExecSection key={section.id} title={section.title} color={colors.primary}>
                  {section.items.map((item) => (
                    <ExecSectionItem key={item.id} item={item} color={colors.primary} />
                  ))}
                </ExecSection>
              ))}
            </div>

            {/* Right - Skills/Languages */}
            <div>
              {data.skills && data.skills.length > 0 && (
                <ExecSection title="Core Competencies" color={colors.primary}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {data.skills.filter(hasContent).map((skill, idx) => (
                      <span key={idx} style={{
                        fontSize: "10px",
                        fontWeight: 500,
                        color: colors.dark,
                        backgroundColor: `${colors.primary}15`,
                        padding: "6px 12px",
                        borderRadius: "16px",
                        border: `1px solid ${colors.primary}30`,
                      }}>
                        {skill}
                      </span>
                    ))}
                  </div>
                </ExecSection>
              )}

              {data.languages && data.languages.length > 0 && (
                <ExecSection title="Languages" color={colors.primary}>
                  {data.languages.filter(hasContent).map((lang, idx) => (
                    <div key={idx} style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginBottom: "6px",
                    }}>
                      <span style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        backgroundColor: colors.primary,
                      }} />
                      <span style={{ fontSize: "10px", color: "#4b5563" }}>{lang}</span>
                    </div>
                  ))}
                </ExecSection>
              )}
            </div>
          </div>
        </div>
      </div>
    </A4PageWrapper>
  );
}

// Helper Components
function ExecSection({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: "24px" }}>
      <h2 style={{
        fontSize: "11px",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.12em",
        color: "#111827",
        marginBottom: "14px",
        paddingBottom: "6px",
        borderBottom: `2px solid ${color}`,
        display: "inline-block",
      }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function ExecSectionItem({ item, color }: { item: { title?: string; subtitle?: string; date?: string; location?: string; description?: string; bullets?: string[] }; color: string }) {
  return (
    <div style={{ marginBottom: "18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: "12px", fontWeight: 700, color: "#111827" }}>
            {formatJobTitle(item.title || "")}
          </h3>
          {item.subtitle && (
            <p style={{ fontSize: "11px", color: "#6b7280", marginTop: "2px" }}>
              {item.subtitle}
            </p>
          )}
        </div>
        {item.date && (
          <span style={{
            fontSize: "10px",
            fontWeight: 600,
            color: "#ffffff",
            backgroundColor: color,
            padding: "3px 10px",
            borderRadius: "4px",
            whiteSpace: "nowrap",
          }}>
            {item.date}
          </span>
        )}
      </div>

      {item.description && (
        <p style={{ fontSize: "10px", color: "#4b5563", marginTop: "8px", lineHeight: 1.6 }}>
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
              marginBottom: "4px",
            }}>
              <span style={{ color, fontSize: "10px", marginTop: "2px", fontWeight: 700 }}>▸</span>
              <span style={{ fontSize: "10px", color: "#374151", lineHeight: 1.6 }}>
                {formatBulletPoint(bullet)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
