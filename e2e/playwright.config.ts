import { defineConfig, devices } from "@playwright/test";

// Production builds on their own ports, so the gates never hit a running dev server.
export const WEB = "http://localhost:3100";
export const ADMIN = "http://localhost:3101";

const ci = Boolean(process.env.CI);

export default defineConfig({
  testDir: "tests",
  fullyParallel: true,
  forbidOnly: ci,
  retries: ci ? 1 : 0,
  reporter: ci ? [["github"], ["html", { open: "never" }]] : "list",
  use: { trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, testIgnore: /performance.spec/ },
    { name: "phone", use: { ...devices["Pixel 7"] }, testIgnore: /performance.spec/ },
    // Load-time budgets are measured alone, after everything else, so other tests running in
    // parallel cannot slow the page being timed.
    {
      name: "performance",
      use: { ...devices["Pixel 7"] },
      testMatch: /performance.spec/,
      dependencies: ["desktop", "phone"],
    },
  ],
  webServer: [
    {
      command: "bunx next start --port 3100",
      cwd: "../apps/web",
      url: WEB,
      reuseExistingServer: !ci,
    },
    {
      command: "bunx next start --port 3101",
      cwd: "../apps/admin",
      url: ADMIN,
      reuseExistingServer: !ci,
    },
  ],
});
