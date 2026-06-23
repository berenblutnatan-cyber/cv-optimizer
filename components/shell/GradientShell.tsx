import { ReactNode } from "react";

type Variant = "warm" | "cool" | "auto";
/** "vivid" = the saturated brand gradient (default). "light" = cream + soft
 *  aurora, matching the onboarding funnel so the builder feels like the home. */
type Tone = "vivid" | "light";

const VARIANT_GRADIENT: Record<Variant, string> = {
  auto: "linear-gradient(135deg, #f5c4d4 0%, #c9b8ff 45%, #8fb3ff 100%)",
  warm: "linear-gradient(135deg, #f5c4d4 0%, #f5b8c8 50%, #c9b8ff 100%)",
  cool: "linear-gradient(135deg, #c9b8ff 0%, #8fb3ff 60%, #6f8fff 100%)",
};

export function GradientShell({
  children,
  variant = "auto",
  tone = "vivid",
  noise = true,
  className,
}: {
  children: ReactNode;
  variant?: Variant;
  tone?: Tone;
  noise?: boolean;
  className?: string;
}) {
  if (tone === "light") {
    return (
      <div
        className={`relative min-h-dvh w-full overflow-hidden bg-[#FBF9F4] text-[#0A2647] ${noise ? "grain-overlay" : ""} ${className ?? ""}`}
      >
        {/* Same calm aurora as the funnel — three soft blobs on cream. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-32 -top-24 h-[42rem] w-[42rem] rounded-full bg-[#C9B8FF] opacity-40 blur-[120px]" />
          <div className="absolute -right-40 top-10 h-[38rem] w-[38rem] rounded-full bg-[#8FB3FF] opacity-30 blur-[130px]" />
          <div className="absolute bottom-[-12rem] left-1/3 h-[40rem] w-[40rem] rounded-full bg-[#F5C4D4] opacity-30 blur-[130px]" />
        </div>
        <div className="relative z-10 min-h-dvh">{children}</div>
      </div>
    );
  }
  return (
    <div
      className={`relative min-h-dvh w-full overflow-hidden ${noise ? "grain-overlay" : ""} ${className ?? ""}`}
      style={{ background: VARIANT_GRADIENT[variant] }}
    >
      <div className="relative z-10 min-h-dvh">{children}</div>
    </div>
  );
}
