import AxeBuilder from "@axe-core/playwright";
import { convergingLens, lensExample } from "@pa/experiments";
import { expect, test, type Page } from "@playwright/test";

import { WEB } from "../playwright.config";

const LAB = `${WEB}/lab/converging-lens`;
const CHECK = `${LAB}/check`;

const serious = async (page: Page) => {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  return violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(" ")).join(", ")})`);
};

/** The example readings as a filled-in template with the lens's marked f, every v moved by `dv` cm. */
function readingsCsv(dv = 0, f = convergingLens.lens.focalLength * 100) {
  const rows = lensExample().map((r) =>
    [r.u, (r.v1! + dv).toFixed(1), (r.v2! + dv).toFixed(1)].join(","),
  );
  return [
    `Marked focal length of the lens f / cm,${f}`,
    "",
    "u / cm,v₁ / cm,v₂ / cm",
    ...rows,
  ].join("\r\n");
}

async function bringIn(page: Page, text: string) {
  await page.locator('input[type="file"]').setInputFiles({
    name: "lens.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(text, "utf-8"),
  });
}

test("the converging lens lab links to its model check", async ({ page }) => {
  await page.goto(LAB);
  await page.getByRole("tab", { name: "Explanation" }).click();
  await page.getByRole("link", { name: "Check your own lab readings" }).click();
  await expect(page).toHaveURL(CHECK);
});

test("the example agrees with the model and gives f from both intercepts", async ({ page }) => {
  await page.goto(CHECK);
  await expect(page.getByText("Example data").first()).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Your readings agree with the model" }),
  ).toBeVisible();
  await expect(page.getByText(/f = 2 ⁄ \(m₁ \+ m₂\) = 1[45]\.\d cm/)).toBeVisible();
});

test("the screen read at its far edge flattens the line, with the precaution", async ({ page }) => {
  await page.goto(CHECK);
  await bringIn(page, readingsCsv(convergingLens.holderHalfWidth * 100));
  await expect(page.getByRole("heading", { name: "Your slope is not the model's" })).toBeVisible();
  await expect(
    page.getByText("Read each holder at its centre mark, square-on to the rule."),
  ).toBeVisible();
});

test("a marking far from the lens's own f is found", async ({ page }) => {
  await page.goto(CHECK);
  await bringIn(page, readingsCsv(0, 18));
  await expect(page.getByText(/shorter than the 18\.0 cm marked on the lens/)).toBeVisible();
});

test("the converging lens's model check has no serious accessibility issues", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(CHECK);
  await expect(page.getByText("Example data").first()).toBeVisible();
  expect(await serious(page)).toEqual([]);
  await bringIn(page, readingsCsv(convergingLens.holderHalfWidth * 100));
  await expect(page.getByRole("heading", { name: "Your slope is not the model's" })).toBeVisible();
  expect(await serious(page)).toEqual([]);
});
