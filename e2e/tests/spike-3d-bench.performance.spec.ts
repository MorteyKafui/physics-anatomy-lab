import { devices, expect, test, type Page } from "@playwright/test";
import { ADMIN } from "../playwright.config";

/*
 * The 3D bench spike (master plan Phase 1; ADR 0036): the same turnable pendulum built with
 * Anatomy 3D and with React Three Fiber, measured on the emulated benchmark phone (Pixel 7
 * size, CPU slowed 6×, as in performance.spec.ts). This records the numbers the decision
 * compares; it checks that each bench draws and moves, not the budgets, since the spike's job is
 * to find out which one meets them.
 */
const BENCHES = [
  { name: "Anatomy 3D", path: "/spikes/3d-bench/anatomy" },
  { name: "React Three Fiber", path: "/spikes/3d-bench/r3f" },
] as const;
const CPU = 6;
const KB = 1024;
const MB = 1024 * 1024;

/** Frames per second over a few seconds, optionally turning the bench 5° every 50 ms. */
const fpsOf = (page: Page, turning: boolean) =>
  page.evaluate(
    (turning) =>
      new Promise<number>((resolve) => {
        const slider = document.querySelector<HTMLElement>("[role=slider]")!;
        const turn = turning
          ? setInterval(
              () =>
                slider.dispatchEvent(
                  new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
                ),
              50,
            )
          : 0;
        let frames = 0;
        const start = performance.now();
        const tick = () => {
          frames += 1;
          if (performance.now() - start < 4000) requestAnimationFrame(tick);
          else {
            clearInterval(turn);
            resolve(frames / ((performance.now() - start) / 1000));
          }
        };
        requestAnimationFrame(tick);
      }),
    turning,
  );

const scriptBytes = (page: Page) =>
  page.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .filter((e) => /\.js(\?|$)/.test(e.name))
      .reduce((n, e) => n + (e as PerformanceResourceTiming).transferSize, 0),
  );

// The admin home page has no links, so nothing is prefetched: the shell alone.
test("the admin shell the benches are measured against", async ({ browser }, info) => {
  const context = await browser.newContext(devices["Pixel 7"]);
  const page = await context.newPage();
  await page.goto(`${ADMIN}/`, { waitUntil: "networkidle" });
  const js = await scriptBytes(page);
  await context.close();
  info.annotations.push({ type: "JS", description: `${(js / KB).toFixed(0)} KB compressed` });
  process.stdout.write(`Shell: JS ${(js / KB).toFixed(0)} KB compressed\n`);
  expect(js).toBeGreaterThan(0);
});

for (const bench of BENCHES) {
  test(`${bench.name}: what the bench costs on the benchmark phone`, async ({ browser }, info) => {
    test.setTimeout(120_000);
    const context = await browser.newContext(devices["Pixel 7"]);
    const page = await context.newPage();
    await page.goto(`${ADMIN}${bench.path}`, { waitUntil: "networkidle" });
    const js = await scriptBytes(page);

    // It draws: a non-empty bench, and it turns when asked.
    const slider = page.getByRole("slider", { name: "Turn the bench" });
    await expect(slider).toBeVisible();
    await slider.focus();
    await page.keyboard.press("ArrowRight");
    await expect(slider).toHaveAttribute("aria-valuetext", "Bench turned 5°");

    const cdp = await context.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: CPU });
    const swinging = await fpsOf(page, false);
    const turning = await fpsOf(page, true);
    await cdp.send("Performance.enable");
    const heap = (await cdp.send("Performance.getMetrics")).metrics.find(
      (m) => m.name === "JSHeapUsedSize",
    )!.value;
    await context.close();

    info.annotations.push(
      { type: "JS", description: `${(js / KB).toFixed(0)} KB compressed` },
      { type: "swinging", description: `${swinging.toFixed(1)} fps at ${CPU}× CPU` },
      { type: "turning", description: `${turning.toFixed(1)} fps at ${CPU}× CPU` },
      { type: "heap", description: `${(heap / MB).toFixed(0)} MB` },
    );
    process.stdout.write(
      `${bench.name}: ${info.annotations.map((a) => `${a.type} ${a.description}`).join(" · ")}\n`,
    );
    expect(swinging).toBeGreaterThan(0);
  });

  test(`${bench.name}: what a phone without WebGL sees`, async ({ browser }, info) => {
    const context = await browser.newContext(devices["Pixel 7"]);
    await context.addInitScript(() => {
      const get = HTMLCanvasElement.prototype.getContext;
      // @ts-expect-error: narrowing the overloads is not the point here.
      HTMLCanvasElement.prototype.getContext = function (kind: string, ...rest: unknown[]) {
        return /webgl/.test(kind) ? null : get.call(this, kind, ...rest);
      };
    });
    const page = await context.newPage();
    await page.goto(`${ADMIN}${bench.path}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    const drawn = await page.locator("[data-bench] svg path").count();
    const fallback = await page.getByText("This bench needs WebGL").count();
    await context.close();
    const seen =
      drawn > 0 ? `the bench (${drawn} SVG paths)` : fallback ? "the no-WebGL message" : "nothing";
    info.annotations.push({ type: "without WebGL", description: seen });
    process.stdout.write(`${bench.name} without WebGL: ${seen}\n`);
    expect(drawn > 0 || fallback > 0).toBe(true);
  });
}
