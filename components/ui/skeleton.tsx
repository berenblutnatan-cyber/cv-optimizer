import { cn } from "./cn";

/** Loading is always a skeleton of the real layout, never a spinner. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton h-4", className)} />;
}
