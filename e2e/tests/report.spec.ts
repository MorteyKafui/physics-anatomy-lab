import { readFile } from "node:fs/promises";
import { inflateRawSync } from "node:zlib";

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { LAB, plotToConclude, tabulateToPlot, timeFor, toMeasure } from "./walk";

// A whole run, Question to Report: longer than the default 30 s.
test.describe.configure({ timeout: 120_000 });

const REPORT = `${LAB}/report`;

/** Four good timings at two lengths, then on through Analyse at Auto. */
async function aRun(page: Page) {
  await toMeasure(page);
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 3000));
  for (const s of [35.9, 35.88]) await timeFor(page, s);
  await page.getByRole("button", { name: "Make the pendulum longer" }).click();
  for (const s of [36.99, 37.0]) await timeFor(page, s);
  await page.getByRole("button", { name: "Finish measuring" }).click();
  await tabulateToPlot(page);
  await plotToConclude(page);
  // Exports and axe wait on timers, so let the fake clock run again.
  await page.clock.resume();
}

const paper = (page: Page) => page.getByRole("region", { name: "Report preview" });
const sections = (page: Page) => page.getByRole("navigation", { name: "Sections" });

/** One file out of a ZIP (a .docx is one), read from its local header. */
function unzip(zip: Buffer, name: string): string {
  for (let i = 0; i < zip.length - 30; i++) {
    if (zip.readUInt32LE(i) !== 0x04034b50) continue;
    const method = zip.readUInt16LE(i + 8);
    const size = zip.readUInt32LE(i + 18);
    const nameLength = zip.readUInt16LE(i + 26);
    const extra = zip.readUInt16LE(i + 28);
    const found = zip.toString("utf8", i + 30, i + 30 + nameLength);
    const start = i + 30 + nameLength + extra;
    if (found === name) {
      const data = zip.subarray(start, start + size);
      return (method === 8 ? inflateRawSync(data) : data).toString("utf8");
    }
  }
  throw new Error(`${name} is not in the file`);
}

async function download(page: Page, kind: RegExp) {
  await page.getByRole("radio", { name: kind }).check();
  const [file] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: /^Download / }).click(),
  ]);
  return { name: file.suggestedFilename(), bytes: await readFile((await file.path())!) };
}

test("the report is written from the run, in the WASSCE format, and opens from step 10", async ({
  page,
}) => {
  await aRun(page);
  await page.getByRole("button", { name: "Continue to Report" }).click();
  await page.getByRole("link", { name: "Open your report" }).click();
  await expect(page).toHaveURL(REPORT);

  await expect(paper(page).getByText("Simple pendulum: finding g")).toBeVisible();
  await expect(paper(page).getByText(/^Fig\. 1 Set-up\. A: base plate/)).toBeVisible();
  await expect(paper(page).getByRole("table")).toContainText("0.850");
  await expect(
    paper(page).getByText(/^g = 4π² ⁄ slope = 39\.48 ⁄ [\d.]+ = [\d.]+ m s⁻²$/),
  ).toBeVisible();
  await expect(
    paper(page).getByText("I started counting at zero as the bob passed the mark."),
  ).toBeVisible();
  // Part (b) is the student's to write.
  await expect(sections(page).getByRole("button", { name: /^Part \(b\)\s*To do/ })).toBeVisible();

  await sections(page).getByRole("button", { name: "University", exact: true }).click();
  await expect(sections(page).getByRole("button", { name: /^Theory/ })).toBeVisible();
  await expect(paper(page).getByText(/^For small swings, the period T/)).toBeVisible();
  await expect(paper(page).getByText(/^I took 4 timings at 2 lengths/)).toBeVisible();
});

