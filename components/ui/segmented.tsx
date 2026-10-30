"use client";

import * as React from "react";
import * as TG from "@radix-ui/react-toggle-group";
import { cn } from "./cn";

export type SegmentOption<T extends string> = { value: T; label: React.ReactNode; icon?: React.ReactNode; ariaLabel?: string };

/** Single-choice segmented control (Type · Chat · Talk, light/dark, table/board). */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = "md",
  className,
  "aria-label": ariaLabel,
}: {
  value: T;
  onChange: (v: T) => void;
  options: SegmentOption<T>[];
  size?: "sm" | "md";
  className?: string;
  "aria-label": string;
}) {
  return (
    <TG.Root
      type="single"
      value={value}
      onValueChange={(v) => v && onChange(v as T)}
      aria-label={ariaLabel}
      className={cn("inline-flex items-center gap-0.5 rounded-control bg-surface-2 p-0.5", className)}
    >
      {options.map((o) => (
        <TG.Item
          key={o.value}
          value={o.value}
          aria-label={o.ariaLabel}
          className={cn(
            "inline-flex items-center justify-center gap-1.5 rounded-[5px] font-medium text-ink-2 transition-[background-color,color,box-shadow] duration-micro hover:text-ink data-[state=on]:bg-surface data-[state=on]:text-ink data-[state=on]:shadow-card [&_svg]:size-4",
            size === "md" ? "h-8 px-3 text-body touch:h-11" : "h-7 px-2.5 text-dense touch:h-11",
          )}
        >
          {o.icon}
          {o.label}
        </TG.Item>
      ))}
    </TG.Root>
  );
}
