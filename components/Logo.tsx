import Link from "next/link";

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

  const textColorClass = variant === "dark" ? "text-[#2c3e7d]" : "text-white";

  return (
    <Link href="/" className="flex items-center gap-2.5 hover:opacity-90 transition-all duration-200 cursor-pointer group">
      <div className={`${sizeClasses[size]} flex items-center justify-center relative`}>
        <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
          {/* Left vertical bar (dark blue) */}
          <rect x="15" y="20" width="15" height="60" fill="#2c3e7d" rx="2"/>
          
          {/* Right vertical bar (dark blue) */}
          <rect x="70" y="20" width="15" height="60" fill="#2c3e7d" rx="2"/>
          
          {/* Middle horizontal bar (yellow/orange) */}
          <path 
            d="M 30 45 L 70 55 L 70 65 L 30 55 Z" 
            fill="#f59e0b"
          />
        </svg>
      </div>
      <div className="flex flex-col leading-none">
        <span 
          className={`${textSizeClasses[size]} font-bold ${textColorClass} tracking-tight`}
        >
          Hired
        </span>
      </div>
    </Link>
  );
}
