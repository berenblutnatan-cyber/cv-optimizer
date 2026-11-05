const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000"],
    },
  },
  // PostHog reverse proxy: avoids ad-blockers and improves capture reliability.
  // Matches the `api_host: "/ingest"` config in instrumentation-client.ts.
  async rewrites() {
    return [
      { source: "/ingest/static/:path*", destination: "https://us-assets.i.posthog.com/static/:path*" },
      { source: "/ingest/:path*", destination: "https://us.i.posthog.com/:path*" },
      { source: "/ingest/decide", destination: "https://us.i.posthog.com/decide" },
    ];
  },
  // The OpenAI voice builder was replaced by Talk mode in the v2 editor (M4).
  async redirects() {
    return [{ source: "/build/voice", destination: "/start", permanent: false }];
  },
  // Headless Chromium for the PDF route finds its binary by relative path: it
  // must stay outside the bundle, and its files must ship with that function
  // Key with "*": a "[id]" key shipped none of the files in a real build (2026-11-05).
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  outputFileTracingIncludes: { "/api/cv/*/pdf": ["./node_modules/@sparticuz/chromium/bin/**"] },
  skipTrailingSlashRedirect: true,
  // Dev-only badge. Bottom-left covered the v2 editor's chat box.
  devIndicators: { position: "bottom-right" },
};

module.exports = nextConfig;
