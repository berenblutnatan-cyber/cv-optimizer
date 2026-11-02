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
 * Bands
 *
 * Two soft colour bands across the top: name and summary, then contacts. Below,
 * experience on the wide side and skills in a narrow column.
 */
export function BandsTemplate({ data, themeColor, className }: TemplateProps) {
  const { t } = useT();
  const colors = getThemeColors(themeColor);
  const head = (title: string) => <h2 style={{ fontSize: scaled(11.5), fontWeight: 600, color: "#1f2937", borderBottom: `1px solid ${colors.primary}`, paddingBottom: spaced(2), marginBottom: spaced(7) }}>{title}</h2>;
  const list = (items: string[]) => items.filter(hasContent).map((s, i) => <p key={i} style={{ fontSize: scaled(10), color: "#374151", lineHeight: leading(1.5) }}>{s}</p>);

  return (
    <A4PageWrapper className={className}>
      <div style={{ backgroundColor: "#ffffff", minHeight: "100%", fontFamily: FONTS.sans.body }}>
        <header style={{ backgroundColor: colors.light, padding: `${spaced(20)} ${spaced(24)}` }}>
          <h1 style={{ fontSize: scaled(26), fontWeight: 700, color: "#111827", fontFamily: FONTS.sans.heading }}>{formatName(data.name)}</h1>
          {data.title && <p style={{ fontSize: scaled(11), fontWeight: 600, color: colors.dark, marginTop: spaced(1) }}>{formatJobTitle(data.title)}</p>}
          {hasContent(data.summary) && <p style={{ fontSize: scaled(10), color: "#374151", lineHeight: leading(1.5), marginTop: spaced(7) }}>{data.summary}</p>}
        </header>
        <p style={{ backgroundColor: `color-mix(in srgb, ${colors.primary} 18%, white)`, padding: `${spaced(8)} ${spaced(24)}`, fontSize: scaled(9.5), color: "#1f2937" }}>{contactLine(data).join("     ")}</p>
        <div style={{ display: "flex" }}>
          <main style={{ flex: 1, minWidth: 0, padding: `${spaced(17)} ${spaced(22)}`, display: "grid", gap: spaced(14), alignContent: "start" }}>
            {data.sections.map((section) => (
              <section key={section.id}>
                {head(section.title)}
                {section.items.map((item) => <Entry key={item.id} item={item} accent={colors.dark} />)}
              </section>
            ))}
          </main>
          <aside style={{ width: "32%", flexShrink: 0, padding: `${spaced(17)} ${spaced(20)}`, display: "grid", gap: spaced(14), alignContent: "start" }}>
            {data.skills && data.skills.length > 0 && <section>{head(t("Skills"))}{list(data.skills)}</section>}
            {data.languages && data.languages.length > 0 && <section>{head(t("Languages"))}{list(data.languages)}</section>}
          </aside>
        </div>
      </div>
    </A4PageWrapper>
  );
}
