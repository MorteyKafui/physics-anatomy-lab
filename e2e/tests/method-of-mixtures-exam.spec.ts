import { readFile } from "node:fs/promises";

import { mixturesFollowUps } from "@pa/experiments";
import { expect, test, type Page } from "@playwright/test";

import { WEB } from "../playwright.config";
import { serious } from "./ohms-walk";

test.describe.configure({ timeout: 90_000 });

const MIXTURES = `${WEB}/lab/method-of-mixtures`;
const EXAM = `${MIXTURES}/exam`;
const clock = (page: Page) => page.getByRole("timer", { name: "Exam clock" });

/** From the start screen into the lab with the clock running. */
async function startExam(page: Page) {
  await page.goto(EXAM);
  await expect(page.getByRole("complementary", { name: "How the hour is split" })).toContainText(
    "60 min",
  );
  await page.getByRole("button", { name: "Start the clock" }).click();
  await expect(page).toHaveURL(MIXTURES);
  await expect(clock(page)).toBeVisible();
}

async function handIn(page: Page) {
  await page.getByRole("button", { name: "Hand in" }).click();
  await page
    .getByRole("dialog", { name: "Hand in now?" })
    .getByRole("button", { name: "Hand in" })
    .click();
}

test("the mixtures lab offers its exam, which starts with the question and runs the clock with the coach off", async ({
  page,
}) => {
  await page.goto(MIXTURES);
  await page.getByRole("tab", { name: "Explanation" }).click();
  await page.getByRole("link", { name: "Try it as an exam" }).click();
  await expect(page).toHaveURL(EXAM);
  await expect(
    page.getByRole("heading", {
      name: "Find the water equivalent of the calorimeter by the method of mixtures.",
    }),
  ).toBeVisible();
  // The question's volumes are the experiment's own.
  await expect(page.getByText(/V = 40 cm³ of cold water/)).toBeVisible();
  await expect(page.getByText(/Repeat for V = 50, 60, 70 cm³\./)).toBeVisible();

  await page.getByRole("button", { name: "Start the clock" }).click();
  await expect(page).toHaveURL(MIXTURES);
  await expect(clock(page)).toContainText("Reading the question");
  await expect(clock(page)).toContainText("Coach off");
  // The coach is off: no help level to choose.
  await expect(page.getByLabel("Help level")).toHaveCount(0);
});

test("a bench handed in early is marked against the mixtures rubric, with part (b) and its answers", async ({
  page,
}) => {
  await startExam(page);
  await page.getByRole("button", { name: "Continue to Predict" }).click();
  await page.getByRole("button", { name: "It gets smaller" }).click();
  await page.getByRole("button", { name: "Continue to Build" }).click();
  await handIn(page);

  await expect(page).toHaveURL(EXAM);
  const script = page.getByRole("region", { name: "Your marked script" });
  // Nothing mixed yet: no marks.
  await expect(script).toContainText(/Your mark\s*0\s*\/ 25/);
  await expect(script).toContainText("A mixture was left without the lid.");
  await expect(script).toContainText("No table of readings.");
  await expect(script).toContainText("No graph drawn.");

  // Part (b): the answer's numbers are the approved calorimeter's.
  const one = mixturesFollowUps()[0].params;
  const followUps = page.getByRole("complementary", { name: "Likely follow-up questions" });
  await expect(followUps).toContainText(`water equivalent is ${one.W} g`);
  await followUps.getByRole("button", { name: "Show the answer" }).first().click();
  await expect(followUps).toContainText(`= ${one.final} °C.`);

  const [file] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download your script (PDF)" }).click(),
  ]);
  expect(file.suggestedFilename()).toBe("method-of-mixtures-exam-script.pdf");
  const raw = (await readFile((await file.path())!)).toString("latin1");
  expect(raw.startsWith("%PDF-")).toBe(true);
  expect(raw).toContain("/ToUnicode");

  // The lab says the exam is over, and goes back to practice on asking.
  await page.goto(MIXTURES);
  await expect(page.getByText("This exam was handed in.")).toBeVisible();
  await page.getByRole("button", { name: "Back to practice" }).click();
  await expect(page.getByText("This exam was handed in.")).toBeHidden();
  await expect(clock(page)).toHaveCount(0);
});

test("the mixtures exam's start screen and marked script have no serious accessibility issues", async ({
  page,
}) => {
  await page.goto(EXAM);
  await expect(page.getByRole("button", { name: "Start the clock" })).toBeVisible();
  expect(await serious(page)).toEqual([]);

  await page.getByRole("button", { name: "Start the clock" }).click();
  await expect(clock(page)).toBeVisible();
  await handIn(page);
  await expect(page.getByRole("region", { name: "Your marked script" })).toContainText("/ 25");
  expect(await serious(page)).toEqual([]);
});
