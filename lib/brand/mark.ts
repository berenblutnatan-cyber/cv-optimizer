// The Hired mark: the navy and gold H with a rising stroke. Every logo and icon
// comes from this geometry. Regenerate app/ icons with `npm run brand:icons`.

export const MARK_SIZE = 32;
export const MARK_RADIUS = 7;

export const MARK_COLORS = { tile: "#0a2647", rail: "#ffffff", stroke: "#e0a92e" } as const;

type Bar = { x: number; y: number; width: number; height: number; rx: number };

export const MARK_RAILS: Bar[] = [
  { x: 7, y: 6, width: 5, height: 20, rx: 1.2 },
  { x: 20, y: 6, width: 5, height: 20, rx: 1.2 },
];

// The stroke runs under the rails, so no seam shows where they meet.
export const MARK_STROKE = "M10 16.375 22 11.125V15.625L10 20.875Z";

function rail({ x, y, width, height, rx }: Bar) {
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${rx}" fill="${MARK_COLORS.rail}"/>`;
}

/** Rounded by default. iOS masks its own corners, so its icon passes `rounded: false`. */
export function markSvg({ rounded = true, size = MARK_SIZE }: { rounded?: boolean; size?: number } = {}) {
  const tile = rounded ? ` rx="${MARK_RADIUS}"` : "";
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${MARK_SIZE} ${MARK_SIZE}">`,
    `<rect width="${MARK_SIZE}" height="${MARK_SIZE}"${tile} fill="${MARK_COLORS.tile}"/>`,
    `<path d="${MARK_STROKE}" fill="${MARK_COLORS.stroke}"/>`,
    ...MARK_RAILS.map(rail),
    "</svg>",
    "",
  ].join("\n");
}
