"use client";

import React from "react";
import { A4PageWrapper, A4Grid } from "../A4PageWrapper";
import { getThemeColors, FONTS } from "../ThemeEngine";
import { TemplateProps } from "./TemplateProps";
import { formatName, formatJobTitle, formatBulletPoint, hasContent } from "@/utils/formatting";

/**
 * Template 1: Modern Sidebar
 * 
 * Two-column layout with dark sidebar for skills/contact.
 * Clean, professional, and widely accepted.
 */

export function ModernSidebarTemplate({ data, themeColor, className }: TemplateProps) {
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
          <div style={{ padding: "28px 20px 20px 24px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
            {data.photo ? (
              <div style={{
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                overflow: "hidden",
                margin: "0 auto 12px",
                border: `3px solid ${colors.primary}`,
              }}>
                <img src={data.photo} alt={data.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
            ) : (
              <div style={{
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                margin: "0 auto 12px",
                background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.dark} 100%)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "28px",
                fontWeight: 700,
                color: "white",
              }}>
                {data.name?.charAt(0)?.toUpperCase() || "?"}
              </div>
            )}
          </div>

          {/* Contact */}
          <SidebarSection title="Contact" color={colors.primary}>
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

          {/* Skills */}
          {data.skills && data.skills.length > 0 && (
            <SidebarSection title="Skills" color={colors.primary}>
              {data.skills.filter(hasContent).map((skill, idx) => (
                <div key={idx} style={{ marginBottom: "10px" }}>
                  <p style={{ fontSize: "10px", color: "#cbd5e1", marginBottom: "4px" }}>{skill}</p>
                  <div style={{ height: "5px", backgroundColor: "rgba(255,255,255,0.1)", borderRadius: "3px" }}>
                    <div style={{
                      height: "100%",
                      width: `${75 + ((skill.length * 3) % 25)}%`,
                      backgroundColor: colors.primary,
                      borderRadius: "3px",
                    }} />
                  </div>
                </div>
              ))}
            </SidebarSection>
          )}

          {/* Languages */}
          {data.languages && data.languages.length > 0 && (
            <SidebarSection title="Languages" color={colors.primary}>
              {data.languages.filter(hasContent).map((lang, idx) => (
                <div key={idx} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: colors.primary }} />
                  <span style={{ fontSize: "10px", color: "#94a3b8" }}>{lang}</span>
                </div>
              ))}
            </SidebarSection>
          )}
        </aside>

        {/* Main Content */}
        <main style={{ backgroundColor: "#ffffff", padding: "28px 32px", fontFamily: FONTS.sans.body }}>
          {/* Header */}
          <header style={{ marginBottom: "20px", paddingBottom: "16px", borderBottom: `2px solid ${colors.light}` }}>
            <h1 style={{
              fontSize: "30px",
              fontWeight: 700,
              color: "#0f172a",
              fontFamily: FONTS.sans.heading,
              marginBottom: "4px",
            }}>
              {formatName(data.name)}
            </h1>
            {data.title && (
              <p style={{ fontSize: "12px", fontWeight: 500, color: colors.primary, textTransform: "uppercase", letterSpacing: "0.15em" }}>
                {formatJobTitle(data.title)}
              </p>
            )}
          </header>

          {/* Summary */}
          {hasContent(data.summary) && (
            <MainSection title="Profile" color={colors.primary}>
              <p style={{ fontSize: "10px", color: "#475569", lineHeight: 1.7 }}>
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
    <div style={{ padding: "16px 20px 16px 24px" }}>
      <h3 style={{
        fontSize: "9px",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.15em",
        color: "#94a3b8",
        marginBottom: "12px",
        display: "flex",
        alignItems: "center",
        gap: "8px",
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
      gap: "10px",
      marginBottom: "8px",
      padding: "6px 8px",
      backgroundColor: "rgba(255,255,255,0.03)",
      borderRadius: "6px",
    }}>
      <span style={{
        color,
        fontSize: "10px",
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
          style={{ fontSize: "10px", color: "#93c5fd", textDecoration: "none" }}
        >
          {displayValue}
        </a>
      ) : (
        <span style={{ fontSize: "10px", color: "#cbd5e1" }}>{value}</span>
      )}
    </div>
  );
}

function MainSection({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: "20px" }}>
      <h2 style={{
        fontSize: "11px",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        color: "#1e293b",
        marginBottom: "12px",
        paddingBottom: "6px",
        borderBottom: "1px solid #e2e8f0",
        display: "flex",
        alignItems: "center",
        gap: "8px",
      }}>
        <span style={{ color, fontSize: "12px" }}>◆</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function SectionItem({ item, color }: { item: { title?: string; subtitle?: string; date?: string; description?: string; bullets?: string[] }; color: string }) {
  return (
    <div style={{ marginBottom: "14px", paddingLeft: "6px", borderLeft: `3px solid ${color}20` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h3 style={{ fontSize: "12px", fontWeight: 600, color: "#1e293b" }}>
          {formatJobTitle(item.title || "")}
        </h3>
        {item.date && (
          <span style={{
            fontSize: "10px",
            fontWeight: 500,
            color,
            backgroundColor: `${color}10`,
            padding: "2px 8px",
            borderRadius: "4px",
          }}>{item.date}</span>
        )}
      </div>
      {item.subtitle && (
        <p style={{ fontSize: "11px", fontWeight: 500, color: "#64748b", marginTop: "2px" }}>
          {item.subtitle}
        </p>
      )}
      {item.description && (
        <p style={{ fontSize: "10px", color: "#64748b", marginTop: "4px", lineHeight: 1.5 }}>
          {item.description}
        </p>
      )}
      {item.bullets && item.bullets.length > 0 && (
        <ul style={{ marginTop: "6px", paddingLeft: "0", listStyle: "none" }}>
          {item.bullets.filter(hasContent).map((bullet, idx) => (
            <li key={idx} style={{ display: "flex", alignItems: "flex-start", gap: "8px", marginBottom: "4px" }}>
              <span style={{ color, fontSize: "10px", marginTop: "2px" }}>▹</span>
              <span style={{ fontSize: "10px", color: "#475569", lineHeight: 1.5 }}>
                {formatBulletPoint(bullet)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
