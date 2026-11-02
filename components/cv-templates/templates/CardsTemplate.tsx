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
 * Cards
 *
 * Each section is a rounded outlined card with its title cut into the top
 * border. Skills and languages are pills.
 */
export function CardsTemplate({ data, themeColor, className }: TemplateProps) {
  const { t } = useT();
  const colors = getThemeColors(themeColor);
  const border = "1px solid #cbd5e1";
  const card = (title: string, children: React.ReactNode, key?: string) => (
    <fieldset key={key} style={{ border, borderRadius: "12px", padding: `${spaced(5)} ${spaced(15)} ${spaced(11)}`, margin: 0, minWidth: 0 }}>
      <legend style={{ padding: `0 ${spaced(6)}`, fontSize: scaled(11), fontWeight: 700, color: colors.primary }}>{title}</legend>
      {children}
    </fieldset>
  );
  const pills = (items: string[]) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: spaced(5) }}>
      {items.filter(hasContent).map((s, i) => <span key={i} style={{ fontSize: scaled(9.5), border: `1px solid ${colors.primary}`, color: colors.dark, borderRadius: "999px", padding: `${spaced(1)} ${spaced(8)}` }}>{s}</span>)}
    </div>
  );

  return (
    <A4PageWrapper className={className}>
      <div style={{ backgroundColor: "#ffffff", minHeight: "100%", padding: `${spaced(26)} ${spaced(28)}`, display: "grid", gap: spaced(12), alignContent: "start", fontFamily: FONTS.sans.body }}>
        <header style={{ border, borderRadius: "12px", padding: spaced(15) }}>
          <h1 style={{ fontSize: scaled(24), fontWeight: 700, color: "#0f172a", fontFamily: FONTS.sans.heading }}>{formatName(data.name)}</h1>
          {data.title && <p style={{ fontSize: scaled(11), fontWeight: 600, color: colors.primary, marginTop: spaced(1) }}>{formatJobTitle(data.title)}</p>}
          <p style={{ fontSize: scaled(9.5), color: "#475569", marginTop: spaced(3) }}>{contactLine(data).join("   ·   ")}</p>
        </header>
        {hasContent(data.summary) && card(t("Summary"), <p style={{ fontSize: scaled(10), color: "#374151", lineHeight: leading(1.5) }}>{data.summary}</p>)}
        {data.sections.map((section) => card(section.title, section.items.map((item) => <Entry key={item.id} item={item} accent={colors.dark} />), section.id))}
        {data.skills && data.skills.length > 0 && card(t("Skills"), pills(data.skills))}
        {data.languages && data.languages.length > 0 && card(t("Languages"), pills(data.languages))}
      </div>
    </A4PageWrapper>
  );
}
