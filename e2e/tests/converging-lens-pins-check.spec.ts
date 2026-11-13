import AxeBuilder from "@axe-core/playwright";
import { pinsExample } from "@pa/experiments";
import { expect, test, type Page } from "@playwright/test";

import { WEB } from "../playwright.config";

const LAB = `${WEB}/lab/converging-lens-pins`;
const CHECK = `${LAB}/check`;

const serious = async (page: Page) => {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  return violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(" ")).join(", ")})`);
};

/** The example readings as a filled-in template with a marked f, every y moved by `dy` cm. */
function readingsCsv(f: number, dy = 0) {
  const rows = pinsExample().map((r) =>
    [r.x, (r.y1! + dy).toFixed(1), (r.y2! + dy).toFixed(1)].join(","),
  );
  return [
    `Marked focal length of the lens f / cm,${f}`,
    "",
    "x / cm,y₁ / cm,y₂ / cm",
    ...rows,
  ].join("\r\n");
}

async function bringIn(page: Page, text: string) {
  await page.locator('input[type="file"]').setInputFiles({
    name: "pins.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(text, "utf-8"),
  });
}

test("the two pins lab links to its model check", async ({ page }) => {
  await page.goto(LAB);
  await page.getByRole("tab", { name: "Explanation" }).click();
  await page.getByRole("link", { name: "Check your own lab readings" }).click();
  await expect(page).toHaveURL(CHECK);
});

test("the example passes through the origin and gives f from the slope", async ({ page }) => {
  await page.goto(CHECK);
  await expect(page.getByText("Example data").first()).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Your readings agree with the model" }),
  ).toBeVisible();
  await expect(page.getByText(/^From your line: f = 1[45]\.\d cm, the slope\./)).toBeVisible();
});

test("with the lens's own marking the readings agree; with another, the slope is found", async ({
  page,
}) => {
  await page.goto(CHECK);
  await bringIn(page, readingsCsv(15));
  await expect(
    page.getByText("Your slope, f, is the marked lens's, within its error."),
  ).toBeVisible();
  await bringIn(page, readingsCsv(18));
  await expect(page.getByText(/shorter than the 18\.0 cm marked on the lens/)).toBeVisible();
});

test("the two pins' model check has no serious accessibility issues", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(CHECK);
  await expect(page.getByText("Example data").first()).toBeVisible();
  expect(await serious(page)).toEqual([]);
  await bringIn(page, readingsCsv(18));
  await expect(page.getByText(/shorter than the 18\.0 cm marked/)).toBeVisible();
  expect(await serious(page)).toEqual([]);
});
