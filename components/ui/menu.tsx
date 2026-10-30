"use client";

import * as React from "react";
import * as M from "@radix-ui/react-dropdown-menu";
import { cn } from "./cn";
import { Kbd } from "./kbd";

export const Menu = M.Root;
export const MenuTrigger = M.Trigger;

export function MenuContent({ children, align = "end", className }: { children: React.ReactNode; align?: "start" | "end" | "center"; className?: string }) {
  return (
    <M.Portal>
      <M.Content
        align={align}
        sideOffset={6}
        collisionPadding={8}
        className={cn("z-50 min-w-52 animate-pop-in rounded-card border border-hairline bg-surface p-1 shadow-pop", className)}
      >
        {children}
      </M.Content>
    </M.Portal>
  );
}

export function MenuItem({
  icon,
  shortcut,
  tone = "default",
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof M.Item> & { icon?: React.ReactNode; shortcut?: string; tone?: "default" | "danger" }) {
  return (
    <M.Item
      className={cn(
        "flex h-9 cursor-default select-none items-center gap-2.5 rounded-control px-2.5 text-body outline-none data-[disabled]:opacity-50 data-[highlighted]:bg-surface-2 [&_svg]:size-4",
        tone === "danger" ? "text-danger" : "text-ink",
      )}
      {...props}
    >
      {icon && <span className={tone === "danger" ? "text-danger" : "text-ink-3"}>{icon}</span>}
      <span className="flex-1">{children}</span>
      {shortcut && <Kbd>{shortcut}</Kbd>}
    </M.Item>
  );
}

export const MenuSeparator = () => <M.Separator className="my-1 h-px bg-hairline" />;
