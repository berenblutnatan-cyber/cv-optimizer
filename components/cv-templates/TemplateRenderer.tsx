"use client";

import * as React from "react";
import type { ComponentType } from "react";
import { TextOverride } from "@/lib/i18n/LanguageProvider";
import type { TemplateRegistryId } from "@/lib/templates/registry";
import type { TemplateProps } from "./templates/TemplateProps";
import {
  ModernSidebarTemplate,
  IvyLeagueTemplate,
  MinimalistTemplate,
  ExecutiveTemplate,
  TechieTemplate,
  CreativeTemplate,
  StartupTemplate,
  InternationalTemplate,
  AuroraTemplate,
  BannerTemplate,
  SpotlightTemplate,
  LedgerTemplate,
  DevfolioTemplate,
  CanvasTemplate,
  TimelineTemplate,
  DoubleColumnTemplate,
  CompactTemplate,
  PhotoLeftTemplate,
  IsraeliTemplate,
  OpalTemplate,
  TintedTemplate,
  CardsTemplate,
  BandsTemplate,
} from "./templates";

// Exhaustive by type: adding an id to lib/templates/registry.ts without a
// component here is a compile error, so no template can silently fall back.
export const TEMPLATE_COMPONENTS: Record<TemplateRegistryId, ComponentType<TemplateProps>> = {
  "modern-sidebar": ModernSidebarTemplate,
  "ivy-league": IvyLeagueTemplate,
  minimalist: MinimalistTemplate,
  executive: ExecutiveTemplate,
  techie: TechieTemplate,
  creative: CreativeTemplate,
  startup: StartupTemplate,
  international: InternationalTemplate,
  aurora: AuroraTemplate,
  banner: BannerTemplate,
  spotlight: SpotlightTemplate,
  ledger: LedgerTemplate,
  devfolio: DevfolioTemplate,
  canvas: CanvasTemplate,
  timeline: TimelineTemplate,
  "double-column": DoubleColumnTemplate,
  compact: CompactTemplate,
  "photo-left": PhotoLeftTemplate,
  israeli: IsraeliTemplate,
  opal: OpalTemplate,
  tinted: TintedTemplate,
  cards: CardsTemplate,
  bands: BandsTemplate,
};

// Every way a template writes these three headings (lib/resume/view headings).
const HEADING_KEYS = {
  summary: ["Summary", "Profile", "Professional Summary", "Executive Summary", "about_me", "about", "What I Bring"],
  skills: ["Skills", "Skills & Competencies", "Core Competencies", "tech_stack", "stack"],
  languages: ["Languages", "languages", "lang"],
} as const;

export function headingWords(headings: TemplateProps["data"]["headings"]): Record<string, string> | null {
  if (!headings) return null;
  const words: Record<string, string> = {};
  for (const [kind, keys] of Object.entries(HEADING_KEYS) as [keyof typeof HEADING_KEYS, readonly string[]][]) {
    const title = headings[kind]?.trim();
    if (!title) continue;
    for (const k of keys) words[k] = title;
    if (kind === "languages") words["Languages:"] = `${title}:`;
  }
  return Object.keys(words).length ? words : null;
}

export function TemplateRenderer({ templateId, ...props }: TemplateProps & { templateId: string }) {
  const Template = TEMPLATE_COMPONENTS[templateId as TemplateRegistryId] ?? ModernSidebarTemplate;
  const words = React.useMemo(() => headingWords(props.data.headings), [props.data.headings]);
  return words ? (
    <TextOverride words={words}>
      <Template {...props} />
    </TextOverride>
  ) : (
    <Template {...props} />
  );
}
