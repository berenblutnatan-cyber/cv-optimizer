import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { TEMPLATE_IDS } from "@/lib/templates/registry";

// A template in the registry with no renderer silently falls back to another
// design, so a user who picks it gets the wrong CV.

describe("template wiring", () => {
  const key = (id: string) => (id.includes("-") ? `"${id}":` : `${id}:`);

  it.each(["components/cv-templates/TemplateRenderer.tsx", "components/cv-templates/index.ts"])("%s renders every registered template", (file) => {
    const src = readFileSync(file, "utf8");
    expect(TEMPLATE_IDS.filter((id) => !src.includes(key(id)))).toEqual([]);
  });
});
