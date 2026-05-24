"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useMemo } from "react";

const COLORS = ["#f5b8c8", "#c9b8ff", "#8fb3ff", "#ffffff", "#fce7f3"];

export function LevelUpConfetti({
  show,
  newLevel,
  count = 36,
}: {
  show: boolean;
  newLevel?: string;
  count?: number;
}) {
  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        color: COLORS[i % COLORS.length],
        x: (Math.random() - 0.5) * 600,
        y: -(80 + Math.random() * 280),
        rot: (Math.random() - 0.5) * 720,
        delay: Math.random() * 0.15,
        size: 6 + Math.random() * 8,
      })),
    [count]
  );

  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          key="confetti"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none fixed inset-0 z-[100] grid place-items-center"
        >
          {newLevel ? (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 220, damping: 18 }}
              className="px-6 py-4 rounded-2xl bg-glass-strong border border-glass-border backdrop-blur-glass text-center shadow-glow"
            >
              <div className="text-[11px] uppercase tracking-[0.2em] text-white/60">Level up</div>
              <div className="mt-1 font-serif italic text-3xl text-white">{newLevel}</div>
            </motion.div>
          ) : null}
          <div className="absolute inset-0 grid place-items-center">
            {particles.map((p) => (
              <motion.span
                key={p.id}
                initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
                animate={{ x: p.x, y: p.y, rotate: p.rot, opacity: 0 }}
                transition={{ duration: 1.4, delay: p.delay, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  width: p.size,
                  height: p.size,
                  background: p.color,
                  borderRadius: 2,
                  position: "absolute",
                }}
              />
            ))}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
