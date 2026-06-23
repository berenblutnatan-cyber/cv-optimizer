import Link from "next/link";
import { LucideIcon } from "lucide-react";

export function SquircleIcon({
  icon: Icon,
  label,
  href,
  gradient,
  badge,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  href?: string;
  gradient?: [string, string];
  badge?: number;
  onClick?: () => void;
}) {
  const bg = gradient
    ? `linear-gradient(135deg, ${gradient[0]} 0%, ${gradient[1]} 100%)`
    : "linear-gradient(135deg, rgba(30,27,55,0.85) 0%, rgba(20,18,38,0.95) 100%)";

  const inner = (
    <span className="flex flex-col items-center gap-2 group">
      <span
        className="relative h-16 w-16 rounded-[28%] grid place-items-center shadow-glow ring-1 ring-white/10 transition-transform duration-200 group-hover:scale-105 group-active:scale-95"
        style={{ background: bg }}
      >
        <Icon className="h-7 w-7 text-white/95" strokeWidth={1.8} />
        {typeof badge === "number" && badge > 0 ? (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 rounded-full bg-[#f5b8c8] text-[11px] font-medium text-[#1a1a1a] grid place-items-center">
            {badge > 99 ? "99+" : badge}
          </span>
        ) : null}
      </span>
      <span className="text-[11px] font-medium tracking-wide text-white/85 px-2 py-0.5 rounded-full bg-black/30 backdrop-blur-sm">
        {label}
      </span>
    </span>
  );

  if (href) return <Link href={href}>{inner}</Link>;
  return (
    <button type="button" onClick={onClick} className="appearance-none bg-transparent">
      {inner}
    </button>
  );
}
