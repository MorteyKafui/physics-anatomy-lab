import AxeBuilder from "@axe-core/playwright";
import { countFromOneErrorPercent } from "@pa/experiments";
import { expect, test, type Page } from "@playwright/test";
import { WEB } from "../playwright.config";

const LAB = `${WEB}/lab/simple-pendulum`;

/** Walk through the four steps before Measure (their activities are built next). */
async function toMeasure(page: Page) {
  // A fake clock: the bench only moves when the test says, so "the same pass" is exact.
  await page.clock.install();
  await page.goto(LAB);
  for (const next of ["Predict", "Build", "Check", "Measure"]) {
    await page.getByRole("button", { name: `Continue to ${next}` }).click();
  }
  await expect(page.getByRole("heading", { name: "Time 20 oscillations" })).toBeVisible();
}

/** Start the stopwatch and count the starting pass as "one" (the plan's off-track mistake). */
async function timeCountingFromOne(page: Page) {
  // Stop time between Start and the first Count, so they fall on exactly the same pass.
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await page.getByRole("button", { name: "Count a pass" }).click();
  await page.clock.runFor(2000);
  await page.getByRole("button", { name: "Stop", exact: true }).click();
}

test("opens a fresh attempt on step 1 and walks to Measure", async ({ page }) => {
  await page.goto(LAB);
  await expect(page.getByRole("heading", { level: 1, name: "Simple pendulum" })).toBeVisible();
  await expect(page.getByText("Step 1 of 10 · Question")).toBeVisible();
  await toMeasure(page);
  await expect(page.getByText("Step 5 of 10 · Measure")).toBeVisible();
});

test("counting from one is caught, with the size of the error worked out from the physics", async ({
  page,
}) => {
  await toMeasure(page);
  await timeCountingFromOne(page);
  const card = page.getByRole("status").filter({ hasText: 'You said "one" on the first pass' });
  await expect(card).toBeVisible();
  // Rule 1: the percentage is computed by packages/experiments from packages/physics.
  await expect(card).toContainText(`about ${countFromOneErrorPercent(9.81)}% too high`);
  await expect(card).toContainText("times 19 swings");
});

test("a reading survives a reload, and Reset and try again removes it", async ({ page }) => {
  await toMeasure(page);
  await timeCountingFromOne(page);
  await expect(page.getByText(/^Readings: \d+\.\d{2} s$/)).toBeVisible();

  await page.reload();
  await expect(page.getByText("Step 5 of 10 · Measure")).toBeVisible();
  await expect(page.getByText(/^Readings: \d+\.\d{2} s$/)).toBeVisible();

  await timeCountingFromOne(page);
  await page.getByRole("button", { name: "Reset and try again" }).click();
  await expect(page.getByText(/^Readings: \d+\.\d{2} s$/)).toBeVisible();
  await expect(page.getByText(/^Readings: .*, /)).toHaveCount(0);
});

test("the step strip opens only steps the student has reached", async ({ page }) => {
  await page.goto(LAB);
  const strip = page.getByRole("navigation", { name: "Stages" });
  await expect(strip.getByRole("button", { name: /Measure/ })).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  await strip.getByRole("button", { name: /Measure/ }).click({ force: true });
  await expect(page.getByText("Step 1 of 10 · Question")).toBeVisible();
});

test("the stopwatch works from the keyboard", async ({ page }, info) => {
  test.skip(info.project.name === "phone", "Keyboard shortcuts are for desktop");
  await toMeasure(page);
  await page.locator("body").click({ position: { x: 5, y: 5 } });
  await page.keyboard.press("s");
  await page.keyboard.press(" ");
  await page.clock.runFor(1000);
  await page.keyboard.press("s");
  await expect(page.getByText(/^Readings: \d+\.\d{2} s$/)).toBeVisible();
});

test("the lab, mid-measurement with the coach speaking, has no serious accessibility issues", async ({
  page,
}) => {
  await toMeasure(page);
  await timeCountingFromOne(page);
  await expect(page.getByRole("status").first()).toBeVisible();
  await page.clock.resume(); // axe uses the page's timers
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  const blocking = violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(" ")).join(", ")})`);
  expect(blocking).toEqual([]);
});

test("no sideways scrolling at phone width", async ({ page }, info) => {
  test.skip(info.project.name !== "phone", "Phone layout");
  await toMeasure(page);
  const widths = await page.evaluate(() => [
    document.documentElement.scrollWidth,
    document.documentElement.clientWidth,
  ]);
  expect(widths[0]).toBe(widths[1]);
});
