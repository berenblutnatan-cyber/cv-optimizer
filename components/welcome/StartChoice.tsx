"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { SignedIn, SignedOut, SignUpButton } from "@clerk/nextjs";
import { MessageCircle, Mic, UploadCloud, Wand2 } from "lucide-react";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/shell/GlassCard";
import { useOnboardingStore } from "@/stores/onboardingStore";
import { toast } from "sonner";
import { track } from "@/lib/analytics";

export function StartChoice() {
  const router = useRouter();
  const search = useSearchParams();
  const { setRoles, setCv, cvFileName } = useOnboardingStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsing, setParsing] = useState(false);

  // Hydrate the store from URL params so a fresh tab landing on /start with
  // ?roles=foo,bar still has the picks ready to go.
  useEffect(() => {
    const raw = search.get("roles");
    if (raw) {
      setRoles(raw.split(",").map((r) => r.trim()).filter(Boolean));
    }
  }, [search, setRoles]);

  async function handleFile(file: File) {
    setParsing(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      // Reuse the existing parser via the analyze pipeline preview. For now
      // we just stash the raw text on the store; the optimizer route will
      // re-parse if needed.
      const text = await file.text().catch(() => "");
      setCv(file.name, text);
      track("start_choice", { choice: "upload", file_size: file.size });
      toast.success(`Got ${file.name} — opening optimizer…`);
      router.push("/optimize?source=upload");
    } catch (e) {
      toast.error("Couldn't read that file — try a PDF or DOCX.");
    } finally {
      setParsing(false);
    }
  }

  return (
    <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-5">
      <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <GlassCard padding="lg" tone="strong" className="h-full">
          <label
            htmlFor="cv-upload"
            className="cursor-pointer flex flex-col items-center text-center gap-4 py-8"
          >
            <span className="h-16 w-16 rounded-[28%] grid place-items-center bg-gradient-to-br from-[#f5b8c8] to-[#c9b8ff] shadow-glow">
              <UploadCloud className="h-7 w-7 text-[#1a1a1a]" strokeWidth={1.7} />
            </span>
            <div>
              <div className="font-serif italic text-2xl text-white">Upload my CV</div>
              <div className="mt-1 text-sm text-white/65">PDF or DOCX, under 5MB</div>
            </div>
            <input
              ref={fileRef}
              id="cv-upload"
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-[#1a1a1a] font-medium text-sm">
              {parsing ? "Reading…" : cvFileName ? `Replace (${cvFileName})` : "Choose file"}
            </span>
          </label>
        </GlassCard>
      </motion.div>

      <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.08 }}>
        <GlassCard padding="lg" tone="strong" className="h-full">
          <div className="flex flex-col items-center text-center gap-4 py-8">
            <span className="h-16 w-16 rounded-[28%] grid place-items-center bg-gradient-to-br from-[#c9b8ff] to-[#8fb3ff] shadow-glow">
              <Wand2 className="h-7 w-7 text-white" strokeWidth={1.7} />
            </span>
            <div>
              <div className="font-serif italic text-2xl text-white">Build a new CV</div>
              <div className="mt-1 text-sm text-white/65">
                Chat with our coach — type or talk — and watch your CV build itself.
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto items-center justify-center flex-wrap">
              <SignedIn>
                <Link
                  href="/build/chat"
                  onClick={() => track("start_choice", { choice: "chat_build" })}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-white text-[#1a1a1a] font-medium text-sm"
                >
                  <MessageCircle className="h-4 w-4" />
                  Tell your story (5 min)
                </Link>
                <Link
                  href="/build/voice"
                  onClick={() => track("start_choice", { choice: "voice_build" })}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-white/15 border border-glass-border text-white font-medium text-sm hover:bg-white/20 transition-colors"
                >
                  <Mic className="h-4 w-4" />
                  Voice call
                </Link>
                <Link
                  href="/builder"
                  onClick={() => track("start_choice", { choice: "manual_build" })}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-white/15 border border-glass-border text-white font-medium text-sm hover:bg-white/20 transition-colors"
                >
                  Step-by-step
                </Link>
              </SignedIn>
              <SignedOut>
                <SignUpButton mode="modal" forceRedirectUrl="/build/chat">
                  <button className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-white text-[#1a1a1a] font-medium text-sm">
                    <MessageCircle className="h-4 w-4" />
                    Tell your story (5 min)
                  </button>
                </SignUpButton>
                <SignUpButton mode="modal" forceRedirectUrl="/build/voice">
                  <button className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-white/15 border border-glass-border text-white font-medium text-sm hover:bg-white/20 transition-colors">
                    <Mic className="h-4 w-4" />
                    Voice call
                  </button>
                </SignUpButton>
                <SignUpButton mode="modal">
                  <button className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-white/15 border border-glass-border text-white font-medium text-sm hover:bg-white/20 transition-colors">
                    Step-by-step
                  </button>
                </SignUpButton>
              </SignedOut>
            </div>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
}
