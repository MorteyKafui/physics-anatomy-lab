import { expect, test, type Page } from "@playwright/test";

import { WEB } from "../playwright.config";
import { serious } from "./ohms-walk";

/*
 * The method of mixtures: the approved board "The method of mixtures: reading the
 * highest temperature". Measuring the water, the check, and watching the thermometer rise to its
 * highest after the pour, with every temperature from the heat model. The page's clock is driven
 * by the test, so a minute of the mixture takes no time.
 */
const MIXTURES = `${WEB}/lab/method-of-mixtures`;
const coach = (page: Page) => page.getByRole("complementary", { name: "Coach" });

/** Through the question and the prediction to the bench. */
async function toBuild(page: Page) {
  await page.clock.install();
  await page.goto(MIXTURES);
  await expect(page.getByText("Step 1 of 10 · Question")).toBeVisible();
  await page.getByRole("button", { name: "Continue to Predict" }).click();
  await page.getByRole("button", { name: "It gets smaller" }).click();
  await expect(page.getByText("You said: It gets smaller. Measure and see.")).toBeVisible();
  await page.getByRole("button", { name: "Continue to Build" }).click();
  await expect(page.getByText("Step 3 of 10 · Build")).toBeVisible();
}

/**
 * Pour, and wait until the lab shows the mixture poured: the pour's time is when its event is
 * saved, so the clock is moved on only after that.
 */
async function pour(page: Page) {
  await page.getByRole("button", { name: "Pour the hot water in" }).click();
  await expect(page.getByRole("button", { name: "Take this reading" })).toBeVisible();
}

/** Measure the water as the question sets it: 40 cm³ cold, 50 cm³ hot, eye level, lid on. */
async function fill(page: Page, eye: "Above" | "Level" = "Level") {
  await page.getByRole("button", { name: eye, exact: true }).first().click();
  await expect(page.getByText("40 cm³", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "Pour into the calorimeter" }).click();
  await page.getByRole("button", { name: "10 cm³ more" }).click();
  await page.getByRole("button", { name: "Pour into the beaker" }).click();
}

test("the student measures the water, the check passes, and the thermometer rises to its highest", async ({
  page,
}) => {
  await toBuild(page);
  await fill(page);
  await page.getByRole("button", { name: "Put the lid on" }).first().click();
  await page.getByRole("button", { name: "Finish building" }).click();
  await expect(page.getByText("Step 4 of 10 · Check")).toBeVisible();
  await expect(page.getByText(/The calorimeter holds 40 cm³ of cold water/)).toBeVisible();
  await page.getByRole("button", { name: "Continue to Measure" }).click();
  await expect(page.getByText("Step 5 of 10 · Measure")).toBeVisible();

  // Stir, heat and pour at once; then watch.
  await page.getByRole("button", { name: "Stir", exact: true }).click();
  await page.getByRole("button", { name: "Heat the beaker to 65 °C" }).click();
  await pour(page);
  await expect(page.getByText("Mixing hot and cold water")).toBeVisible();

  await page.clock.fastForward("00:30");
  await expect(page.getByText("Still rising", { exact: true })).toBeVisible();
  await expect(
    coach(page).getByRole("status").filter({ hasText: "It is still rising" }),
  ).toBeVisible();
  // 46.3 °C at 30 s, or 46.4 °C a tick later.
  await expect(page.getByText(/^46\.[34] °C$/).first()).toBeVisible();

  // The model's highest is 47.350 °C at 61 s after the pour: on the edge of rounding, so it shows
  // as 47.4 °C at the peak and 47.3 °C a fifth of a second either side.
  await page.clock.fastForward("00:31");
  await expect(page.getByText("Stopped rising", { exact: true })).toBeVisible();
  await expect(page.getByText(/^The rise T is 47\.([34]) − 28\.0 = 19\.\1 °C\.$/)).toBeVisible();
  await page.getByRole("button", { name: "Take this reading" }).click();
  await expect(
    page.getByText(/^V = 40 cm³: 28\.0 °C to 47\.([34]) °C, a rise of 19\.\1 °C$/),
  ).toBeVisible();
  // Read carefully at the highest, there is nothing to coach.
  await expect(coach(page).getByRole("status")).toHaveCount(0);
});

test("read from above, the cylinder is caught on finishing the build", async ({ page }) => {
  await toBuild(page);
  await fill(page, "Above");
  await page.getByRole("button", { name: "Put the lid on" }).first().click();
  await page.getByRole("button", { name: "Finish building" }).click();
  await expect(
    coach(page)
      .getByRole("status")
      .filter({ hasText: "The measuring cylinder was read at an angle" }),
  ).toBeVisible();
  await expect(page.getByText(/read the measuring cylinder 20° from level/)).toBeVisible();
});

test("not stirred, the hot water stays on top and the coach says what it costs", async ({
  page,
}) => {
  await toBuild(page);
  await fill(page);
  await page.getByRole("button", { name: "Put the lid on" }).first().click();
  await page.getByRole("button", { name: "Finish building" }).click();
  await page.getByRole("button", { name: "Continue to Measure" }).click();
  await page.getByRole("button", { name: "Heat the beaker to 65 °C" }).click();
  await pour(page);
  await page.clock.fastForward("01:01");
  await expect(page.getByText("Not stirred: the hot water stays on top")).toBeVisible();
  const warning = coach(page)
    .getByRole("status")
    .filter({ hasText: "The mixture is not being stirred" });
  await expect(warning).toBeVisible();
  await expect(warning).toContainText("34.9 °C after 61 s");
  await expect(warning).toContainText("for 8 minutes, and then 1.6 °C lower than stirred");
});

