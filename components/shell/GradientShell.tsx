import { ReactNode } from "react";

type Variant = "warm" | "cool" | "auto";

const VARIANT_GRADIENT: Record<Variant, string> = {
  auto: "linear-gradient(135deg, #f5c4d4 0%, #c9b8ff 45%, #8fb3ff 100%)",
  warm: "linear-gradient(135deg, #f5c4d4 0%, #f5b8c8 50%, #c9b8ff 100%)",
  cool: "linear-gradient(135deg, #c9b8ff 0%, #8fb3ff 60%, #6f8fff 100%)",
};

export function GradientShell({
  children,
  variant = "auto",
  noise = true,
  className,
}: {
  children: ReactNode;
  variant?: Variant;
  noise?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`relative min-h-dvh w-full overflow-hidden ${noise ? "grain-overlay" : ""} ${className ?? ""}`}
      style={{ background: VARIANT_GRADIENT[variant] }}
    >
      <div className="relative z-10 min-h-dvh">{children}</div>
    </div>
  );
}
