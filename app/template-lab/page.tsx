"use client";

import React, { useState } from "react";
import {
  // existing 8
  ModernSidebarTemplate,
  IvyLeagueTemplate,
  MinimalistTemplate,
  ExecutiveTemplate,
  TechieTemplate,
  CreativeTemplate,
  StartupTemplate,
  InternationalTemplate,
  // new 6
  AuroraTemplate,
  BannerTemplate,
  SpotlightTemplate,
  LedgerTemplate,
  DevfolioTemplate,
  CanvasTemplate,
} from "@/components/cv-templates/templates";
import { THEME_COLOR_VALUES, ThemeColor } from "@/context/BuilderContext";
import type { ResumeData } from "@/components/cv-templates/templates/TemplateProps";
import { useT } from "@/lib/i18n/LanguageProvider";

// ── Sample résumé used to fill every template ──────────────────────────────
const SAMPLE: ResumeData = {
  name: "Maya Chen",
  title: "Senior Product Manager",
  contact: {
    email: "maya.chen@gmail.com",
    phone: "(415) 555-0148",
    location: "San Francisco, CA",
    linkedin: "linkedin.com/in/mayachen",
    github: "github.com/mayachen",
    website: "mayachen.design",
  },
  summary:
    "Product manager with 7+ years shipping consumer and B2B products end-to-end. I turn ambiguous problems into focused roadmaps and love pairing with design and engineering to ship things users actually keep.",
  skills: [
    "Product Strategy", "Roadmapping", "A/B Testing", "SQL", "User Research",
    "Figma", "Go-to-Market", "Stakeholder Mgmt", "Analytics", "Jira",
  ],
  languages: ["English — Native", "Mandarin — Fluent", "Spanish — Conversational"],
  sections: [
    {
      id: "exp",
      title: "Experience",
      type: "experience",
      items: [
        {
          id: "e1",
          title: "Senior Product Manager",
          subtitle: "Lumen Labs",
          location: "San Francisco",
          date: "2022 – Present",
          bullets: [
            "Led a 0→1 payments product to $4M ARR in year one across 3 markets.",
            "Ran weekly experiments that lifted activation 31% and cut churn 12%.",
            "Grew the PM pod from 2 to 6 and set the team's discovery process.",
          ],
        },
        {
          id: "e2",
          title: "Product Manager",
          subtitle: "Northwind",
          location: "Remote",
          date: "2019 – 2022",
          bullets: [
            "Owned the mobile checkout roadmap for 2M monthly users.",
            "Shipped 40+ A/B tests; the top five added $1.2M in annual revenue.",
          ],
        },
        {
          id: "e3",
          title: "Associate Product Manager",
          subtitle: "BrightForge",
          location: "Austin",
          date: "2017 – 2019",
          bullets: [
            "Launched self-serve onboarding, doubling trial-to-paid conversion.",
          ],
        },
      ],
    },
    {
      id: "edu",
      title: "Education",
      type: "education",
      items: [
        {
          id: "ed1",
          title: "B.S. Computer Science",
          subtitle: "UC Berkeley",
          location: "Berkeley, CA",
          date: "2013 – 2017",
          description: "Minor in Cognitive Science. Led the campus Product Club.",
        },
      ],
    },
  ],
};

type Entry = { id: string; name: string; tag: string; isNew?: boolean; Component: (p: { data: ResumeData; themeColor: ThemeColor }) => JSX.Element };

const NEW: Entry[] = [
  { id: "aurora", name: "Aurora", tag: "Bold & colorful", isNew: true, Component: AuroraTemplate },
  { id: "banner", name: "Banner", tag: "Bold & colorful", isNew: true, Component: BannerTemplate },
  { id: "spotlight", name: "Spotlight", tag: "Minimal · ATS-safe", isNew: true, Component: SpotlightTemplate },
  { id: "ledger", name: "Ledger", tag: "Editorial serif", isNew: true, Component: LedgerTemplate },
  { id: "devfolio", name: "Devfolio", tag: "Tech / developer", isNew: true, Component: DevfolioTemplate },
  { id: "canvas", name: "Canvas", tag: "Creative", isNew: true, Component: CanvasTemplate },
];

