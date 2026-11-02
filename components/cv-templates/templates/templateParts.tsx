"use client";

import React from "react";
import type { ResumeData, ResumeSectionItem } from "./TemplateProps";
import { formatBulletPoint, formatJobTitle, hasContent } from "@/utils/formatting";
import { leading, scaled, spaced } from "@/lib/builder/density";

/** Shared pieces of the Israeli, Opal, Tinted, Cards and Bands layouts. */

export function contactLine(data: ResumeData): string[] {
  const c = data.contact;
  return [c.email, c.phone, c.location, c.linkedin, c.website, c.github].filter(hasContent) as string[];
}

export function Bullets({ item, marker }: { item: ResumeSectionItem; marker?: string }) {
  const bullets = (item.bullets ?? []).filter(hasContent);
  if (bullets.length === 0) return null;
  return (
    <ul style={{ marginTop: spaced(3), paddingInlineStart: marker ? 0 : spaced(14), listStyle: marker ? "none" : "disc" }}>
      {bullets.map((b, i) => (
        <li key={i} style={{ display: marker ? "flex" : undefined, gap: spaced(6), fontSize: scaled(10), color: "#374151", lineHeight: leading(1.45), marginBottom: spaced(2) }}>
          {marker && <span aria-hidden="true">{marker}</span>}
          <span>{formatBulletPoint(b)}</span>
        </li>
      ))}
    </ul>
  );
}

/** Role, place and date on two lines, then the bullets. */
export function Entry({ item, accent, marker }: { item: ResumeSectionItem; accent: string; marker?: string }) {
  return (
    <div className="cv-item" style={{ marginBottom: spaced(9) }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: spaced(10) }}>
        <span style={{ fontSize: scaled(11), fontWeight: 700, color: "#111827" }}>{formatJobTitle(item.title || "")}</span>
        {item.date && <span style={{ fontSize: scaled(9.5), color: "#6b7280", whiteSpace: "nowrap" }}>{item.date}</span>}
      </div>
      {(item.subtitle || item.location) && (
        <p style={{ fontSize: scaled(10), fontWeight: 600, color: accent, marginTop: spaced(1) }}>{[item.subtitle, item.location].filter(hasContent).join(" · ")}</p>
      )}
      {hasContent(item.description) && <p style={{ fontSize: scaled(10), color: "#374151", lineHeight: leading(1.45), marginTop: spaced(2) }}>{item.description}</p>}
      <Bullets item={item} marker={marker} />
    </div>
  );
}
