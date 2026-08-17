"use client";

import React from "react";
import { A4PageWrapper, A4Grid } from "../A4PageWrapper";
import { getThemeColors, FONTS } from "../ThemeEngine";
import { TemplateProps } from "./TemplateProps";
import { formatName, formatJobTitle, formatBulletPoint, hasContent } from "@/utils/formatting";
import { useT } from "@/lib/i18n/LanguageProvider";
import { scaled, spaced, leading } from "@/lib/builder/density";

/**
 * Template 1: Modern Sidebar
 * 
 * Two-column layout with dark sidebar for skills/contact.
 * Clean, professional, and widely accepted.
 */

export function ModernSidebarTemplate({ data, themeColor, className }: TemplateProps) {
  const { t } = useT();
  const colors = getThemeColors(themeColor);

  return (
    <A4PageWrapper className={className}>
      <A4Grid columns="34% 66%">
        {/* Sidebar */}
        <aside style={{
          background: "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)",
          color: "#e2e8f0",
          padding: "0",
          height: "100%",
          fontFamily: FONTS.sans.body,
          position: "relative",
        }}>
          {/* Accent Line */}
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "4px",
            height: "100%",
            background: `linear-gradient(180deg, ${colors.primary} 0%, ${colors.dark} 100%)`,
          }} />

          {/* Profile Avatar */}
          <div style={{ padding: `${spaced(28)} ${spaced(20)} ${spaced(20)} ${spaced(24)}`, borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
            {data.photo ? (
              <div style={{
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                overflow: "hidden",
                margin: `0 auto ${spaced(12)}`,
                border: `3px solid ${colors.primary}`,
              }}>
                <img src={data.photo} alt={data.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
            ) : (
              <div style={{
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                margin: `0 auto ${spaced(12)}`,
                background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.dark} 100%)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: scaled(28),
                fontWeight: 700,
                color: "white",
              }}>
                {data.name?.charAt(0)?.toUpperCase() || "?"}
              </div>
            )}
          </div>

          {/* Contact */}
          <SidebarSection title={t("Contact")} color={colors.primary}>
            {hasContent(data.contact.email) && (
              <ContactItem icon="✉" value={data.contact.email!} color={colors.primary} />
            )}
            {hasContent(data.contact.phone) && (
              <ContactItem icon="☎" value={data.contact.phone!} color={colors.primary} />
            )}
            {hasContent(data.contact.location) && (
              <ContactItem icon="📍" value={data.contact.location!} color={colors.primary} />
            )}
            {hasContent(data.contact.linkedin) && (
              <ContactItem icon="in" value={data.contact.linkedin!} color={colors.primary} isLinkedIn />
            )}
          </SidebarSection>

          {/* Skills - Tag Cloud */}
          {data.skills && data.skills.length > 0 && (
            <SidebarSection title={t("Skills")} color={colors.primary}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: spaced(6) }}>
                {data.skills.filter(hasContent).map((skill, idx) => (
                  <span key={idx} style={{
                    fontSize: scaled(9),
                    fontWeight: 500,
                    color: colors.primary,
                    backgroundColor: `${colors.primary}20`,
                    padding: `${spaced(4)} ${spaced(10)}`,
                    borderRadius: "12px",
                  }}>
                    {skill}
                  </span>
                ))}
              </div>
            </SidebarSection>
          )}

          {/* Languages */}
          {data.languages && data.languages.length > 0 && (
            <SidebarSection title={t("Languages")} color={colors.primary}>
              {data.languages.filter(hasContent).map((lang, idx) => (
                <div key={idx} style={{ display: "flex", alignItems: "center", gap: spaced(8), marginBottom: spaced(6) }}>
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: colors.primary }} />
                  <span style={{ fontSize: scaled(10), color: "#94a3b8" }}>{lang}</span>
                </div>
              ))}
            </SidebarSection>
          )}
        </aside>

        {/* Main Content */}
        <main style={{ backgroundColor: "#ffffff", padding: `${spaced(28)} ${spaced(32)}`, fontFamily: FONTS.sans.body }}>
          {/* Header */}
          <header style={{ marginBottom: spaced(20), paddingBottom: spaced(16), borderBottom: `2px solid ${colors.light}` }}>
            <h1 style={{
              fontSize: scaled(30),
              fontWeight: 700,
              color: "#0f172a",
              fontFamily: FONTS.sans.heading,
              marginBottom: spaced(4),
            }}>
              {formatName(data.name)}
            </h1>
            {data.title && (
              <p style={{ fontSize: scaled(12), fontWeight: 500, color: colors.primary, textTransform: "uppercase", letterSpacing: "0.15em" }}>
                {formatJobTitle(data.title)}
              </p>
            )}
          </header>

          {/* Summary */}
          {hasContent(data.summary) && (
            <MainSection title={t("Profile")} color={colors.primary}>
              <p style={{ fontSize: scaled(10), color: "#475569", lineHeight: leading(1.7) }}>
                {data.summary}
              </p>
            </MainSection>
          )}

          {/* Sections */}
          {data.sections.map((section) => (
            <MainSection key={section.id} title={section.title} color={colors.primary}>
              {section.items.map((item) => (
                <SectionItem key={item.id} item={item} color={colors.primary} />
              ))}
            </MainSection>
          ))}
        </main>
      </A4Grid>
    </A4PageWrapper>
  );
}

