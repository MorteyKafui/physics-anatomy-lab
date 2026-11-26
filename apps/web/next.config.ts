import type { NextConfig } from "next";

import { securityHeaders } from "@pa/security";

// The API's address as the web server reaches it. The browser only ever calls /api on this
// origin, so the session cookie stays first-party (ADR 0038). Live sockets go the same way.
const API_URL = process.env.API_URL ?? "http://localhost:8000";

const nextConfig: NextConfig = {
  // Workspace packages ship TypeScript source; Next compiles them.
  transpilePackages: ["@pa/ui", "@pa/apparatus", "@pa/security"],
  // Metadata arrives with each page, never streamed after it. Pages render on each request
  // (ADR 0046), and a streamed title leaves a navigation briefly without one (WCAG 2.4.2).
  htmlLimitedBots: /.*/,
  turbopack: {
    // `import text from "./file.md?raw"` bundles a file's text (src/raw.d.ts). Pages render on
    // each request for their CSP nonce, and the server has no files to read.
    rules: {
      "*.md": { condition: { query: "?raw" }, type: "text" },
      "*.yml": { condition: { query: "?raw" }, type: "text" },
    },
  },
  async rewrites() {
    // Not the staff routes (/admin/…): only the admin portal's server calls those (ADR 0040),
    // so the public site does not offer them to the internet at all.
    return [
      {
        source: "/api/:path((?!admin(?:/|$)).*)",
        destination: `${API_URL}/:path`,
      },
    ];
  },
  // The headers that are the same everywhere; the CSP, new on every page, is set in src/proxy.ts.
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders() }];
  },
};

export default nextConfig;
