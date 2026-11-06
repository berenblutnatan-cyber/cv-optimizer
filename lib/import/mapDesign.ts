// An uploaded CV's own design → the closest Hired design, so an import opens
// looking like the file the person chose, not like our default.
//
// Each rule names the templates whose layout matches (checked against the
// template code: which side the column is on and whether it takes the accent
// colour). The colour is kept exactly unless a preset is indistinguishable.

import { nearestAccent } from "@/lib/design/accents";
import type { DesignState, DesignTemplate } from "@/lib/resume/document";
import { getTemplateEntry } from "@/lib/templates/registry";
import type { PdfDesign } from "./pdfDesign";

/** Layout → templates in order of fit; the first that can show the photo wins when there is one. */
const FITS: Record<string, DesignTemplate[]> = {
  // An accent-coloured column on the left (Creative and Canvas fill it with the accent).
  "sidebar-left-dark": ["creative", "canvas"],
  // A pale tinted column on the left.
  "sidebar-left-light": ["tinted", "photo-left"],
  // The narrow column on the right.
  "sidebar-right": ["international", "executive"],
  // A coloured block across the top.
  band: ["banner", "bands", "executive"],
  // Two plain columns under a full header.
  columns: ["double-column"],
  "single-serif": ["ivy-league", "ledger"],
  "single-mono": ["devfolio", "techie"],
  "single-sans": ["minimalist", "startup"],
};

export function layoutOf(d: PdfDesign): keyof typeof FITS {
  if (d.sidebar?.side === "left") return d.sidebar.dark ? "sidebar-left-dark" : "sidebar-left-light";
  if (d.sidebar?.side === "right") return "sidebar-right";
  if (d.band) return "band";
  if (d.columns) return "columns";
  return d.headingFont === "serif" || d.bodyFont === "serif" ? "single-serif" : d.headingFont === "mono" || d.bodyFont === "mono" ? "single-mono" : "single-sans";
}

export function designFromPdf(d: PdfDesign): Pick<DesignState, "template" | "accentColor"> {
  const fits = FITS[layoutOf(d)];
  const template = (d.photo && fits.find((t) => getTemplateEntry(t)?.supportsPhoto)) || fits[0];
  // A CV in black and grey stays black and grey.
  const accentColor = d.accent ? nearestAccent(d.accent) : "black";
  return { template, accentColor };
}
