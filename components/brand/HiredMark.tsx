import { MARK_COLORS, MARK_RADIUS, MARK_RAILS, MARK_SIZE, MARK_STROKE } from "@/lib/brand/mark";

/** Decorative: it always sits beside the name "Hired" or inside a labelled link. */
export function HiredMark({ className }: { className?: string }) {
  return (
    <svg viewBox={`0 0 ${MARK_SIZE} ${MARK_SIZE}`} className={className} aria-hidden="true" focusable="false">
      <rect width={MARK_SIZE} height={MARK_SIZE} rx={MARK_RADIUS} fill={MARK_COLORS.tile} />
      <path d={MARK_STROKE} fill={MARK_COLORS.stroke} />
      {MARK_RAILS.map((bar) => (
        <rect key={bar.x} {...bar} fill={MARK_COLORS.rail} />
      ))}
    </svg>
  );
}
