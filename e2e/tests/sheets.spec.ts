import { readFile } from "node:fs/promises";

import AxeBuilder from "@axe-core/playwright";
import { pendulumSheet } from "@pa/experiments";
import { expect, test, type Page } from "@playwright/test";

import { LAB } from "./walk";

const SHEETS = `${LAB}/sheets`;

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

test("the lab's explanation links to the print sheets", async ({ page }) => {
  await page.goto(LAB);
  await page.getByRole("tab", { name: "Explanation" }).click();
  await page.getByRole("link", { name: "Print sheets for this experiment" }).click();
  await expect(page).toHaveURL(SHEETS);
  await expect(page.getByRole("heading", { level: 1, name: "Print sheets" })).toBeVisible();
});

test("the poster, the explained drawing and the explainer download as PDFs with real text", async ({
  page,
}) => {
  await page.goto(SHEETS);

  const poster = await download(page, "Poster");
  expect(poster.name).toBe("simple-pendulum-poster-a4.pdf");
  expect(poster.raw.startsWith("%PDF-")).toBe(true);
  expect(poster.raw).toContain("/FontFile2");
  expect(poster.raw).toContain("/ToUnicode");
  expect(pages(poster.raw)).toBe(1);
  await expect(
    page.getByRole("status").filter({ hasText: "Poster downloaded as PDF, 1 page." }),
  ).toBeVisible();

  const drawing = await download(page, "Explained drawing");
  expect(drawing.name).toBe("simple-pendulum-drawing-a4.pdf");
  expect(pages(drawing.raw)).toBe(1);

  await page.getByLabel("Paper").selectOption("letter");
  const explainer = await download(page, "Explainer");
  expect(explainer.name).toBe("simple-pendulum-explainer-letter.pdf");
  expect(pages(explainer.raw)).toBe(2);
  // US Letter is 612 × 792 points.
  expect(explainer.raw).toMatch(/\/MediaBox \[ ?0 0 612 792 ?\]/);
});

test("the sheets' numbers are the physics package's", async () => {
  // The sheet prints these; they come from packages/experiments, never typed in (rule 1).
  const sheet = pendulumSheet(9.81);
  expect(sheet.period.toPrecision(3)).toBe("1.80");
  expect(sheet.slope.toPrecision(3)).toBe("4.03");
  expect(Math.round(sheet.countFromOne)).toBe(11);
});

test("the print sheets page has no serious accessibility issues", async ({ page }) => {
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

test("no sideways scrolling at phone width on the print sheets", async ({ page }, info) => {
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
