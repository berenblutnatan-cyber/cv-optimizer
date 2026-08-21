/**
 * PDF export pipeline.
 *
 * DEFAULT PATH — browser print engine (vector, ATS-parseable):
 * The element is cloned into a hidden same-origin iframe with every stylesheet
 * copied across, the one-page A4 clip is lifted, and the browser's print
 * pipeline produces a real vector PDF with selectable text that paginates
 * naturally across as many A4 pages as the content needs.
 *
 * FALLBACK PATH — html2canvas + jsPDF (raster, image-only):
 * Used only when the print pipeline is unavailable or fails (some in-app
 * webviews). The A4 clip is temporarily lifted on the live element, the full
 * content is captured, and the canvas is sliced into N full A4 pages — a
 * 2-page CV exports as 2 complete pages, never silently truncated.
 *
 * Uses dynamic imports to avoid SSR issues with jspdf.
 */

// A4 dimensions in mm
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

export type ExportPdfMode = "auto" | "print" | "raster";

export interface ExportPdfOptions {
  /**
   * "auto" (default): try the vector print pipeline, fall back to raster.
   * "print": vector print pipeline only (throws if unavailable).
   * "raster": html2canvas + jsPDF image PDF only.
   */
  mode?: ExportPdfMode;
}

export async function exportToPdf(
  element: HTMLElement,
  fileName: string = "Resume",
  options: ExportPdfOptions = {}
): Promise<void> {
  if (!element) {
    throw new Error("No element provided for PDF export");
  }

  const mode = options.mode ?? "auto";

  if (mode !== "raster") {
    try {
      await exportViaPrint(element, fileName);
      return;
    } catch (err) {
      if (mode === "print") throw err;
      // Print pipeline unusable (e.g. in-app webview) — fall back to the
      // paginated raster export so the user still gets a complete file.
      console.warn("Print export unavailable — falling back to raster PDF:", err);
    }
  }

  await exportToPdfRaster(element, fileName);
}

// ============================================================
// VECTOR PATH — hidden-iframe print (selectable text, N pages)
// ============================================================

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Wait for cloned stylesheets, images and fonts inside the print frame. */
async function waitForFrameAssets(doc: Document): Promise<void> {
  const settle = (target: Element, timeoutMs: number) =>
    new Promise<void>((resolve) => {
      const done = () => resolve();
      target.addEventListener("load", done, { once: true });
      target.addEventListener("error", done, { once: true });
      setTimeout(done, timeoutMs);
    });

  const links = Array.from(doc.querySelectorAll('link[rel="stylesheet"]')).filter(
    (link) => !(link as HTMLLinkElement).sheet
  );
  const images = Array.from(doc.images).filter((img) => !img.complete);
  await Promise.all([
    ...links.map((link) => settle(link, 2000)),
    ...images.map((img) => settle(img, 2000)),
  ]);

  try {
    await (doc as Document & { fonts?: { ready: Promise<unknown> } }).fonts?.ready;
  } catch {
    // Font Loading API unavailable — proceed with whatever is rendered.
  }
  // One extra frame for layout to settle after styles/fonts land.
  await new Promise((resolve) => setTimeout(resolve, 150));
}

async function exportViaPrint(element: HTMLElement, fileName: string): Promise<void> {
  if (typeof window === "undefined" || typeof window.print !== "function") {
    throw new Error("Print pipeline unavailable in this environment");
  }

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.visibility = "hidden";
  document.body.appendChild(iframe);

  try {
    const doc = iframe.contentDocument;
    const win = iframe.contentWindow;
    if (!doc || !win || typeof win.print !== "function") {
      throw new Error("Print pipeline unavailable (no frame window)");
    }

    doc.open();
    // The document title becomes the default "Save as PDF" filename.
    doc.write(
      `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(fileName)}</title></head><body></body></html>`
    );
    doc.close();

    // Copy every stylesheet (Tailwind globals + component <style> tags) so the
    // clone renders identically to the on-screen export element.
    document.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => {
      doc.head.appendChild(doc.importNode(node, true));
    });

    // Print overrides: strict A4 pages, exact colors, and — critically — lift
    // the one-page A4 clip (A4PageWrapper enforces height + overflow:hidden)
    // so content past page 1 flows onto page 2+ instead of being cut.
    const overrides = doc.createElement("style");
    overrides.textContent = `
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
      /* Print safety: never split a bullet/paragraph or a whole CV entry
         (.cv-item) across the page boundary, and never strand a section
         heading at the bottom of a page. */
      .a4-wrapper li, .a4-wrapper p { break-inside: avoid; page-break-inside: avoid; }
      .a4-wrapper .cv-item { break-inside: avoid; page-break-inside: avoid; }
      .a4-wrapper h1, .a4-wrapper h2, .a4-wrapper h3 { break-after: avoid; page-break-after: avoid; }
    `;
    doc.head.appendChild(overrides);

    // Clone the export element into the frame. Neutralize any positioning /
    // transform on the root (some call sites keep the export render off-screen
    // or scaled) so the clone prints from the top-left of the page.
    const clone = doc.importNode(element, true) as HTMLElement;
    clone.style.position = "static";
    clone.style.left = "auto";
    clone.style.top = "auto";
    clone.style.transform = "none";
    clone.style.margin = "0";
    doc.body.appendChild(clone);

    await waitForFrameAssets(doc);

    await new Promise<void>((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        resolve();
      };
      win.addEventListener("afterprint", finish);
      win.focus();
      // Blocks until the dialog closes in Chromium/Firefox; Safari returns
      // immediately, so the timeout resolves once the dialog was presented.
      win.print();
      setTimeout(finish, 1000);
    });
  } finally {
    // Delay removal so Safari's async print job isn't killed mid-flight.
    setTimeout(() => iframe.remove(), 5000);
  }
}

