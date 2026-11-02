"use client";

import React from "react";
import { A4PageWrapper } from "../A4PageWrapper";
import { FONTS, getThemeColors } from "../ThemeEngine";
import { TemplateProps } from "./TemplateProps";
import { contactLine, Entry } from "./templateParts";
import { formatJobTitle, formatName, hasContent } from "@/utils/formatting";
import { useT } from "@/lib/i18n/LanguageProvider";
import { leading, scaled, spaced } from "@/lib/builder/density";

/**
 * Opal
 *
 * Quiet and centered: generous margins, spaced section titles, triangle bullets.
 * One column, so ATS-safe, and the colour only touches the headings.
 */
export function OpalTemplate({ data, themeColor, className }: TemplateProps) {
  const { t } = useT();
  const colors = getThemeColors(themeColor);
  const head = (title: string) => <h2 style={{ textAlign: "center", fontSize: scaled(12), fontWeight: 600, letterSpacing: "0.06em", color: colors.dark, marginBottom: spaced(8) }}>{title}</h2>;
  const line = (items: string[]) => <p style={{ textAlign: "center", fontSize: scaled(10), color: "#374151", lineHeight: leading(1.6) }}>{items.filter(hasContent).join("  •  ")}</p>;

  return (
    <A4PageWrapper className={className}>
      <div style={{ backgroundColor: "#ffffff", minHeight: "100%", padding: `${spaced(44)} ${spaced(54)}`, fontFamily: FONTS.sans.body }}>
        <header style={{ textAlign: "center", marginBottom: spaced(18) }}>
          <h1 style={{ fontSize: scaled(28), fontWeight: 700, color: colors.dark, fontFamily: FONTS.sans.heading }}>{formatName(data.name)}</h1>
          {data.title && <p style={{ fontSize: scaled(11), fontWeight: 600, letterSpacing: "0.06em", color: colors.primary, marginTop: spaced(2) }}>{formatJobTitle(data.title)}</p>}
          <p style={{ fontSize: scaled(9.5), color: "#4b5563", marginTop: spaced(5) }}>{contactLine(data).join("   •   ")}</p>
        </header>

        {hasContent(data.summary) && (
          <section style={{ marginBottom: spaced(16) }}>
            {head(t("Summary"))}
            <p style={{ fontSize: scaled(10), color: "#374151", lineHeight: leading(1.55) }}>{data.summary}</p>
          </section>
        )}
        {data.sections.map((section) => (
          <section key={section.id} style={{ marginBottom: spaced(16) }}>
            {head(section.title)}
            {section.items.map((item) => <Entry key={item.id} item={item} accent={colors.dark} marker="▸" />)}
          </section>
        ))}
        {data.skills && data.skills.length > 0 && <section style={{ marginBottom: spaced(16) }}>{head(t("Skills"))}{line(data.skills)}</section>}
        {data.languages && data.languages.length > 0 && <section>{head(t("Languages"))}{line(data.languages)}</section>}
      </div>
    </A4PageWrapper>
  );
}
