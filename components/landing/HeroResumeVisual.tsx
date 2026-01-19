"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";

/**
 * HeroResumeVisual - Dynamic 3D Rotating Resume Card
 * 
 * Features:
 * - Continuous 360° Y-axis rotation
 * - Two-sided card: "Before" (plain) and "After" (Hired, premium)
 * - Floating ATS Score badge with glassmorphism
 * - Skills Match bubble with icons
 * - Tells a story of transformation and success
 */
export function HeroResumeVisual() {
  return (
    <div 
      className="relative w-full h-full min-h-[540px] flex items-center justify-center"
      style={{ perspective: "1200px" }}
    >
      {/* Floating ATS Score Badge - Top Right */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={{ 
          opacity: 1, 
          scale: 1,
          y: [0, -8, 0],
        }}
        transition={{
          opacity: { duration: 0.6, delay: 0.5 },
          scale: { duration: 0.6, delay: 0.5 },
          y: { duration: 3.5, repeat: Infinity, ease: "easeInOut" },
        }}
        className="absolute top-8 right-4 z-20"
      >
        <div 
          className="bg-white/90 backdrop-blur-xl rounded-2xl p-4 shadow-2xl border border-white/50"
          style={{
            boxShadow: "0 20px 50px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255,255,255,0.8) inset",
          }}
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <svg className="w-14 h-14 -rotate-90">
                <circle
                  cx="28"
                  cy="28"
                  r="24"
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth="4"
                />
                <motion.circle
                  cx="28"
                  cy="28"
                  r="24"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="4"
                  strokeLinecap="round"
                  initial={{ strokeDasharray: "0 151" }}
                  animate={{ strokeDasharray: "142 151" }}
                  transition={{ duration: 1.5, delay: 1, ease: "easeOut" }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <Check className="w-5 h-5 text-indigo-600" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">98%</div>
              <div className="text-xs text-slate-500 font-medium">Score</div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Rotating 3D Card Container */}
      <motion.div
        animate={{ rotateY: [0, 360] }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "linear",
        }}
        className="relative w-[300px] sm:w-[340px]"
        style={{
          transformStyle: "preserve-3d",
          aspectRatio: "210/297",
        }}
      >
        {/* ===== FRONT FACE - "Before" State ===== */}
        <div
          className="absolute inset-0 bg-white rounded-2xl overflow-hidden border border-slate-200"
          style={{
            backfaceVisibility: "hidden",
            boxShadow: "0 25px 60px rgba(0, 0, 0, 0.15)",
          }}
        >
          <div className="p-5 h-full flex flex-col">
            {/* Plain Header - No Photo */}
            <div className="mb-4 pb-4 border-b border-slate-100">
              <div className="h-5 w-36 bg-slate-300 rounded mb-2" />
              <div className="h-3 w-24 bg-slate-200 rounded" />
            </div>

            {/* Contact placeholders */}
            <div className="flex gap-2 mb-5">
              <div className="h-2.5 w-20 bg-slate-100 rounded-full" />
              <div className="h-2.5 w-16 bg-slate-100 rounded-full" />
            </div>

            {/* Summary Section */}
            <div className="mb-5">
              <div className="h-3 w-16 bg-slate-200 rounded mb-2" />
              <div className="space-y-1.5">
                <div className="h-2 w-full bg-slate-100 rounded" />
                <div className="h-2 w-11/12 bg-slate-100 rounded" />
                <div className="h-2 w-4/5 bg-slate-100 rounded" />
              </div>
            </div>

            {/* Experience Section */}
            <div className="mb-5">
              <div className="h-3 w-20 bg-slate-200 rounded mb-3" />
              <div className="space-y-3">
                <div>
                  <div className="h-2.5 w-32 bg-slate-200 rounded mb-1.5" />
                  <div className="h-2 w-24 bg-slate-100 rounded mb-2" />
                  <div className="space-y-1">
                    <div className="h-1.5 w-full bg-slate-50 rounded" />
                    <div className="h-1.5 w-5/6 bg-slate-50 rounded" />
                  </div>
                </div>
                <div>
                  <div className="h-2.5 w-28 bg-slate-200 rounded mb-1.5" />
                  <div className="h-2 w-20 bg-slate-100 rounded mb-2" />
                  <div className="space-y-1">
                    <div className="h-1.5 w-full bg-slate-50 rounded" />
                    <div className="h-1.5 w-4/5 bg-slate-50 rounded" />
                  </div>
                </div>
              </div>
            </div>

            {/* Education Section */}
            <div className="mt-auto">
              <div className="h-3 w-16 bg-slate-200 rounded mb-2" />
              <div className="h-2 w-36 bg-slate-100 rounded mb-1" />
              <div className="h-1.5 w-28 bg-slate-50 rounded" />
            </div>

            {/* "Before" Label */}
            <div className="absolute bottom-3 right-3 px-2 py-1 bg-slate-100 rounded text-[10px] font-medium text-slate-400 uppercase tracking-wider">
              Before
            </div>
          </div>
        </div>

        {/* ===== BACK FACE - "Hired" State ===== */}
        <div
          className="absolute inset-0 bg-white rounded-2xl overflow-hidden"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            boxShadow: "0 25px 60px rgba(5, 150, 105, 0.2), 0 0 0 2px rgba(16, 185, 129, 0.1)",
          }}
        >
          <div className="p-5 h-full flex flex-col">
            {/* Premium Header with Photo */}
            <div className="flex items-start gap-4 mb-4 pb-4 border-b border-indigo-100">
              {/* Professional Photo */}
              <div 
                className="w-16 h-16 rounded-full flex-shrink-0 overflow-hidden ring-3 ring-indigo-500 ring-offset-2"
                style={{
                  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                }}
              >
                {/* Placeholder for professional headshot silhouette */}
                <div className="w-full h-full flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-10 h-10 text-white/90">
                    <circle cx="12" cy="8" r="4" fill="currentColor" />
                    <path d="M12 14c-4 0-8 2-8 4v2h16v-2c0-2-4-4-8-4z" fill="currentColor" />
                  </svg>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-slate-900 mb-0.5">Aviv Levi</h3>
                <p className="text-sm text-indigo-600 font-medium">Senior Product Manager</p>
                <p className="text-xs text-slate-500">Tel Aviv, Israel</p>
              </div>
            </div>

            {/* Contact Pills - Premium style */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-[10px] font-medium">
                aviv@email.com
              </span>
              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-[10px] font-medium">
                linkedin.com/in/aviv
              </span>
            </div>

            {/* Summary - Premium */}
            <div className="mb-4">
              <h4 className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-1.5">
                Summary
              </h4>
              <p className="text-[9px] text-slate-600 leading-relaxed">
                Strategic product leader with 8+ years driving innovation at scale. 
                Led $50M product line, increased user engagement by 340%.
              </p>
            </div>

            {/* Experience - Premium */}
            <div className="mb-4 flex-1">
              <h4 className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-2">
                Experience
              </h4>
              <div className="space-y-2.5">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-900">Lead Product Manager</span>
                    <span className="text-[9px] text-slate-400">2021-Present</span>
                  </div>
                  <p className="text-[10px] text-indigo-600 font-medium mb-1">Google</p>
                  <p className="text-[9px] text-slate-600">• Launched AI feature used by 100M+ users</p>
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-900">Senior PM</span>
                    <span className="text-[9px] text-slate-400">2018-2021</span>
                  </div>
                  <p className="text-[10px] text-indigo-600 font-medium mb-1">Stripe</p>
                  <p className="text-[9px] text-slate-600">• Grew payments volume by $2B annually</p>
                </div>
              </div>
            </div>

            {/* Skills - Premium with colored tags */}
            <div>
              <h4 className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-1.5">
                Skills
              </h4>
              <div className="flex flex-wrap gap-1">
                <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded text-[8px] font-medium">Strategy</span>
                <span className="px-1.5 py-0.5 bg-cyan-100 text-cyan-700 rounded text-[8px] font-medium">Data Analysis</span>
                <span className="px-1.5 py-0.5 bg-violet-100 text-violet-700 rounded text-[8px] font-medium">Leadership</span>
                <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[8px] font-medium">Agile</span>
              </div>
            </div>
          </div>

          {/* HIRED Badge - Attached to back face */}
          <div 
            className="absolute -top-3 -left-3 flex items-center gap-1.5 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white px-3 py-1.5 rounded-full font-bold text-xs shadow-lg"
            style={{
              boxShadow: "0 8px 20px rgba(16, 185, 129, 0.4)",
            }}
          >
            <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center">
              <Check className="w-3 h-3 text-indigo-600" />
            </div>
            HIRED
          </div>

          {/* "After" Label */}
          <div className="absolute bottom-3 right-3 px-2 py-1 bg-indigo-100 rounded text-[10px] font-medium text-indigo-600 uppercase tracking-wider">
            After
          </div>
        </div>
      </motion.div>

      {/* Ambient Glow Effect */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.08) 0%, transparent 60%)",
        }}
      />

      {/* Decorative Floating Particles */}
      <motion.div
        animate={{ 
          y: [0, -20, 0],
          opacity: [0.2, 0.5, 0.2],
          scale: [1, 1.2, 1],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-16 left-8 w-2 h-2 rounded-full bg-indigo-400"
      />
      <motion.div
        animate={{ 
          y: [0, 15, 0],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute bottom-24 right-12 w-3 h-3 rounded-full bg-cyan-400"
      />
      <motion.div
        animate={{ 
          y: [0, -12, 0],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        className="absolute top-1/3 right-4 w-1.5 h-1.5 rounded-full bg-violet-400"
      />
    </div>
  );
}
