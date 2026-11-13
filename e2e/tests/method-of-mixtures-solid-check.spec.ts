import AxeBuilder from "@axe-core/playwright";
import { solidExample } from "@pa/experiments";
import { expect, test, type Page } from "@playwright/test";

import { WEB } from "../playwright.config";

const LAB = `${WEB}/lab/method-of-mixtures-solid`;
const CHECK = `${LAB}/check`;

const serious = async (page: Page) => {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  return violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(" ")).join(", ")})`);
};

/** The example's minute readings as a filled-in template, every reading after the start `up` °C higher. */
function readingsCsv(c: number | "", up = 0) {
  const rows = solidExample().map((r) =>
    [r.t, (r.t === 0 ? r.theta! : r.theta! + up).toFixed(1)].join(","),
  );
  return [
    "Mass of the solid / g,100",
    "Mass of the empty calorimeter / g,50",
    "Mass of the calorimeter with water / g,100",
    "Temperature of the boiling water / °C,100",
    `Specific heat capacity of the metal c / J kg⁻¹ K⁻¹,${c}`,
    "",
    "t / min,θ / °C",
    ...rows,
  ].join("\r\n");
}

async function bringIn(page: Page, text: string) {
  await page.locator('input[type="file"]').setInputFiles({
    name: "solid.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(text, "utf-8"),
  });
}

test("the hot solid lab links to its model check", async ({ page }) => {
  await page.goto(LAB);
  await page.getByRole("tab", { name: "Explanation" }).click();
  await page.getByRole("link", { name: "Check your own lab readings" }).click();
  await expect(page).toHaveURL(CHECK);
});

test("the example agrees with the model and gives c from the highest reading", async ({ page }) => {
  await page.goto(CHECK);
  await expect(page.getByText("Example data").first()).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Your readings agree with the model" }),
  ).toBeVisible();
  await expect(
    page.getByText(/^From your highest reading, 38\.\d °C: c = \d+ J kg⁻¹ K⁻¹/),
  ).toBeVisible();
});

test("copper's readings with copper's c agree; 0.5 °C higher, they are found above", async ({
  page,
}) => {
  await page.goto(CHECK);
  await bringIn(page, readingsCsv(390));
  await expect(
    page.getByText("Your readings sit on the model's curve, within their error."),
  ).toBeVisible();
  await bringIn(page, readingsCsv(390, 0.5));
  await expect(page.getByText(/Boiling water carried in on the solid adds heat/)).toBeVisible();
  await expect(
    page.getByText("Shake the solid before you move it, and lower it in gently."),
  ).toBeVisible();
});

test("the hot solid's model check has no serious accessibility issues", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(CHECK);
  await expect(page.getByText("Example data").first()).toBeVisible();
  expect(await serious(page)).toEqual([]);
  await bringIn(page, readingsCsv(390, 0.5));
  await expect(page.getByText(/Boiling water carried in/)).toBeVisible();
  expect(await serious(page)).toEqual([]);
});
