"use client";

// The home experience: the onboarding funnel IS the landing. On finish it stashes
// the kickoff (role/goal/template/CV) and sends the visitor into the builder,
// which drafts the CV live — Enhancv-style "answer a few questions, watch it build".

import Link from "next/link";
import { useRouter } from "next/navigation";
import { OnboardingFunnel, type FunnelResult } from "@/components/home/OnboardingFunnel";

export function HomeExperience() {
  const router = useRouter();

  function onComplete(result: FunnelResult) {
    try {
      sessionStorage.setItem("builder-kickoff", JSON.stringify(result));
    } catch {
      /* ignore — builder falls back to its normal greeting */
    }
    router.push("/build/chat");
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0">
        <OnboardingFunnel onComplete={onComplete} />
      </div>
      {/* Quiet escape hatch for people who'd rather use the classic form. */}
      <div className="flex-shrink-0 text-center pb-1">
        <Link href="/optimize" className="text-xs text-stone-400 hover:text-[#0A2647] transition-colors">
          Already have a CV? Just optimize it →
        </Link>
      </div>
    </div>
  );
}
