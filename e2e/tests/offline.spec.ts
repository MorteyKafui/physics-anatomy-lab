import { readFile } from "node:fs/promises";

import { expect, test, type Page } from "@playwright/test";
import { WEB } from "../playwright.config";

import { BUILD_ORDER, LAB, put } from "./walk";

test.describe.configure({ timeout: 90_000 });

/** Open the app once online and wait until the service worker controls the page. */
async function installed(page: Page) {
  await page.goto(LAB);
  await expect(page.getByText("Step 1 of 10 · Question")).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  // The first visit installs it; the next load is served through it.
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
}

test("after one visit, the lab, the notebook, the report and the sheets open with no connection", async ({
  page,
  context,
}) => {
  await installed(page);
  await context.setOffline(true);

  await page.reload();
  await expect(page.getByText("Step 1 of 10 · Question")).toBeVisible();
  await expect(
    page.getByRole("status").filter({ hasText: "Offline. Your work is saved on this device." }),
  ).toBeVisible();

  // The lab works: build the bench, and the work is kept.
  for (const next of ["Predict", "Build"])
    await page.getByRole("button", { name: `Continue to ${next}` }).click();
  for (const [part, slot] of BUILD_ORDER) await put(page, part, slot);
  await page.getByRole("button", { name: "Finish building" }).click();
  await expect(page.getByText("Step 4 of 10 · Check")).toBeVisible();

  for (const [path, heading] of [
    ["notebook", "Notebook"],
    ["review", "Review"],
    ["report", "Report"],
    ["sheets", "Print sheets"],
    ["exam", "Exam"],
  ] as const) {
    await page.goto(`${LAB}/${path}`);
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
  }

  // The report's PDF is made offline too: its fonts come from the cache.
  await page.goto(`${LAB}/report`);
  await expect(page.getByText("Simple pendulum: finding g")).toBeVisible();
  const [file] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download report (PDF)" }).click(),
  ]);
  const raw = (await readFile((await file.path())!)).toString("latin1");
  expect(raw).toContain("/FontFile2");

  // Back online, the work is still there.
  await context.setOffline(false);
  await page.goto(LAB);
  await expect(page.getByText("Step 4 of 10 · Check")).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "Offline." })).toHaveCount(0);
});

test("the app installs: a manifest that opens on the lab, and PNG icons at 192 and 512 px", async ({
  request,
}) => {
  const res = await request.get(`${WEB}/manifest.webmanifest`);
  expect(res.ok()).toBe(true);
  const manifest = (await res.json()) as {
    name: string;
    start_url: string;
    display: string;
    icons: { src: string; sizes: string; purpose: string }[];
  };
  expect(manifest).toMatchObject({
    name: "Physics Anatomy",
    start_url: "/lab/simple-pendulum",
    display: "standalone",
  });
  for (const icon of manifest.icons) {
    const png = await request.get(`${WEB}${icon.src}`);
    expect(png.headers()["content-type"]).toBe("image/png");
    const bytes = await png.body();
    // The PNG header, then the width and height in the IHDR chunk.
    expect(bytes.subarray(1, 4).toString("latin1")).toBe("PNG");
    const [w, h] = icon.sizes.split("x").map(Number);
    expect([bytes.readUInt32BE(16), bytes.readUInt32BE(20)]).toEqual([w, h]);
  }
  expect(manifest.icons.some((i) => i.purpose === "maskable")).toBe(true);
});
