import { readFile } from "node:fs/promises";

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { BUILD_ORDER, LAB, put } from "./walk";

test.describe.configure({ timeout: 90_000 });

const EXAM = `${LAB}/exam`;

const serious = async (page: Page) => {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  return violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(" ")).join(", ")})`);
};

/** From the start screen into the lab with the clock running. */
async function startExam(page: Page) {
  await page.goto(EXAM);
  await expect(page.getByRole("complementary", { name: "How the hour is split" })).toContainText(
    "60 min",
  );
  await page.getByRole("button", { name: "Start the clock" }).click();
  await expect(page).toHaveURL(LAB);
  await expect(page.getByRole("timer", { name: "Exam clock" })).toBeVisible();
}

const clock = (page: Page) => page.getByRole("timer", { name: "Exam clock" });

test("the exam starts with the question and the guide's split of the hour, and runs the clock in the lab", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto(EXAM);
  await expect(page.getByRole("complementary", { name: "How the hour is split" })).toBeVisible();
  // Stop the clock before the exam starts, so the seconds a slow machine takes to open the lab
  // do not count: the only time that passes is the time fast-forwarded below.
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 1000);
  await startExam(page);
  await expect(clock(page)).toContainText(/Time left\s*60:00/);
  await expect(clock(page)).toContainText("Reading the question");
  await expect(clock(page)).toContainText("Coach off");
  // The coach is off: no help level to choose.
  await expect(page.getByLabel("Help level")).toHaveCount(0);
  // 18 min 48 s in, the guide expects performing, with 11 min 12 s of it left.
  await page.clock.fastForward((18 * 60 + 48) * 1000);
  await expect(clock(page)).toContainText(/Time left\s*41:12/);
  await expect(clock(page)).toContainText("Performing · 11:12 left in this part");
});

test("handing in early asks first, then marks the script and offers follow-up questions", async ({
  page,
}) => {
  await startExam(page);
  for (const next of ["Predict", "Build"])
    await page.getByRole("button", { name: `Continue to ${next}` }).click();
  for (const [part, slot] of BUILD_ORDER) await put(page, part, slot);

  await page.getByRole("button", { name: "Hand in" }).click();
  const confirm = page.getByRole("dialog", { name: "Hand in now?" });
  await confirm.getByRole("button", { name: "Keep working" }).click();
  await expect(confirm).toBeHidden();
  await page.getByRole("button", { name: "Hand in" }).click();
  await confirm.getByRole("button", { name: "Hand in" }).click();

  await expect(page).toHaveURL(EXAM);
  const script = page.getByRole("region", { name: "Your marked script" });
  await expect(script).toContainText(/Your mark\s*2\s*\/ 24/);
  await expect(script).toContainText("Set-up built, every part in its place");
  await expect(script).toContainText("No graph drawn.");
  await expect(script).toContainText("No table of readings.");

  const followUps = page.getByRole("complementary", { name: "Likely follow-up questions" });
  await followUps.getByRole("button", { name: "Show the answer" }).nth(1).click();
  await expect(followUps).toContainText("= 0.994 m.");

  const [file] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download your script (PDF)" }).click(),
  ]);
  expect(file.suggestedFilename()).toBe("simple-pendulum-exam-script.pdf");
  const raw = (await readFile((await file.path())!)).toString("latin1");
  expect(raw.startsWith("%PDF-")).toBe(true);
  expect(raw).toContain("/ToUnicode");

  // The lab says the exam is over, and goes back to practice on asking.
  await page.goto(LAB);
  await expect(page.getByText("This exam was handed in.")).toBeVisible();
  await page.getByRole("button", { name: "Back to practice" }).click();
  await expect(page.getByText("This exam was handed in.")).toBeHidden();
  await expect(page.getByRole("timer", { name: "Exam clock" })).toHaveCount(0);
});

test("at the end of the hour the clock hands the script in itself", async ({ page }) => {
  await page.clock.install();
  await startExam(page);
  // Jump the hour: each timer fires once, as a real hour would leave it.
  await page.clock.fastForward(61 * 60_000);
  await expect(page).toHaveURL(EXAM);
  await expect(page.getByRole("region", { name: "Your marked script" })).toContainText("/ 24");
  await page.goto(LAB);
  await expect(page.getByText("Time is up. Your script was handed in for you.")).toBeVisible();
});

test("the exam's start screen and marked script have no serious accessibility issues", async ({
  page,
}) => {
  await page.goto(EXAM);
  await expect(page.getByRole("button", { name: "Start the clock" })).toBeVisible();
  expect(await serious(page)).toEqual([]);
  await startExam(page);
  expect(await serious(page)).toEqual([]);
  await page.getByRole("button", { name: "Hand in" }).click();
  await page
    .getByRole("dialog", { name: "Hand in now?" })
    .getByRole("button", { name: "Hand in" })
    .click();
  await expect(page.getByRole("region", { name: "Your marked script" })).toBeVisible();
  expect(await serious(page)).toEqual([]);
});

test("no sideways scrolling at phone width in an exam", async ({ page }, info) => {
  test.skip(info.project.name !== "phone", "Phone layout");
  const sideways = () =>
    page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
  await page.goto(EXAM);
  await expect(page.getByRole("button", { name: "Start the clock" })).toBeVisible();
  expect(await sideways()).toBe(0);
  await startExam(page);
  expect(await sideways()).toBe(0);
});
