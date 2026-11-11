import { readFile } from "node:fs/promises";

import { lensSheet } from "@pa/experiments";
import { expect, test, type Page } from "@playwright/test";

import { WEB } from "../playwright.config";
import { serious } from "./ohms-walk";

const LENS = `${WEB}/lab/converging-lens`;
const SHEETS = `${LENS}/sheets`;

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

test("the lens lab's explanation links to its print sheets", async ({ page }) => {
  await page.goto(LENS);
  await page.getByRole("tab", { name: "Explanation" }).click();
  await page.getByRole("link", { name: "Print sheets for this experiment" }).click();
  await expect(page).toHaveURL(SHEETS);
  await expect(page.getByRole("heading", { level: 1, name: "Print sheets" })).toBeVisible();
  await expect(page.getByText("PA-003")).toBeVisible();
  await expect(
    page.getByRole("navigation").getByRole("link", { name: "The converging lens" }),
  ).toHaveAttribute("href", "/lab/converging-lens");
});

test("the lens poster, explained drawing and explainer download as PDFs with real text", async ({
  page,
}) => {
  await page.goto(SHEETS);

  const poster = await download(page, "Poster");
  expect(poster.name).toBe("converging-lens-poster-a4.pdf");
  expect(poster.raw.startsWith("%PDF-")).toBe(true);
  expect(poster.raw).toContain("/FontFile2");
  expect(poster.raw).toContain("/ToUnicode");
  expect(pages(poster.raw)).toBe(1);

  const drawing = await download(page, "Explained drawing");
  expect(drawing.name).toBe("converging-lens-drawing-a4.pdf");
  expect(pages(drawing.raw)).toBe(1);

  await page.getByLabel("Paper").selectOption("letter");
  const explainer = await download(page, "Explainer");
  expect(explainer.name).toBe("converging-lens-explainer-letter.pdf");
  expect(pages(explainer.raw)).toBe(2);
});

test("the lens sheets' numbers are the exact lens model's", () => {
  // The sheet prints these; they come from packages/experiments, never typed in (rule 1).
  const sheet = lensSheet();
  expect((sheet.f * 100).toFixed(2)).toBe("14.83");
  expect((sheet.points[0]!.v * 100).toFixed(1)).toBe("57.2");
});

test("the lens print sheets page has no serious accessibility issues", async ({ page }) => {
  await page.goto(SHEETS);
  await expect(page.getByRole("button", { name: "Download Poster (PDF)" })).toBeEnabled({
    timeout: 20_000,
  });
  expect(await serious(page)).toEqual([]);
});

test("no sideways scrolling at phone width on the lens print sheets", async ({ page }, info) => {
  test.skip(info.project.name !== "phone", "Phone layout");
  await page.goto(SHEETS);
  await expect(page.getByRole("button", { name: "Download Poster (PDF)" })).toBeEnabled({
    timeout: 20_000,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    ),
  ).toBe(0);
});
