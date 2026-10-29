"use client";

import * as React from "react";
import { cn } from "./cn";
import { Tooltip } from "./tooltip";

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required: becomes the accessible name and the tooltip. */
  label: string;
  shortcut?: string;
  size?: "md" | "lg";
  active?: boolean;
}

/** Square icon control. 36px visual, 44px tap target on touch (lg). */
export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ label, shortcut, size = "md", active, className, children, ...props }, ref) => (
    <Tooltip content={label} shortcut={shortcut}>
      <button
        ref={ref}
        type="button"
        aria-label={label}
        aria-pressed={active}
        className={cn(
          "inline-grid shrink-0 place-items-center rounded-control text-ink-2 transition-colors duration-micro hover:bg-surface-2 hover:text-ink disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-[18px]",
          size === "md" ? "size-9 touch:size-11" : "size-11",
          active && "bg-surface-2 text-ink",
          className,
        )}
        {...props}
      >
        {children}
      </button>
    </Tooltip>
  ),
);
IconButton.displayName = "IconButton";
