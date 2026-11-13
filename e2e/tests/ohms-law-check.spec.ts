import AxeBuilder from "@axe-core/playwright";
import { ohmsLaw, ohmsLawExample } from "@pa/experiments";
import { expect, test, type Page } from "@playwright/test";

import { WEB } from "../playwright.config";

const LAB = `${WEB}/lab/ohms-law`;
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
 * The example bench's readings as a filled-in template, with the cells' marked e.m.f., and every
 * voltmeter reading moved by `dv` volts: a line moved sideways, as cells run down would move it.
 */
function readingsCsv(dv = 0) {
  const v = (x: number) => (x + dv).toFixed(2);
  const rows = ohmsLawExample().map((r) =>
    [r.PJ ?? "", r.I1!.toFixed(2), r.I2!.toFixed(2), v(r.V1!), v(r.V2!)].join(","),
  );
  return [
    `Marked e.m.f. of the cells E / V,${ohmsLaw.cell.emf.toFixed(1)}`,
    "",
    "PJ / cm,I₁ / A,I₂ / A,V₁ / V,V₂ / V",
    ...rows,
  ].join("\r\n");
}

async function bringIn(page: Page, text: string) {
  await page.locator('input[type="file"]').setInputFiles({
    name: "ohms-law.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(text, "utf-8"),
  });
}

test("the Ohm's law lab links to its model check", async ({ page }) => {
  await page.goto(LAB);
  await page.getByRole("tab", { name: "Explanation" }).click();
  await page.getByRole("link", { name: "Check your own lab readings" }).click();
  await expect(page).toHaveURL(CHECK);
});

test("the example lies on one line and gives the bench's E and r", async ({ page }) => {
  await page.goto(CHECK);
  await expect(page.getByText("Example data").first()).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Your readings lie on one straight line" }),
  ).toBeVisible();
  await expect(page.getByText(/^From your line: E = 3\.0\d V and r = 1\.\d\d Ω\./)).toBeVisible();
  await expect(
    page.getByText("Add the e.m.f. marked on your cells to compare E with it."),
  ).toBeVisible();
});

test("with the marking, the bench's own readings agree with it", async ({ page }) => {
  await page.goto(CHECK);
  await bringIn(page, readingsCsv());
  await expect(page.getByText("Example data")).toHaveCount(0);
  await expect(
    page.getByText(
      "Your line meets the V axis at the e.m.f. marked on the cells, within its error.",
    ),
  ).toBeVisible();
});

test("cells that give 0.3 V less than their marking are found, with the precaution", async ({
  page,
}) => {
  await page.goto(CHECK);
  await bringIn(page, readingsCsv(-0.3));
  await expect(
    page.getByRole("heading", { name: "Your readings are shifted from the model" }),
  ).toBeVisible();
  await expect(page.getByText(/below the 3\.0 V marked on the cells/)).toBeVisible();
  await expect(
    page.getByText("Check that both meters read zero before you connect them."),
  ).toBeVisible();
});

test("the marked e.m.f. can be typed in with the readings", async ({ page }) => {
  await page.goto(CHECK);
  await page.getByRole("button", { name: "Type them in instead" }).click();
  await page.getByLabel("Marked e.m.f. of the cells E / V").pressSequentially("3.0");
  const rows = ohmsLawExample();
  for (const [i, r] of rows.entries()) {
    await page.getByLabel(`I₁ / A, row ${i + 1}`).fill(r.I1!.toFixed(2));
    await page.getByLabel(`V₁ / V, row ${i + 1}`).fill(r.V1!.toFixed(2));
  }
  await expect(page.getByText(/E = 3\.0\d V, marked 3\.0 V/)).toBeVisible();
});

test("Ohm's law's model check has no serious accessibility issues", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(CHECK);
  await expect(page.getByText("Example data").first()).toBeVisible();
  expect(await serious(page)).toEqual([]);
  await bringIn(page, readingsCsv(-0.3));
  await expect(page.getByText(/below the 3\.0 V marked/)).toBeVisible();
  expect(await serious(page)).toEqual([]);
});
