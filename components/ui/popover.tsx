"use client";

import * as React from "react";
import * as P from "@radix-ui/react-popover";
import { cn } from "./cn";
import { useT } from "@/lib/i18n/LanguageProvider";

export const Popover = P.Root;
export const PopoverTrigger = P.Trigger;

export function PopoverContent({ className, align = "start", ...props }: React.ComponentPropsWithoutRef<typeof P.Content>) {
  const { dir } = useT();
  return (
    <P.Portal>
      <P.Content
        dir={dir}
        align={align}
        sideOffset={6}
        collisionPadding={8}
        className={cn("z-50 w-80 animate-pop-in rounded-card border border-hairline bg-surface p-4 shadow-pop focus-visible:outline-none", className)}
        {...props}
      />
    </P.Portal>
  );
}
