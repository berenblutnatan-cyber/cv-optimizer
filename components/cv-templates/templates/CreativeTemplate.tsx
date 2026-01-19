"use client";

import React from "react";
import { A4PageWrapper, A4Grid } from "../A4PageWrapper";
import { getThemeColors, FONTS } from "../ThemeEngine";
import { TemplateProps } from "./TemplateProps";
import { formatName, formatJobTitle, formatBulletPoint, hasContent } from "@/utils/formatting";

/**
 * Template 6: Creative
 * 
 * Unique split design with accent color background.
 * Perfect for designers, marketers, and creative professionals.
 */

export function CreativeTemplate({ data, themeColor, className }: TemplateProps) {
  const colors = getThemeColors(themeColor);

  return (
    <A4PageWrapper className={className}>
      <A4Grid columns="35% 65%">
        {/* Left - Accent Color Sidebar */}
        <aside style={{
          backgroundColor: colors.primary,
          padding: "32px 24px",
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
              margin: "0 auto 20px",
              border: "4px solid rgba(255,255,255,0.3)",
            }}>
              <img src={data.photo} alt={data.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          ) : (
            <div style={{
              width: "100px",
              height: "100px",
              borderRadius: "50%",
              margin: "0 auto 20px",
              backgroundColor: "rgba(255,255,255,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "36px",
              fontWeight: 700,
              color: "white",
            }}>
              {data.name?.charAt(0)?.toUpperCase() || "?"}
            </div>
          )}

          {/* Name & Title */}
          <div style={{ textAlign: "center", marginBottom: "24px", color: "white" }}>
            <h1 style={{
              fontSize: "22px",
              fontWeight: 700,
              fontFamily: FONTS.sans.heading,
              lineHeight: 1.2,
            }}>
              {formatName(data.name)}
            </h1>
            {data.title && (
              <p style={{
                fontSize: "11px",
                marginTop: "6px",
                opacity: 0.9,
                fontWeight: 500,
              }}>
                {formatJobTitle(data.title)}
              </p>
            )}
          </div>

          {/* Contact */}
          <CreativeSidebarSection title="Contact">
            {hasContent(data.contact.email) && <CreativeContactItem icon="✉" value={data.contact.email!} />}
            {hasContent(data.contact.phone) && <CreativeContactItem icon="☎" value={data.contact.phone!} />}
            {hasContent(data.contact.location) && <CreativeContactItem icon="📍" value={data.contact.location!} />}
            {hasContent(data.contact.linkedin) && <CreativeContactItem icon="in" value={data.contact.linkedin!} />}
            {hasContent(data.contact.website) && <CreativeContactItem icon="🌐" value={data.contact.website!} />}
          </CreativeSidebarSection>

          {/* Skills */}
          {data.skills && data.skills.length > 0 && (
            <CreativeSidebarSection title="Skills">
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {data.skills.filter(hasContent).map((skill, idx) => (
                  <span key={idx} style={{
                    fontSize: "9px",
                    color: colors.primary,
                    backgroundColor: "white",
                    padding: "4px 10px",
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
            <CreativeSidebarSection title="Languages">
              {data.languages.filter(hasContent).map((lang, idx) => (
                <p key={idx} style={{ fontSize: "10px", color: "rgba(255,255,255,0.9)", marginBottom: "4px" }}>
                  • {lang}
                </p>
              ))}
            </CreativeSidebarSection>
          )}
        </aside>

        {/* Right - Main Content */}
        <main style={{
          backgroundColor: "#ffffff",
          padding: "32px 36px",
          fontFamily: FONTS.sans.body,
        }}>
          {/* Summary */}
          {hasContent(data.summary) && (
            <section style={{
              marginBottom: "24px",
              padding: "16px 20px",
              backgroundColor: colors.light,
              borderRadius: "12px",
            }}>
              <p style={{
                fontSize: "11px",
                color: "#374151",
                lineHeight: 1.8,
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
    <div style={{ marginBottom: "20px" }}>
      <h3 style={{
        fontSize: "9px",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.15em",
        color: "rgba(255,255,255,0.7)",
        marginBottom: "10px",
        paddingBottom: "6px",
        borderBottom: "1px solid rgba(255,255,255,0.2)",
      }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function CreativeContactItem({ icon, value }: { icon: string; value: string }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "10px",
      marginBottom: "8px",
    }}>
      <span style={{
        width: "24px",
        height: "24px",
        borderRadius: "50%",
        backgroundColor: "rgba(255,255,255,0.2)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "10px",
      }}>{icon}</span>
      <span style={{ fontSize: "10px", color: "white" }}>{value}</span>
    </div>
  );
}

function CreativeSection({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: "22px" }}>
      <h2 style={{
        fontSize: "13px",
        fontWeight: 700,
        color: color,
        marginBottom: "14px",
        display: "flex",
        alignItems: "center",
        gap: "10px",
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
          fontSize: "11px",
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
    <div style={{
      marginBottom: "16px",
      paddingLeft: "14px",
      borderLeft: `3px solid ${color}30`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h3 style={{ fontSize: "12px", fontWeight: 600, color: "#1e293b" }}>
          {formatJobTitle(item.title || "")}
        </h3>
        {item.date && (
          <span style={{
            fontSize: "10px",
            color,
            fontWeight: 500,
          }}>
            {item.date}
          </span>
        )}
      </div>
      {item.subtitle && (
        <p style={{ fontSize: "10px", color: "#6b7280", marginTop: "2px" }}>
          {item.subtitle}
        </p>
      )}
      {item.description && (
        <p style={{ fontSize: "10px", color: "#4b5563", marginTop: "6px", lineHeight: 1.6 }}>
          {item.description}
        </p>
      )}
      {item.bullets && item.bullets.length > 0 && (
        <ul style={{ marginTop: "6px", paddingLeft: "0", listStyle: "none" }}>
          {item.bullets.filter(hasContent).map((bullet, idx) => (
            <li key={idx} style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "6px",
              marginBottom: "3px",
            }}>
              <span style={{
                width: "5px",
                height: "5px",
                borderRadius: "50%",
                backgroundColor: color,
                marginTop: "5px",
                flexShrink: 0,
              }} />
              <span style={{ fontSize: "10px", color: "#374151", lineHeight: 1.5 }}>
                {formatBulletPoint(bullet)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
