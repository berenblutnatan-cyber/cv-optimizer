"use client";

import * as React from "react";
import * as T from "@radix-ui/react-tooltip";
import { Kbd } from "./kbd";

export const TooltipProvider = ({ children }: { children: React.ReactNode }) => (
  <T.Provider delayDuration={350} skipDelayDuration={150}>
    {children}
  </T.Provider>
);

/** The only place explanations live (house rules). */
export function Tooltip({
  content,
  shortcut,
  side = "top",
  children,
}: {
  content: React.ReactNode;
  shortcut?: string;
  side?: "top" | "right" | "bottom" | "left";
  children: React.ReactElement;
}) {
  return (
    <T.Root>
      <T.Trigger asChild>{children}</T.Trigger>
      <T.Portal>
        <T.Content
          side={side}
          sideOffset={6}
          collisionPadding={8}
          className="z-50 flex max-w-72 animate-pop-in items-center gap-2 rounded-control bg-ink px-2.5 py-1.5 text-dense text-canvas shadow-pop"
        >
          <span>{content}</span>
          {shortcut && <Kbd tone="inverse">{shortcut}</Kbd>}
        </T.Content>
      </T.Portal>
    </T.Root>
  );
}
