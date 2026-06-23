import { ElementType, ReactNode } from "react";

type Tone = "default" | "strong";
type Padding = "sm" | "md" | "lg";

const TONE: Record<Tone, string> = {
  default: "bg-glass",
  strong: "bg-glass-strong",
};

const PAD: Record<Padding, string> = {
  sm: "p-3",
  md: "p-5",
  lg: "p-7",
};

export function GlassCard({
  children,
  tone = "default",
  padding = "md",
  as,
  className,
  ...rest
}: {
  children: ReactNode;
  tone?: Tone;
  padding?: Padding;
  as?: ElementType;
  className?: string;
} & React.HTMLAttributes<HTMLElement>) {
  const Tag: ElementType = as ?? "div";
  return (
    <Tag
      className={[
        "relative rounded-3xl border border-glass-border",
        "backdrop-blur-glass shadow-glow",
        TONE[tone],
        PAD[padding],
        "text-[color:var(--text-on-glass)]",
        className ?? "",
      ].join(" ")}
      {...rest}
    >
      {children}
    </Tag>
  );
}
