import { gzipSync } from "node:zlib";

import { expect, test, type Page } from "@playwright/test";
import { WEB } from "../playwright.config";

import { LAB, toMeasure } from "./walk";

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
  // Runs in the "performance" project only (phone size, alone; see playwright.config.ts).
  test.skip(browserName !== "chromium", "Network throttling needs the Chrome DevTools Protocol");

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

/*
 * The benchmark phone, emulated (master plan, "Performance budgets"): a low-cost Android phone
 * with 2 GB of RAM on slow 4G. Chrome's CPU is slowed 6× and the network set to slow 4G; each
 * budget below is the plan's. A real phone run follows docs/how-to/benchmark-phone.md.
 */
const BENCHMARK_CPU = 6;
const KB = 1024;
const MB = 1024 * 1024;

const scriptBytes = (page: Page) =>
  page.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .filter((e) => /\.js(\?|$)/.test(e.name))
      .reduce((n, e) => n + (e as PerformanceResourceTiming).transferSize, 0),
  );

test.describe("the benchmark phone, emulated", () => {
  // A first visit, as the phone makes it: nothing cached by a service worker yet.
  test.use({ serviceWorkers: "block" });

  test("the app shell and the lab download within their JavaScript budgets", async ({
    browser,
  }, info) => {
    // Each page in a fresh browser, so nothing comes from the other's cache.
    const firstVisit = async (url: string) => {
      const context = await browser.newContext({ serviceWorkers: "block" });
      const page = await context.newPage();
      await page.goto(url, { waitUntil: "networkidle" });
      const bytes = await scriptBytes(page);
      await context.close();
      return bytes;
    };
    const shell = await firstVisit(WEB);
    const total = await firstVisit(LAB);
    info.annotations.push(
      { type: "shell JS", description: `${(shell / KB).toFixed(0)} KB compressed` },
      { type: "lab JS", description: `${(total / KB).toFixed(0)} KB compressed` },
    );
    // The shell 200 KB or less; the lab is the shell plus the pendulum, 150 KB more at most.
    expect(shell).toBeLessThanOrEqual(200 * KB);
    expect(total).toBeLessThanOrEqual((200 + 150) * KB);
  });

  test("the offline pack, everything the service worker keeps, is 3 MB or less compressed", async ({
    request,
  }, info) => {
    const sw = await (await request.get(`${WEB}/sw.js`)).text();
    const urls = [...sw.matchAll(/"url":"([^"]+)"/g)].map((m) => m[1]!);
    expect(urls.length).toBeGreaterThan(20);
    let compressed = 0;
    for (const url of urls)
      compressed += gzipSync(await (await request.get(`${WEB}${url}`)).body()).length;
    info.annotations.push({
      type: "offline pack",
      description: `${urls.length} files, ${(compressed / MB).toFixed(2)} MB compressed`,
    });
    expect(compressed).toBeLessThanOrEqual(3 * MB);
  });

  test("the bob swings at 30 fps or more, answers a tap within 200 ms, and stays under 150 MB", async ({
    page,
  }, info) => {
    test.setTimeout(120_000);
    await toMeasure(page);
    await page.clock.resume();
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: BENCHMARK_CPU });
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", SLOW_4G);

    // The bob really moves while the frames are counted.
    const bob = page.locator('[data-part="bob"]').first();
    const before = (await bob.boundingBox())!.x;
    const fps = await page.evaluate(
      () =>
        new Promise<number>((resolve) => {
          let frames = 0;
          const start = performance.now();
          const tick = () => {
            frames += 1;
            if (performance.now() - start < 4000) requestAnimationFrame(tick);
            else resolve(frames / ((performance.now() - start) / 1000));
          };
          requestAnimationFrame(tick);
        }),
    );
    const after = (await bob.boundingBox())!.x;
    expect(Math.abs(after - before)).toBeGreaterThan(1);

    // Interaction to Next Paint, as the browser times it: Start, a count, and Stop.
    await page.evaluate(() => {
      (window as unknown as { __longest: number }).__longest = 0;
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          const w = window as unknown as { __longest: number };
          w.__longest = Math.max(w.__longest, e.duration);
        }
      }).observe({
        type: "event",
        durationThreshold: 16,
        buffered: true,
      } as PerformanceObserverInit);
    });
    await page.getByRole("button", { name: "Start", exact: true }).click();
    await page.getByRole("button", { name: "Count a pass" }).click();
    await page.getByRole("button", { name: "Stop", exact: true }).click();
    await page.waitForTimeout(500);
    const inp = await page.evaluate(() => (window as unknown as { __longest: number }).__longest);

    await cdp.send("Performance.enable");
    const heap = (await cdp.send("Performance.getMetrics")).metrics.find(
      (m) => m.name === "JSHeapUsedSize",
    )!.value;

    info.annotations.push(
      { type: "frame rate", description: `${fps.toFixed(1)} fps at ${BENCHMARK_CPU}× CPU` },
      { type: "slowest interaction", description: `${Math.round(inp)} ms` },
      { type: "memory", description: `${(heap / MB).toFixed(0)} MB of JavaScript heap` },
    );
    expect(fps).toBeGreaterThanOrEqual(30);
    expect(inp).toBeLessThanOrEqual(200);
    expect(heap).toBeLessThanOrEqual(150 * MB);
  });
});
