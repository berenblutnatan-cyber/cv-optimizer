import * as React from "react";
import { cn } from "./cn";

/**
 * The one h1 of an app page, in the brand serif. Hebrew pages (dir="rtl") switch
 * to the sans: Instrument Serif has no Hebrew, and a light Hebrew title reads weak.
 */
export function PageTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h1
      className={cn("font-display text-h1 font-normal text-ink md:text-title rtl:font-sans rtl:font-semibold rtl:tracking-normal", className)}
      {...props}
    />
  );
}
