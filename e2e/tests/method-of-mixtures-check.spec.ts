import AxeBuilder from "@axe-core/playwright";
import { mixturesExample } from "@pa/experiments";
import { expect, test, type Page } from "@playwright/test";

import { WEB } from "../playwright.config";

const LAB = `${WEB}/lab/method-of-mixtures`;
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
 * The example readings as a filled-in template, the highest temperature `drop` °C lower than the
 * careful run's: heat lost before it was read.
 */
function readingsCsv(drop = 0, hot = ["50", "65"]) {
  const rows = mixturesExample().map((r) =>
    [r.V, r.theta1, (r.theta2! - drop).toFixed(1)].join(","),
  );
  return [
    `Hot water volume V₀ / cm³,${hot[0]}`,
    `Hot water temperature θₕ / °C,${hot[1]}`,
    "",
    "V / cm³,θ₁ / °C,θ₂ / °C",
    ...rows,
  ].join("\r\n");
}

async function bringIn(page: Page, text: string) {
  await page.locator('input[type="file"]').setInputFiles({
    name: "mixtures.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(text, "utf-8"),
  });
}

test("the method of mixtures lab links to its model check", async ({ page }) => {
  await page.goto(LAB);
  await page.getByRole("tab", { name: "Explanation" }).click();
  await page.getByRole("link", { name: "Check your own lab readings" }).click();
  await expect(page).toHaveURL(CHECK);
});

test("the example agrees with the model and gives W", async ({ page }) => {
  await page.goto(CHECK);
  await expect(page.getByText("Example data").first()).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Your readings agree with the model" }),
  ).toBeVisible();
  await expect(page.getByText(/so W = \d+\.\d cm³\./)).toBeVisible();
});

test("highest temperatures read 1 °C low lower the slope, with the precaution", async ({
  page,
}) => {
  await page.goto(CHECK);
  await bringIn(page, readingsCsv(1));
  await expect(page.getByRole("heading", { name: "Your slope is not the model's" })).toBeVisible();
  await expect(
    page.getByText(/heat was lost before the highest temperature was read/),
  ).toBeVisible();
  await expect(page.getByText(/keep the lid on, and stir until you have read/)).toBeVisible();
});

test("without the hot water's values it asks for them", async ({ page }) => {
  await page.goto(CHECK);
  await bringIn(page, readingsCsv(0, ["", ""]));
  await expect(
    page.getByRole("heading", {
      name: "Give the hot water's volume and temperature to check your readings against the model.",
    }),
  ).toBeVisible();
});

test("the method of mixtures' model check has no serious accessibility issues", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(CHECK);
  await expect(page.getByText("Example data").first()).toBeVisible();
  expect(await serious(page)).toEqual([]);
  await bringIn(page, readingsCsv(1));
  await expect(page.getByRole("heading", { name: "Your slope is not the model's" })).toBeVisible();
  expect(await serious(page)).toEqual([]);
});