test("the mixtures bench has no serious accessibility issues, building and measuring", async ({
  page,
}) => {
  await toBuild(page);
  await fill(page);
  expect(await serious(page)).toEqual([]);
  await page.getByRole("button", { name: "Put the lid on" }).first().click();
  await page.getByRole("button", { name: "Finish building" }).click();
  await page.getByRole("button", { name: "Continue to Measure" }).click();
  await page.getByRole("button", { name: "Stir", exact: true }).click();
  await page.getByRole("button", { name: "Heat the beaker to 65 °C" }).click();
  await pour(page);
  await page.clock.fastForward("00:30");
  await expect(page.getByText("Still rising", { exact: true })).toBeVisible();
  expect(await serious(page)).toEqual([]);
});

/**
 * Finish a step. On some runs the coach flags something on the way out; the student reads it and
 * finishes again to carry on.
 */
async function finish(page: Page, button: string, next: string) {
  const step = page.getByText(next);
  await page.getByRole("button", { name: button }).click();
  await step
    .waitFor({ timeout: 3000 })
    .catch(() => page.getByRole("button", { name: button }).click());
  await expect(step).toBeVisible();
}

/** Set the measuring cylinder from what it reads to `to` cm³, in 10s. */
async function cylinderTo(page: Page, from: number, to: number) {
  for (let v = from; v !== to; v += to > from ? 10 : -10)
    await page.getByRole("button", { name: to > from ? "10 cm³ more" : "10 cm³ less" }).click();
}

/** Through Measure at Auto, with a careful reading at each volume, then the table filled in. */
async function measureAll(page: Page, volumes: number[]) {
  await toBuild(page);
  await page.getByLabel("Help level").selectOption("auto");
  await fill(page);
  await page.getByRole("button", { name: "Put the lid on" }).first().click();
  await page.getByRole("button", { name: "Finish building" }).click();
  await page.getByRole("button", { name: "Continue to Measure" }).click();
  await page.getByRole("button", { name: "Stir", exact: true }).click();
  // The cylinder reads 50 cm³ after the first hot water.
  for (const [i, v] of volumes.entries()) {
    if (i > 0) {
      await page.getByRole("button", { name: "Empty the calorimeter for the next volume" }).click();
      await cylinderTo(page, 50, v);
      await page.getByRole("button", { name: "Pour into the calorimeter" }).click();
      await cylinderTo(page, v, 50);
      await page.getByRole("button", { name: "Pour into the beaker" }).click();
    }
    await page.getByRole("button", { name: "Heat the beaker to 65 °C" }).click();
    await pour(page);
    await page.clock.fastForward("01:01");
    await expect(page.getByText("Stopped rising", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Take this reading" }).click();
    await expect(page.locator("aside ol li").last()).toContainText(`V = ${v} cm³`);
  }
  await finish(page, "Finish measuring", "Step 6 of 10 · Tabulate");
  await page.getByRole("button", { name: "Standard" }).click();
  await page.getByRole("button", { name: "Fill in my readings" }).click();
  await finish(page, "Finish tabulating", "Step 7 of 10 · Plot");
}

test("at Auto the whole mixtures lab runs: four mixtures, the table, V against 1/T, and W", async ({
  page,
}, info) => {
  test.skip(info.project.name === "phone", "The help level is set on desktop");
  test.setTimeout(180_000);
  await measureAll(page, [40, 50, 60, 70]);
  await finish(page, "Finish plotting", "Step 8 of 10 · Analyse");

  // Read to 0.1 °C at the highest, the line meets the V axis about 54 cm³ below zero, so W is 3 to
  // 6 cm³ (4.6 cm³ for the 50 g copper calorimeter). The exact numbers are checked against the
  // model in packages/experiments.
  const read = async (id: string) =>
    Number((await page.locator(`[data-answer="${id}"]`).textContent())!.split(" ")[0]);
  const [slope, intercept, W] = [await read("slope"), await read("intercept"), await read("W")];
  expect(slope).toBeGreaterThan(1750);
  expect(slope).toBeLessThan(1900);
  expect(intercept).toBeGreaterThan(-57);
  expect(intercept).toBeLessThan(-52);
  expect(W).toBeCloseTo(-intercept - 50, 1);
  await expect(page.locator('[data-answer="W"]')).toContainText("cm³");
  await finish(page, "Finish analysing", "Step 9 of 10 · Conclude");

  await expect(page.getByText(/The water equivalent of the calorimeter is/)).toBeVisible();
  await page.getByRole("button", { name: "Continue to Report" }).click();
  await expect(page.getByText("Step 10 of 10 · Report")).toBeVisible();
  await expect(page.getByText(/The report, the print sheets and the exam/)).toBeVisible();
});

test("plotting V against T is caught, and the analysis asks for V against 1/T", async ({
  page,
}, info) => {
  test.skip(info.project.name === "phone", "The help level is set on desktop");
  test.setTimeout(120_000);
  await measureAll(page, [40, 70]);
  await page
    .getByRole("region", { name: "Graph sheet" })
    .getByRole("group", { name: "Across (x)" })
    .getByLabel("Plot")
    .selectOption({ label: "T/°C" });
  await expect(
    page.getByRole("status").filter({ hasText: "Plot V against 1/T" }).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Finish plotting" }).click();
  await page.getByRole("button", { name: "Finish plotting" }).click();
  await expect(page.getByText("Step 8 of 10 · Analyse")).toBeVisible();
  await expect(page.getByText(/Your graph is V against T/)).toBeVisible();
});
