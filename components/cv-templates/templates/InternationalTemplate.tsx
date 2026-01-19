"use client";

import React from "react";
import { A4PageWrapper, A4Grid } from "../A4PageWrapper";
import { getThemeColors, FONTS } from "../ThemeEngine";
import { TemplateProps } from "./TemplateProps";
import { formatName, formatJobTitle, formatBulletPoint, hasContent } from "@/utils/formatting";

/**
 * Template 8: International
 * 
 * Standardized layout with optional photo support.
 * Common in European countries, follows formal conventions.
 */

export function InternationalTemplate({ data, themeColor, className }: TemplateProps) {
  const colors = getThemeColors(themeColor);
  const hasPhoto = !!data.photo;

  return (
    <A4PageWrapper className={className}>
      <div style={{
        backgroundColor: "#ffffff",
        minHeight: "100%",
        fontFamily: FONTS.clean.body,
        padding: "36px 40px",
      }}>
        {/* Header with optional photo */}
        <header style={{
          display: "flex",
          gap: "24px",
          marginBottom: "24px",
          paddingBottom: "20px",
          borderBottom: `2px solid ${colors.primary}`,
        }}>
          {/* Photo (Optional) */}
          {hasPhoto && (
            <div style={{
              width: "100px",
              height: "130px",
              overflow: "hidden",
              border: `2px solid ${colors.light}`,
              flexShrink: 0,
            }}>
              <img src={data.photo} alt={data.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          )}

          {/* Personal Info */}
          <div style={{ flex: 1 }}>
            <h1 style={{
              fontSize: "26px",
              fontWeight: 700,
              color: "#1e293b",
              fontFamily: FONTS.clean.heading,
              marginBottom: "4px",
            }}>
              {formatName(data.name)}
            </h1>
            {data.title && (
              <p style={{
                fontSize: "13px",
                color: colors.primary,
                fontWeight: 500,
                marginBottom: "12px",
              }}>
                {formatJobTitle(data.title)}
              </p>
            )}

            {/* Contact Grid */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "6px 20px",
            }}>
              {hasContent(data.contact.email) && (
                <IntlContactItem label="Email" value={data.contact.email!} />
              )}
              {hasContent(data.contact.phone) && (
                <IntlContactItem label="Phone" value={data.contact.phone!} />
              )}
              {hasContent(data.contact.location) && (
                <IntlContactItem label="Address" value={data.contact.location!} />
              )}
              {hasContent(data.contact.linkedin) && (
                <IntlContactItem label="LinkedIn" value={data.contact.linkedin!} />
              )}
              {hasContent(data.contact.website) && (
                <IntlContactItem label="Website" value={data.contact.website!} />
              )}
            </div>
          </div>
        </header>

        {/* Two Column Layout */}
        <A4Grid columns="1fr 200px" gap={24}>
          {/* Left - Main Content */}
          <div>
            {/* Summary / Profile */}
            {hasContent(data.summary) && (
              <IntlSection title="Profile" color={colors.primary}>
                <p style={{
                  fontSize: "10px",
                  color: "#374151",
                  lineHeight: 1.8,
                }}>
                  {data.summary}
                </p>
              </IntlSection>
            )}

            {/* Sections */}
            {data.sections.map((section) => (
              <IntlSection key={section.id} title={section.title} color={colors.primary}>
                {section.items.map((item) => (
                  <IntlSectionItem key={item.id} item={item} color={colors.primary} />
                ))}
              </IntlSection>
            ))}
          </div>

          {/* Right - Sidebar */}
          <div>
            {/* Skills */}
            {data.skills && data.skills.length > 0 && (
              <IntlSection title="Skills" color={colors.primary}>
                {data.skills.filter(hasContent).map((skill, idx) => (
                  <div key={idx} style={{
                    marginBottom: "8px",
                  }}>
                    <p style={{ fontSize: "10px", color: "#374151", marginBottom: "4px" }}>{skill}</p>
                    <div style={{
                      height: "4px",
                      backgroundColor: "#e5e7eb",
                      borderRadius: "2px",
                    }}>
                      <div style={{
                        height: "100%",
                        width: `${70 + ((skill.length * 5) % 30)}%`,
                        backgroundColor: colors.primary,
                        borderRadius: "2px",
                      }} />
                    </div>
                  </div>
                ))}
              </IntlSection>
            )}

            {/* Languages */}
            {data.languages && data.languages.length > 0 && (
              <IntlSection title="Languages" color={colors.primary}>
                {data.languages.filter(hasContent).map((lang, idx) => (
                  <div key={idx} style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "6px",
                    padding: "6px 0",
                    borderBottom: "1px solid #f3f4f6",
                  }}>
                    <span style={{ fontSize: "10px", color: "#374151" }}>{lang.split(" - ")[0] || lang}</span>
                    <span style={{ fontSize: "9px", color: "#6b7280" }}>{lang.split(" - ")[1] || ""}</span>
                  </div>
                ))}
              </IntlSection>
            )}
          </div>
        </A4Grid>
      </div>
    </A4PageWrapper>
  );
}

// Helper Components
function IntlContactItem({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: "8px" }}>
      <span style={{ fontSize: "10px", fontWeight: 600, color: "#6b7280", minWidth: "55px" }}>{label}:</span>
      <span style={{ fontSize: "10px", color: "#374151" }}>{value}</span>
    </div>
  );
}

function IntlSection({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: "20px" }}>
      <h2 style={{
        fontSize: "11px",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        color: "#1e293b",
        marginBottom: "12px",
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

function IntlSectionItem({ item, color }: { item: { title?: string; subtitle?: string; date?: string; location?: string; description?: string; bullets?: string[] }; color: string }) {
  return (
    <div style={{ marginBottom: "14px" }}>
      {/* Date aligned right */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: "12px", fontWeight: 600, color: "#1e293b" }}>
            {formatJobTitle(item.title || "")}
          </h3>
          {item.subtitle && (
            <p style={{ fontSize: "10px", color: "#6b7280", marginTop: "2px" }}>
              {item.subtitle}{item.location ? ` — ${item.location}` : ""}
            </p>
          )}
        </div>
        {item.date && (
          <span style={{
            fontSize: "10px",
            fontWeight: 500,
            color,
            textAlign: "right",
            whiteSpace: "nowrap",
          }}>
            {item.date}
          </span>
        )}
      </div>

      {/* Description */}
      {item.description && (
        <p style={{ fontSize: "10px", color: "#4b5563", marginTop: "6px", lineHeight: 1.6 }}>
          {item.description}
        </p>
      )}

      {/* Bullets */}
      {item.bullets && item.bullets.length > 0 && (
        <ul style={{ marginTop: "6px", paddingLeft: "14px" }}>
          {item.bullets.filter(hasContent).map((bullet, idx) => (
            <li key={idx} style={{
              fontSize: "10px",
              color: "#374151",
              lineHeight: 1.6,
              marginBottom: "3px",
            }}>
              {formatBulletPoint(bullet)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
