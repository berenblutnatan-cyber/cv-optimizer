"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  ScanLine,
  Sparkles,
  Target,
  CheckCircle2,
  Wand2,
} from "lucide-react";

type Stage = {
  label: string;
  hint: string;
  Icon: typeof FileText;
};

const TARGETED_STAGES: Stage[] = [
  { label: "Reading your resume", hint: "Parsing every section, role, and skill", Icon: FileText },
  { label: "Decoding the job description", hint: "Extracting must-have keywords and requirements", Icon: ScanLine },
  { label: "Matching you to the role", hint: "Scoring your fit and surfacing gaps", Icon: Target },
  { label: "Crafting tailored rewrites", hint: "Sharper bullets, stronger verbs, ATS-friendly language", Icon: Wand2 },
  { label: "Finalizing your results", hint: "Almost there — packaging your optimized CV", Icon: Sparkles },
];

const QUICK_STAGES: Stage[] = [
  { label: "Reading your resume", hint: "Parsing every section, role, and skill", Icon: FileText },
  { label: "Auditing structure & impact", hint: "Where the bullets land and where they don't", Icon: ScanLine },
  { label: "Tightening keywords & verbs", hint: "ATS-friendly language for your field", Icon: Target },
  { label: "Crafting stronger rewrites", hint: "Recruiter-ready polish on every line", Icon: Wand2 },
  { label: "Finalizing your results", hint: "Almost there — packaging your optimized CV", Icon: Sparkles },
];

// Stage durations (ms). Total ~26s — analysis usually takes ~20-35s. If it runs
// long, the final stage just lingers (no fake completion).
const STAGE_DURATIONS = [3000, 5000, 6000, 7000, 999999];

type Props = {
  open: boolean;
  mode?: "quick" | "targeted";
  jobTitle?: string;
};

