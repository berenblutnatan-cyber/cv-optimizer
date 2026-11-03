import { describe, expect, it } from "vitest";
import { untranslatedLiterals } from "./jsx-literals";

const texts = (src: string) => untranslatedLiterals(src).map((f) => f.text);

describe("untranslated literal guard", () => {
  it("flags JSX text, user-facing props, fields and toasts", () => {
    expect(texts(`<p>Your CVs</p>`)).toEqual(["Your CVs"]);
    expect(texts(`<IconButton label="CV actions" />`)).toEqual(["CV actions"]);
    expect(texts(`<D title={\`Delete “\${name}”?\`} />`)).toEqual(["Delete “"]);
    expect(texts(`<p>{busy ? "Saving" : t("Save")}</p>`)).toEqual(["Saving"]);
    expect(texts(`const o = [{ label: "Bold" }];`)).toEqual(["Bold"]);
    expect(texts(`toast.error("Couldn't save");`)).toEqual(["Couldn't save"]);
    expect(texts(`<p>{err ?? "Try again"}</p>`)).toEqual(["Try again"]);
    expect(texts(`function S({ label = "CV score", size = 112 }) {}`)).toEqual(["CV score"]);
  });

  it("passes translated text, terms that stay English, and non-text props", () => {
    expect(texts(`<p>{t("Your CVs")}</p>`)).toEqual([]);
    expect(texts(`<p>{t("Delete “{title}”?", { title })}</p>`)).toEqual([]);
    expect(texts(`<B variant="primary" size="lg" href="/start" className="px-4" />`)).toEqual([]);
    expect(texts(`<span>PDF · ATS</span>`)).toEqual([]);
    expect(texts(`<span> · {n} </span>`)).toEqual([]);
    expect(texts(`const o = [{ label: msg("Bold") }];`)).toEqual([]);
    expect(texts(`fetch("/api/cv", { method: "POST" });`)).toEqual([]);
  });
});
