import type { NextConfig } from "next";

import { securityHeaders } from "@pa/security";

const nextConfig: NextConfig = {
  // Workspace packages ship TypeScript source; Next compiles them.
  transpilePackages: ["@pa/ui", "@pa/security"],
  // Metadata arrives with each page, never streamed after it. Pages render on each request
  // (ADR 0046), and a streamed title leaves a navigation briefly without one (WCAG 2.4.2).
  htmlLimitedBots: /.*/,
  // The headers that are the same everywhere; the CSP, new on every page, is set in src/proxy.ts.
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders() }];
  },
};

export default nextConfig;
