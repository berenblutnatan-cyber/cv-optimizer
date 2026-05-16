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
  skipTrailingSlashRedirect: true,
};

module.exports = nextConfig;
