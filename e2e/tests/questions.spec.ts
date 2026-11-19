// The teacher's Questions page (design/mockups/Questions.dc.html; ai-questions-brief.md).
// The API is mocked in the browser.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type Request } from "@playwright/test";
import { WEB } from "../playwright.config";

test.use({ serviceWorkers: "block" });

const DRAFTS = [
  {
    question: "Why do you start the stopwatch as the bob passes the centre?",
    answer: "It moves fastest there, so the moment is sharp.",
    marks: 2,
  },
  {
    question: "Why do you keep the amplitude below 10°?",
    answer: "The period depends on the amplitude for large swings.",
    marks: 2,
  },
  {
    question: "Name one precaution when measuring the length.",
    answer: "Measure to the centre of the bob, eye level with the mark.",
    marks: 1,
  },
];
const ON = {
  available: true,
  reason: null,
  message: null,
  features: ["tutor", "question-drafting"],
};

async function mock(page: Page, status: object) {
  const posted: Request[] = [];
  await page.route("**/api/consents", (route) => route.abort());
  await page.route("**/api/ai/status", (route) => route.fulfill({ json: status }));
  await page.route("**/api/questions/mine", (route) => route.fulfill({ json: [] }));
  await page.route("**/api/ai/question-drafting", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body: `event: item\ndata: ${JSON.stringify({ item: { questions: DRAFTS } })}\n\nevent: done\ndata: {"cut_short": false}\n\n`,
    }),
  );
  await page.route("**/api/questions", (route) => {
    posted.push(route.request());
    const body = route.request().postDataJSON() as { questions: typeof DRAFTS };
    return route.fulfill({
      status: 201,
      json: body.questions.map((q, i) => ({
        ...q,
        id: `q-${String(i)}`,
        experiment_id: "simple-pendulum",
        topic: "precautions",
        state: "submitted",
        reason: null,
        submitted_at: "2026-11-19T10:00:00Z",
        reviewed_at: null,
      })),
    });
  });
  return posted;
}

test("a teacher drafts, edits and sends two questions for review", async ({ page }) => {
  const posted = await mock(page, ON);
  await page.goto(`${WEB}/teach/questions`);
  await page.getByRole("button", { name: "Draft three questions" }).click();
  await expect(page.getByLabel("Keep question 3")).toBeVisible();

  await page.getByLabel("Keep question 3").uncheck();
  await page
    .getByRole("textbox", { name: /^Question/ })
    .first()
    .fill("Why do you start timing as the bob passes the centre?");
  await page.getByRole("button", { name: "Send 2 for review" }).click();
  await expect(page.getByText("Sent for review.", { exact: true })).toBeVisible();

  const body = posted[0]?.postDataJSON() as { questions: { question: string }[]; topic: string };
  expect(body.topic).toBe("precautions");
  expect(body.questions.map((q) => q.question)).toEqual([
    "Why do you start timing as the bob passes the centre?",
    DRAFTS[1]!.question,
  ]);
  const list = page.getByRole("listitem").filter({ hasText: "Why do you start timing" });
  await expect(list).toContainText("Waiting");

  const serious = (await new AxeBuilder({ page }).analyze()).violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  expect(serious).toEqual([]);
});

test("without AI the teacher is told why and cannot draft", async ({ page }) => {
  await mock(page, {
    available: false,
    reason: "switched-off",
    message: "AI help is switched off at the moment. The coach still works.",
    features: [],
  });
  await page.goto(`${WEB}/teach/questions`);
  await expect(page.getByRole("button", { name: "Draft three questions" })).toBeDisabled();
  await expect(
    page.getByText("Drafting needs AI. AI help is switched off", { exact: false }),
  ).toBeVisible();
});
