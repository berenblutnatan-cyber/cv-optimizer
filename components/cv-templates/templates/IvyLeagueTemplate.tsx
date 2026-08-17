"use client";

import React from "react";
import { A4PageWrapper } from "../A4PageWrapper";
import { getThemeColors, FONTS } from "../ThemeEngine";
import { TemplateProps } from "./TemplateProps";
import { formatName, formatJobTitle, formatBulletPoint, hasContent } from "@/utils/formatting";
import { useT } from "@/lib/i18n/LanguageProvider";
import { scaled, spaced, leading } from "@/lib/builder/density";

/**
 * Template 2: Ivy League
 * 
 * Classic serif typography with traditional top-down layout.
 * Conservative, text-heavy, no icons. Perfect for law/finance.
 */

export function IvyLeagueTemplate({ data, themeColor, className }: TemplateProps) {
  const { t } = useT();
  const colors = getThemeColors(themeColor);

  return (
    <A4PageWrapper className={className}>
      <div style={{
        backgroundColor: "#ffffff",
        padding: `${spaced(20)} ${spaced(28)}`, // Reduced from 40px 48px
        minHeight: "100%",
        fontFamily: FONTS.serif.body,
      }}>
        {/* Header - Centered */}
        <header style={{ textAlign: "center", marginBottom: spaced(12), paddingBottom: spaced(8), borderBottom: "2px solid #1e293b" }}>
          <h1 style={{
            fontSize: scaled(22), // Reduced from 28px
            fontWeight: 700,
            color: "#1e293b",
            fontFamily: FONTS.serif.heading,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            marginBottom: spaced(2),
          }}>
            {formatName(data.name)}
          </h1>
          {data.title && (
            <p style={{ fontSize: scaled(11), color: "#475569", marginTop: spaced(2), fontStyle: "italic" }}>
              {formatJobTitle(data.title)}
            </p>
          )}
          
          {/* Contact Row - Single line */}
          <div style={{ marginTop: spaced(6), fontSize: scaled(9), color: "#64748b" }}>
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
          <ClassicSection title={t("Professional Summary")}>
            <p style={{ fontSize: scaled(9), color: "#374151", lineHeight: leading(1.4), textAlign: "justify" }}>
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
          <ClassicSection title={t("Skills & Competencies")}>
            <p style={{ fontSize: scaled(9), color: "#374151", lineHeight: leading(1.3) }}>
              {data.skills.filter(hasContent).join(" • ")}
            </p>
          </ClassicSection>
        )}

        {/* Languages */}
        {data.languages && data.languages.length > 0 && (
          <ClassicSection title={t("Languages")}>
            <p style={{ fontSize: scaled(9), color: "#374151", lineHeight: leading(1.3) }}>
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
    <span style={{ fontSize: scaled(9), color: "#64748b" }}>
      <strong style={{ fontWeight: 600 }}>{label}:</strong> {value}
    </span>
  );
}

function ClassicSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: spaced(10) }}>
      <h2 style={{
        fontSize: scaled(10),
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        color: "#1e293b",
        marginBottom: spaced(6),
        paddingBottom: spaced(2),
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
    <div className="cv-item" style={{ marginBottom: spaced(8) }}>
      {/* Title Row with Date */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h3 style={{ fontSize: scaled(10), fontWeight: 700, color: "#1e293b", fontFamily: FONTS.serif.heading }}>
          {formatJobTitle(item.title || "")}
        </h3>
        {item.date && (
          <span style={{ fontSize: scaled(9), fontWeight: 500, color: "#64748b", fontStyle: "italic" }}>
            {item.date}
          </span>
        )}
      </div>

      {/* Subtitle / Company */}
      {(item.subtitle || item.location) && (
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: spaced(1) }}>
          {item.subtitle && (
            <p style={{ fontSize: scaled(9), fontStyle: "italic", color: "#475569" }}>
              {item.subtitle}
            </p>
          )}
          {item.location && (
            <span style={{ fontSize: scaled(8), color: "#6b7280" }}>{item.location}</span>
          )}
        </div>
      )}

      {/* Description */}
      {item.description && (
        <p style={{ fontSize: scaled(9), color: "#374151", marginTop: spaced(3), lineHeight: leading(1.4) }}>
          {item.description}
        </p>
      )}

      {/* Bullets - Compact */}
      {item.bullets && item.bullets.length > 0 && (
        <ul style={{ marginTop: spaced(3), paddingLeft: spaced(14), marginBottom: "0" }}>
          {item.bullets.filter(hasContent).map((bullet, idx) => (
            <li key={idx} style={{ fontSize: scaled(9), color: "#374151", lineHeight: leading(1.35), marginBottom: spaced(1) }}>
              {formatBulletPoint(bullet)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
