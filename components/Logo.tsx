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

  const textColorClass = variant === "dark" ? "text-[#0A2647]" : "text-white";

  return (
    <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-all duration-200 cursor-pointer group">
      <div className={`${sizeClasses[size]} flex items-center justify-center relative`}>
        <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
          {/* Left vertical bar (navy) */}
          <rect x="15" y="20" width="14" height="60" fill="#0A2647" rx="1"/>
          
          {/* Right vertical bar (navy) */}
          <rect x="71" y="20" width="14" height="60" fill="#0A2647" rx="1"/>
          
          {/* Middle diagonal bar (gold accent) */}
          <path 
            d="M 29 45 L 71 55 L 71 63 L 29 53 Z" 
            fill="#B8860B"
          />
        </svg>
      </div>
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
