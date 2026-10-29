import { cn } from "./cn";

export function Kbd({ children, tone = "default", className }: { children: React.ReactNode; tone?: "default" | "inverse"; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex h-6 min-w-6 items-center justify-center rounded-[4px] px-1.5 font-sans text-dense font-medium",
        tone === "default" ? "border border-hairline bg-surface-2 text-ink-2" : "bg-canvas/15 text-canvas",
        className,
      )}
    >
      {children}
    </kbd>
  );
}
