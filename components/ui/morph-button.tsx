"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { Button, type ButtonProps } from "./button";
import { IconButton } from "./icon-button";
import { cn } from "./cn";
import { toast } from "./toast";

/**
 * A button whose label changes in place: Save → Saving → Saved. Every label sits
 * in the same grid cell, so the button keeps the width of the longest one and
 * nothing around it moves.
 */
export function MorphButton<S extends string>({
  state,
  labels,
  ...props
}: Omit<ButtonProps, "children"> & { state: S; labels: Record<S, React.ReactNode> }) {
  return (
    <Button aria-live="polite" {...props}>
      <span className="grid">
        {(Object.keys(labels) as S[]).map((key) => (
          <span
            key={key}
            aria-hidden={key !== state}
            className={cn(
              "col-start-1 row-start-1 inline-flex items-center justify-center gap-2 transition-[opacity,transform,filter] duration-200 ease-strong",
              key === state ? "opacity-100" : "pointer-events-none translate-y-1.5 opacity-0 blur-[2px]",
            )}
          >
            {labels[key]}
          </span>
        ))}
      </span>
    </Button>
  );
}

/**
 * The one copy control. The label (or the icon alone) turns into a check for a
 * moment, in place, so the person sees it worked where they clicked.
 * `text` may be a function, read at click time (a link to the current page).
 */
export function CopyButton({
  text,
  label = "Copy",
  copiedLabel = "Copied",
  failedLabel = "Couldn't copy",
  iconOnly,
  ariaLabel,
  variant = "ghost",
  size = "sm",
  className,
}: {
  text: string | (() => string);
  label?: string;
  copiedLabel?: string;
  failedLabel?: string;
  iconOnly?: boolean;
  /** What is copied, when the visible label alone doesn't say it ("Copy summary"). */
  ariaLabel?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
}) {
  const [copied, setCopied] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout>>();
  React.useEffect(() => () => clearTimeout(timer.current), []);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(typeof text === "function" ? text() : text);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error(failedLabel);
    }
  };
  if (iconOnly)
    return (
      <IconButton label={copied ? copiedLabel : label} onClick={() => void copy()} className={className}>
        <span className="grid [&_svg]:col-start-1 [&_svg]:row-start-1 [&_svg]:transition-[opacity,transform] [&_svg]:duration-200 [&_svg]:ease-strong">
          <Copy className={cn(copied && "scale-50 opacity-0")} aria-hidden />
          <Check className={cn("text-success", !copied && "scale-50 opacity-0")} aria-hidden />
        </span>
      </IconButton>
    );
  return (
    <MorphButton
      variant={variant}
      size={size}
      className={className}
      aria-label={ariaLabel}
      state={copied ? "copied" : "idle"}
      onClick={() => void copy()}
      labels={{
        idle: (
          <>
            <Copy aria-hidden /> {label}
          </>
        ),
        copied: (
          <>
            <Check aria-hidden className={variant === "primary" ? undefined : "text-success"} /> {copiedLabel}
          </>
        ),
      }}
    />
  );
}
