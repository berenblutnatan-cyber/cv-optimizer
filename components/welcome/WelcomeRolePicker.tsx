"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, X } from "lucide-react";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/shell/GlassCard";
import { useOnboardingStore } from "@/stores/onboardingStore";
import { track } from "@/lib/analytics";

export function WelcomeRolePicker({ suggestions }: { suggestions: string[] }) {
  const router = useRouter();
  const { roles, setRoles } = useOnboardingStore();
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const max = 5;
  const remaining = max - roles.length;

  function addRole(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (roles.length >= max) return;
    if (roles.some((r) => r.toLowerCase() === trimmed.toLowerCase())) return;
    setRoles([...roles, trimmed]);
    setDraft("");
  }

  function removeRole(role: string) {
    setRoles(roles.filter((r) => r !== role));
  }

  function next() {
    if (roles.length === 0) return;
    setBusy(true);
    track("landing_roles_submitted", { count: roles.length, roles: roles.join("|") });
    const params = new URLSearchParams({ roles: roles.join(",") });
    router.push(`/start?${params.toString()}`);
  }

  return (
    <div className="mt-10 space-y-5">
      <GlassCard padding="lg">
        <div className="flex flex-wrap gap-2 min-h-[44px] items-center">
          {roles.map((role) => (
            <motion.span
              key={role}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-full bg-white/15 border border-glass-border text-sm text-white"
            >
              {role}
              <button
                type="button"
                aria-label={`Remove ${role}`}
                onClick={() => removeRole(role)}
                className="h-5 w-5 grid place-items-center rounded-full hover:bg-white/15"
              >
                <X className="h-3 w-3" />
              </button>
            </motion.span>
          ))}
          {roles.length < max ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addRole(draft);
              }}
              className="flex-1 min-w-[180px]"
            >
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "," || e.key === "Enter") {
                    e.preventDefault();
                    addRole(draft);
                  }
                  if (e.key === "Backspace" && !draft && roles.length > 0) {
                    setRoles(roles.slice(0, -1));
                  }
                }}
                placeholder={
                  roles.length === 0
                    ? "Product Manager, Software Engineer…"
                    : `Add another${remaining > 1 ? ` (${remaining} left)` : ""}`
                }
                className="bg-transparent text-base text-white placeholder:text-white/45 w-full focus:outline-none py-1.5"
                autoFocus
              />
            </form>
          ) : null}
        </div>
      </GlassCard>

      <div>
        <div className="text-xs uppercase tracking-[0.18em] text-white/55 mb-3">Quick picks</div>
        <div className="flex flex-wrap gap-2">
          {suggestions.map((s) => {
            const picked = roles.some((r) => r.toLowerCase() === s.toLowerCase());
            const disabled = picked || roles.length >= max;
            return (
              <button
                key={s}
                type="button"
                disabled={disabled}
                onClick={() => addRole(s)}
                className={[
                  "px-3.5 py-1.5 rounded-full text-sm border transition-colors",
                  picked
                    ? "bg-white/20 border-white/30 text-white/65 cursor-default"
                    : disabled
                      ? "bg-white/5 border-white/8 text-white/35 cursor-not-allowed"
                      : "bg-white/8 border-glass-border text-white/85 hover:bg-white/15",
                ].join(" ")}
              >
                {s}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <div className="text-xs text-white/55">
          {roles.length}/{max} roles
        </div>
        <button
          type="button"
          onClick={next}
          disabled={roles.length === 0 || busy}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-[#1a1a1a] font-medium shadow-glow disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/95 active:scale-[0.98] transition-all"
        >
          Continue
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
