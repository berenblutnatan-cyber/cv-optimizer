"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics";

/** Fires resume_example_viewed once on mount (track() is client-only). */
export function ExampleViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    track("resume_example_viewed", { template_id: slug });
  }, [slug]);
  return null;
}
