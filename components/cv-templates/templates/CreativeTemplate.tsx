"use client";

import React from "react";
import { A4PageWrapper, A4Grid } from "../A4PageWrapper";
import { getThemeColors, FONTS } from "../ThemeEngine";
import { TemplateProps } from "./TemplateProps";
import { formatName, formatJobTitle, formatBulletPoint, hasContent } from "@/utils/formatting";
import { useT } from "@/lib/i18n/LanguageProvider";
import { scaled, spaced, leading } from "@/lib/builder/density";

/**
 * Template 6: Creative
 * 
 * Unique split design with accent color background.
 * Perfect for designers, marketers, and creative professionals.
 */

export function CreativeTemplate({ data, themeColor, className }: TemplateProps) {
  const colors = getThemeColors(themeColor);
  const { t } = useT();

  return (
    <A4PageWrapper className={className}>
      <A4Grid columns="35% 65%">
        {/* Left - Accent Color Sidebar */}
        <aside style={{
          backgroundColor: colors.primary,
          padding: `${spaced(32)} ${spaced(24)}`,
          height: "100%",
          position: "relative",
          overflow: "hidden",
        }}>
          {/* Decorative circles */}
          <div style={{
            position: "absolute",
            top: "-40px",
            right: "-40px",
            width: "120px",
            height: "120px",
            borderRadius: "50%",
            backgroundColor: "rgba(255,255,255,0.1)",
          }} />
          <div style={{
            position: "absolute",
            bottom: "60px",
            left: "-20px",
            width: "80px",
            height: "80px",
            borderRadius: "50%",
            backgroundColor: "rgba(255,255,255,0.08)",
          }} />

          {/* Photo */}
          {data.photo ? (
            <div style={{
              width: "100px",
              height: "100px",
              borderRadius: "50%",
              overflow: "hidden",
              margin: `0 auto ${spaced(20)}`,
              border: "4px solid rgba(255,255,255,0.3)",
            }}>
              <img src={data.photo} alt={data.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          ) : (
            <div style={{
              width: "100px",
              height: "100px",
              borderRadius: "50%",
              margin: `0 auto ${spaced(20)}`,
              backgroundColor: "rgba(255,255,255,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: scaled(36),
              fontWeight: 700,
              color: "white",
            }}>
              {data.name?.charAt(0)?.toUpperCase() || "?"}
            </div>
          )}

          {/* Name & Title */}
          <div style={{ textAlign: "center", marginBottom: spaced(24), color: "white" }}>
            <h1 style={{
              fontSize: scaled(22),
              fontWeight: 700,
              fontFamily: FONTS.sans.heading,
              lineHeight: leading(1.2),
            }}>
              {formatName(data.name)}
            </h1>
            {data.title && (
              <p style={{
                fontSize: scaled(11),
                marginTop: spaced(6),
                opacity: 0.9,
                fontWeight: 500,
              }}>
                {formatJobTitle(data.title)}
              </p>
            )}
          </div>

          {/* Contact */}
          <CreativeSidebarSection title={t("Contact")}>
            {hasContent(data.contact.email) && <CreativeContactItem icon="✉" value={data.contact.email!} />}
            {hasContent(data.contact.phone) && <CreativeContactItem icon="☎" value={data.contact.phone!} />}
            {hasContent(data.contact.location) && <CreativeContactItem icon="📍" value={data.contact.location!} />}
            {hasContent(data.contact.linkedin) && <CreativeContactItem icon="in" value={data.contact.linkedin!} isLinkedIn />}
            {hasContent(data.contact.website) && <CreativeContactItem icon="🌐" value={data.contact.website!} />}
          </CreativeSidebarSection>

          {/* Skills */}
          {data.skills && data.skills.length > 0 && (
            <CreativeSidebarSection title={t("Skills")}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: spaced(6) }}>
                {data.skills.filter(hasContent).map((skill, idx) => (
                  <span key={idx} style={{
                    fontSize: scaled(9),
                    color: colors.primary,
                    backgroundColor: "white",
                    padding: `${spaced(4)} ${spaced(10)}`,
                    borderRadius: "12px",
                    fontWeight: 500,
                  }}>
                    {skill}
                  </span>
                ))}
              </div>
            </CreativeSidebarSection>
          )}

          {/* Languages */}
          {data.languages && data.languages.length > 0 && (
            <CreativeSidebarSection title={t("Languages")}>
              {data.languages.filter(hasContent).map((lang, idx) => (
                <p key={idx} style={{ fontSize: scaled(10), color: "rgba(255,255,255,0.9)", marginBottom: spaced(4) }}>
                  • {lang}
                </p>
              ))}
            </CreativeSidebarSection>
          )}
        </aside>

        {/* Right - Main Content */}
        <main style={{
          backgroundColor: "#ffffff",
          padding: `${spaced(32)} ${spaced(36)}`,
          fontFamily: FONTS.sans.body,
        }}>
          {/* Summary */}
          {hasContent(data.summary) && (
            <section style={{
              marginBottom: spaced(24),
              padding: `${spaced(16)} ${spaced(20)}`,
              backgroundColor: colors.light,
              borderRadius: "12px",
            }}>
              <p style={{
                fontSize: scaled(11),
                color: "#374151",
                lineHeight: leading(1.8),
                fontStyle: "italic",
              }}>
                &ldquo;{data.summary}&rdquo;
              </p>
            </section>
          )}

          {/* Sections */}
          {data.sections.map((section) => (
            <CreativeSection key={section.id} title={section.title} color={colors.primary}>
              {section.items.map((item) => (
                <CreativeSectionItem key={item.id} item={item} color={colors.primary} />
              ))}
            </CreativeSection>
          ))}
        </main>
      </A4Grid>
    </A4PageWrapper>
  );
}

