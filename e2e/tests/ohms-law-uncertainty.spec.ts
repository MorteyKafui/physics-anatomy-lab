import { expect, test, type Page } from "@playwright/test";

import { WEB } from "../playwright.config";
import { DIAGRAM, serious, wire } from "./ohms-walk";

const OHMS = `${WEB}/lab/ohms-law`;

/** Finish a step; on some runs the coach flags something first, and finishing again carries on. */
async function finish(page: Page, button: string, next: string) {
  const step = page.getByText(next);
  await page.getByRole("button", { name: button }).click();
  await step
    .waitFor({ timeout: 3000 })
    .catch(() => page.getByRole("button", { name: button }).click());
  await expect(step).toBeVisible();
}

/** Wired, then read off the wire and at each of the book's positions, up and back down. */
async function toPlot(page: Page) {
  await page.goto(OHMS);
  await page.getByRole("switch", { name: "Uncertainties" }).click();
  // At Auto the app plots the points and draws the line, so the graph has something to bar.
  await page.getByLabel("Help level").selectOption("auto");
  await page.getByRole("button", { name: "Continue to Predict" }).click();
  await page.getByRole("button", { name: "It falls" }).click();
  await page.getByRole("button", { name: "Continue to Build" }).click();
  await wire(page, DIAGRAM);
  await page.getByRole("button", { name: "Finish building" }).click();
  await page.getByRole("button", { name: "Continue to Measure" }).click();
  await page.getByRole("button", { name: "Close the key" }).click();
  const take = page.getByRole("button", { name: "Take this reading" });
  await take.click();
  // PJ increasing, then decreasing, as the book takes them, so each mean has its two repeats.
  for (const cm of [40, 50, 60, 70, 80, 80, 70, 60, 50, 40]) {
    await page.getByRole("slider").fill(String(cm));
    await page.getByRole("button", { name: "Press the jockey" }).click();
    await expect(page.getByRole("button", { name: "Lift the jockey" })).toBeVisible();
    await take.click();
    await page.getByRole("button", { name: "Lift the jockey" }).click();
    await expect(page.getByRole("button", { name: "Press the jockey" })).toBeVisible();
  }
  await take.click();
  await page.getByRole("button", { name: "Open the key" }).click();
  await page.getByRole("button", { name: "Finish measuring" }).click();
  await expect(page.getByText("Step 6 of 10 · Tabulate")).toBeVisible();
  await page.getByRole("button", { name: "Standard" }).click();
  await page.getByRole("button", { name: "Fill in my readings" }).click();
  // The readings land in the table before it is read or finished.
  await expect(
    page
      .getByRole("region", { name: "Results table" })
      .getByRole("textbox", { name: "Row 1, I₁/A" }),
  ).not.toHaveValue("");
}

test("with the layer on, Ohm's law's table, graph and Analyse carry the uncertainties", async ({
  page,
}, info) => {
  test.skip(info.project.name === "phone", "The help level is set on desktop");
  test.setTimeout(120_000);
  await toPlot(page);
  const results = page.getByRole("region", { name: "Results table" });
  // The meters are needles on scales: half their least count, 0.01 A and 0.025 V.
  await expect(results.locator('[data-uncertainty="I1"]')).toHaveText("± 0.01");
  await expect(results.locator('[data-uncertainty="V1"]')).toHaveText("± 0.025");
  await finish(page, "Finish tabulating", "Step 7 of 10 · Plot");

  await expect(page.locator('[data-graph="error-bars"]')).toHaveCount(1);
  // The app plots the points at Auto as the graph opens.
  await expect(page.locator('[data-graph="points"] > g').first()).toBeVisible();
  await page.getByLabel("Draw the steepest and least steep lines through the error bars").check();
  await expect(page.locator('[data-graph="worst-lines"] line')).toHaveCount(2);
  await finish(page, "Finish plotting", "Step 8 of 10 · Analyse");

  await expect(page.getByText(/^Least squares: the slope ± /)).toBeVisible();
  await expect(page.getByLabel("E, your value")).toBeVisible();
  await page.getByLabel("r, your value").fill("1.5");
  await page.getByLabel("The uncertainty in r").fill("9");
  await expect(page.getByRole("status").filter({ hasText: "more than twice" })).toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(await serious(page)).toEqual([]);

  // The university report carries E and r with their uncertainties.
  await page.goto(`${OHMS}/report`);
  await page
    .getByRole("navigation", { name: "Sections" })
    .getByRole("button", { name: "University", exact: true })
    .click();
  const paper = page.getByRole("region", { name: "Report preview" });
  await expect(
    paper.getByText(/^E, where the line meets the V axis, is [\d.]+ ± [\d.]+ V\.$/),
  ).toBeVisible();
  await expect(
    paper.getByText(/^r has the slope's percentage uncertainty: r = [\d.]+ ± [\d.]+ Ω\.$/),
  ).toBeVisible();
});
