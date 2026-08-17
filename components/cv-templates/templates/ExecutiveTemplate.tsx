"use client";

import React from "react";
import { A4PageWrapper } from "../A4PageWrapper";
import { getThemeColors, FONTS } from "../ThemeEngine";
import { TemplateProps } from "./TemplateProps";
import { formatName, formatJobTitle, formatBulletPoint, hasContent } from "@/utils/formatting";
import { useT } from "@/lib/i18n/LanguageProvider";
import { scaled, spaced, leading } from "@/lib/builder/density";

/**
 * Template 4: Executive
 * 
 * Bold dark header block with name in white.
 * Serious, commanding presence for senior roles.
 */

export function ExecutiveTemplate({ data, themeColor, className }: TemplateProps) {
  const colors = getThemeColors(themeColor);
  const { t } = useT();

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
          padding: `${spaced(40)} ${spaced(48)}`,
          display: "flex",
          alignItems: "center",
          gap: spaced(24),
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
              fontSize: scaled(32),
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
              fontSize: scaled(34),
              fontWeight: 700,
              color: "#ffffff",
              fontFamily: FONTS.sans.heading,
              letterSpacing: "-0.02em",
            }}>
              {formatName(data.name)}
            </h1>
            {data.title && (
              <p style={{
                fontSize: scaled(14),
                color: colors.primary,
                marginTop: spaced(6),
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
          padding: `${spaced(12)} ${spaced(48)}`,
          display: "flex",
          justifyContent: "center",
          gap: spaced(32),
          flexWrap: "wrap",
        }}>
          {hasContent(data.contact.email) && (
            <span style={{ fontSize: scaled(11), color: "#ffffff", fontWeight: 500 }}>
              ✉ {data.contact.email}
            </span>
          )}
          {hasContent(data.contact.phone) && (
            <span style={{ fontSize: scaled(11), color: "#ffffff", fontWeight: 500 }}>
              ☎ {data.contact.phone}
            </span>
          )}
          {hasContent(data.contact.location) && (
            <span style={{ fontSize: scaled(11), color: "#ffffff", fontWeight: 500 }}>
              📍 {data.contact.location}
            </span>
          )}
          {hasContent(data.contact.linkedin) && (
            <a 
              href={data.contact.linkedin!.startsWith("http") ? data.contact.linkedin! : `https://${data.contact.linkedin}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: scaled(11), color: "#bfdbfe", fontWeight: 500, textDecoration: "none" }}
            >
              in {data.contact.linkedin!.replace(/^https?:\/\//, "").replace(/\/$/, "")}
            </a>
          )}
        </div>

        {/* Main Content */}
        <div style={{ padding: `${spaced(32)} ${spaced(48)}` }}>
          {/* Summary */}
          {hasContent(data.summary) && (
            <section style={{ marginBottom: spaced(28) }}>
              <h2 style={{
                fontSize: scaled(12),
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.15em",
                color: "#111827",
                marginBottom: spaced(12),
                paddingBottom: spaced(8),
                borderBottom: `3px solid ${colors.primary}`,
                display: "inline-block",
              }}>
                {t("Executive Summary")}
              </h2>
              <p style={{ fontSize: scaled(11), color: "#374151", lineHeight: leading(1.8) }}>
                {data.summary}
              </p>
            </section>
          )}

          {/* Two Column Layout */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: spaced(32) }}>
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
                <ExecSection title={t("Core Competencies")} color={colors.primary}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: spaced(8) }}>
                    {data.skills.filter(hasContent).map((skill, idx) => (
                      <span key={idx} style={{
                        fontSize: scaled(10),
                        fontWeight: 500,
                        color: colors.dark,
                        backgroundColor: `${colors.primary}15`,
                        padding: `${spaced(6)} ${spaced(12)}`,
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
                <ExecSection title={t("Languages")} color={colors.primary}>
                  {data.languages.filter(hasContent).map((lang, idx) => (
                    <div key={idx} style={{
                      display: "flex",
                      alignItems: "center",
                      gap: spaced(8),
                      marginBottom: spaced(6),
                    }}>
                      <span style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        backgroundColor: colors.primary,
                      }} />
                      <span style={{ fontSize: scaled(10), color: "#4b5563" }}>{lang}</span>
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
    <section style={{ marginBottom: spaced(24) }}>
      <h2 style={{
        fontSize: scaled(11),
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.12em",
        color: "#111827",
        marginBottom: spaced(14),
        paddingBottom: spaced(6),
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
    <div className="cv-item" style={{ marginBottom: spaced(18) }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: scaled(12), fontWeight: 700, color: "#111827" }}>
            {formatJobTitle(item.title || "")}
          </h3>
          {item.subtitle && (
            <p style={{ fontSize: scaled(11), color: "#6b7280", marginTop: spaced(2) }}>
              {item.subtitle}
            </p>
          )}
        </div>
        {item.date && (
          <span style={{
            fontSize: scaled(10),
            fontWeight: 600,
            color: "#ffffff",
            backgroundColor: color,
            padding: `${spaced(3)} ${spaced(10)}`,
            borderRadius: "4px",
            whiteSpace: "nowrap",
          }}>
            {item.date}
          </span>
        )}
      </div>

      {item.description && (
        <p style={{ fontSize: scaled(10), color: "#4b5563", marginTop: spaced(8), lineHeight: leading(1.6) }}>
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
              marginBottom: spaced(4),
            }}>
              <span style={{ color, fontSize: scaled(10), marginTop: spaced(2), fontWeight: 700 }}>▸</span>
              <span style={{ fontSize: scaled(10), color: "#374151", lineHeight: leading(1.6) }}>
                {formatBulletPoint(bullet)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
