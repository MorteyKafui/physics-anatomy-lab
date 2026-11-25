import type { NextConfig } from "next";

import { securityHeaders } from "@pa/security";

const nextConfig: NextConfig = {
  // Workspace packages ship TypeScript source; Next compiles them.
  transpilePackages: ["@pa/ui", "@pa/security"],
  // The headers that are the same everywhere; the CSP, new on every page, is set in src/proxy.ts.
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders() }];
  },
};

export default nextConfig;
