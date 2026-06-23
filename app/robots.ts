import type { MetadataRoute } from "next";

const BASE = "https://hiredcv.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Keep auth + API + transactional routes out of the index.
      disallow: ["/api/", "/sign-in", "/sign-up", "/dashboard", "/purchase-success"],
    },
    sitemap: `${BASE}/sitemap.xml`,
  };
}