test("a section rewritten by the student is kept, and the attempt's text comes back on asking", async ({
  page,
}) => {
  await aRun(page);
  await page.goto(REPORT);
  await paper(page).getByRole("button", { name: "Edit Part (b)" }).click();
  await paper(page)
    .getByRole("textbox", { name: "Part (b), your words" })
    .fill("(i) The period does not depend on the mass of the bob.");
  await paper(page).getByRole("button", { name: "Done" }).click();
  await expect(sections(page).getByRole("button", { name: /^Part \(b\)/ })).not.toContainText(
    "To do",
  );

  await paper(page).getByRole("button", { name: "Edit Precautions" }).click();
  await paper(page)
    .getByRole("textbox", { name: "Precautions, your words" })
    .fill("I kept the swing small.");
  await paper(page).getByRole("button", { name: "Done" }).click();
  await expect(paper(page).getByText("2 more precautions needed before you submit.")).toBeVisible();
  await expect(sections(page).getByRole("button", { name: /^Precautions/ })).toContainText(
    "1 of 3",
  );

  await page.reload();
  await expect(
    paper(page).getByText("(i) The period does not depend on the mass of the bob."),
  ).toBeVisible();
  await paper(page).getByRole("button", { name: "Edit Precautions" }).click();
  await paper(page).getByRole("button", { name: "Use the text from your attempt" }).click();
  await expect(paper(page).getByText("I repeated each timing and used the mean.")).toBeVisible();
});

test("the report downloads as a PDF with real text, a Word file, figures and data", async ({
  page,
}) => {
  await aRun(page);
  await page.goto(REPORT);
  await expect(paper(page).getByText("Simple pendulum: finding g")).toBeVisible();

  const pdf = await download(page, /^Report PDF/);
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: /Report downloaded as PDF, \d+ pages?, graphs in colour/ }),
  ).toBeVisible();
  expect(pdf.name).toBe("simple-pendulum-report.pdf");
  const raw = pdf.bytes.toString("latin1");
  expect(raw.startsWith("%PDF-")).toBe(true);
  // Real text: the font is embedded, with a map from its glyphs back to the characters.
  expect(raw).toContain("/FontFile2");
  expect(raw).toContain("/ToUnicode");

  const docx = await download(page, /^Report for editing/);
  expect(docx.name).toBe("simple-pendulum-report.docx");
  const document = unzip(docx.bytes, "word/document.xml");
  expect(document).toContain(
    "To determine the acceleration due to gravity, g, using a simple pendulum.",
  );
  expect(document).toContain("<w:tblGrid>");
  expect(document).toContain('r:embed="');
  expect(unzip(docx.bytes, "[Content_Types].xml")).toContain("wordprocessingml.document.main+xml");

  await page.getByRole("button", { name: "Black and white", exact: true }).click();
  const figures = await download(page, /^Figures only/);
  expect(figures.name).toBe("simple-pendulum-figures.zip");
  const svg = unzip(figures.bytes, "fig-2-simple-pendulum-graph.svg");
  expect(svg).toContain("<svg");
  expect(svg).not.toContain("var(--");
  const figurePdf = figures.bytes.toString("latin1");
  expect(figurePdf).toContain("fig-1-simple-pendulum-bench.pdf");
  expect(figurePdf).toContain("fig-2-simple-pendulum-graph.pdf");

  const data = await download(page, /^Data only/);
  expect(data.name).toBe("simple-pendulum-data.zip");
  const csv = unzip(data.bytes, "table-1.csv");
  expect(csv).toContain("l/m,");
  expect(csv).toContain("0.850");
  expect(data.bytes.toString("latin1")).toContain("table-1.xlsx");
  const json = JSON.parse(unzip(data.bytes, "table-1.json"));
  expect(json.format).toBe("physics-anatomy/table");
  expect(json.columns[0]).toEqual({ symbol: "l", unit: "m" });
});

test("the report has no serious accessibility issues", async ({ page }) => {
  await aRun(page);
  await page.goto(REPORT);
  await expect(paper(page).getByText("Simple pendulum: finding g")).toBeVisible();
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(
    violations
      .filter((v) => v.impact === "serious" || v.impact === "critical")
      .map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(" ")).join(", ")})`),
  ).toEqual([]);
});

test("no sideways scrolling at phone width on the report", async ({ page }, info) => {
  test.skip(info.project.name !== "phone", "Phone layout");
  await aRun(page);
  await page.goto(REPORT);
  await expect(paper(page).getByText("Simple pendulum: finding g")).toBeVisible();
  const sideways = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(sideways).toBe(0);
});
