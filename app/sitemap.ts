import type { MetadataRoute } from "next";
import { EXAMPLE_SLUGS } from "@/lib/resumeExamples";

const BASE = "https://hiredcv.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = ["", "/resume-examples", "/build/chat", "/score", "/pricing"].map((path) => ({
    url: `${BASE}${path}`,
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.7,
  }));

  const exampleRoutes = EXAMPLE_SLUGS.map((slug) => ({
    url: `${BASE}/resume-examples/${slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [...staticRoutes, ...exampleRoutes];
}
