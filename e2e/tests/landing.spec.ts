import { benchPeriod, EXAM_MINUTES, simplePendulum } from "@pa/experiments";
import { gFromPeriod, periodExact, recordedPeriod } from "@pa/physics";
import { expect, test, type Page } from "@playwright/test";

import { WEB } from "../playwright.config";

// The landing page (design/mockups/Main.dc.html; docs/content/landing-page-brief.md).

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

test("the hero: the headline, its two actions, and the live slits behind it", async ({ page }) => {
  await page.goto(WEB);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Physics fromfirst principles.");
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
      // A fresh connection each time: a reused keep-alive socket can be closed by the server at the
      // moment it is reused (Node's 5 s idle timeout), which reads as ECONNRESET.
      const response = await request.get(new URL(href, WEB).href, {
        headers: { connection: "close" },
      });
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

test.describe("Time it yourself", () => {
  const figure = (page: Page) => page.getByRole("figure").filter({ hasText: "Drag the bob" });

  test("its readings are the physics', and counting from one makes g about 11% too high", async ({
    page,
  }) => {
    await page.goto(WEB);
    const T = periodExact({ length: 0.8, g: 9.81, amplitude: (8 * Math.PI) / 180 });
    const f = figure(page);
    await expect(f).toContainText(`${T.toFixed(3)} s`);
    await expect(f).toContainText(gFromPeriod(0.8, T).toFixed(2));
    await f.getByRole("button", { name: "one" }).click();
    await expect(f.getByRole("button", { name: "one" })).toHaveAttribute("aria-pressed", "true");
    const T19 = recordedPeriod(T, 20, 1);
    await expect(f).toContainText(`${T19.toFixed(3)} s`);
    await expect(f.getByRole("status")).toContainText("Your g is about 11% too high");
  });

  test("works from the keyboard: the arrows pull the bob, Enter lets it go", async ({ page }) => {
    await page.goto(WEB);
    const bob = figure(page).getByRole("slider");
    await bob.focus();
    for (let i = 0; i < 6; i++) await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");
    await expect(bob).toHaveAttribute("aria-valuenow", "14");
    await expect(figure(page).getByRole("status")).toContainText("That swing is 14°");
  });
});

test("Every part has a job: each part's note, and the stand pulled apart", async ({ page }) => {
  await page.goto(WEB);
  const section = page.locator("#anatomy");
  await section.getByRole("button", { name: /^Stopwatch/ }).focus();
  await expect(section.getByRole("tooltip")).toContainText(
    `Reads to ${simplePendulum.stopwatch.resolution} s`,
  );
  const bob = section.locator('[data-part="bob"]');
  const at = async () => bob.evaluate((el) => (el as SVGGElement).style.transform);
  await section.getByRole("slider").fill("0");
  await expect.poll(at).toBe("translate(0px, 0px)");
  await section.getByRole("slider").fill("100");
  await expect.poll(at).toBe("translate(90px, 6px)");
});

test("Caught the moment it happens: the coach says what the lab says", async ({ page }) => {
  await page.goto(WEB);
  const slip = (simplePendulum.swings * benchPeriod(9.81, 0.8)).toFixed(2);
  await expect(page.getByRole("img", { name: /A results table being filled in/ })).toContainText(
    `Row 2, mean t: ${slip} needs 3 decimal places`,
  );
});

test.describe("with reduced motion, the demos hold still", () => {
  test.use({ reducedMotion: "reduce" });

  test("the coach demo shows the corrected mean and its note", async ({ page }) => {
    await page.goto(WEB);
    const fixed = `${(simplePendulum.swings * benchPeriod(9.81, 0.8)).toFixed(2)}0 ✓`;
    await expect(page.getByText(fixed)).toBeVisible();
    await expect(page.locator(".pa-toast")).toHaveCSS("opacity", "1");
  });
});

test.describe("the experiment cards", () => {
  test("the pendulum's bars follow the T and T² switch, and a bar shows its values", async ({
    page,
  }) => {
    await page.goto(WEB);
    const card = page.locator('[data-card="pendulum"]');
    const top = () => card.locator('[data-bar="5"] polygon').nth(2).getAttribute("points");
    const squared = await top();
    await card.getByRole("button", { name: "T", exact: true }).click();
    await expect.poll(top).not.toBe(squared);
    await card.locator('[data-bar="0"]').hover();
    const T = benchPeriod(9.81, 0.5);
    await expect(card.getByRole("tooltip")).toHaveText(
      `l = 0.500 mT = ${T.toFixed(3)} s,  T² = ${(T * T).toFixed(3)} s²`,
    );
  });

  test("pointing at a part of the circuit says what it does", async ({ page }) => {
    await page.goto(WEB);
    const card = page.locator('[data-card="circuit"]');
    await card.locator('[data-tip="key"]').hover();
    await expect(card.getByRole("tooltip")).toContainText("Open it as soon as each reading");
  });

  test("each feed shows the lab's readings", async ({ page }) => {
    await page.goto(WEB);
    const T = benchPeriod(9.81, 0.5);
    await expect(page.locator('[data-card="pendulum"]')).toContainText(`T ${T.toFixed(3)} s`);
    await expect(page.locator('[data-card="lens"]')).toContainText("u 20.0 cm");
  });
});

test.describe("the feature bento", () => {
  test("the graph switches between colour and black and white", async ({ page }) => {
    await page.goto(WEB);
    const graph = page.getByRole("img", { name: /graph of T² against l/ });
    await expect(graph).toHaveAttribute("aria-label", /^Colour graph/);
    await page.getByRole("button", { name: "Black and white" }).click();
    await expect(graph).toHaveAttribute("aria-label", /^Black and white graph/);
  });

  test("the connection tile shows the real connection", async ({ page, context }) => {
    await page.goto(WEB);
    const tile = page.locator("[data-online]");
    await expect(tile).toHaveText("Online: your work syncs");
    await context.setOffline(true);
    await expect(tile).toHaveText("Offline: your work is kept on this device");
    await context.setOffline(false);
  });

  test("the exam countdown starts from the paper's time", async ({ page }) => {
    await page.goto(WEB);
    await expect(
      page.getByText(`The pendulum paper allows ${EXAM_MINUTES} minutes.`),
    ).toBeVisible();
  });
});
