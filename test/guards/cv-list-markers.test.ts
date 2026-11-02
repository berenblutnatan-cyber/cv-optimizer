import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

// Tailwind's reset sets list-style: none, and cv.css loads after it. Ten templates
// rely on the browser's default bullet, so without this rule their bullets vanish
// on screen and in the PDF. They did, from the v2 launch until 2026-11-02.

describe("CV list markers", () => {
  // Scoped to .a4-wrapper alone: the PDF export clones the page out of .cv-doc.
  it.each(["styles/v2/cv.css", "app/(legacy)/globals.css"])("%s restores bullets on the page", (file) => {
    expect(readFileSync(file, "utf8")).toMatch(/(^|\n)\.a4-wrapper ul\s*\{\s*list-style:\s*disc/);
  });
});
