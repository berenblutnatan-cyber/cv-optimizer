import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { he } from "@/lib/i18n/he";
import { heV2 } from "@/lib/i18n/he.v2";
import { TOOLS } from "@/lib/toolkit/tools";
import { TEMPLATE_REGISTRY } from "@/lib/templates/registry";
import { hasEnglish, untranslatedLiterals } from "./jsx-literals";

// The v2 surfaces that replaced translated legacy pages (Start, the free
// score, Pricing, the toolkit) and the shell around them must stay fully
// Hebrew: every t("…") key there needs an entry, or it silently renders in
// English for Hebrew users. Add a file here when you translate it.

const TRANSLATED = [
  "components/v2/AppNav.tsx",
  "components/v2/AccountNav.tsx",
  "components/ui/field.tsx",
  "components/ui/diff-line.tsx",
  "components/ui/score.tsx",
  "components/v2/SiteFooter.tsx",
  "app/(v2)/page.tsx",
  "app/(v2)/start/page.tsx",
  "components/v2/start/StartFlow.tsx",
  "app/(v2)/score/page.tsx",
  "app/(v2)/pricing/page.tsx",
  "app/(v2)/toolkit/page.tsx",
  "app/(v2)/toolkit/[tool]/page.tsx",
  "components/v2/toolkit/ToolRunner.tsx",
  "components/ui/hold-button.tsx",
  "components/ui/morph-button.tsx",
  "components/ui/flourish.tsx",
  "app/(v2)/cv/page.tsx",
  "components/v2/cv/CvCard.tsx",
  "components/v2/cv/RelativeTime.tsx",
  "app/(v2)/cv/[id]/page.tsx",
  "app/(v2)/cv/[id]/not-found.tsx",
  "components/v2/editor/EditorShell.tsx",
  "components/v2/editor/SectionEditor.tsx",
  "components/v2/editor/PhotoField.tsx",
  "components/v2/editor/fields.tsx",
  "components/v2/editor/DesignPanel.tsx",
  "components/v2/editor/PanelHeader.tsx",
  "components/v2/editor/CvPreview.tsx",
  "components/v2/editor/useCvDocument.ts",
  "components/v2/editor/ChatPanel.tsx",
  "components/v2/editor/VersionsPanel.tsx",
  "components/v2/editor/TailorPanel.tsx",
  "components/v2/editor/VoicePanel.tsx",
  "app/(v2)/jobs/page.tsx",
  "components/v2/jobs/JobsBoard.tsx",
  "components/v2/jobs/JobDrawer.tsx",
  "app/(v2)/interview/page.tsx",
  "app/(v2)/interview/new/page.tsx",
  "app/(v2)/interview/[id]/page.tsx",
  "components/v2/interview/InterviewRoom.tsx",
  "components/v2/interview/InterviewSetup.tsx",
  "components/v2/interview/Debrief.tsx",
  "app/(v2)/account/page.tsx",
  "components/v2/billing/AccountView.tsx",
  "components/v2/billing/CheckoutButton.tsx",
  "lib/billing/labels.ts",
  "components/ui/dialog.tsx",
  "components/ui/command.tsx",
  "components/ui/theme-toggle.tsx",
  "components/ui/voice-orb.tsx",
  "components/v2/voice/call.tsx",
];

// Library code that builds user-facing labels through a passed-in t(): only its
// keys are checked (its other strings are prompts for the model, not UI).
const KEY_SOURCES = ["lib/chat/cvTools.ts"];

const dict: Record<string, string> = { ...he, ...heV2 };

function keysIn(file: string): string[] {
  const src = readFileSync(file, "utf8");
  return [...src.matchAll(/\b(?:t|msg)\(\s*"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1].replace(/\\"/g, '"'));
}

describe("v2 Hebrew coverage", () => {
  it("every string on a translated surface has a Hebrew entry", () => {
    const missing = [...TRANSLATED, ...KEY_SOURCES].flatMap((f) => keysIn(f).filter((k) => !(k in dict)).map((k) => `${f}: ${k}`));
    expect(missing).toEqual([]);
  });

  it("every toolkit label, placeholder and option is translated", () => {
    const keys = Object.values(TOOLS).flatMap((s) => [s.title, s.tagline, ...s.fields.flatMap((f) => [f.label, f.placeholder ?? "", ...(f.options ?? [])]), ...s.output.map((o) => o.label)]);
    // Numbers (word counts) read the same in both languages.
    expect(keys.filter((k) => k && !/^\d+$/.test(k) && !(k in dict))).toEqual([]);
  });

  it("no English literal on a translated surface bypasses t()", () => {
    const found = TRANSLATED.flatMap((f) => untranslatedLiterals(readFileSync(f, "utf8"), f).map((x) => `${f}:${x.line}: ${x.text}`));
    expect(found).toEqual([]);
  });

  it("no Hebrew entry is left in English", () => {
    const english = Object.entries(heV2).filter(([, v]) => hasEnglish(v)).map(([k, v]) => `${k} → ${v}`);
    expect(english).toEqual([]);
  });

  it("every template name is translated", () => {
    expect(Object.values(TEMPLATE_REGISTRY).map((e) => e.name).filter((n) => !(n in dict))).toEqual([]);
  });

  it("placeholders survive translation", () => {
    const vars = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    for (const [en, heText] of Object.entries(heV2)) expect(vars(heText), en).toEqual(vars(en));
  });
});