// Helper Components
function SidebarSection({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: `${spaced(16)} ${spaced(20)} ${spaced(16)} ${spaced(24)}` }}>
      <h3 style={{
        fontSize: scaled(9),
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.15em",
        color: "#94a3b8",
        marginBottom: spaced(12),
        display: "flex",
        alignItems: "center",
        gap: spaced(8),
      }}>
        <span style={{ width: "8px", height: "8px", backgroundColor: color, borderRadius: "2px" }} />
        {title}
      </h3>
      {children}
    </div>
  );
}

function ContactItem({ icon, value, color, isLinkedIn = false }: { icon: string; value: string; color: string; isLinkedIn?: boolean }) {
  // Format LinkedIn URL for linking
  const getLinkedInHref = (val: string) => {
    if (!val) return "";
    return val.startsWith("http") ? val : `https://${val}`;
  };
  
  const displayValue = isLinkedIn ? value.replace(/^https?:\/\//, "").replace(/\/$/, "") : value;
  
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: spaced(10),
      marginBottom: spaced(8),
      padding: `${spaced(6)} ${spaced(8)}`,
      backgroundColor: "rgba(255,255,255,0.03)",
      borderRadius: "6px",
    }}>
      <span style={{
        color,
        fontSize: scaled(10),
        width: "16px",
        height: "16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: `${color}20`,
        borderRadius: "4px",
      }}>{icon}</span>
      {isLinkedIn ? (
        <a 
          href={getLinkedInHref(value)} 
          target="_blank" 
          rel="noopener noreferrer"
          style={{ fontSize: scaled(10), color: "#93c5fd", textDecoration: "none" }}
        >
          {displayValue}
        </a>
      ) : (
        <span style={{ fontSize: scaled(10), color: "#cbd5e1" }}>{value}</span>
      )}
    </div>
  );
}

function MainSection({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: spaced(20) }}>
      <h2 style={{
        fontSize: scaled(11),
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        color: "#1e293b",
        marginBottom: spaced(12),
        paddingBottom: spaced(6),
        borderBottom: "1px solid #e2e8f0",
        display: "flex",
        alignItems: "center",
        gap: spaced(8),
      }}>
        <span style={{ color, fontSize: scaled(12) }}>◆</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function SectionItem({ item, color }: { item: { title?: string; subtitle?: string; date?: string; description?: string; bullets?: string[] }; color: string }) {
  return (
    <div className="cv-item" style={{ marginBottom: spaced(14), paddingLeft: spaced(6), borderLeft: `3px solid ${color}20` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h3 style={{ fontSize: scaled(12), fontWeight: 600, color: "#1e293b" }}>
          {formatJobTitle(item.title || "")}
        </h3>
        {item.date && (
          <span style={{
            fontSize: scaled(10),
            fontWeight: 500,
            color,
            backgroundColor: `${color}10`,
            padding: `${spaced(2)} ${spaced(8)}`,
            borderRadius: "4px",
          }}>{item.date}</span>
        )}
      </div>
      {item.subtitle && (
        <p style={{ fontSize: scaled(11), fontWeight: 500, color: "#64748b", marginTop: spaced(2) }}>
          {item.subtitle}
        </p>
      )}
      {item.description && (
        <p style={{ fontSize: scaled(10), color: "#64748b", marginTop: spaced(4), lineHeight: leading(1.5) }}>
          {item.description}
        </p>
      )}
      {item.bullets && item.bullets.length > 0 && (
        <ul style={{ marginTop: spaced(6), paddingLeft: "0", listStyle: "none" }}>
          {item.bullets.filter(hasContent).map((bullet, idx) => (
            <li key={idx} style={{ display: "flex", alignItems: "flex-start", gap: spaced(8), marginBottom: spaced(4) }}>
              <span style={{ color, fontSize: scaled(10), marginTop: spaced(2) }}>▹</span>
              <span style={{ fontSize: scaled(10), color: "#475569", lineHeight: leading(1.5) }}>
                {formatBulletPoint(bullet)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
