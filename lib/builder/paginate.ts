// Spacer paginator for multi-page mode.
//
// The browser's print engine breaks pages wherever 1123px boundaries land —
// and the raster fallback slices geometrically. To keep the on-screen
// preview, the vector print, and the raster slicer all telling the same
// story, this pass nudges any .cv-item that straddles a page boundary down
// below it (inline margin-top), so nothing ever sits across a slice line.

export const PAGE_HEIGHT_PX = 1123;

const SPACER_ATTR = "data-cv-spacer";

/** Remove spacers from a previous pass. */
export function clearPagination(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>(`[${SPACER_ATTR}]`).forEach((el) => {
    el.style.marginTop = "";
    el.removeAttribute(SPACER_ATTR);
  });
}

/**
 * Push straddling items below their page boundary. Re-run after content
 * changes (clear + re-measure). Handles CSS-transform scale on ancestors by
 * normalizing rect coordinates. Returns the resulting page count.
 */
export function paginateCvItems(root: HTMLElement, pageHeight = PAGE_HEIGHT_PX): number {
  clearPagination(root);

  const rootRect = root.getBoundingClientRect();
  const scale = root.offsetWidth > 0 ? rootRect.width / root.offsetWidth : 1;
  const topOf = (el: HTMLElement) => (el.getBoundingClientRect().top - root.getBoundingClientRect().top) / scale;
  const bottomOf = (el: HTMLElement) => (el.getBoundingClientRect().bottom - root.getBoundingClientRect().top) / scale;

  const items = Array.from(root.querySelectorAll<HTMLElement>(".cv-item"));
  for (const item of items) {
    const top = topOf(item);
    const bottom = bottomOf(item);
    const height = bottom - top;
    if (height <= 0 || height >= pageHeight) continue; // unbreakable giant — leave it
    const startPage = Math.floor((top + 1) / pageHeight);
    const endPage = Math.floor((bottom - 1) / pageHeight);
    if (startPage === endPage) continue;
    const push = (startPage + 1) * pageHeight - top;
    const currentMargin = parseFloat(getComputedStyle(item).marginTop) || 0;
    item.style.marginTop = `${currentMargin + push}px`;
    item.setAttribute(SPACER_ATTR, "1");
    // Layout shifted — subsequent items re-measure against the new positions
    // (topOf/bottomOf read live rects, so nothing else to do).
  }

  const contentBottom = root.scrollHeight;
  return Math.max(1, Math.ceil((contentBottom - 2) / pageHeight));
}
