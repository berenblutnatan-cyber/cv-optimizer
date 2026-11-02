"use client";

import React from "react";
import { A4PageWrapper } from "../A4PageWrapper";
import { FONTS } from "../ThemeEngine";
import { TemplateProps } from "./TemplateProps";
import { Bullets, contactLine } from "./templateParts";
import { formatJobTitle, formatName, hasContent } from "@/utils/formatting";
import { useT } from "@/lib/i18n/LanguageProvider";
import { leading, scaled, spaced } from "@/lib/builder/density";

/**
 * Israeli
 *
 * The plain format Israeli recruiters expect: black on white, centered name,
 * and years in their own column beside each role. Single reading order, so it
 * parses cleanly. The theme colour stays out of it on purpose.
 */
export function IsraeliTemplate({ data, className }: TemplateProps) {
  const { t } = useT();
  const rule = "1px solid #111827";
  const head = (title: string) => <h2 style={{ fontSize: scaled(12), fontWeight: 700, color: "#111827", borderBottom: rule, paddingBottom: spaced(2), marginBottom: spaced(7) }}>{title}</h2>;
  const text = { fontSize: scaled(10), color: "#1f2937", lineHeight: leading(1.5) };

  return (
    <A4PageWrapper className={className}>
      <div style={{ backgroundColor: "#ffffff", minHeight: "100%", padding: `${spaced(34)} ${spaced(44)}`, fontFamily: FONTS.sans.body }}>
        <header style={{ textAlign: "center", borderBottom: rule, paddingBottom: spaced(9), marginBottom: spaced(13) }}>
          <h1 style={{ fontSize: scaled(24), fontWeight: 700, color: "#111827", fontFamily: FONTS.sans.heading }}>{formatName(data.name)}</h1>
          {data.title && <p style={{ fontSize: scaled(11.5), color: "#374151", marginTop: spaced(1) }}>{formatJobTitle(data.title)}</p>}
          <p style={{ fontSize: scaled(9.5), color: "#374151", marginTop: spaced(3) }}>{contactLine(data).join("  |  ")}</p>
        </header>

        {hasContent(data.summary) && (
          <section style={{ marginBottom: spaced(12) }}>
            {head(t("Summary"))}
            <p style={text}>{data.summary}</p>
          </section>
        )}

        {data.sections.map((section) => (
          <section key={section.id} style={{ marginBottom: spaced(12) }}>
            {head(section.title)}
            {section.items.map((item) => (
              <div key={item.id} className="cv-item" style={{ display: "grid", gridTemplateColumns: `${spaced(82)} minmax(0, 1fr)`, gap: spaced(10), marginBottom: spaced(8) }}>
                <span style={{ fontSize: scaled(10), fontWeight: 700, color: "#111827" }}>{item.date}</span>
                <div>
                  <p style={{ fontSize: scaled(10.5), fontWeight: 700, color: "#111827" }}>{[formatJobTitle(item.title || ""), item.subtitle].filter(hasContent).join(" — ")}</p>
                  {item.location && <p style={{ fontSize: scaled(9.5), color: "#4b5563" }}>{item.location}</p>}
                  {hasContent(item.description) && <p style={text}>{item.description}</p>}
                  <Bullets item={item} />
                </div>
              </div>
            ))}
          </section>
        ))}

        {data.skills && data.skills.length > 0 && (
          <section style={{ marginBottom: spaced(12) }}>
            {head(t("Skills"))}
            <p style={text}>{data.skills.filter(hasContent).join(", ")}</p>
          </section>
        )}
        {data.languages && data.languages.length > 0 && (
          <section>
            {head(t("Languages"))}
            <p style={text}>{data.languages.filter(hasContent).join(" · ")}</p>
          </section>
        )}
      </div>
    </A4PageWrapper>
  );
}
