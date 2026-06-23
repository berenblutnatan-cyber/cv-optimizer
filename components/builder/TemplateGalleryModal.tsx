"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Crown, Search, Sparkles, X } from "lucide-react";
import { ResumePreview, type ResumePreviewData } from "@/components/builder/ResumePreview";
import type { BuilderTemplateId, ThemeColor } from "@/context/BuilderContext";
import {
  PRESET_CATEGORIES,
  TEMPLATE_PRESETS,
  presetsByCategory,
  type PresetCategory,
  type TemplatePreset,
} from "@/lib/builder/templatePresets";

const A4_W = 794;

// One gallery card. The live resume only renders once the card scrolls into
// view (IntersectionObserver) so 100 A4 previews never mount at once.
function PresetCard({
  preset,
  data,
  selected,
  onSelect,
}: {
  preset: TemplatePreset;
  data: ResumePreviewData;
  selected: boolean;
  onSelect: () => void;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [scale, setScale] = useState(0.26);

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      if (w) setScale(w / A4_W);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    // Reveal as soon as the card is near the viewport. The immediate rect check
    // makes the first screen render even where IntersectionObserver is throttled.
    const inView = () => {
      const r = el.getBoundingClientRect();
      return r.top < window.innerHeight + 500 && r.bottom > -500;
    };
    if (inView()) setVisible(true);
    const io = new IntersectionObserver(
      (entries) => entries.some((e) => e.isIntersecting) && (setVisible(true), io.disconnect()),
      { rootMargin: "500px" }
    );
    io.observe(el);
    return () => {
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group text-left rounded-xl border bg-white overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none ${
        selected ? "border-[#0A2647] ring-2 ring-[#0A2647]/30" : "border-stone-200 hover:border-[#0A2647]/40"
      }`}
    >
      {/* A4-ratio thumbnail */}
      <div ref={frameRef} className="relative w-full overflow-hidden bg-stone-100" style={{ aspectRatio: "210 / 297" }}>
        {visible ? (
          <div
            className="absolute top-0 left-0 origin-top-left pointer-events-none"
            style={{ width: `${A4_W}px`, transform: `scale(${scale})` }}
          >
            <ResumePreview data={data} templateId={preset.layout} themeColor={preset.color} />
          </div>
        ) : (
          <div className="absolute inset-0 animate-pulse bg-gradient-to-b from-stone-100 to-stone-200" />
        )}
        {selected ? (
          <div className="absolute top-2 right-2 grid place-items-center h-6 w-6 rounded-full bg-[#0A2647] text-white shadow">
            <Check className="h-3.5 w-3.5" strokeWidth={3} />
          </div>
        ) : null}
        <div className="absolute top-2 left-2 flex flex-col items-start gap-1">
          {preset.isNew ? (
            <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#0A2647] text-white text-[9px] font-bold tracking-wide shadow">
              <Sparkles className="h-2.5 w-2.5" /> NEW
            </div>
          ) : null}
          {preset.premium ? (
            <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#B8860B] text-white text-[9px] font-bold tracking-wide shadow">
              <Crown className="h-2.5 w-2.5" /> PRO
            </div>
          ) : (
            <div className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-700 text-[9px] font-bold tracking-wide">
              FREE
            </div>
          )}
        </div>
      </div>
      <div className="px-2.5 py-2 border-t border-stone-100">
        <div className="text-[12.5px] font-semibold text-[#0A2647] truncate">{preset.name}</div>
        <div className="text-[11px] text-stone-400 truncate">{preset.tagline}</div>
      </div>
    </button>
  );
}

export function TemplateGalleryModal({
  open,
  onClose,
  data,
  currentLayout,
  currentColor,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  data: ResumePreviewData;
  currentLayout: BuilderTemplateId;
  currentColor: ThemeColor;
  onSelect: (layout: BuilderTemplateId, color: ThemeColor) => void;
}) {
  const [category, setCategory] = useState<"All" | PresetCategory>("All");
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const q = query.trim().toLowerCase();
  const list = presetsByCategory(category).filter(
    (p) => !q || p.name.toLowerCase().includes(q) || p.tagline.toLowerCase().includes(q)
  );

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[#F3F4F6]">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-stone-200 px-4 sm:px-6 py-3 flex items-center gap-4">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-[#0A2647] leading-tight">Templates</h2>
          <p className="text-[12px] text-stone-500">
            {TEMPLATE_PRESETS.length} designs across {new Set(TEMPLATE_PRESETS.map((p) => p.layout)).size} layouts — pick one to apply it instantly.
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2 px-3 h-9 rounded-full bg-stone-100 border border-stone-200 w-56">
            <Search className="h-4 w-4 text-stone-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search templates or roles"
              className="flex-1 bg-transparent text-[13px] text-[#1a1a1a] placeholder:text-stone-400 outline-none"
            />
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close templates"
            className="grid place-items-center h-9 w-9 rounded-full text-stone-500 hover:bg-stone-100 hover:text-[#0A2647] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex-shrink-0 bg-white border-b border-stone-200 px-4 sm:px-6 py-2 flex items-center gap-1.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {PRESET_CATEGORIES.map((c) => {
          const count = presetsByCategory(c).length;
          const active = category === c;
          return (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] transition-colors ${
                active ? "bg-[#0A2647] text-white font-semibold" : "text-stone-600 hover:bg-stone-100"
              }`}
            >
              {c}
              <span className={`text-[10px] tabular-nums ${active ? "text-white/70" : "text-stone-400"}`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Grid */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-5">
        {list.length === 0 ? (
          <p className="text-center text-sm text-stone-400 py-16">No templates match “{query}”.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            {list.map((preset) => (
              <PresetCard
                key={preset.id}
                preset={preset}
                data={data}
                selected={preset.layout === currentLayout && preset.color === currentColor}
                onSelect={() => {
                  onSelect(preset.layout, preset.color);
                  onClose();
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
