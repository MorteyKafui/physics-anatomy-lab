import { expect, test } from "@playwright/test";
import { WEB } from "../playwright.config";

// Master plan section 13: Largest Contentful Paint on the landing page over slow 4G is 2.5 s or less.
const LCP_BUDGET_MS = 2500;

// Lighthouse's slow 4G profile: 150 ms round trip, 1.6 Mbit/s down, 750 kbit/s up, CPU slowed 4×.
const SLOW_4G = {
  offline: false,
  latency: 150,
  downloadThroughput: (1.6 * 1024 * 1024) / 8,
  uploadThroughput: (750 * 1024) / 8,
};

test("landing page LCP over slow 4G is within budget", async ({ page, browserName }, info) => {
  test.skip(browserName !== "chromium", "Network throttling needs the Chrome DevTools Protocol");
  test.skip(info.project.name !== "phone", "The budget is measured at phone size");

  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", SLOW_4G);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });

  await page.goto(WEB, { waitUntil: "load" });
  const lcp = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const last = entries[entries.length - 1];
          if (last) resolve(last.startTime);
        }).observe({ type: "largest-contentful-paint", buffered: true });
      }),
  );

  info.annotations.push({ type: "LCP", description: `${Math.round(lcp)} ms` });
  expect(lcp).toBeLessThanOrEqual(LCP_BUDGET_MS);
});
