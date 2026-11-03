"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "./cn";
import { Tooltip } from "./tooltip";

type State = "idle" | "holding" | "done";

/**
 * Press and hold to confirm an irreversible action. The fill is the countdown;
 * letting go early drains it. Space or Enter held down does the same.
 * Idea from Kokonut UI's hold button (MIT), rebuilt on our tokens.
 */
export function HoldButton({
  children,
  done,
  onConfirm,
  hint,
  ms = 1200,
  className,
}: {
  children: React.ReactNode;
  /** Label once confirmed. */
  done: React.ReactNode;
  /** Return false (or reject) when the action failed, and the button resets. */
  onConfirm: () => void | boolean | Promise<void | boolean>;
  /** Tooltip: how to use it. */
  hint: string;
  ms?: number;
  className?: string;
}) {
  const [state, setState] = React.useState<State>("idle");
  const timer = React.useRef<ReturnType<typeof setTimeout>>();

  const start = () => {
    if (state !== "idle") return;
    setState("holding");
    timer.current = setTimeout(async () => {
      setState("done");
      const ok = await Promise.resolve()
        .then(onConfirm)
        .catch(() => false);
      if (ok === false) setState("idle");
    }, ms);
  };
  const cancel = () => {
    clearTimeout(timer.current);
    setState((s) => (s === "holding" ? "idle" : s));
  };
  React.useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <Tooltip content={hint}>
      <button
        type="button"
        data-state={state}
        aria-disabled={state === "done" || undefined}
        onPointerDown={(e) => {
          if (e.button === 0) start();
        }}
        onPointerUp={cancel}
        onPointerLeave={cancel}
        onPointerCancel={cancel}
        onKeyDown={(e) => {
          if ((e.key === " " || e.key === "Enter") && !e.repeat) {
            e.preventDefault();
            start();
          }
        }}
        onKeyUp={(e) => {
          if (e.key === " " || e.key === "Enter") cancel();
        }}
        onContextMenu={(e) => e.preventDefault()}
        className={cn(
          "relative inline-flex h-9 touch-none select-none items-center justify-center overflow-hidden rounded-control border border-danger/30 bg-danger-wash px-3.5 text-body font-medium text-danger transition-[transform,background-color,color] duration-micro ease-strong [-webkit-touch-callout:none] touch:h-11 [&_svg]:size-4",
          "data-[state=holding]:scale-[0.98] data-[state=done]:border-danger data-[state=done]:bg-danger data-[state=done]:text-white",
          className,
        )}
        style={{ ["--hold-ms" as string]: `${ms}ms` }}
      >
        <span
          aria-hidden
          data-state={state}
          className="hold-fill absolute inset-0 origin-left bg-danger/20 rtl:origin-right"
          style={{
            transform: state === "idle" ? "scaleX(0)" : "scaleX(1)",
            transition: state === "holding" ? `transform ${ms}ms linear` : "transform 220ms var(--ease-strong)",
          }}
        />
        <span className="relative grid">
          <span aria-hidden={state === "done" || undefined} className={cn("col-start-1 row-start-1 inline-flex items-center gap-2 transition-[opacity,transform] duration-micro", state === "done" && "-translate-y-2 opacity-0")}>{children}</span>
          <span
            aria-hidden={state !== "done"}
            className={cn("col-start-1 row-start-1 inline-flex items-center justify-center gap-2 transition-[opacity,transform] duration-micro", state === "done" ? "opacity-100" : "translate-y-2 opacity-0")}
          >
            <Check />
            {done}
          </span>
        </span>
      </button>
    </Tooltip>
  );
}
