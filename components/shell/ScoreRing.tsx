"use client";

// The ONE score ring. Two visual variants, same geometry and motion:
//   "glass" — white-on-dark with the brand gradient (marketing surfaces)
//   "band"  — light surfaces, colored by the shared score band
//             (builder panel, review studio, history rows)
// Band colors come from lib/score/bands.ts so every surface speaks the same
// score language.

import { motion } from "framer-motion";
import { bandFor, BAND_COLOR } from "@/lib/score/bands";

export function ScoreRing({
  value,
  size = 160,
  label,
  animate = true,
  variant = "glass",
  trackColor,
  fillColor,
}: {
  value: number; // 0-100
  size?: number;
  label?: string;
  animate?: boolean;
  variant?: "glass" | "band";
  trackColor?: string;
  fillColor?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const stroke = Math.max(6, size / 16);
  const r = size / 2 - stroke;
  const c = 2 * Math.PI * r;
  const offset = c - (clamped / 100) * c;

  const bandColor = BAND_COLOR[bandFor(clamped)];
  const resolvedTrack = trackColor ?? (variant === "band" ? "#E7E5E4" : "rgba(255,255,255,0.15)");
  const resolvedFill = fillColor ?? (variant === "band" ? bandColor : "url(#scoreGrad)");

  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <defs>
          <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f5b8c8" />
            <stop offset="60%" stopColor="#c9b8ff" />
            <stop offset="100%" stopColor="#8fb3ff" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} stroke={resolvedTrack} strokeWidth={stroke} fill="none" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={resolvedFill}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: animate ? c : offset }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          style={variant === "band" ? { transition: "stroke 400ms" } : undefined}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        {variant === "band" ? (
          <div>
            <div
              className="font-bold tabular-nums leading-none"
              style={{ fontSize: size / 4, color: bandColor }}
            >
              {Math.round(clamped)}
            </div>
            {label ? (
              <div className="mt-1 text-sm text-stone-400">{label}</div>
            ) : null}
          </div>
        ) : (
          <div>
            <div className="font-serif italic text-white tabular-nums" style={{ fontSize: size / 4 }}>
              {Math.round(clamped)}
            </div>
            {label ? (
              <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-white/60">{label}</div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
