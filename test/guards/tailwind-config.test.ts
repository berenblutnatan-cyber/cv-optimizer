import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

// Two Tailwind themes share one build. A stylesheet without its own @config
// compiles against the wrong theme and silently loses its utilities, which
// took the whole legacy site's design down once. Each entry names its config.
const ENTRIES = [
  ["app/(legacy)/globals.css", "tailwind.config.ts"],
  ["styles/v2/app.css", "tailwind.v2.config.ts"],
];

describe("Tailwind entry stylesheets", () => {
  it.each(ENTRIES)("%s pins %s", (file, config) => {
    expect(readFileSync(file, "utf8")).toContain(`@config "../../${config}"`);
  });
});
