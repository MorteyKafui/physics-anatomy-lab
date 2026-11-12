import { readFile } from "node:fs/promises";

import { lensFollowUps } from "@pa/experiments";
import { expect, test, type Page } from "@playwright/test";

import { WEB } from "../playwright.config";
import { serious } from "./ohms-walk";

test.describe.configure({ timeout: 90_000 });

const LENS = `${WEB}/lab/converging-lens`;
const EXAM = `${LENS}/exam`;
const clock = (page: Page) => page.getByRole("timer", { name: "Exam clock" });

/** From the start screen into the lab with the clock running. */
async function startExam(page: Page) {
  await page.goto(EXAM);
  await expect(page.getByRole("complementary", { name: "How the hour is split" })).toContainText(
    "60 min",
  );
  await page.getByRole("button", { name: "Start the clock" }).click();
  await expect(page).toHaveURL(LENS);
  await expect(clock(page)).toBeVisible();
}

test("the lens lab offers its exam, which starts with the question and runs the clock with the coach off", async ({
  page,
}) => {
  await page.goto(LENS);
  await page.getByRole("tab", { name: "Explanation" }).click();
  await page.getByRole("link", { name: "Try it as an exam" }).click();
  await expect(page).toHaveURL(EXAM);
  await expect(
    page.getByRole("heading", { name: "Find the focal length of the converging lens." }),
  ).toBeVisible();
  // The question's object distances are the experiment's own.
  await expect(page.getByText("u = 20.0 cm from the lens")).toBeVisible();
  await expect(page.getByText("Repeat for u = 25.0, 30.0, 35.0, 40.0 cm.")).toBeVisible();

  await page.getByRole("button", { name: "Start the clock" }).click();
  await expect(page).toHaveURL(LENS);
  await expect(clock(page)).toContainText("Reading the question");
  await expect(clock(page)).toContainText("Coach off");
  // The coach is off: no help level to choose.
  await expect(page.getByLabel("Help level")).toHaveCount(0);
});

test("a bench set up and handed in early is marked against the lens rubric, with part (b) and its answers", async ({
  page,
}) => {
  await startExam(page);
  await page.getByRole("button", { name: "Continue to Predict" }).click();
  await page.getByRole("button", { name: "It moves closer to the lens" }).click();
  await page.getByRole("button", { name: "Continue to Build" }).click();

  await page.getByRole("button", { name: "Hand in" }).click();
  await page
    .getByRole("dialog", { name: "Hand in now?" })
    .getByRole("button", { name: "Hand in" })
    .click();

  await expect(page).toHaveURL(EXAM);
  const script = page.getByRole("region", { name: "Your marked script" });
  // The set-up's two marks only: no readings, table, graph or answers yet.
  await expect(script).toContainText(/Your mark\s*2\s*\/ 25/);
  await expect(script).toContainText("Gauze and lens set on one axis");
  await expect(script).toContainText("u and v read from the holders' centre marks");
  await expect(script).toContainText("No table of readings.");
  await expect(script).toContainText("No graph drawn.");

  // Part (b): the answers' numbers are the approved lens's.
  const one = lensFollowUps()[0].params;
  const followUps = page.getByRole("complementary", { name: "Likely follow-up questions" });
  await expect(followUps).toContainText(
    `a sharp image ${one.v} cm from the lens with the object ${one.u} cm from it`,
  );
  await followUps.getByRole("button", { name: "Show the answer" }).first().click();
  await expect(followUps).toContainText(
    `1/f = 1/u + 1/v = 1/${one.u} + 1/${one.v}, so f = ${one.f} cm.`,
  );

  const [file] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download your script (PDF)" }).click(),
  ]);
  expect(file.suggestedFilename()).toBe("converging-lens-exam-script.pdf");
  const raw = (await readFile((await file.path())!)).toString("latin1");
  expect(raw.startsWith("%PDF-")).toBe(true);
  expect(raw).toContain("/ToUnicode");

  // The lab says the exam is over, and goes back to practice on asking.
  await page.goto(LENS);
  await expect(page.getByText("This exam was handed in.")).toBeVisible();
  await page.getByRole("button", { name: "Back to practice" }).click();
  await expect(page.getByText("This exam was handed in.")).toBeHidden();
  await expect(clock(page)).toHaveCount(0);
});

test("the lens exam's start screen and marked script have no serious accessibility issues", async ({
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
