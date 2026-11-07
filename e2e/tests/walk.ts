import { expect, test, type Page } from "@playwright/test";
import { WEB } from "../playwright.config";

/**
 * Walking the lab from Question onwards, shared by the specs that need a run in a given state.
 * Each step is taken the way a student takes it, with the fake clock so passes are exact.
 */

export const LAB = `${WEB}/lab/simple-pendulum`;

export const BUILD_ORDER = [
  ["Base plate", "Put the base plate on the bench"],
  ["Retort stand rod", "Put the retort stand rod into the base plate"],
  ["Boss and clamp", "Put the boss and clamp on the rod"],
  ["Split cork", "Put the split cork in the clamp jaw"],
  ["Thread", "Put the thread in the split cork"],
  ["Bob", "Put the bob on the end of the thread"],
  ["Stopwatch", "Put the stopwatch on the bench beside the stand"],
] as const;

/** Walk through Question and Predict (their activities are built next) to the parts tray. */
export async function toBuild(page: Page) {
  // A fake clock: the bench only moves when the test says, so "the same pass" is exact.
  await page.clock.install();
  await page.goto(LAB);
  for (const next of ["Predict", "Build"]) {
    await page.getByRole("button", { name: `Continue to ${next}` }).click();
  }
  await expect(page.getByRole("heading", { name: "Set up the pendulum" })).toBeVisible();
}

export const tray = (page: Page) => page.getByRole("region", { name: "Parts tray" });
export const trayPart = (page: Page, part: string) =>
  tray(page).getByRole("button", { name: new RegExp(`^${part}`) });

/** Pick a part from the tray and choose its slot, as a tap or a keyboard user would. */
export async function put(page: Page, part: string, slot: string) {
  await trayPart(page, part).click();
  await page.getByRole("button", { name: slot }).click();
}

/** Build the bench the right way round and walk on to Measure. */
export async function toMeasure(page: Page) {
  await toBuild(page);
  for (const [part, slot] of BUILD_ORDER) await put(page, part, slot);
  await page.getByRole("button", { name: "Finish building" }).click();
  await page.getByRole("button", { name: "Continue to Measure" }).click();
  await expect(page.getByRole("heading", { name: "Time 20 oscillations" })).toBeVisible();
}

/** Start the stopwatch and count the starting pass as "one" (the plan's off-track mistake). */
export async function timeCountingFromOne(page: Page) {
  // Stop time between Start and the first Count, so they fall on exactly the same pass.
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 3000));
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await page.getByRole("button", { name: "Count a pass" }).click();
  await page.clock.runFor(2000);
  await page.getByRole("button", { name: "Stop", exact: true }).click();
}

/** Time 20 oscillations that take `seconds` on the fake clock. */
export async function timeFor(page: Page, seconds: number) {
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await page.clock.runFor(seconds * 1000);
  await page.getByRole("button", { name: "Stop", exact: true }).click();
}

/** Measure twice at 0.800 m and twice at 0.850 m, then go on to Tabulate. */
export async function toTabulate(page: Page) {
  await toMeasure(page);
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 3000));
  await timeFor(page, 2);
  await timeFor(page, 2);
  await page.getByRole("button", { name: "Make the pendulum longer" }).click();
  await timeFor(page, 2.2);
  await timeFor(page, 2.2);
  await page.getByRole("button", { name: "Finish measuring" }).click();
  await expect(page.getByText("Step 6 of 10 · Tabulate")).toBeVisible();
}

export const results = (page: Page) => page.getByRole("region", { name: "Results table" });
export const cell = (page: Page, row: number, head: string) =>
  results(page).getByRole("textbox", { name: `Row ${row}, ${head}`, exact: true });

/** The help level is chosen on the desktop header; the phone keeps the default (Auto). */
export async function chooseHelp(page: Page, level: "Auto" | "Check my work" | "On my own") {
  test.skip(test.info().project.name === "phone", "The help level is set on desktop");
  await page.getByRole("combobox", { name: "Help level" }).selectOption({ label: level });
}

/** From Tabulate: the standard table filled with the readings, then on to Plot. */
export async function tabulateToPlot(page: Page) {
  await results(page).getByRole("button", { name: "Standard" }).click();
  await results(page).getByRole("button", { name: "Fill in my readings" }).click();
  await page.getByRole("button", { name: "Finish tabulating" }).click();
  await page.getByRole("button", { name: "Carry on as it is" }).click();
  await expect(page.getByText("Step 7 of 10 · Plot")).toBeVisible();
}

/** From Plot, through Analyse at Auto, so the slope and g are worked out from the readings. */
export async function plotToConclude(page: Page) {
  await page.getByRole("button", { name: "Finish plotting" }).click();
  const carryOn = page.getByRole("button", { name: "Carry on as it is" });
  if (await carryOn.isVisible()) await carryOn.click();
  await expect(page.getByText("Step 8 of 10 · Analyse")).toBeVisible();
  await page.getByRole("button", { name: "Finish analysing" }).click();
  await expect(page.getByText("Step 9 of 10 · Conclude")).toBeVisible();
}
