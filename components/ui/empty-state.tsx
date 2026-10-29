import * as React from "react";
import { cn } from "./cn";

/** One icon, one line, one action. Nothing else. */
export function EmptyState({ icon, title, action, className }: { icon: React.ReactNode; title: string; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-4 px-6 py-14 text-center", className)}>
      <div className="grid size-12 place-items-center rounded-card border border-hairline bg-surface-2 text-ink-3 [&_svg]:size-5">{icon}</div>
      <p className="text-emph font-medium text-ink">{title}</p>
      {action}
    </div>
  );
}

/** Error = what happened in one line + one recovery action. */
export function ErrorState({ title, action, className }: { title: string; action?: React.ReactNode; className?: string }) {
  return (
    <div role="alert" className={cn("flex flex-wrap items-center justify-between gap-3 rounded-card border border-danger/25 bg-danger-wash px-4 py-3", className)}>
      <p className="text-body font-medium text-danger">{title}</p>
      {action}
    </div>
  );
}