export function AnalyzingScreen({ open, mode = "targeted", jobTitle }: Props) {
  const stages = mode === "quick" ? QUICK_STAGES : TARGETED_STAGES;
  const [stageIdx, setStageIdx] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!open) {
      setStageIdx(0);
      setProgress(0);
      return;
    }

    // Stage advancement
    const timers: ReturnType<typeof setTimeout>[] = [];
    let elapsed = 0;
    for (let i = 0; i < stages.length - 1; i++) {
      elapsed += STAGE_DURATIONS[i];
      const next = i + 1;
      timers.push(setTimeout(() => setStageIdx(next), elapsed));
    }

    // Smoothly approach 95% over ~24s; never hit 100 until the parent unmounts us.
    const start = Date.now();
    const ease = setInterval(() => {
      const t = Date.now() - start;
      // Asymptote at 95: progress = 95 * (1 - e^(-t/9000))
      const eased = 95 * (1 - Math.exp(-t / 9000));
      setProgress(Math.min(95, eased));
    }, 120);

    return () => {
      timers.forEach(clearTimeout);
      clearInterval(ease);
    };
  }, [open, stages.length]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="analyzing-screen"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[60] flex items-center justify-center px-4 py-8"
          aria-live="polite"
          role="dialog"
          aria-label="Analyzing your resume"
        >
          {/* Backdrop with gradient + soft animated orbs */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#0A2647] via-[#0d3259] to-[#0A2647]" />
          <motion.div
            className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-[#B8860B]/25 blur-3xl"
            animate={{ x: [0, 60, -20, 0], y: [0, 40, -30, 0] }}
            transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -bottom-40 -right-32 h-[28rem] w-[28rem] rounded-full bg-indigo-500/20 blur-3xl"
            animate={{ x: [0, -40, 30, 0], y: [0, -50, 20, 0] }}
            transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Content card */}
          <motion.div
            initial={{ y: 30, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
            className="relative w-full max-w-xl bg-white/95 backdrop-blur-xl rounded-sm shadow-modal border border-white/20 px-6 sm:px-10 py-8 sm:py-10"
          >
            {/* Animated CV centerpiece */}
            <div className="flex justify-center mb-6 sm:mb-8">
              <CvScannerIcon />
            </div>

            {/* Headline */}
            <div className="text-center mb-7 sm:mb-8">
              <h2 className="font-serif text-2xl sm:text-3xl font-light text-[#1a1a1a] mb-2 tracking-tight">
                {mode === "quick"
                  ? "Polishing your resume"
                  : jobTitle?.trim()
                    ? "Tailoring your resume"
                    : "Analyzing your resume"}
              </h2>
              <p className="text-sm sm:text-base text-stone-500 font-light">
                {mode === "quick"
                  ? "Recruiter-grade polish in under a minute"
                  : jobTitle?.trim()
                    ? `Optimizing for ${jobTitle.trim()}`
                    : "Optimizing for your target role"}
              </p>
            </div>

            {/* Progress bar */}
            <div className="mb-7">
              <div className="relative h-1.5 w-full bg-stone-100 rounded-full overflow-hidden">
                <motion.div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#0A2647] via-[#B8860B] to-[#0A2647] bg-[length:200%_100%]"
                  animate={{ backgroundPosition: ["0% 0%", "200% 0%"] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-[10px] uppercase tracking-[0.18em] text-stone-400 font-medium">
                <span>Analyzing</span>
                <span>{Math.round(progress)}%</span>
              </div>
            </div>

            {/* Stage list */}
            <ul className="space-y-3 sm:space-y-4">
              {stages.map((stage, i) => {
                const done = i < stageIdx;
                const active = i === stageIdx;
                const StageIcon = stage.Icon;
                return (
                  <li
                    key={stage.label}
                    className={`flex items-start gap-3 sm:gap-4 transition-all duration-300 ${
                      done ? "opacity-65" : active ? "opacity-100" : "opacity-35"
                    }`}
                  >
                    <div
                      className={`flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all ${
                        done
                          ? "bg-[#0A2647]/10"
                          : active
                            ? "bg-[#B8860B]/15"
                            : "bg-stone-100"
                      }`}
                    >
                      {done ? (
                        <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-[#0A2647]" strokeWidth={2} />
                      ) : active ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                          className="flex"
                        >
                          <StageIcon className="w-4 h-4 sm:w-5 sm:h-5 text-[#B8860B]" strokeWidth={2} />
                        </motion.div>
                      ) : (
                        <StageIcon className="w-4 h-4 sm:w-5 sm:h-5 text-stone-400" strokeWidth={1.5} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 pt-1">
                      <div
                        className={`text-sm sm:text-base font-medium tracking-wide ${
                          active ? "text-[#0A2647]" : "text-[#1a1a1a]"
                        }`}
                      >
                        {stage.label}
                      </div>
                      <div className="text-xs sm:text-[13px] text-stone-500 font-light leading-snug">
                        {stage.hint}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Footnote */}
            <p className="mt-7 sm:mt-8 text-center text-[11px] sm:text-xs text-stone-400 font-light tracking-wide">
              This usually takes 20-40 seconds. Hang tight — we're being thorough.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function CvScannerIcon() {
  return (
    <div className="relative w-24 h-24 sm:w-28 sm:h-28">
      {/* Soft halo */}
      <motion.div
        className="absolute inset-0 rounded-full bg-[#B8860B]/15 blur-2xl"
        animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0.85, 0.6] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* CV page */}
      <div className="relative w-full h-full flex items-center justify-center">
        <div className="relative w-16 h-20 sm:w-20 sm:h-24 bg-white rounded-[2px] shadow-lift border border-stone-200 overflow-hidden">
          {/* Header block */}
          <div className="px-2 pt-2.5 pb-1.5 border-b border-stone-100">
            <div className="h-1.5 w-3/4 bg-[#0A2647] rounded-sm mb-1" />
            <div className="h-0.5 w-1/2 bg-stone-300 rounded-sm" />
          </div>
          {/* Body lines */}
          <div className="px-2 pt-2 space-y-1">
            <div className="h-0.5 w-full bg-stone-200 rounded-sm" />
            <div className="h-0.5 w-5/6 bg-stone-200 rounded-sm" />
            <div className="h-0.5 w-4/6 bg-stone-200 rounded-sm" />
            <div className="h-0.5 w-full bg-stone-200 rounded-sm mt-1.5" />
            <div className="h-0.5 w-3/4 bg-stone-200 rounded-sm" />
          </div>

          {/* Scanner sweep */}
          <motion.div
            className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#B8860B] to-transparent shadow-[0_0_10px_2px_rgba(184,134,11,0.6)]"
            initial={{ top: "0%" }}
            animate={{ top: ["0%", "92%", "0%"] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
          />
          {/* Scanner shading wash */}
          <motion.div
            className="absolute left-0 right-0 bg-[#B8860B]/8"
            initial={{ top: 0, height: 0 }}
            animate={{ top: ["0%", "92%", "0%"], height: ["0%", "10%", "0%"] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        {/* Orbiting sparkles */}
        <motion.div
          className="absolute inset-0"
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        >
          <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#B8860B]" />
          <span className="absolute top-1/2 -right-0.5 -translate-y-1/2 w-1 h-1 rounded-full bg-indigo-400" />
          <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#0A2647]" />
        </motion.div>
      </div>
    </div>
  );
}
