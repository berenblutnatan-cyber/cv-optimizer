"use client";

import { Toaster as Sonner, toast } from "sonner";

/** Toasts only for results that land off-screen (house rules). */
export function Toaster() {
  return (
    <Sonner
      position="bottom-right"
      gap={8}
      // Phones: above the bottom tab bar when the page has one.
      mobileOffset={{ bottom: "calc(var(--bottom-nav, 0px) + 16px)", left: 16, right: 16 }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "flex w-[356px] items-center gap-3 rounded-card border border-hairline bg-surface px-4 py-3 text-body text-ink shadow-pop",
          title: "font-medium",
          description: "text-ink-2",
          actionButton: "ms-auto rounded-control bg-ink px-2.5 py-1 text-dense font-medium text-canvas",
          cancelButton: "rounded-control px-2.5 py-1 text-dense text-ink-2",
          error: "[&_svg]:text-danger",
          success: "[&_svg]:text-success",
        },
      }}
    />
  );
}

export { toast };
