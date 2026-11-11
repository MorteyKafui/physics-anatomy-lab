import { readFile } from "node:fs/promises";

import { ohmsLawFollowUps } from "@pa/experiments";
import { expect, test, type Page } from "@playwright/test";

import { WEB } from "../playwright.config";
import { DIAGRAM, serious, wire } from "./ohms-walk";

test.describe.configure({ timeout: 90_000 });

const OHMS = `${WEB}/lab/ohms-law`;
const EXAM = `${OHMS}/exam`;
const clock = (page: Page) => page.getByRole("timer", { name: "Exam clock" });

/** From the start screen into the lab with the clock running. */
async function startExam(page: Page) {
  await page.goto(EXAM);
  await expect(page.getByRole("complementary", { name: "How the hour is split" })).toContainText(
    "60 min",
  );
  await page.getByRole("button", { name: "Start the clock" }).click();
  await expect(page).toHaveURL(OHMS);
  await expect(clock(page)).toBeVisible();
}

test("the Ohm's law lab offers its exam, which starts with the question and runs the clock with the coach off", async ({
  page,
}) => {
  await page.goto(OHMS);
  await page.getByRole("tab", { name: "Explanation" }).click();
  await page.getByRole("link", { name: "Try it as an exam" }).click();
  await expect(page).toHaveURL(EXAM);
  await expect(
    page.getByRole("heading", { name: "Find the emf and the internal resistance of the cells." }),
  ).toBeVisible();
  // The question's positions are the experiment's own.
  await expect(page.getByText("PJ = 40, 50, 60, 70, 80 cm")).toBeVisible();

  await page.getByRole("button", { name: "Start the clock" }).click();
  await expect(page).toHaveURL(OHMS);
  await expect(clock(page)).toContainText("Reading the question");
  await expect(clock(page)).toContainText("Coach off");
  // The coach is off: no help level to choose.
  await expect(page.getByLabel("Help level")).toHaveCount(0);
});

test("a circuit wired and handed in early is marked against the Ohm's law rubric, with part (b) and its answers", async ({
  page,
}) => {
  await startExam(page);
  await page.getByRole("button", { name: "Continue to Predict" }).click();
  await page.getByRole("button", { name: "It falls" }).click();
  await page.getByRole("button", { name: "Continue to Build" }).click();
  await wire(page, DIAGRAM);

  await page.getByRole("button", { name: "Hand in" }).click();
  await page
    .getByRole("dialog", { name: "Hand in now?" })
    .getByRole("button", { name: "Hand in" })
    .click();

  await expect(page).toHaveURL(EXAM);
  const script = page.getByRole("region", { name: "Your marked script" });
  // The diagram's two marks only: no readings, table, graph or answers yet.
  await expect(script).toContainText(/Your mark\s*2\s*\/ 25/);
  await expect(script).toContainText("Circuit connected as the diagram shows");
  await expect(script).toContainText("Voltmeter across the cells");
  await expect(script).toContainText("No table of readings.");
  await expect(script).toContainText("No graph drawn.");

  // Part (b): the answers' numbers are the circuit solver's.
  const lost = ohmsLawFollowUps()[0].params;
  const followUps = page.getByRole("complementary", { name: "Likely follow-up questions" });
  await expect(followUps).toContainText(
    `the ammeter reads ${lost.I} A and the voltmeter ${lost.V} V`,
  );
  await followUps.getByRole("button", { name: "Show the answer" }).first().click();
  await expect(followUps).toContainText(
    `Lost volts = E − V = ${lost.E} − ${lost.V} = ${lost.lost} V. r = lost volts ⁄ I = ${lost.lost} ⁄ ${lost.I} = ${lost.r} Ω.`,
  );

  const [file] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download your script (PDF)" }).click(),
  ]);
  expect(file.suggestedFilename()).toBe("ohms-law-exam-script.pdf");
  const raw = (await readFile((await file.path())!)).toString("latin1");
  expect(raw.startsWith("%PDF-")).toBe(true);
  expect(raw).toContain("/ToUnicode");

  // The lab says the exam is over, and goes back to practice on asking.
  await page.goto(OHMS);
  await expect(page.getByText("This exam was handed in.")).toBeVisible();
  await page.getByRole("button", { name: "Back to practice" }).click();
  await expect(page.getByText("This exam was handed in.")).toBeHidden();
  await expect(clock(page)).toHaveCount(0);
});

test("the Ohm's law exam's start screen and marked script have no serious accessibility issues", async ({
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
