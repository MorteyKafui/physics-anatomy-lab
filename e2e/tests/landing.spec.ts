import { expect, test, type Page } from "@playwright/test";

import { WEB } from "../playwright.config";

// The landing page (design/mockups/Main.dc.html; docs/content/landing-page-brief.md).

const SCENE_NOTE =
  /Behind this text: (two slits|two slits with a detector watching which slit|a single slit|four slits), one particle at a time/;

/** A checksum of the hero's canvas, to tell one frame from another. */
const checksum = (page: Page) =>
  page.locator("#top canvas").evaluate((c: HTMLCanvasElement) => {
    const data = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
    let sum = 0;
    for (let i = 0; i < data.length; i += 4)
      sum = (sum * 31 + data[i]! + data[i + 1]! + data[i + 2]!) % 2147483647;
    return sum;
  });

/** How many pixels of the hero's canvas are not the background. */
const litPixels = (page: Page) =>
  page.locator("#top canvas").evaluate((c: HTMLCanvasElement) => {
    const data = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
    let lit = 0;
    for (let i = 0; i < data.length; i += 4) if (data[i]! + data[i + 1]! + data[i + 2]! > 60) lit++;
    return lit;
  });

test("the hero: the headline, its two actions, and the scene behind it", async ({ page }) => {
  await page.goto(WEB);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Physics fromfirst principles.");
  await expect(page.getByText(SCENE_NOTE)).toBeVisible();
  const canvas = page.locator("#top canvas");
  await expect(canvas).toHaveAttribute("aria-label", /^Particles landing/);
  await expect(canvas).toHaveAttribute("data-scene", /^(twoSlits|detector|oneSlit|fourSlits)$/);

  // Where it goes; the link test below checks that every page linked from here answers.
  await expect(
    page.locator("#top").getByRole("link", { name: "Start an experiment" }),
  ).toHaveAttribute("href", "/lab/simple-pendulum");
});

test("particles keep landing, one frame after another, once the page has loaded", async ({
  page,
}) => {
  await page.goto(WEB, { waitUntil: "load" });
  await expect.poll(() => litPixels(page), { timeout: 10_000 }).toBeGreaterThan(200);
  // Old dots fade and scenes change, so the count of lit pixels can level off or fall; what must
  // hold is that the picture keeps changing.
  const first = await checksum(page);
  await expect.poll(() => checksum(page)).not.toBe(first);
});

test.describe("with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("the hero draws one finished pattern and stops (brief, decision 2)", async ({ page }) => {
    await page.goto(WEB, { waitUntil: "load" });
    await expect.poll(() => litPixels(page)).toBeGreaterThan(2000);
    const drawn = await checksum(page);
    await page.waitForTimeout(1000);
    expect(await checksum(page)).toBe(drawn);
  });
});

test("the status light asks the API and says what it found (brief, decision 7)", async ({
  page,
}) => {
  await page.route("**/api/health", (r) => r.fulfill({ status: 200, json: { status: "ok" } }));
  await page.goto(WEB);
  await expect(page.locator("[data-status]")).toHaveText("All systems normal");

  await page.unroute("**/api/health");
  await page.route("**/api/health", (r) => r.abort());
  await page.reload();
  await expect(page.locator("[data-status]")).toHaveText(
    "Can't reach the server: the lab still works offline",
  );
});

test("every link goes somewhere real (brief, decision 7)", async ({ page, request }) => {
  await page.goto(WEB);
  const hrefs = await page
    .locator("a[href]")
    .evaluateAll((as) => [...new Set(as.map((a) => a.getAttribute("href")!))]);
  expect(hrefs.length).toBeGreaterThan(3);
  for (const href of hrefs) {
    if (href.startsWith("#")) {
      await expect(page.locator(href), href).toHaveCount(1);
    } else {
      const response = await request.get(new URL(href, WEB).href);
      expect(response.status(), href).toBe(200);
    }
  }
});

test("the header becomes a floating bar once the page scrolls", async ({ page }) => {
  await page.goto(WEB);
  const bar = page.locator("[data-scrolled]");
  await expect(bar).toHaveAttribute("data-scrolled", "false");
  await page.mouse.wheel(0, 400);
  await expect(bar).toHaveAttribute("data-scrolled", "true");
});
