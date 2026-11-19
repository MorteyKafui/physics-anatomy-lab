import type { NextConfig } from "next";

// The API's address as the web server reaches it. The browser only ever calls /api on this
// origin, so the session cookie stays first-party (ADR 0038). Live sockets go the same way.
const API_URL = process.env.API_URL ?? "http://localhost:8000";

const nextConfig: NextConfig = {
  // Workspace packages ship TypeScript source; Next compiles them.
  transpilePackages: ["@pa/ui", "@pa/apparatus"],
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_URL}/:path*` }];
  },
};

export default nextConfig;
