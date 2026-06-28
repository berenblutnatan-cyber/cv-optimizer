"use client";

import { motion } from "framer-motion";
import { Mic, Square } from "lucide-react";
import type { VoiceState } from "@/hooks/useVoiceSession";
import { useT } from "@/lib/i18n/LanguageProvider";

const STATE_COPY: Record<VoiceState, string> = {
  idle: "Tap to start",
  connecting: "Connecting…",
  listening: "I'm listening",
  thinking: "Thinking…",
  speaking: "Speaking…",
  finalizing: "Building your CV…",
  error: "Something broke",
};

export function VoiceOrb({
  state,
  amplitude,
  onClick,
}: {
  state: VoiceState;
  amplitude: number;
  onClick: () => void;
}) {
  const { t } = useT();
  const active = state !== "idle" && state !== "error";
  const scale = 1 + Math.min(0.35, amplitude * 1.2);
  const isUserTurn = state === "listening";
  const isAssistantTurn = state === "speaking";

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        type="button"
        onClick={onClick}
        aria-label={t(STATE_COPY[state])}
        className="relative grid place-items-center focus:outline-none"
      >
        {/* Glow ring */}
        <motion.span
          aria-hidden
          className="absolute rounded-full blur-3xl opacity-70"
          style={{
            width: 360,
            height: 360,
            background:
              "radial-gradient(circle at 35% 30%, #f5b8c8 0%, #c9b8ff 35%, #8fb3ff 80%)",
          }}
          animate={{
            scale: active ? [1, 1.05, 1] : 1,
            opacity: active ? [0.65, 0.85, 0.65] : 0.4,
          }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* The orb itself */}
        <motion.span
          className="relative h-56 w-56 md:h-64 md:w-64 rounded-full grid place-items-center"
          style={{
            background:
              "radial-gradient(circle at 35% 30%, rgba(255,255,255,0.85), rgba(245,184,200,0.6) 35%, rgba(143,179,255,0.55) 75%, rgba(20,18,38,0.65) 100%)",
            boxShadow:
              "inset 0 0 60px rgba(255,255,255,0.35), 0 30px 80px -20px rgba(20,18,38,0.7)",
          }}
          animate={{ scale }}
          transition={{ type: "spring", stiffness: 220, damping: 22 }}
        >
          {/* Mic / Square symbol */}
          <span
            className={[
              "relative grid place-items-center h-16 w-16 rounded-full transition-colors duration-200",
              active ? "bg-white/95 text-[#1a1a1a]" : "bg-white/85 text-[#1a1a1a]",
            ].join(" ")}
          >
            {active ? (
              <Square className="h-5 w-5 fill-current" />
            ) : (
              <Mic className="h-7 w-7" strokeWidth={1.7} />
            )}
          </span>

          {/* User vs assistant indicator dot */}
          {active ? (
            <span
              aria-hidden
              className={[
                "absolute -bottom-2 h-2 w-12 rounded-full transition-colors",
                isUserTurn ? "bg-[#f5b8c8]" : isAssistantTurn ? "bg-[#8fb3ff]" : "bg-white/40",
              ].join(" ")}
            />
          ) : null}
        </motion.span>
      </button>

      <div className="text-center">
        <div className="text-[11px] uppercase tracking-[0.22em] text-white/55">
          {t(STATE_COPY[state])}
        </div>
      </div>
    </div>
  );
}
