"use client";

import * as React from "react";
import * as D from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "./cn";

export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;

export function DialogContent({
  title,
  description,
  children,
  footer,
  className,
  size = "md",
  showDescription = false,
}: {
  title: string;
  /** Screen-reader description; nothing visible restates the title. */
  description?: string;
  /** Show the description as the dialog's one line of body text (a confirm). */
  showDescription?: boolean;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px] data-[state=open]:animate-fade-in" />
      <D.Content
        className={cn(
          "fixed inset-x-0 top-[12vh] z-50 mx-auto flex max-h-[76vh] w-[calc(100vw-32px)] flex-col rounded-panel border border-hairline bg-surface shadow-pop focus-visible:outline-none data-[state=open]:animate-pop-in",
          size === "sm" && "max-w-sm",
          size === "md" && "max-w-lg",
          size === "lg" && "max-w-2xl",
          className,
        )}
      >
        <div className="flex items-center justify-between gap-4 px-5 pb-2 pt-5">
          <D.Title className="text-h3 font-semibold text-ink">{title}</D.Title>
          <D.Close aria-label="Close" className="grid size-9 place-items-center rounded-control text-ink-3 hover:bg-surface-2 hover:text-ink">
            <X className="size-[18px]" />
          </D.Close>
        </div>
        {description && showDescription ? (
          <D.Description className="px-5 pb-5 text-body text-ink-2">{description}</D.Description>
        ) : (
          <D.Description className="sr-only">{description || title}</D.Description>
        )}
        {children && <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">{children}</div>}
        {footer && <div className="flex justify-end gap-2 border-t border-hairline px-5 py-3">{footer}</div>}
      </D.Content>
    </D.Portal>
  );
}
