"use client";

import type { ComponentType } from "react";
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
};

export function TemplateRenderer({ templateId, ...props }: TemplateProps & { templateId: string }) {
  const Template = TEMPLATE_COMPONENTS[templateId as TemplateRegistryId] ?? ModernSidebarTemplate;
  return <Template {...props} />;
}
