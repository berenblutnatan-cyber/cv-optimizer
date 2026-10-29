"use client";

import * as React from "react";
import { Drawer } from "vaul";
import { cn } from "./cn";

/**
 * Bottom sheet on phones, side drawer on desktop (`side="right"`).
 * Built on vaul so drag-to-dismiss and focus trapping come for free.
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  side = "bottom",
  trigger,
  children,
  className,
}: {
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
  title: string;
  side?: "bottom" | "right";
  trigger?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} direction={side}>
      {trigger && <Drawer.Trigger asChild>{trigger}</Drawer.Trigger>}
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/30" />
        <Drawer.Content
          className={cn(
            "fixed z-50 flex flex-col border-hairline bg-surface shadow-pop focus-visible:outline-none",
            side === "bottom" && "inset-x-0 bottom-0 max-h-[92vh] rounded-t-panel border-t",
            side === "right" && "inset-y-0 right-0 w-[min(480px,100vw)] border-s",
            className,
          )}
        >
          {side === "bottom" && <div aria-hidden className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-hairline-strong" />}
          <div className="flex min-h-14 items-center px-5">
            <Drawer.Title className="text-h3 font-semibold text-ink">{title}</Drawer.Title>
            <Drawer.Description className="sr-only">{title}</Drawer.Description>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-[max(20px,env(safe-area-inset-bottom))]">{children}</div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
