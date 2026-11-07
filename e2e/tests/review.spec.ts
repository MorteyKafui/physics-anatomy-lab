import AxeBuilder from "@axe-core/playwright";
import { readingErrorPercent } from "@pa/experiments";
import { expect, test, type Page } from "@playwright/test";

import {
  LAB,
  plotToConclude,
  tabulateToPlot,
  timeCountingFromOne,
  timeFor,
  toMeasure,
} from "./walk";

// A whole run, Question to Conclude, then a redo: longer than the default 30 s.
test.describe.configure({ timeout: 120_000 });

const REVIEW = `${LAB}/review`;

/** One reading counted from one, three timed right, then on through Analyse at Auto. */
async function runWithCountFromOne(page: Page) {
  await toMeasure(page);
  await timeCountingFromOne(page);
  await timeFor(page, 2);
  await page.getByRole("button", { name: "Make the pendulum longer" }).click();
  await timeFor(page, 2.2);
  await timeFor(page, 2.2);
  await page.getByRole("button", { name: "Finish measuring" }).click();
  await expect(page.getByText("Step 6 of 10 · Tabulate")).toBeVisible();
  await tabulateToPlot(page);
  await plotToConclude(page);
}

const review = (page: Page) => page.getByRole("region", { name: "Review" });
const compare = (page: Page) => page.getByRole("complementary", { name: "Compare" });
const runsStrip = (page: Page) => page.getByRole("region", { name: "Runs" });

test("the review lists the mistake with what it did to g, and Compare opens once it is read", async ({
  page,
}) => {
  await runWithCountFromOne(page);
  await page.getByRole("link", { name: "Review" }).click();
  await expect(page).toHaveURL(REVIEW);

  const card = review(page)
    .locator("div")
    .filter({ hasText: 'You said "one" on the first pass' })
    .last();
  await expect(card).toContainText("Step 5 · Measure");
  await expect(card).toContainText("Still in your result");
  // Rule 1: the size comes from packages/experiments and packages/physics.
  const percent = Math.round(readingErrorPercent({ count: 20, countedFromOne: true }, 9.81)!);
  await expect(card).toContainText(`Raised it by ${percent}% in each reading timed this way`);
  await expect(
    review(page)
      .getByText(/ m s⁻²$/)
      .first(),
  ).toBeVisible();

  // Locked until the feedback is read; the accepted value is hidden too.
  await expect(compare(page).getByText("Locked")).toBeVisible();
  await expect(review(page).getByText("The accepted value appears when")).toBeVisible();
  await page.getByRole("button", { name: "I have read my feedback" }).click();
  await expect(review(page).getByText("Accepted value here")).toBeVisible();
  await expect(review(page).getByText("9.81 m s⁻²")).toBeVisible();

  const table = compare(page).getByRole("table");
  await expect(table.getByRole("columnheader", { name: "The right way" })).toBeVisible();
  const counting = table.getByRole("row", { name: /^Counting/ });
  await expect(counting).toContainText("From one in 1 of 4");
  await expect(counting).toContainText("From zero");

  await compare(page).getByRole("button", { name: "Watch both at the first mistake" }).click();
  const dialog = page.getByRole("dialog", { name: "Both at the first pass" });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();

  // It stays read after a reload: it is an event in the run.
  await page.reload();
  await expect(compare(page).getByRole("table")).toBeVisible();
});

test("redoing from Measure starts run 2 with the work before it, and keeps run 1", async ({
  page,
}) => {
  await runWithCountFromOne(page);
  await page.goto(REVIEW);
  // Counting from one and stopping early are both Measure mistakes: either redo will do.
  await review(page).getByRole("button", { name: "Redo from Measure" }).first().click();
  const confirm = page.getByRole("dialog", { name: "Start run 2 from Measure?" });
  await expect(confirm).toContainText("Question to Check comes with you from run 1");
  await confirm.getByRole("button", { name: "Start run 2 from Measure" }).click();

  await expect(page).toHaveURL(LAB);
  await expect(page.getByText("Step 5 of 10 · Measure")).toBeVisible();
  await expect(page.getByRole("button", { name: "Start", exact: true })).toBeVisible();
  // Build was kept: the bench is set up, nothing to place.
  await expect(page.getByRole("region", { name: "Parts tray" })).toHaveCount(0);

  await page.goto(REVIEW);
  await expect(page.getByText("2 runs")).toBeVisible();
  await expect(page.getByRole("button", { name: "Run 2", pressed: true })).toBeVisible();
  const run2 = runsStrip(page)
    .locator("div")
    .filter({ hasText: /^Run 2/ })
    .last();
  await expect(run2.getByText("from run 1")).toHaveCount(4);
  await page.getByRole("button", { name: "Run 1", exact: true }).click();
  await expect(review(page).getByText('You said "one" on the first pass')).toBeVisible();
});

test("the review has no serious accessibility issues, locked and open", async ({ page }) => {
  const serious = async () => {
    const { violations } = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    return violations
      .filter((v) => v.impact === "serious" || v.impact === "critical")
      .map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(" ")).join(", ")})`);
  };
  await runWithCountFromOne(page);
  // axe waits on timers, so let the fake clock run again.
  await page.clock.resume();
  await page.goto(REVIEW);
  await expect(compare(page).getByText("Locked")).toBeVisible();
  expect(await serious()).toEqual([]);
  await page.getByRole("button", { name: "I have read my feedback" }).click();
  await expect(compare(page).getByRole("table")).toBeVisible();
  expect(await serious()).toEqual([]);
});

test("no sideways scrolling at phone width on the review", async ({ page }, info) => {
  test.skip(info.project.name !== "phone", "Phone layout");
  await runWithCountFromOne(page);
  await page.goto(REVIEW);
  await page.getByRole("button", { name: "I have read my feedback" }).click();
  await expect(compare(page).getByRole("table")).toBeVisible();
  const sideways = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(sideways).toBe(0);
});

test("Review in the step strip stays locked until Analyse is finished", async ({ page }) => {
  await page.goto(LAB);
  await expect(
    page.getByRole("button", { name: /^Review\. Review opens when you finish Analyse/ }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Review" })).toHaveCount(0);
});
