import { readFile } from "node:fs/promises";

import AxeBuilder from "@axe-core/playwright";
import { pendulumModelT2, SHEET_LENGTHS, simplePendulum } from "@pa/experiments";
import { expect, test, type Page } from "@playwright/test";

import { LAB } from "./walk";

const CHECK = `${LAB}/check`;

const serious = async (page: Page) => {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  return violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(" ")).join(", ")})`);
};

/**
 * A student's readings as a CSV in the template's layout, timed exactly at each length from the
 * model, with every length read `short` metres short (measured to the top of the bob).
 */
function readingsCsv(short = 0, slip?: { row: number; text: string }) {
  const rows = SHEET_LENGTHS.map((l, i) => {
    const t = (simplePendulum.swings * Math.sqrt(pendulumModelT2(l + short))).toFixed(2);
    return `${l},${i === slip?.row ? slip.text : t},${t}`;
  });
  return ["l / m,t₁ / s,t₂ / s", ...rows].join("\r\n");
}

async function bringIn(page: Page, name: string, text: string) {
  await page.locator('input[type="file"]').setInputFiles({
    name,
    mimeType: "text/csv",
    buffer: Buffer.from(text, "utf-8"),
  });
}

test("the lab's explanation links to the model check", async ({ page }) => {
  await page.goto(LAB);
  await page.getByRole("tab", { name: "Explanation" }).click();
  await page.getByRole("link", { name: "Check your own lab readings" }).click();
  await expect(page).toHaveURL(CHECK);
  await expect(
    page.getByRole("heading", { level: 1, name: "Check your own lab readings" }),
  ).toBeVisible();
});

test("before any readings it shows labelled example data that agrees with the model", async ({
  page,
}) => {
  await page.goto(CHECK);
  await expect(page.getByText("Example data").first()).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Your readings agree with the model" }),
  ).toBeVisible();
  await expect(page.getByRole("img", { name: /^5 readings of T² against l/ })).toBeVisible();
});

test("the data template downloads with the lab's columns and the print sheets' lengths", async ({
  page,
}) => {
  await page.goto(CHECK);
  const [file] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download CSV" }).click(),
  ]);
  expect(file.suggestedFilename()).toBe("simple-pendulum-data-template.csv");
  const text = (await readFile((await file.path())!)).toString("utf-8");
  expect(text).toContain("l / m,t₁ / s,t₂ / s");
  for (const l of SHEET_LENGTHS) expect(text).toContain(`\r\n${l},,`);
});

test("lengths measured to the top of the bob are found as a shift, with its cause and precaution", async ({
  page,
}) => {
  await page.goto(CHECK);
  await bringIn(page, "readings.csv", readingsCsv(0.01));
  await expect(
    page.getByRole("heading", { name: "Your readings are shifted from the model" }),
  ).toBeVisible();
  await expect(page.getByText("Example data")).toHaveCount(0);
  await expect(page.getByText(/as if each length were about 1\.0 cm short/)).toBeVisible();
  await expect(
    page.getByText("Measure the length from the point of suspension to the centre of the bob."),
  ).toBeVisible();
});

test("a decimal written with a comma is named on its cell, and the rest are kept", async ({
  page,
}) => {
  await page.goto(CHECK);
  await bringIn(page, "readings.csv", readingsCsv(0, { row: 3, text: '"35,90"' }));
  await expect(page.getByRole("alert").filter({ hasText: "Row 4" })).toHaveText(
    "Row 4, t₁: it reads “35,90”. Use a full stop for the decimal point, 35.90.",
  );
  // The row is kept with its other timing.
  await expect(page.getByText("5 rows", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Your readings agree with the model" }),
  ).toBeVisible();
});

test("a file of another type is refused, and nothing changes", async ({ page }) => {
  await page.goto(CHECK);
  await page.locator('input[type="file"]').setInputFiles({
    name: "readings.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.7"),
  });
  await expect(page.getByRole("alert").filter({ hasText: "readings.pdf" })).toHaveText(
    "Bring in a CSV or XLSX file. readings.pdf is neither.",
  );
  await expect(page.getByText("Example data").first()).toBeVisible();
});

test("readings typed in are checked the same way", async ({ page }) => {
  await page.goto(CHECK);
  await page.getByRole("button", { name: "Type them in instead" }).click();
  for (const [i, l] of SHEET_LENGTHS.entries()) {
    const t = (simplePendulum.swings * Math.sqrt(pendulumModelT2(l))).toFixed(2);
    // Key by key, as a student types.
    await page.getByLabel(`t₁ / s, row ${i + 1}`).pressSequentially(t);
  }
  await expect(
    page.getByRole("heading", { name: "Your readings agree with the model" }),
  ).toBeVisible();
  await expect(page.getByText("Example data")).toHaveCount(0);
});

test("the readings export as JSON in their own format", async ({ page }) => {
  await page.goto(CHECK);
  await bringIn(page, "readings.csv", readingsCsv());
  const [file] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "JSON" }).click(),
  ]);
  expect(file.suggestedFilename()).toBe("simple-pendulum-lab-data.json");
  const json = JSON.parse((await readFile((await file.path())!)).toString("utf-8"));
  expect(json.format).toBe("physics-anatomy/lab-data");
  expect(json.rows).toHaveLength(SHEET_LENGTHS.length);
});

test("the model check has no serious accessibility issues, with example data and a shift", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(CHECK);
  await expect(page.getByText("Example data").first()).toBeVisible();
  expect(await serious(page)).toEqual([]);
  await bringIn(page, "readings.csv", readingsCsv(0.01));
  await expect(
    page.getByRole("heading", { name: "Your readings are shifted from the model" }),
  ).toBeVisible();
  expect(await serious(page)).toEqual([]);
});
