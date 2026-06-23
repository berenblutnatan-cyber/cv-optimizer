"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, Plus, RotateCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { GlassCard } from "@/components/shell/GlassCard";
import { BlurredLock } from "@/components/shell/BlurredLock";
import { ScoreRing } from "@/components/shell/ScoreRing";

type Card = {
  id: string;
  role: string;
  score: number | null;
  unlocked: boolean;
  content: unknown; // GeneratedCardOutput["resumeData"] — loose-typed at the wire
  error: string | null;
  createdAt: string;
};

export function RolesDeck({
  targetRoles,
  credits,
  initialCards,
}: {
  targetRoles: string[];
  credits: number;
  initialCards: Card[];
}) {
  const router = useRouter();
  const [cards, setCards] = useState<Card[]>(initialCards);
  const [busy, startTransition] = useTransition();
  const [generating, setGenerating] = useState(false);

  async function regenerate() {
    if (targetRoles.length === 0) {
      toast.message("Add target roles in the dashboard first.");
      return;
    }
    setGenerating(true);
    try {
      // Pull base CV text. For now we use the most recent Analysis text;
      // future iterations can let the user pick from uploaded files.
      const meRes = await fetch("/api/me");
      if (!meRes.ok) throw new Error("Sign in first");
      const meData = await meRes.json();
      // The base CV text isn't on /me yet; rely on the user's last analysis
      // stored server-side. For Stage 6 we accept that the user must have run
      // at least one optimization, and ask for it explicitly if missing.
      const cvText = await loadLatestCvText();
      if (!cvText) {
        toast.error("Run an optimization first so we have your CV to work with.");
        return;
      }
      const res = await fetch("/api/generate-targeted-cv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseCvText: cvText, roles: targetRoles }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data?.error ?? "Generation failed");
        return;
      }
      const data = await res.json();
      // Refresh from server to capture canonical state (including unlocked
      // flag race on parallel resolution).
      router.refresh();
      setCards(
        (data.cards as Card[]).map((c) => ({ ...c, createdAt: new Date().toISOString() }))
      );
      toast.success(`${data.cards.length} CVs generated`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setGenerating(false);
    }
  }

  function unlockCard(card: Card) {
    if (credits <= 0) {
      router.push("/pricing?reason=unlock_role");
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch(`/api/generated-resume/${card.id}/unlock`, { method: "POST" });
        if (res.status === 402) {
          router.push("/pricing?reason=unlock_role");
          return;
        }
        if (!res.ok) throw new Error("Unlock failed");
        setCards((prev) =>
          prev.map((c) => (c.id === card.id ? { ...c, unlocked: true } : c))
        );
        toast.success(`${card.role} unlocked`);
      } catch {
        toast.error("Couldn't unlock — try again");
      }
    });
  }

  return (
    <div className="mt-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-white/55">
          {cards.length} card{cards.length === 1 ? "" : "s"} · {credits} credit
          {credits === 1 ? "" : "s"} available
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={regenerate}
            disabled={generating}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-[#1a1a1a] text-sm font-medium shadow-glow disabled:opacity-60"
          >
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : cards.length > 0 ? (
              <RotateCw className="h-4 w-4" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {cards.length > 0 ? "Regenerate" : "Generate CV deck"}
          </button>
        </div>
      </div>

      {cards.length === 0 && !generating ? (
        <GlassCard padding="lg" className="text-center py-12">
          <div className="font-serif italic text-2xl text-white">No cards yet</div>
          <p className="mt-2 text-white/70 max-w-md mx-auto">
            Add the roles you're targeting from the dashboard, then run a
            quick optimization. We'll tailor a fresh CV for each role.
          </p>
        </GlassCard>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {cards.map((card, i) => (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            whileHover={{ y: -4 }}
          >
            <GlassCard padding="lg" tone="strong" className="h-full">
              <BlurredLock
                locked={!card.unlocked}
                scoreImpact={card.score ?? undefined}
                label="Unlock — 1 credit"
                onUnlock={() => unlockCard(card)}
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-white/55">
                        Target role
                      </div>
                      <div className="mt-1 font-serif italic text-xl text-white truncate">
                        {card.role}
                      </div>
                    </div>
                    {card.score !== null ? (
                      <ScoreRing value={card.score} size={64} animate={false} />
                    ) : null}
                  </div>
                  <CardPreview content={card.content} error={card.error} />
                </div>
              </BlurredLock>
            </GlassCard>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function CardPreview({ content, error }: { content: unknown; error: string | null }) {
  if (error) {
    return <div className="text-xs text-[#f5b8c8]">Couldn't generate — {error}</div>;
  }
  const c = (content && typeof content === "object" ? (content as Record<string, unknown>) : {}) ?? {};
  const summary = typeof c.summary === "string" ? c.summary : "";
  const skills = Array.isArray(c.skills) ? (c.skills as string[]) : [];
  return (
    <div className="space-y-3">
      {typeof c.headline === "string" && c.headline ? (
        <div className="text-sm text-white/85 font-medium">{c.headline as string}</div>
      ) : null}
      {summary ? (
        <p className="text-sm text-white/80 leading-relaxed line-clamp-4">{summary}</p>
      ) : (
        <p className="text-sm text-white/55 italic">No summary generated.</p>
      )}
      {skills.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {skills.slice(0, 8).map((s) => (
            <span
              key={s}
              className="px-2 py-0.5 rounded-full bg-white/10 border border-glass-border text-[11px] text-white/85"
            >
              {s}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

// Pull the user's most recent analysis CV text. Used as the base for the
// multi-role generation. Returns null if the user hasn't run an analysis yet.
async function loadLatestCvText(): Promise<string | null> {
  // Simple endpoint hop — keep the call shallow so the deck UI doesn't bundle
  // the prisma client. The lookup itself is cheap on the server.
  const res = await fetch("/api/me/latest-cv-text", { cache: "no-store" });
  if (!res.ok) return null;
  const data = await res.json();
  if (typeof data?.cvText === "string" && data.cvText.length > 0) return data.cvText;
  return null;
}
