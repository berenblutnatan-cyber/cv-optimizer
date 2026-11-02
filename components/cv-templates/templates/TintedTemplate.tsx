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
 * Tinted
 *
 * A soft tinted side column under a solid colour block holding the name and
 * contacts. The summary sits in a matching tinted panel on the main side.
 */
export function TintedTemplate({ data, themeColor, className }: TemplateProps) {
  const { t } = useT();
  const colors = getThemeColors(themeColor);
  const head = (title: string, color: string) => <h2 style={{ fontSize: scaled(11.5), fontWeight: 600, color, borderBottom: `1px solid ${colors.primary}`, paddingBottom: spaced(2), marginBottom: spaced(7) }}>{title}</h2>;
  const list = (items: string[]) => items.filter(hasContent).map((s, i) => <p key={i} style={{ fontSize: scaled(10), color: "#1f2937", lineHeight: leading(1.5) }}>{s}</p>);

  return (
    <A4PageWrapper className={className}>
      <div style={{ display: "flex", minHeight: "100%", backgroundColor: "#ffffff", fontFamily: FONTS.sans.body }}>
        <aside style={{ width: "35%", flexShrink: 0, backgroundColor: colors.light }}>
          <div style={{ backgroundColor: colors.primary, color: "#ffffff", padding: `${spaced(20)} ${spaced(18)}` }}>
            <h1 style={{ fontSize: scaled(23), fontWeight: 700, lineHeight: leading(1.1), fontFamily: FONTS.sans.heading }}>{formatName(data.name)}</h1>
            {data.title && <p style={{ fontSize: scaled(11), marginTop: spaced(2) }}>{formatJobTitle(data.title)}</p>}
            <div style={{ marginTop: spaced(9), display: "grid", gap: spaced(3) }}>
              {contactLine(data).map((c) => <p key={c} style={{ fontSize: scaled(9.5), overflowWrap: "anywhere" }}>{c}</p>)}
            </div>
          </div>
          <div style={{ padding: `${spaced(15)} ${spaced(18)}`, display: "grid", gap: spaced(14) }}>
            {data.skills && data.skills.length > 0 && <section>{head(t("Skills"), colors.dark)}{list(data.skills)}</section>}
            {data.languages && data.languages.length > 0 && <section>{head(t("Languages"), colors.dark)}{list(data.languages)}</section>}
          </div>
        </aside>
        <main style={{ flex: 1, minWidth: 0, padding: `${spaced(20)} ${spaced(22)}`, display: "grid", gap: spaced(14), alignContent: "start" }}>
          {hasContent(data.summary) && (
            <section style={{ backgroundColor: colors.light, padding: spaced(12), borderRadius: "4px" }}>
              <p style={{ fontSize: scaled(10), color: "#1f2937", lineHeight: leading(1.5) }}>{data.summary}</p>
            </section>
          )}
          {data.sections.map((section) => (
            <section key={section.id}>
              {head(section.title, colors.primary)}
              {section.items.map((item) => <Entry key={item.id} item={item} accent={colors.dark} />)}
            </section>
          ))}
        </main>
      </div>
    </A4PageWrapper>
  );
}
