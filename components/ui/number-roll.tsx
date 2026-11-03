"use client";

import NumberFlow from "@number-flow/react";
import { cn } from "./cn";

/** A number whose digits roll to the new value (NumberFlow, MIT). Calm motion is kept for reduced-motion users. */
export function NumberRoll({ value, className, suffix }: { value: number; className?: string; suffix?: string }) {
  return (
    <bdi className={cn("tabular", className)}>
      <NumberFlow value={value} suffix={suffix} willChange transformTiming={{ duration: 650, easing: "cubic-bezier(.23,1,.32,1)" }} />
    </bdi>
  );
}
