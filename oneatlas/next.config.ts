import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components / Partial Prefetching are intentionally OFF (see README, "Key decisions").
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    // Provider/lab logos are served from /public or generated initials in Phase 1.
    remotePatterns: [],
  },
};

export default nextConfig;
