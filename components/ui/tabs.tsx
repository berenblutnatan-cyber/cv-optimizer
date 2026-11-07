"use client";

import * as React from "react";
import * as T from "@radix-ui/react-tabs";
import { LayoutGroup, MotionConfig, motion } from "framer-motion";
import { cn } from "./cn";

// The active tab's underline slides to the next one (framer layout animation).
const TabsCtx = React.createContext<{ group: string; value?: string }>({ group: "" });

export const Tabs = React.forwardRef<React.ElementRef<typeof T.Root>, React.ComponentPropsWithoutRef<typeof T.Root>>(
  ({ value, defaultValue, onValueChange, ...props }, ref) => {
    const group = React.useId();
    const [inner, setInner] = React.useState(defaultValue);
    const current = value ?? inner;
    return (
      <TabsCtx.Provider value={{ group, value: current }}>
        <MotionConfig reducedMotion="user" transition={{ type: "spring", duration: 0.32, bounce: 0.1 }}>
          <LayoutGroup id={group}>
            <T.Root
              ref={ref}
              value={value}
              defaultValue={defaultValue}
              onValueChange={(v) => {
                setInner(v);
                onValueChange?.(v);
              }}
              {...props}
            />
          </LayoutGroup>
        </MotionConfig>
      </TabsCtx.Provider>
    );
  },
);
Tabs.displayName = "Tabs";

export const TabsList = React.forwardRef<React.ElementRef<typeof T.List>, React.ComponentPropsWithoutRef<typeof T.List>>(
  ({ className, ...props }, ref) => (
    <T.List ref={ref} className={cn("flex items-center gap-5 border-b border-hairline", className)} {...props} />
  ),
);
TabsList.displayName = "TabsList";

export const TabsTrigger = React.forwardRef<React.ElementRef<typeof T.Trigger>, React.ComponentPropsWithoutRef<typeof T.Trigger>>(
  ({ className, children, value, ...props }, ref) => {
    const ctx = React.useContext(TabsCtx);
    return (
      <T.Trigger
        ref={ref}
        value={value}
        className={cn(
          "relative -mb-px inline-flex h-10 items-center gap-2 text-body font-medium text-ink-2 transition-colors duration-micro hover:text-ink data-[state=active]:text-ink",
          className,
        )}
        {...props}
      >
        {children}
        {ctx.value === value && <motion.span layoutId="tab-line" className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-ink" aria-hidden />}
      </T.Trigger>
    );
  },
);
TabsTrigger.displayName = "TabsTrigger";

export const TabsContent = React.forwardRef<React.ElementRef<typeof T.Content>, React.ComponentPropsWithoutRef<typeof T.Content>>(
  ({ className, ...props }, ref) => <T.Content ref={ref} className={cn("pt-5 focus-visible:outline-none", className)} {...props} />,
);
TabsContent.displayName = "TabsContent";