const EXISTING: Entry[] = [
  { id: "modern-sidebar", name: "Modern Sidebar", tag: "Two-column", Component: ModernSidebarTemplate },
  { id: "ivy-league", name: "Ivy League", tag: "Classic serif", Component: IvyLeagueTemplate },
  { id: "minimalist", name: "Minimalist", tag: "Minimal", Component: MinimalistTemplate },
  { id: "executive", name: "Executive", tag: "Bold header", Component: ExecutiveTemplate },
  { id: "techie", name: "Techie", tag: "Tech", Component: TechieTemplate },
  { id: "creative", name: "Creative", tag: "Split", Component: CreativeTemplate },
  { id: "startup", name: "Startup", tag: "Modern", Component: StartupTemplate },
  { id: "international", name: "International", tag: "Photo + standard", Component: InternationalTemplate },
];

const COLORS: ThemeColor[] = ["indigo", "violet", "blue", "navy", "purple", "orange", "rose", "amber", "slate", "black"];

// A4 is 794×1123px at 96dpi; scale it down into a fixed-width card.
const PREVIEW_W = 372;
const SCALE = PREVIEW_W / 794;
const PREVIEW_H = Math.round(1123 * SCALE);

function TemplateCard({ entry, themeColor }: { entry: Entry; themeColor: ThemeColor }) {
  const { t } = useT();
  const { Component } = entry;
  return (
    <div className="flex flex-col items-center" style={{ width: PREVIEW_W }}>
      <div className="mb-3 flex w-full items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white">{entry.name}</span>
          {entry.isNew && (
            <span className="rounded-full bg-emerald-400/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">{t("New")}</span>
          )}
        </div>
        <span className="font-mono text-[11px] text-white/40">{t(entry.tag)}</span>
      </div>
      <div
        className="overflow-hidden rounded-lg ring-1 ring-white/10"
        style={{ width: PREVIEW_W, height: PREVIEW_H, boxShadow: "0 24px 50px -20px rgba(0,0,0,0.7)" }}
      >
        <div style={{ width: 794, height: 1123, transform: `scale(${SCALE})`, transformOrigin: "top left" }}>
          <Component data={SAMPLE} themeColor={themeColor} />
        </div>
      </div>
    </div>
  );
}

export default function TemplateLabPage() {
  const { t } = useT();
  const [themeColor, setThemeColor] = useState<ThemeColor>("indigo");

  return (
    <div className="min-h-screen bg-[#0c0c12] text-white">
      {/* Control bar */}
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0c0c12]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-white/40">Hired · {t("résumé templates")}</p>
            <h1 className="text-lg font-semibold tracking-tight">{t("Template Lab — {newCount} new + {existingCount} current", { newCount: NEW.length, existingCount: EXISTING.length })}</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] text-white/40">{t("accent")}</span>
            <div className="flex items-center gap-1.5">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setThemeColor(c)}
                  title={c}
                  aria-label={t("Accent {color}", { color: c })}
                  className={`h-6 w-6 rounded-full transition-transform hover:scale-110 ${themeColor === c ? "ring-2 ring-white ring-offset-2 ring-offset-[#0c0c12]" : ""}`}
                  style={{ backgroundColor: THEME_COLOR_VALUES[c].primary }}
                />
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] px-5 py-10 sm:px-8">
        <Section title={t("New designs")} subtitle={t("Fresh directions — pick the ones to wire into the builder.")}>
          {NEW.map((e) => <TemplateCard key={e.id} entry={e} themeColor={themeColor} />)}
        </Section>

        <div className="my-12 h-px bg-white/10" />

        <Section title={t("Already in the builder")} subtitle={t("Your current 8, shown with the same résumé for comparison.")}>
          {EXISTING.map((e) => <TemplateCard key={e.id} entry={e} themeColor={themeColor} />)}
        </Section>
      </main>

      <footer className="border-t border-white/10 px-5 py-10 text-center font-mono text-[12px] text-white/40 sm:px-8">
        {t("Same résumé, every template. Tell me which new ones to promote and I'll wire them into the builder + pricing.")}
      </footer>
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-7">
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        <p className="mt-1 text-sm text-white/50">{subtitle}</p>
      </div>
      <div className="flex flex-wrap justify-center gap-x-6 gap-y-10">
        {children}
      </div>
    </section>
  );
}