// Helper Components
function CreativeSidebarSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: spaced(20) }}>
      <h3 style={{
        fontSize: scaled(9),
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.15em",
        color: "rgba(255,255,255,0.7)",
        marginBottom: spaced(10),
        paddingBottom: spaced(6),
        borderBottom: "1px solid rgba(255,255,255,0.2)",
      }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function CreativeContactItem({ icon, value, isLinkedIn = false }: { icon: string; value: string; isLinkedIn?: boolean }) {
  const getLinkedInHref = (val: string) => val.startsWith("http") ? val : `https://${val}`;
  const displayValue = isLinkedIn ? value.replace(/^https?:\/\//, "").replace(/\/$/, "") : value;
  
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: spaced(10),
      marginBottom: spaced(8),
    }}>
      <span style={{
        width: "24px",
        height: "24px",
        borderRadius: "50%",
        backgroundColor: "rgba(255,255,255,0.2)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: scaled(10),
      }}>{icon}</span>
      {isLinkedIn ? (
        <a 
          href={getLinkedInHref(value)} 
          target="_blank" 
          rel="noopener noreferrer"
          style={{ fontSize: scaled(10), color: "#bfdbfe", textDecoration: "none" }}
        >
          {displayValue}
        </a>
      ) : (
        <span style={{ fontSize: scaled(10), color: "white" }}>{value}</span>
      )}
    </div>
  );
}

function CreativeSection({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: spaced(22) }}>
      <h2 style={{
        fontSize: scaled(13),
        fontWeight: 700,
        color: color,
        marginBottom: spaced(14),
        display: "flex",
        alignItems: "center",
        gap: spaced(10),
        fontFamily: FONTS.sans.heading,
      }}>
        <span style={{
          width: "24px",
          height: "24px",
          borderRadius: "6px",
          backgroundColor: color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontSize: scaled(11),
        }}>
          {title.charAt(0)}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function CreativeSectionItem({ item, color }: { item: { title?: string; subtitle?: string; date?: string; description?: string; bullets?: string[] }; color: string }) {
  return (
    <div className="cv-item" style={{
      marginBottom: spaced(16),
      paddingLeft: spaced(14),
      borderLeft: `3px solid ${color}30`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h3 style={{ fontSize: scaled(12), fontWeight: 600, color: "#1e293b" }}>
          {formatJobTitle(item.title || "")}
        </h3>
        {item.date && (
          <span style={{
            fontSize: scaled(10),
            color,
            fontWeight: 500,
          }}>
            {item.date}
          </span>
        )}
      </div>
      {item.subtitle && (
        <p style={{ fontSize: scaled(10), color: "#6b7280", marginTop: spaced(2) }}>
          {item.subtitle}
        </p>
      )}
      {item.description && (
        <p style={{ fontSize: scaled(10), color: "#4b5563", marginTop: spaced(6), lineHeight: leading(1.6) }}>
          {item.description}
        </p>
      )}
      {item.bullets && item.bullets.length > 0 && (
        <ul style={{ marginTop: spaced(6), paddingLeft: "0", listStyle: "none" }}>
          {item.bullets.filter(hasContent).map((bullet, idx) => (
            <li key={idx} style={{
              display: "flex",
              alignItems: "flex-start",
              gap: spaced(6),
              marginBottom: spaced(3),
            }}>
              <span style={{
                width: "5px",
                height: "5px",
                borderRadius: "50%",
                backgroundColor: color,
                marginTop: spaced(5),
                flexShrink: 0,
              }} />
              <span style={{ fontSize: scaled(10), color: "#374151", lineHeight: leading(1.5) }}>
                {formatBulletPoint(bullet)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
