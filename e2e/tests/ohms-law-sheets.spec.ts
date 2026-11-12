import { readFile } from "node:fs/promises";

import AxeBuilder from "@axe-core/playwright";
import { ohmsLawSheet } from "@pa/experiments";
import { expect, test, type Page } from "@playwright/test";

import { WEB } from "../playwright.config";

const OHMS = `${WEB}/lab/ohms-law`;
const SHEETS = `${OHMS}/sheets`;

async function download(page: Page, name: string) {
  await page.getByRole("radio", { name: new RegExp(`^${name}`) }).check();
  const button = page.getByRole("button", { name: `Download ${name} (PDF)` });
  // The sheet is drawn on this device first; the button waits for it.
  await expect(button).toBeEnabled({ timeout: 20_000 });
  await expect(
    page.getByRole("region", { name: "Sheet preview" }).locator("object"),
  ).toHaveAttribute("title", `${name}, as it prints`);
  const [file] = await Promise.all([page.waitForEvent("download"), button.click()]);
  return {
    name: file.suggestedFilename(),
    raw: (await readFile((await file.path())!)).toString("latin1"),
  };
}

/** Pages in a PDF written without object streams: one /Type /Page object each. */
const pages = (raw: string) => (raw.match(/\/Type \/Page\b(?!s)/g) ?? []).length;

test("the Ohm's law lab's explanation links to its print sheets", async ({ page }) => {
  await page.goto(OHMS);
  await page.getByRole("tab", { name: "Explanation" }).click();
  await page.getByRole("link", { name: "Print sheets for this experiment" }).click();
  await expect(page).toHaveURL(SHEETS);
  await expect(page.getByRole("heading", { level: 1, name: "Print sheets" })).toBeVisible();
  await expect(page.getByText("PA-002")).toBeVisible();
  await expect(
    page.getByRole("navigation").getByRole("link", { name: "Ohm's law and the potentiometer" }),
  ).toHaveAttribute("href", "/lab/ohms-law");
});

test("the Ohm's law poster, explained drawing and explainer download as PDFs with real text", async ({
  page,
}) => {
  // Three PDFs are made on the device, about 20 to 30 s on the build machine; more under load.
  test.setTimeout(60_000);
  await page.goto(SHEETS);

  const poster = await download(page, "Poster");
  expect(poster.name).toBe("ohms-law-poster-a4.pdf");
  expect(poster.raw.startsWith("%PDF-")).toBe(true);
  expect(poster.raw).toContain("/FontFile2");
  expect(poster.raw).toContain("/ToUnicode");
  expect(pages(poster.raw)).toBe(1);

  const drawing = await download(page, "Explained drawing");
  expect(drawing.name).toBe("ohms-law-drawing-a4.pdf");
  expect(pages(drawing.raw)).toBe(1);

  await page.getByLabel("Paper").selectOption("letter");
  const explainer = await download(page, "Explainer");
  expect(explainer.name).toBe("ohms-law-explainer-letter.pdf");
  expect(pages(explainer.raw)).toBe(2);
  expect(explainer.raw).toMatch(/\/MediaBox \[ ?0 0 612 792 ?\]/);
});

test("the Ohm's law sheets' numbers are the circuit solver's", () => {
  // The sheet prints these; they come from packages/experiments, never typed in (rule 1).
  const sheet = ohmsLawSheet();
  expect(sheet.intercept.toFixed(2)).toBe("3.00");
  expect(sheet.r.toFixed(2)).toBe("1.50");
  expect(sheet.slope.toPrecision(3)).toBe("-0.667");
});

test("the Ohm's law print sheets page has no serious accessibility issues", async ({ page }) => {
  await page.goto(SHEETS);
  await expect(page.getByRole("button", { name: "Download Poster (PDF)" })).toBeEnabled({
    timeout: 20_000,
  });
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(
    violations
      .filter((v) => v.impact === "serious" || v.impact === "critical")
      .map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(" ")).join(", ")})`),
  ).toEqual([]);
});

test("no sideways scrolling at phone width on the Ohm's law print sheets", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "phone", "Phone layout");
  await page.goto(SHEETS);
  await expect(page.getByRole("button", { name: "Download Poster (PDF)" })).toBeEnabled({
    timeout: 20_000,
  });
  const sideways = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(sideways).toBe(0);
});
