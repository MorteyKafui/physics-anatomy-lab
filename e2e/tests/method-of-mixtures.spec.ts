import { expect, test, type Page } from "@playwright/test";

import { WEB } from "../playwright.config";
import { serious } from "./ohms-walk";

/*
 * The method of mixtures, steps 1 to 5: the approved board "The method of mixtures: reading the
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
  await page.getByRole("button", { name: "Pour the hot water in" }).click();
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
  await page.getByRole("button", { name: "Pour the hot water in" }).click();
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
  await page.getByRole("button", { name: "Pour the hot water in" }).click();
  await page.clock.fastForward("00:30");
  await expect(page.getByText("Still rising", { exact: true })).toBeVisible();
  expect(await serious(page)).toEqual([]);
});
