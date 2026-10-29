"use client";

import * as React from "react";
import { Info } from "lucide-react";
import { cn } from "./cn";
import { Tooltip } from "./tooltip";

/**
 * Label + control + error. The label is always programmatically associated
 * (the control gets the generated id). Explanations go in `hint` (a tooltip),
 * never in helper paragraphs.
 */
export function Field({
  label,
  hint,
  error,
  optional,
  className,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  className?: string;
  children: React.ReactElement<{ id?: string; "aria-invalid"?: boolean; "aria-describedby"?: string }>;
}) {
  const id = React.useId();
  const errId = `${id}-err`;
  const control = React.cloneElement(children, {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? errId : undefined,
  });
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-center gap-1.5">
        <label htmlFor={id} className="text-dense font-medium text-ink">
          {label}
        </label>
        {optional && <span className="text-dense text-ink-3">optional</span>}
        {hint && (
          <Tooltip content={hint}>
            <button type="button" aria-label={`About ${label}`} className="text-ink-3 hover:text-ink-2">
              <Info className="size-4" />
            </button>
          </Tooltip>
        )}
      </div>
      {control}
      {error && (
        <p id={errId} role="alert" className="text-dense text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
