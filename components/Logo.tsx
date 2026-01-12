import Link from "next/link";
import { Sparkles } from "lucide-react";

type LogoProps = {
  variant?: "light" | "dark";
  size?: "sm" | "md" | "lg";
  linkTo?: string;
};

export function Logo({ variant = "dark", size = "md", linkTo }: LogoProps) {
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-10 h-10",
  };

  const textSizeClasses = {
    sm: "text-base",
    md: "text-xl",
    lg: "text-2xl",
  };

  const iconSizeClasses = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  const textColorClass = variant === "dark" ? "text-slate-900" : "text-white";

  const content = (
    <>
      <div className={`${sizeClasses[size]} rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center`}>
        <Sparkles className={`${iconSizeClasses[size]} text-white`} />
      </div>
      <span className={`${textSizeClasses[size]} font-bold tracking-tight ${textColorClass}`}>
        Hired
      </span>
    </>
  );

  if (linkTo) {
    return (
      <Link href={linkTo} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
        {content}
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {content}
    </div>
  );
}
