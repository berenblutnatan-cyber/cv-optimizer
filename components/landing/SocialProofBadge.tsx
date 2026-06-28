"use client";

// Real social proof, reused from the paywall's stat source. /api/stats/active-users
// returns a distinct count of users who optimized in the last 30 days, floored to a
// round number and SUPPRESSED below 100 (returns display:null). So this badge either
// shows a real, conservative number or renders nothing — never a fabricated figure.

import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { useT } from "@/lib/i18n/LanguageProvider";

export function SocialProofBadge({ className = "" }: { className?: string }) {
  const { t } = useT();
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/stats/active-users", { cache: "force-cache" })
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && typeof d?.display === "number") setCount(d.display);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (count === null) return null;

  return (
    <div
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-sm bg-white border border-stone-200 text-sm text-stone-600 font-light shadow-sm ${className}`}
    >
      <Users className="w-4 h-4 text-[#0A2647]" strokeWidth={1.5} />
      <span>
        {t("Trusted by")} <strong className="font-medium text-[#1a1a1a]">{count.toLocaleString()}+</strong> {t("job seekers in the last 30 days")}
      </span>
    </div>
  );
}
