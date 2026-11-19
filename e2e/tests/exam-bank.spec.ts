// Approved questions from the bank in exam mode (ai-questions-brief.md, decision 5): shown after
// the built-in follow-ups, and kept on the device for an exam with no connection.
import { expect, test, type Page } from "@playwright/test";

import { LAB } from "./walk";

test.describe.configure({ timeout: 90_000 });
// The mocks are page routes, which a service worker's own requests would go round.
test.use({ serviceWorkers: "block" });

const EXAM = `${LAB}/exam`;
const BANK = [
  {
    id: "b-1",
    question: "Why do you start the stopwatch as the bob passes the centre of its swing?",
    answer: "It moves fastest at the centre, so the moment it passes the mark is sharp.",
    marks: 2,
  },
];

async function handIn(page: Page) {
  await page.goto(EXAM);
  await page.getByRole("button", { name: "Start the clock" }).click();
  await expect(page).toHaveURL(LAB);
  await page.getByRole("button", { name: "Hand in" }).click();
  await page
    .getByRole("dialog", { name: "Hand in now?" })
    .getByRole("button", { name: "Hand in" })
    .click();
  await expect(page).toHaveURL(EXAM);
}

test("approved questions follow the built-in ones, and stay on the device offline", async ({
  page,
}) => {
  await page.route("**/api/questions/approved?experiment_id=simple-pendulum", (route) =>
    route.fulfill({ json: BANK }),
  );
  await handIn(page);
  const followUps = page.getByRole("complementary", { name: "Likely follow-up questions" });
  await expect(followUps).toContainText("Why must the angle of swing be kept small?");
  await expect(followUps).toContainText(BANK[0]!.question);
  await expect(followUps).toContainText("From the question bank, reviewed");
  await followUps.getByRole("button", { name: "Show the answer" }).nth(3).click();
  await expect(followUps).toContainText(`${BANK[0]!.answer} (2 marks)`);

  // Offline: the bank cannot be reached, and the kept copy is shown.
  await page.unroute("**/api/questions/approved?experiment_id=simple-pendulum");
  await page.route("**/api/questions/approved**", (route) => route.abort());
  await page.reload();
  await expect(followUps).toContainText(BANK[0]!.question);
});

test("with an empty bank only the built-in questions show", async ({ page }) => {
  await page.route("**/api/questions/approved**", (route) => route.fulfill({ json: [] }));
  await handIn(page);
  const followUps = page.getByRole("complementary", { name: "Likely follow-up questions" });
  await expect(followUps.getByRole("button", { name: "Show the answer" })).toHaveCount(3);
  await expect(followUps).not.toContainText("From the question bank");
});
