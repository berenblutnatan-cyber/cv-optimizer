"use client";

import Link from "next/link";

interface LogoProps {
  variant?: "light" | "dark";
  size?: "sm" | "md" | "lg";
  linkTo?: string;
}

export function Logo({ variant = "dark", size = "md", linkTo = "/" }: LogoProps) {
  const sizeClasses = {
    sm: "text-xl",
    md: "text-2xl",
    lg: "text-3xl",
  };

  const colorClasses = {
    light: "text-white",
    dark: "text-slate-900",
  };

  const logo = (
    <span
      className={`font-extrabold tracking-tight ${sizeClasses[size]} ${colorClasses[variant]}`}
    >
      Hired
    </span>
  );

  if (linkTo) {
    return (
      <Link href={linkTo} className="hover:opacity-90 transition-opacity">
        {logo}
      </Link>
    );
  }

  return logo;
}