// ============================================================
// RASTER PATH — html2canvas + jsPDF (image PDF, sliced pages)
// ============================================================

/**
 * Raster export: captures the element to a canvas and slices it into complete
 * A4 pages. Image-only output (no selectable text) — the vector print path
 * above is preferred; this exists for environments where printing fails.
 */
export async function exportToPdfRaster(
  element: HTMLElement,
  fileName: string = "Resume"
): Promise<void> {
  if (!element) {
    throw new Error("No element provided for PDF export");
  }

  // Dynamic imports to avoid SSR issues
  const html2canvas = (await import("html2canvas")).default;
  const { jsPDF } = await import("jspdf");

  // Temporarily lift the one-page A4 clip (A4PageWrapper enforces a fixed
  // height with overflow:hidden) so the capture includes content past page 1.
  // Every export call site renders the element off-screen, so this never
  // flashes on the user's screen.
  const wrappers: HTMLElement[] = Array.from(
    element.querySelectorAll<HTMLElement>(".a4-wrapper")
  );
  if (element.classList.contains("a4-wrapper")) wrappers.unshift(element);
  const savedStyles = wrappers.map((el) => el.style.cssText);
  wrappers.forEach((el) => {
    el.style.height = "auto";
    el.style.maxHeight = "none";
    el.style.overflow = "visible";
    el.style.margin = "0";
    el.style.boxShadow = "none";
  });

  let canvas: HTMLCanvasElement;
  try {
    // Force reflow so scrollWidth/scrollHeight reflect the unclipped layout.
    void element.offsetHeight;

    canvas = await html2canvas(element, {
      scale: 2, // Higher scale for better quality
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      logging: false,
      // Capture the FULL (unclipped) element
      width: element.scrollWidth,
      height: element.scrollHeight,
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
    });
  } finally {
    wrappers.forEach((el, i) => {
      el.style.cssText = savedStyles[i];
    });
  }

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // Slice the canvas into full A4 pages. The 1% tolerance avoids a phantom
  // near-empty trailing page from sub-pixel rounding.
  const pageHeightPx = Math.floor((canvas.width * A4_HEIGHT_MM) / A4_WIDTH_MM);
  const pageCount = Math.max(1, Math.ceil(canvas.height / pageHeightPx - 0.01));

  for (let page = 0; page < pageCount; page++) {
    const slice = document.createElement("canvas");
    slice.width = canvas.width;
    slice.height = pageHeightPx;
    const ctx = slice.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, slice.width, slice.height);
    ctx.drawImage(
      canvas,
      0,
      page * pageHeightPx,
      canvas.width,
      pageHeightPx,
      0,
      0,
      canvas.width,
      pageHeightPx
    );

    if (page > 0) pdf.addPage();
    pdf.addImage(
      slice.toDataURL("image/png"),
      "PNG",
      0,
      0,
      A4_WIDTH_MM,
      A4_HEIGHT_MM,
      undefined,
      "FAST"
    );
  }

  pdf.save(`${fileName}.pdf`);
}

/**
 * Alternative: Use print-to-PDF with automatic download
 * This opens print dialog but with PDF pre-selected
 */
export function printToPdf(element: HTMLElement): void {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Please allow popups to download PDF");
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Resume</title>
        <style>
          @page { size: A4; margin: 0; }
          body { margin: 0; padding: 0; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .a4-wrapper { height: auto !important; max-height: none !important; overflow: visible !important; }
          .a4-wrapper li, .a4-wrapper p { break-inside: avoid; page-break-inside: avoid; }
          .a4-wrapper .cv-item { break-inside: avoid; page-break-inside: avoid; }
          .a4-wrapper h1, .a4-wrapper h2, .a4-wrapper h3 { break-after: avoid; page-break-after: avoid; }
        </style>
      </head>
      <body>
        ${element.innerHTML}
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();

  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
}

export default exportToPdf;
