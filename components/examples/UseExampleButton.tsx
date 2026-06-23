"use client";

// Loads an example CV into the builder. Writes straight to useResumeStore (the
// path StudioBuilder subscribes to) then routes to /build/chat — note the
// onboarding "builder-kickoff" stash is read nowhere, so setResumeData is the
// real handoff.

import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { useResumeStore } from "@/store/useResumeStore";
import { track } from "@/lib/analytics";
import type { ResumeData } from "@/types/resume";

export function UseExampleButton({
  data,
  slug,
  label = "Use this example",
  className,
}: {
  data: ResumeData;
  slug: string;
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  const setResumeData = useResumeStore((s) => s.setResumeData);

  function onClick() {
    setResumeData(data);
    track("resume_example_used", { template_id: slug });
    router.push("/build/chat");
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={
        className ??
        "inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#0A2647] text-white text-sm font-semibold hover:bg-[#0d3259] transition-colors"
      }
    >
      {label}
      <ArrowRight className="h-4 w-4" />
    </button>
  );
}
