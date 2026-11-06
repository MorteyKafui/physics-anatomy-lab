import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Workspace packages ship TypeScript source; Next compiles them.
  transpilePackages: ["@pa/ui", "@pa/apparatus"],
};

export default nextConfig;
