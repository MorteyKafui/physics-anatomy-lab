import { readFile } from "node:fs/promises";

import { pinsFollowUps } from "@pa/experiments";
import { expect, test, type Page } from "@playwright/test";

import { WEB } from "../playwright.config";
import { serious } from "./ohms-walk";

test.describe.configure({ timeout: 90_000 });

const PINS = `${WEB}/lab/converging-lens-pins`;
const EXAM = `${PINS}/exam`;
const clock = (page: Page) => page.getByRole("timer", { name: "Exam clock" });

/** From the start screen into the lab with the clock running. */
async function startExam(page: Page) {
  await page.goto(EXAM);
  await expect(page.getByRole("complementary", { name: "How the hour is split" })).toContainText(
    "60 min",
  );
  await page.getByRole("button", { name: "Start the clock" }).click();
  await expect(page).toHaveURL(PINS);
  await expect(clock(page)).toBeVisible();
}

test("the two-pin lab offers its exam, which starts with the question and runs the clock with the coach off", async ({
  page,
}) => {
  await page.goto(PINS);
  await page.getByRole("tab", { name: "Explanation" }).click();
  await page.getByRole("link", { name: "Try it as an exam" }).click();
  await expect(page).toHaveURL(EXAM);
  await expect(
    page.getByRole("heading", {
      name: "Find the focal length of the converging lens by no parallax.",
    }),
  ).toBeVisible();
  // The question's object distances are the experiment's own.
  await expect(page.getByText(/x = 20\.0 cm from the lens/)).toBeVisible();
  await expect(page.getByText(/Repeat for x = 30\.0, 40\.0, 50\.0 cm\./)).toBeVisible();

  await page.getByRole("button", { name: "Start the clock" }).click();
  await expect(page).toHaveURL(PINS);
  await expect(clock(page)).toContainText("Reading the question");
  await expect(clock(page)).toContainText("Coach off");
  // The coach is off: no help level to choose.
  await expect(page.getByLabel("Help level")).toHaveCount(0);
});

test("a bench handed in early is marked against the two-pin rubric, with part (b) and its answers", async ({
  page,
}) => {
  await startExam(page);
  await page.getByRole("button", { name: "Continue to Predict" }).click();
  await page.getByRole("button", { name: "Closer to the lens" }).click();
  await page.getByRole("button", { name: "Continue to Build" }).click();

  await page.getByRole("button", { name: "Hand in" }).click();
  await page
    .getByRole("dialog", { name: "Hand in now?" })
    .getByRole("button", { name: "Hand in" })
    .click();

  await expect(page).toHaveURL(EXAM);
  const script = page.getByRole("region", { name: "Your marked script" });
  // The eye's mark only: the object pin's tip is still 4 mm high, and there is nothing else yet.
  await expect(script).toContainText(/Your mark\s*1\s*\/ 25/);
  await expect(script).toContainText("The pins' tips were not level with the lens's axis.");
  await expect(script).toContainText("The eye kept along the lens's axis");
  await expect(script).toContainText("No table of readings.");
  await expect(script).toContainText("No graph drawn.");

  // Part (b): the answer's numbers are the approved lens's.
  const g = pinsFollowUps()[0].params;
  const followUps = page.getByRole("complementary", { name: "Likely follow-up questions" });
  await expect(followUps).toContainText(`passes through xy = ${g.xy} cm²`);
  await followUps.getByRole("button", { name: "Show the answer" }).first().click();
  await expect(followUps).toContainText(`f = xy ⁄ (x + y) = ${g.xy} ⁄ ${g.sum} = ${g.f} cm.`);

  const [file] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download your script (PDF)" }).click(),
  ]);
  expect(file.suggestedFilename()).toBe("converging-lens-pins-exam-script.pdf");
  const raw = (await readFile((await file.path())!)).toString("latin1");
  expect(raw.startsWith("%PDF-")).toBe(true);
  expect(raw).toContain("/ToUnicode");

  // The lab says the exam is over, and goes back to practice on asking.
  await page.goto(PINS);
  await expect(page.getByText("This exam was handed in.")).toBeVisible();
  await page.getByRole("button", { name: "Back to practice" }).click();
  await expect(page.getByText("This exam was handed in.")).toBeHidden();
  await expect(clock(page)).toHaveCount(0);
});

test("the two-pin exam's start screen and marked script have no serious accessibility issues", async ({
  page,
}) => {
  await page.goto(EXAM);
  await expect(page.getByRole("button", { name: "Start the clock" })).toBeVisible();
  expect(await serious(page)).toEqual([]);

  await page.getByRole("button", { name: "Start the clock" }).click();
  await expect(clock(page)).toBeVisible();
  await page.getByRole("button", { name: "Hand in" }).click();
  await page
    .getByRole("dialog", { name: "Hand in now?" })
    .getByRole("button", { name: "Hand in" })
    .click();
  await expect(page.getByRole("region", { name: "Your marked script" })).toContainText("/ 25");
  expect(await serious(page)).toEqual([]);
});
