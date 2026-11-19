// The tutor in the pendulum lab (docs/content/ai-tutor-brief.md, design/mockups/AI.dc.html).
// The API is mocked in the browser: the status, and the stream from the bytes the API's own test
// checks it sends (packages/api-client/test/fixtures/ai-stream.txt). No key, no network.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, test, type Page, type Request } from "@playwright/test";
import { WEB } from "../playwright.config";

const LAB = `${WEB}/lab/simple-pendulum`;
const REPLY = readFileSync(
  fileURLToPath(new URL("../../packages/api-client/test/fixtures/ai-stream.txt", import.meta.url)),
  "utf-8",
);
const HELD =
  "That answer used a number that is not from your bench, so it has been hidden. Try asking again.";

const ON = {
  available: true,
  reason: null,
  message: null,
  features: ["tutor", "what-if", "report-review"],
};
const CLASS_OFF = {
  available: false,
  reason: "class-off",
  message: "Your teacher has not turned AI on for this class.",
  features: [],
};

async function mockAi(page: Page, status: object, body = REPLY): Promise<Request[]> {
  const asked: Request[] = [];
  await page.route("**/api/ai/status", (route) => route.fulfill({ json: status }));
  await page.route("**/api/ai/tutor", (route) => {
    asked.push(route.request());
    return route.fulfill({ status: 200, contentType: "text/event-stream", body });
  });
  return asked;
}

test("a student asks the tutor from the help menu and reads the reply", async ({ page }) => {
  const asked = await mockAi(page, ON);
  await page.goto(LAB);
  await page.getByRole("button", { name: "Help" }).filter({ visible: true }).click();
  await page.getByRole("button", { name: /Ask the tutor/ }).click();
  await expect(page.getByRole("heading", { name: "Ask about this step" })).toBeVisible();
  await expect(page.getByText("6 of 6 questions left on this step")).toBeVisible();

  await page.getByLabel("Your question").fill("Why do I count from zero?");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(
    page.getByText("Start counting at zero. Then T = t / 20 gives 1.806 s."),
  ).toBeVisible();
  await expect(page.getByText("5 of 6 questions left on this step")).toBeVisible();

  // What was sent: the step and the question, never a name; and the thread grows in turn.
  const sent = asked[0]?.postDataJSON() as Record<string, unknown>;
  expect(sent).toMatchObject({
    experiment_id: "simple-pendulum",
    step: "question",
    student_text: "Why do I count from zero?",
    thread: [],
  });
  await page.getByLabel("Your question").fill("And then?");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText("4 of 6 questions left on this step")).toBeVisible();
  const second = asked[1]?.postDataJSON() as { thread: unknown[] };
  expect(second.thread).toHaveLength(2);
});

test("a held reply is hidden, with a way to ask again", async ({ page }) => {
  const held = `event: text\ndata: {"text": "Your g is 9.81"}\n\nevent: refused\ndata: ${JSON.stringify({ message: HELD })}\n\n`;
  await mockAi(page, ON, held);
  await page.goto(LAB);
  await page.getByRole("tab", { name: "Ask" }).click();
  await page.getByLabel("Your question").fill("What is g?");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Answer hidden" })).toContainText(HELD);
  await expect(page.getByText("Your g is 9.81")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
});

test("with AI off for the class, the help menu says why and there is no Ask tab", async ({
  page,
}) => {
  await mockAi(page, CLASS_OFF);
  await page.goto(LAB);
  await page.getByRole("button", { name: "Help" }).filter({ visible: true }).click();
  await expect(page.getByText(CLASS_OFF.message)).toBeVisible();
  await expect(page.getByRole("tab", { name: "Ask" })).toHaveCount(0);
});

test("signed out or offline, the lab works and offers no tutor", async ({ page }) => {
  await page.route("**/api/ai/status", (route) => route.abort());
  await page.goto(LAB);
  await page.getByRole("button", { name: "Help" }).filter({ visible: true }).click();
  await expect(page.getByRole("button", { name: /Give me a hint/ })).toBeVisible();
  await expect(page.getByText("Ask the tutor")).toHaveCount(0);
  await expect(page.getByRole("tab", { name: "Ask" })).toHaveCount(0);
});

// Every lab has the tutor, sending its own experiment and the step the student is on.
for (const id of [
  "ohms-law",
  "converging-lens",
  "converging-lens-pins",
  "method-of-mixtures",
  "method-of-mixtures-solid",
]) {
  test(`the tutor answers in the ${id} lab`, async ({ page }) => {
    const asked = await mockAi(page, ON);
    await page.goto(`${WEB}/lab/${id}`);
    await page.getByRole("button", { name: "Help" }).filter({ visible: true }).click();
    await page.getByRole("button", { name: /Ask the tutor/ }).click();
    await page.getByLabel("Your question").fill("What do I do first?");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText("Start counting at zero.", { exact: false })).toBeVisible();
    expect(asked[0]?.postDataJSON()).toMatchObject({ experiment_id: id, step: "question" });
  });
}
