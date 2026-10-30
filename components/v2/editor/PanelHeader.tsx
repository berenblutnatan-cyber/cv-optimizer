"use client";

import * as React from "react";
import { X } from "lucide-react";
import { IconButton } from "@/components/ui";

/** Header for a panel that temporarily replaces the editor (Design, Versions). */
export function PanelHeader({ title, onClose, action }: { title: string; onClose: () => void; action?: React.ReactNode }) {
  // Move focus into the panel on open (to the heading, not a control: a
  // focused icon button would pop its tooltip).
  const headingRef = React.useRef<HTMLHeadingElement>(null);
  React.useEffect(() => headingRef.current?.focus({ preventScroll: true }), []);
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented && !(e.target as HTMLElement | null)?.closest("[role=dialog],[role=menu],input,textarea")) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="flex h-13 shrink-0 items-center gap-2 border-b border-hairline px-3 ps-4">
      <h2 ref={headingRef} tabIndex={-1} className="flex-1 truncate text-emph font-semibold text-ink outline-none">{title}</h2>
      {action}
      <IconButton label="Close" shortcut="Esc" onClick={onClose}>
        <X />
      </IconButton>
    </div>
  );
}
