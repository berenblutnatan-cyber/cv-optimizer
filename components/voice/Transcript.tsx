"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import type { Turn } from "@/hooks/useVoiceSession";
import { useT } from "@/lib/i18n/LanguageProvider";

export function Transcript({ turns }: { turns: Turn[] }) {
  const { t: translate } = useT();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [turns]);

  if (turns.length === 0) {
    return (
      <div className="mt-2 px-4 py-2 rounded-full bg-white/8 border border-glass-border text-xs text-white/55 inline-flex">
        {translate("Start by saying your name and what you do.")}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className="max-w-xl mx-auto w-full max-h-[260px] overflow-y-auto pr-1 space-y-2 [scrollbar-width:thin]"
      // Spoken answers are resume PII — mask the transcript in Clarity replays.
      data-clarity-mask="true"
    >
      {turns.map((t, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className={t.role === "user" ? "text-right" : "text-left"}
        >
          <span
            className={[
              "inline-block max-w-[85%] px-3.5 py-2 rounded-2xl text-sm leading-relaxed",
              t.role === "user"
                ? "bg-white/85 text-[#1a1a1a] rounded-tr-md"
                : "bg-white/10 text-white/90 border border-glass-border rounded-tl-md",
            ].join(" ")}
          >
            {t.text}
          </span>
        </motion.div>
      ))}
    </div>
  );
}
