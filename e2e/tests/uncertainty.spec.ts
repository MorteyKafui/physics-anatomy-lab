import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { LAB, results, tabulateToPlot, timeFor, toMeasure } from "./walk";

const serious = async (page: Page) => {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  return violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(" ")).join(", ")})`);
};

const toggle = (page: Page) => page.getByRole("switch", { name: "Uncertainties" });

/** Three lengths, timed twice each, then the standard table filled in and on to Plot. */
async function toPlot(page: Page) {
  await toMeasure(page);
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 3000));
  for (const s of [35.9, 35.88]) await timeFor(page, s);
  await page.getByRole("button", { name: "Make the pendulum longer" }).click();
  for (const s of [36.99, 37.0]) await timeFor(page, s);
  await page.getByRole("button", { name: "Make the pendulum longer" }).click();
  for (const s of [38.05, 38.1]) await timeFor(page, s);
  await page.getByRole("button", { name: "Finish measuring" }).click();
  await tabulateToPlot(page);
}

test("the Uncertainties switch is off, and the lab is as it was until it is turned on", async ({
  page,
}) => {
  await page.goto(LAB);
  await expect(toggle(page)).toHaveAttribute("aria-checked", "false");
  await toggle(page).click();
  await expect(toggle(page)).toHaveAttribute("aria-checked", "true");
  // Remembered on this device.
  await page.reload();
  await expect(toggle(page)).toHaveAttribute("aria-checked", "true");
});

test("with the layer on, the table, the graph and Analyse carry the uncertainties", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.goto(LAB);
  await toggle(page).click();
  await toPlot(page);

  // The graph: error bars, and the worst lines when asked for.
  await expect(page.locator('[data-graph="error-bars"]')).toHaveCount(1);
  await page.getByLabel("Draw the steepest and least steep lines through the error bars").check();
  await expect(page.locator('[data-graph="worst-lines"] line')).toHaveCount(2);

  // Back to the table: each reading's uncertainty in its heading, each worked value's beside it.
  await page
    .getByRole("button", { name: /Tabulate/ })
    .first()
    .click();
  await expect(results(page).locator('[data-uncertainty="l"]')).toHaveText("± 0.0005");
  await expect(results(page).locator('[data-uncertainty="t1"]')).toHaveText("± 0.01");
  await expect(results(page).getByLabel(/^Row 1, T²\/s²: \d\.\d+ ± 0\.0\d+$/)).toBeVisible();
  await page.getByRole("button", { name: /Plot/ }).first().click();

  // Analyse: the slope's least-squares uncertainty, and g quoted with one, checked.
  await page.getByRole("button", { name: "Finish plotting" }).click();
  const carryOn = page.getByRole("button", { name: "Carry on as it is" });
  if (await carryOn.isVisible()) await carryOn.click();
  await expect(page.getByText(/^Least squares: the slope ± /)).toBeVisible();
  await page.getByLabel("g, your value").fill("9.80");
  await page.getByLabel("The uncertainty in g").fill("5");
  await expect(page.getByRole("status").filter({ hasText: "more than twice" })).toBeVisible();
  await expect(
    page.getByRole("status").filter({ hasText: "Give the uncertainty to one significant figure" }),
  ).toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.resume();
  expect(await serious(page)).toEqual([]);

  // The university report carries the uncertainty working.
  await page.goto(`${LAB}/report`);
  await page
    .getByRole("navigation", { name: "Sections" })
    .getByRole("button", { name: "University", exact: true })
    .click();
  const paper = page.getByRole("region", { name: "Report preview" });
  await expect(paper.getByText(/^By least squares, the slope is [\d.]+ ± [\d.]+/)).toBeVisible();
  await expect(
    paper.getByText(/^g has the same percentage uncertainty: g = [\d.]+ ± [\d.]+ m s⁻²\.$/),
  ).toBeVisible();
  await expect(
    paper.getByText(/^The largest percentage uncertainty in the table is in /),
  ).toBeVisible();
});
