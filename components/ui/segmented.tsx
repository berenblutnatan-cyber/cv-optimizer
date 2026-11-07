"use client";

import * as React from "react";
import * as TG from "@radix-ui/react-toggle-group";
import { LayoutGroup, MotionConfig, motion } from "framer-motion";
import { cn } from "./cn";

export type SegmentOption<T extends string> = { value: T; label: React.ReactNode; icon?: React.ReactNode; ariaLabel?: string };

/** Single-choice segmented control (Type · Chat · Talk, light/dark, table/board). The pill slides to the choice. */
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
  // Each control gets its own layout group, so two on one page never trade pills.
  const group = React.useId();
  return (
    <MotionConfig reducedMotion="user" transition={{ type: "spring", duration: 0.32, bounce: 0.15 }}>
      <LayoutGroup id={group}>
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
                "relative inline-flex items-center justify-center gap-1.5 rounded-[6px] font-medium text-ink-2 transition-colors duration-micro hover:text-ink data-[state=on]:text-ink [&_svg]:size-4",
                size === "md" ? "h-9 px-3 text-body touch:h-11" : "h-7 px-2.5 text-dense touch:h-11",
              )}
            >
              {o.value === value && <motion.span layoutId="pill" className="absolute inset-0 rounded-[6px] bg-surface shadow-card" aria-hidden />}
              <span className="relative inline-flex items-center gap-1.5">
                {o.icon}
                {o.label}
              </span>
            </TG.Item>
          ))}
        </TG.Root>
      </LayoutGroup>
    </MotionConfig>
  );
}
