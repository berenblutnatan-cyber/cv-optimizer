"use client";

import * as React from "react";
import * as T from "@radix-ui/react-tabs";
import { cn } from "./cn";

export const Tabs = T.Root;

export const TabsList = React.forwardRef<React.ElementRef<typeof T.List>, React.ComponentPropsWithoutRef<typeof T.List>>(
  ({ className, ...props }, ref) => (
    <T.List ref={ref} className={cn("flex items-center gap-5 border-b border-hairline", className)} {...props} />
  ),
);
TabsList.displayName = "TabsList";

export const TabsTrigger = React.forwardRef<React.ElementRef<typeof T.Trigger>, React.ComponentPropsWithoutRef<typeof T.Trigger>>(
  ({ className, ...props }, ref) => (
    <T.Trigger
      ref={ref}
      className={cn(
        "relative -mb-px inline-flex h-10 items-center gap-2 border-b-2 border-transparent text-body font-medium text-ink-2 transition-colors duration-micro hover:text-ink data-[state=active]:border-ink data-[state=active]:text-ink",
        className,
      )}
      {...props}
    />
  ),
);
TabsTrigger.displayName = "TabsTrigger";

export const TabsContent = React.forwardRef<React.ElementRef<typeof T.Content>, React.ComponentPropsWithoutRef<typeof T.Content>>(
  ({ className, ...props }, ref) => <T.Content ref={ref} className={cn("pt-5 focus-visible:outline-none", className)} {...props} />,
);
TabsContent.displayName = "TabsContent";
