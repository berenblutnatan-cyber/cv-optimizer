import Link from "next/link";
import { HiredMark } from "@/components/brand/HiredMark";

type LogoProps = {
  variant?: "light" | "dark";
  size?: "sm" | "md" | "lg";
};

export function Logo({ variant = "dark", size = "md" }: LogoProps) {
  const sizeClasses = {
    sm: "w-7 h-7",
    md: "w-9 h-9",
    lg: "w-11 h-11",
  };

  const textSizeClasses = {
    sm: "text-xl",
    md: "text-2xl",
    lg: "text-3xl",
  };

  const textColorClass = variant === "dark" ? "text-brand-navy" : "text-white";

  return (
    <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-all duration-200 cursor-pointer group">
      <HiredMark className={`${sizeClasses[size]} shrink-0`} />
      <div className="flex flex-col leading-none">
        <span 
          className={`${textSizeClasses[size]} font-serif font-semibold ${textColorClass} tracking-tight`}
        >
          Hired
        </span>
      </div>
    </Link>
  );
}
