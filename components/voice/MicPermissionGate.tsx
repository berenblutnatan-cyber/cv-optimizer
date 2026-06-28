"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Mic, MicOff } from "lucide-react";
import { GlassCard } from "@/components/shell/GlassCard";
import { useT } from "@/lib/i18n/LanguageProvider";

type Permission = "checking" | "prompt" | "granted" | "denied" | "unavailable";

export function MicPermissionGate({ children }: { children: React.ReactNode }) {
  const { t } = useT();
  const [perm, setPerm] = useState<Permission>("checking");

  useEffect(() => {
    let active = true;
    (async () => {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        if (active) setPerm("unavailable");
        return;
      }
      try {
        // Permissions API isn't available on all browsers (Safari) — try it,
        // fall back to "prompt" so the user gets the start screen.
        const status = await (
          navigator.permissions as unknown as {
            query?: (q: { name: PermissionName }) => Promise<PermissionStatus>;
          }
        )
          .query?.({ name: "microphone" as PermissionName })
          .catch(() => null);
        if (!active) return;
        if (!status) setPerm("prompt");
        else if (status.state === "granted") setPerm("granted");
        else if (status.state === "denied") setPerm("denied");
        else setPerm("prompt");
      } catch {
        if (active) setPerm("prompt");
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (perm === "checking") return null;

  if (perm === "unavailable") {
    return (
      <GlassCard padding="lg" className="text-center max-w-md mx-auto">
        <MicOff className="h-8 w-8 mx-auto mb-3 text-white/70" />
        <div className="font-serif italic text-2xl text-white">
          {t("Voice isn't supported here")}
        </div>
        <p className="mt-2 text-white/70">
          {t("This browser doesn't expose microphone access. Try Chrome, Edge, or Safari on a phone.")}
        </p>
        <Link
          href="/builder"
          className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-[#1a1a1a] text-sm font-medium"
        >
          {t("Use the typed builder instead")}
        </Link>
      </GlassCard>
    );
  }

  if (perm === "denied") {
    return (
      <GlassCard padding="lg" className="text-center max-w-md mx-auto">
        <MicOff className="h-8 w-8 mx-auto mb-3 text-white/70" />
        <div className="font-serif italic text-2xl text-white">
          {t("Mic access is blocked")}
        </div>
        <p className="mt-2 text-white/70">
          {t("Open your browser's site settings, allow the microphone for this page, and reload. We don't store the audio — only the structured CV you confirm at the end.")}
        </p>
      </GlassCard>
    );
  }

  return <>{children}</>;
}
