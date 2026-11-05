// The CV as one standalone print document: the page's stylesheets, the A4
// print rules, and a copy of the on-screen CV. The server PDF (a real file,
// /api/cv/[id]/pdf) and the browser print dialog (the fallback) both print
// this, so the two can never drift apart.

/**
 * Strict A4 pages, exact colours, and the one-page clip lifted (A4PageWrapper
 * fixes the height with overflow hidden) so page 2+ flows instead of being cut.
 * Never split a bullet, a paragraph or a whole entry (.cv-item) across pages,
 * and never strand a heading at the bottom of one.
 */
export const PRINT_CSS = `
  @page { size: A4; margin: 0; }
  html, body { margin: 0 !important; padding: 0 !important; background: #ffffff; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  .a4-wrapper {
    height: auto !important;
    max-height: none !important;
    overflow: visible !important;
    margin: 0 !important;
    box-shadow: none !important;
  }
  .a4-wrapper li, .a4-wrapper p { break-inside: avoid; page-break-inside: avoid; }
  .a4-wrapper .cv-item { break-inside: avoid; page-break-inside: avoid; }
  .a4-wrapper h1, .a4-wrapper h2, .a4-wrapper h3 { break-after: avoid; page-break-after: avoid; }
`;

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/**
 * The page's fonts are CSS variables set by classes on <body> (next/font): a
 * print document without them falls back to the browser's serif. Carry the
 * root classes and language over; always print the light theme.
 */
export function rootAttributes(): { html: Record<string, string>; bodyClass: string } {
  const h = document.documentElement;
  return {
    html: { lang: h.lang || "en", dir: h.dir || "ltr", class: h.className, "data-theme": "light" },
    bodyClass: document.body.className,
  };
}

/** Neutralise any positioning on the export root so it prints from the page's top-left. */
export function resetRoot(el: HTMLElement) {
  el.style.position = "static";
  el.style.left = "auto";
  el.style.top = "auto";
  el.style.transform = "none";
  el.style.margin = "0";
}

/**
 * The print document as HTML text, for a renderer outside this page. Asset
 * URLs are made absolute (a stylesheet's href, the base for everything else),
 * and scripts never come along.
 */
export function printDocumentHtml(element: HTMLElement, title: string): string {
  const head = [...document.querySelectorAll<HTMLStyleElement | HTMLLinkElement>('style, link[rel="stylesheet"]')]
    .map((n) => (n instanceof HTMLLinkElement ? `<link rel="stylesheet" href="${escapeHtml(n.href)}">` : `<style>${n.textContent ?? ""}</style>`))
    .join("");
  const clone = element.cloneNode(true) as HTMLElement;
  resetRoot(clone);
  clone.querySelectorAll("script").forEach((s) => s.remove());
  const { html, bodyClass } = rootAttributes();
  const attrs = Object.entries(html)
    .map(([k, v]) => `${k}="${escapeHtml(v)}"`)
    .join(" ");
  return (
    `<!DOCTYPE html><html ${attrs}><head><meta charset="utf-8">` +
    `<base href="${escapeHtml(location.origin)}/"><title>${escapeHtml(title)}</title>${head}<style>${PRINT_CSS}</style></head>` +
    `<body class="${escapeHtml(bodyClass)}">${clone.outerHTML}</body></html>`
  );
}
