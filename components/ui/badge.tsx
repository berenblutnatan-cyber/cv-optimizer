import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./cn";

const badge = cva("inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-full px-2.5 text-dense font-medium [&_svg]:size-3.5", {
  variants: {
    tone: {
      neutral: "bg-surface-2 text-ink-2",
      accent: "bg-accent-wash text-accent-ink",
      success: "bg-success-wash text-success",
      warn: "bg-warn-wash text-warn",
      danger: "bg-danger-wash text-danger",
      outline: "border border-hairline-strong text-ink-2",
    },
  },
  defaultVariants: { tone: "neutral" },
});

export function Badge({ tone, className, ...props }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badge>) {
  return <span className={cn(badge({ tone }), className)} {...props} />;
}
