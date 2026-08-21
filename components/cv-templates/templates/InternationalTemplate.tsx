"use client";

import React from "react";
import { A4PageWrapper, A4Grid } from "../A4PageWrapper";
import { getThemeColors, FONTS } from "../ThemeEngine";
import { TemplateProps } from "./TemplateProps";
import { formatName, formatJobTitle, formatBulletPoint, hasContent } from "@/utils/formatting";
import { useT } from "@/lib/i18n/LanguageProvider";
import { scaled, spaced, leading } from "@/lib/builder/density";

/**
 * Template 8: International
 * 
 * Standardized layout with optional photo support.
 * Common in European countries, follows formal conventions.
 */

export function InternationalTemplate({ data, themeColor, className }: TemplateProps) {
  const { t } = useT();
  const colors = getThemeColors(themeColor);
  const hasPhoto = !!data.photo;

  return (
    <A4PageWrapper className={className}>
      <div style={{
        backgroundColor: "#ffffff",
        minHeight: "100%",
        fontFamily: FONTS.clean.body,
        padding: `${spaced(36)} ${spaced(40)}`,
      }}>
        {/* Header with optional photo */}
        <header style={{
          display: "flex",
          gap: spaced(24),
          marginBottom: spaced(24),
          paddingBottom: spaced(20),
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
              fontSize: scaled(26),
              fontWeight: 700,
              color: "#1e293b",
              fontFamily: FONTS.clean.heading,
              marginBottom: spaced(4),
            }}>
              {formatName(data.name)}
            </h1>
            {data.title && (
              <p style={{
                fontSize: scaled(13),
                color: colors.primary,
                fontWeight: 500,
                marginBottom: spaced(12),
              }}>
                {formatJobTitle(data.title)}
              </p>
            )}

            {/* Contact Grid */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: `${spaced(6)} ${spaced(20)}`,
            }}>
              {hasContent(data.contact.email) && (
                <IntlContactItem label={t("Email")} value={data.contact.email!} />
              )}
              {hasContent(data.contact.phone) && (
                <IntlContactItem label={t("Phone")} value={data.contact.phone!} />
              )}
              {hasContent(data.contact.location) && (
                <IntlContactItem label={t("Address")} value={data.contact.location!} />
              )}
              {hasContent(data.contact.linkedin) && (
                <IntlContactItem label={t("LinkedIn")} value={data.contact.linkedin!} isLinkedIn />
              )}
              {hasContent(data.contact.website) && (
                <IntlContactItem label={t("Website")} value={data.contact.website!} />
              )}
            </div>
          </div>
        </header>

        {/* Two Column Layout */}
        <A4Grid columns="1fr 200px" gap="24px">
          {/* Left - Main Content */}
          <div>
            {/* Summary / Profile */}
            {hasContent(data.summary) && (
              <IntlSection title={t("Profile")} color={colors.primary}>
                <p style={{
                  fontSize: scaled(10),
                  color: "#374151",
                  lineHeight: leading(1.8),
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
            {/* Skills - Tag Cloud */}
            {data.skills && data.skills.length > 0 && (
              <IntlSection title={t("Skills")} color={colors.primary}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: spaced(6) }}>
                  {data.skills.filter(hasContent).map((skill, idx) => (
                    <span key={idx} style={{
                      fontSize: scaled(9),
                      fontWeight: 500,
                      color: colors.dark,
                      backgroundColor: `${colors.primary}15`,
                      padding: `${spaced(4)} ${spaced(10)}`,
                      borderRadius: "10px",
                    }}>
                      {skill}
                    </span>
                  ))}
                </div>
              </IntlSection>
            )}

            {/* Languages */}
            {data.languages && data.languages.length > 0 && (
              <IntlSection title={t("Languages")} color={colors.primary}>
                {data.languages.filter(hasContent).map((lang, idx) => (
                  <div key={idx} style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: spaced(6),
                    padding: `${spaced(6)} 0`,
                    borderBottom: "1px solid #f3f4f6",
                  }}>
                    <span style={{ fontSize: scaled(10), color: "#374151" }}>{lang.split(" - ")[0] || lang}</span>
                    <span style={{ fontSize: scaled(9), color: "#6b7280" }}>{lang.split(" - ")[1] || ""}</span>
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
function IntlContactItem({ label, value, isLinkedIn = false }: { label: string; value: string; isLinkedIn?: boolean }) {
  const getLinkedInHref = (val: string) => val.startsWith("http") ? val : `https://${val}`;
  const displayValue = isLinkedIn ? value.replace(/^https?:\/\//, "").replace(/\/$/, "") : value;
  
  return (
    <div style={{ display: "flex", gap: spaced(8) }}>
      <span style={{ fontSize: scaled(10), fontWeight: 600, color: "#6b7280", minWidth: "55px" }}>{label}:</span>
      {isLinkedIn ? (
        <a 
          href={getLinkedInHref(value)} 
          target="_blank" 
          rel="noopener noreferrer"
          style={{ fontSize: scaled(10), color: "#4f46e5", textDecoration: "none" }}
        >
          {displayValue}
        </a>
      ) : (
        <span style={{ fontSize: scaled(10), color: "#374151" }}>{value}</span>
      )}
    </div>
  );
}

function IntlSection({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: spaced(20) }}>
      <h2 style={{
        fontSize: scaled(11),
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        color: "#1e293b",
        marginBottom: spaced(12),
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

function IntlSectionItem({ item, color }: { item: { title?: string; subtitle?: string; date?: string; location?: string; description?: string; bullets?: string[] }; color: string }) {
  return (
    <div className="cv-item" style={{ marginBottom: spaced(14) }}>
      {/* Date aligned right */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: scaled(12), fontWeight: 600, color: "#1e293b" }}>
            {formatJobTitle(item.title || "")}
          </h3>
          {item.subtitle && (
            <p style={{ fontSize: scaled(10), color: "#6b7280", marginTop: spaced(2) }}>
              {item.subtitle}{item.location ? ` — ${item.location}` : ""}
            </p>
          )}
        </div>
        {item.date && (
          <span style={{
            fontSize: scaled(10),
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
        <p style={{ fontSize: scaled(10), color: "#4b5563", marginTop: spaced(6), lineHeight: leading(1.6) }}>
          {item.description}
        </p>
      )}

      {/* Bullets */}
      {item.bullets && item.bullets.length > 0 && (
        <ul style={{ marginTop: spaced(6), paddingLeft: spaced(14) }}>
          {item.bullets.filter(hasContent).map((bullet, idx) => (
            <li key={idx} style={{
              fontSize: scaled(10),
              color: "#374151",
              lineHeight: leading(1.6),
              marginBottom: spaced(3),
            }}>
              {formatBulletPoint(bullet)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
