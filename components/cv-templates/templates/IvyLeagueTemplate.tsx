"use client";

import React from "react";
import { A4PageWrapper } from "../A4PageWrapper";
import { getThemeColors, FONTS } from "../ThemeEngine";
import { TemplateProps } from "./TemplateProps";
import { formatName, formatJobTitle, formatBulletPoint, hasContent } from "@/utils/formatting";

/**
 * Template 2: Ivy League
 * 
 * Classic serif typography with traditional top-down layout.
 * Conservative, text-heavy, no icons. Perfect for law/finance.
 */

export function IvyLeagueTemplate({ data, themeColor, className }: TemplateProps) {
  const colors = getThemeColors(themeColor);

  return (
    <A4PageWrapper className={className}>
      <div style={{
        backgroundColor: "#ffffff",
        padding: "20px 28px", // Reduced from 40px 48px
        minHeight: "100%",
        fontFamily: FONTS.serif.body,
      }}>
        {/* Header - Centered */}
        <header style={{ textAlign: "center", marginBottom: "12px", paddingBottom: "8px", borderBottom: "2px solid #1e293b" }}>
          <h1 style={{
            fontSize: "22px", // Reduced from 28px
            fontWeight: 700,
            color: "#1e293b",
            fontFamily: FONTS.serif.heading,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            marginBottom: "2px",
          }}>
            {formatName(data.name)}
          </h1>
          {data.title && (
            <p style={{ fontSize: "11px", color: "#475569", marginTop: "2px", fontStyle: "italic" }}>
              {formatJobTitle(data.title)}
            </p>
          )}
          
          {/* Contact Row - Single line */}
          <div style={{ marginTop: "6px", fontSize: "9px", color: "#64748b" }}>
            {[
              hasContent(data.contact.email) && data.contact.email,
              hasContent(data.contact.phone) && data.contact.phone,
              hasContent(data.contact.location) && data.contact.location,
            ].filter(Boolean).join(" | ")}
            {hasContent(data.contact.linkedin) && (
              <>
                {" | "}
                <a 
                  href={data.contact.linkedin!.startsWith("http") ? data.contact.linkedin! : `https://${data.contact.linkedin}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#4f46e5", textDecoration: "none" }}
                >
                  {data.contact.linkedin!.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                </a>
              </>
            )}
          </div>
        </header>

        {/* Summary */}
        {hasContent(data.summary) && (
          <ClassicSection title="Professional Summary">
            <p style={{ fontSize: "9px", color: "#374151", lineHeight: 1.4, textAlign: "justify" }}>
              {data.summary}
            </p>
          </ClassicSection>
        )}

        {/* Sections */}
        {data.sections.map((section) => (
          <ClassicSection key={section.id} title={section.title}>
            {section.items.map((item) => (
              <ClassicSectionItem key={item.id} item={item} color={colors.primary} />
            ))}
          </ClassicSection>
        ))}

        {/* Skills */}
        {data.skills && data.skills.length > 0 && (
          <ClassicSection title="Skills & Competencies">
            <p style={{ fontSize: "9px", color: "#374151", lineHeight: 1.3 }}>
              {data.skills.filter(hasContent).join(" • ")}
            </p>
          </ClassicSection>
        )}

        {/* Languages */}
        {data.languages && data.languages.length > 0 && (
          <ClassicSection title="Languages">
            <p style={{ fontSize: "9px", color: "#374151", lineHeight: 1.3 }}>
              {data.languages.filter(hasContent).join(" • ")}
            </p>
          </ClassicSection>
        )}
      </div>
    </A4PageWrapper>
  );
}

// Helper Components - Compact versions
function ContactItem({ label, value }: { label: string; value: string }) {
  return (
    <span style={{ fontSize: "9px", color: "#64748b" }}>
      <strong style={{ fontWeight: 600 }}>{label}:</strong> {value}
    </span>
  );
}

function ClassicSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: "10px" }}>
      <h2 style={{
        fontSize: "10px",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        color: "#1e293b",
        marginBottom: "6px",
        paddingBottom: "2px",
        borderBottom: "1px solid #d1d5db",
        fontFamily: FONTS.serif.heading,
      }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function ClassicSectionItem({ item, color }: { item: { title?: string; subtitle?: string; date?: string; location?: string; description?: string; bullets?: string[] }; color: string }) {
  return (
    <div style={{ marginBottom: "8px" }}>
      {/* Title Row with Date */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h3 style={{ fontSize: "10px", fontWeight: 700, color: "#1e293b", fontFamily: FONTS.serif.heading }}>
          {formatJobTitle(item.title || "")}
        </h3>
        {item.date && (
          <span style={{ fontSize: "9px", fontWeight: 500, color: "#64748b", fontStyle: "italic" }}>
            {item.date}
          </span>
        )}
      </div>

      {/* Subtitle / Company */}
      {(item.subtitle || item.location) && (
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1px" }}>
          {item.subtitle && (
            <p style={{ fontSize: "9px", fontStyle: "italic", color: "#475569" }}>
              {item.subtitle}
            </p>
          )}
          {item.location && (
            <span style={{ fontSize: "8px", color: "#6b7280" }}>{item.location}</span>
          )}
        </div>
      )}

      {/* Description */}
      {item.description && (
        <p style={{ fontSize: "9px", color: "#374151", marginTop: "3px", lineHeight: 1.4 }}>
          {item.description}
        </p>
      )}

      {/* Bullets - Compact */}
      {item.bullets && item.bullets.length > 0 && (
        <ul style={{ marginTop: "3px", paddingLeft: "14px", marginBottom: "0" }}>
          {item.bullets.filter(hasContent).map((bullet, idx) => (
            <li key={idx} style={{ fontSize: "9px", color: "#374151", lineHeight: 1.35, marginBottom: "1px" }}>
              {formatBulletPoint(bullet)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
