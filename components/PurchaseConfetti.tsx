"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";

const COLORS = ["#0A2647", "#D4AF37", "#2F6B4F", "#E07A5F", "#8FB3FF", "#F2CC8F", "#C9B8FF", "#F5B8C8"];

export function PurchaseConfetti() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.6 },
        colors: COLORS,
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.6 },
        colors: COLORS,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    // Initial burst from center
    confetti({
      particleCount: 80,
      spread: 100,
      origin: { y: 0.5 },
      colors: COLORS,
      startVelocity: 45,
    });

    // Continuous side cannons
    frame();
  }, []);

  return null;
}
