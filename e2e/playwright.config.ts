import { defineConfig, devices } from "@playwright/test";

// Production builds on their own ports, so the gates never hit a running dev server. Set
// E2E_WEB_PORT and E2E_ADMIN_PORT to run beside another checkout's servers on the same machine:
// locally an existing server is reused, so a shared port would test the other checkout's code.
const WEB_PORT = process.env.E2E_WEB_PORT ?? "3100";
const ADMIN_PORT = process.env.E2E_ADMIN_PORT ?? "3101";
export const WEB = `http://localhost:${WEB_PORT}`;
export const ADMIN = `http://localhost:${ADMIN_PORT}`;

const ci = Boolean(process.env.CI);

export default defineConfig({
  testDir: "tests",
  fullyParallel: true,
  forbidOnly: ci,
  // No retries: a test that passes on its second try has a bug, in the test or the app. Find it.
  retries: 0,
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
      command: `bunx next start --port ${WEB_PORT}`,
      cwd: "../apps/web",
      url: WEB,
      reuseExistingServer: !ci,
    },
    {
      command: `bunx next start --port ${ADMIN_PORT}`,
      cwd: "../apps/admin",
      url: ADMIN,
      reuseExistingServer: !ci,
    },
  ],
});
