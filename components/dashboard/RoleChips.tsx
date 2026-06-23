"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";

export function RoleChips({ initial }: { initial: string[] }) {
  const [roles, setRoles] = useState(initial);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  async function persist(next: string[]) {
    setBusy(true);
    try {
      const res = await fetch("/api/me/roles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roles: next }),
      });
      if (!res.ok) throw new Error("Failed to update roles");
      setRoles(next);
    } catch (e) {
      toast.error("Couldn't save roles — try again");
    } finally {
      setBusy(false);
    }
  }

  function add() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    if (roles.length >= 5) {
      toast.message("Max 5 target roles");
      return;
    }
    if (roles.some((r) => r.toLowerCase() === trimmed.toLowerCase())) {
      setDraft("");
      return;
    }
    const next = [...roles, trimmed];
    setDraft("");
    persist(next);
  }

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {roles.map((role) => (
        <span
          key={role}
          className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full bg-white/8 border border-glass-border text-sm text-white/90"
        >
          {role}
          <button
            type="button"
            aria-label={`Remove ${role}`}
            disabled={busy}
            onClick={() => persist(roles.filter((r) => r !== role))}
            className="ml-0.5 h-5 w-5 grid place-items-center rounded-full hover:bg-white/15 transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      {roles.length < 5 ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/5 border border-dashed border-white/15"
        >
          <Plus className="h-3.5 w-3.5 text-white/55" />
          <input
            value={draft}
            disabled={busy}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add role"
            className="bg-transparent placeholder:text-white/35 text-sm text-white/90 focus:outline-none w-32"
          />
        </form>
      ) : null}
    </div>
  );
}
