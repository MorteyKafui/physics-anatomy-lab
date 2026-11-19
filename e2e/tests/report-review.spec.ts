// Report review (docs/content/ai-tutor-brief.md, decision 7; design/mockups/AI.dc.html).
// The API is mocked in the browser: the status, and one checked item, as the API sends it.
import { expect, test, type Page, type Request } from "@playwright/test";
import { LAB, plotToConclude, tabulateToPlot, timeFor, toMeasure } from "./walk";

test.describe.configure({ timeout: 90_000 });
// The mocks are page routes, which a service worker's own requests would go round.
test.use({ serviceWorkers: "block" });

const REPORT = `${LAB}/report`;
const ON = { available: true, reason: null, message: null, features: ["report-review"] };
const NOTE = {
  section: "precautions",
  quote: "I started counting at zero as the bob passed the mark.",
  comment: "Good. Say also how you kept your eye level with the mark.",
  rule: "precaution-specific",
  rule_text: "A precaution names the part and the action: not just 'I was careful'.",
};

async function toReport(page: Page) {
  await toMeasure(page);
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 3000));
  for (const s of [35.9, 35.88]) await timeFor(page, s);
  await page.getByRole("button", { name: "Make the pendulum longer" }).click();
  for (const s of [36.99, 37.0]) await timeFor(page, s);
  await page.getByRole("button", { name: "Finish measuring" }).click();
  await tabulateToPlot(page);
  await plotToConclude(page);
  await page.clock.resume();
  await page.goto(REPORT);
}

async function mock(page: Page, status: object): Promise<Request[]> {
  const asked: Request[] = [];
  await page.route("**/api/ai/status", (route) => route.fulfill({ json: status }));
  await page.route("**/api/ai/report-review", (route) => {
    asked.push(route.request());
    const body = `event: item\ndata: ${JSON.stringify({ item: { comments: [NOTE], dropped: 0 } })}\n\nevent: done\ndata: {"cut_short": false}\n\n`;
    return route.fulfill({ status: 200, contentType: "text/event-stream", body });
  });
  return asked;
}

test("a review comes back as notes beside the section, and the report is unchanged", async ({
  page,
}) => {
  const asked = await mock(page, ON);
  await toReport(page);
  const paper = page.getByRole("region", { name: "Report preview" });
  const before = await paper.getByText(NOTE.quote).count();
  await page.getByRole("button", { name: "Ask for a review" }).click();
  await expect(page.getByText("1 note on your report.")).toBeVisible();
  const note = paper.locator("[data-review-notes]");
  await expect(note).toContainText(`Note on “${NOTE.quote}”`);
  await expect(note).toContainText(NOTE.comment);
  await expect(note).toContainText(`Rule: ${NOTE.rule_text}`);

  // Only the sections that need judgement were sent, and nothing else about the student.
  const sent = asked[0]?.postDataJSON() as { sections: { id: string }[] };
  expect(
    sent.sections.map((s) => s.id).every((id) => ["precautions", "sources"].includes(id)),
  ).toBe(true);
  expect(Object.keys(sent).sort()).toEqual(
    ["experiment_id", "experiment_version", "format", "sections"].sort(),
  );
  // The report's own text is as it was: the note sits beside it.
  await expect(paper.getByText(NOTE.quote, { exact: true })).toHaveCount(before);
});

test("without AI there is no review button, and the report works as before", async ({ page }) => {
  await page.route("**/api/ai/status", (route) => route.abort());
  await page.goto(REPORT);
  await expect(page.getByRole("navigation", { name: "Sections" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Ask for a review" })).toHaveCount(0);
});
