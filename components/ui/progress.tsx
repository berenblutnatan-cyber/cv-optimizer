import { cn } from "./cn";

export function Progress({ value, label, className }: { value: number; label: string; className?: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v)} className={cn("h-1.5 overflow-hidden rounded-full bg-surface-2", className)}>
      <div className="h-full rounded-full bg-accent transition-[width] duration-panel" style={{ width: `${v}%` }} />
    </div>
  );
}
