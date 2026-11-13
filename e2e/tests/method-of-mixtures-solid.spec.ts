import { expect, test, type Page } from "@playwright/test";

import { WEB } from "../playwright.config";
import { serious } from "./ohms-walk";

/*
 * The method of mixtures with a hot solid, steps 1 to 5: the approved board "The method of
 * mixtures: a hot solid, read every minute". Weighing, the check, moving the solid across, and
 * reading every minute until the thermometer falls, with every temperature from the heat model.
 * Each attempt's metal comes from its seed, so the readings are checked for their shape, not a
 * number. The page's clock is driven by the test.
 */
const SOLID = `${WEB}/lab/method-of-mixtures-solid`;
const coach = (page: Page) => page.getByRole("complementary", { name: "Coach" });

async function toBuild(page: Page) {
  await page.clock.install();
  await page.goto(SOLID);
  await expect(page.getByText("Step 1 of 10 · Question")).toBeVisible();
  await page.getByRole("button", { name: "Continue to Predict" }).click();
  await page.getByRole("button", { name: "The solid's temperature falls more" }).click();
  await page.getByRole("button", { name: "Continue to Build" }).click();
  await expect(page.getByText("Step 3 of 10 · Build")).toBeVisible();
}

/** Weigh the solid and the calorimeter empty, fill it, weigh it again, and put the lid on. */
async function weighAll(page: Page) {
  await page.getByRole("button", { name: "Weigh the solid" }).click();
  await page.getByRole("button", { name: "Weigh the calorimeter empty" }).click();
  await page.getByRole("button", { name: "Fill it half full with water" }).click();
  await page.getByRole("button", { name: "Weigh it with the water" }).click();
  await page.getByRole("button", { name: "Put the lid on" }).click();
}

async function toMeasure(page: Page) {
  await toBuild(page);
  await weighAll(page);
  await page.getByRole("button", { name: "Finish building" }).click();
  await expect(page.getByText("Step 4 of 10 · Check")).toBeVisible();
  await expect(page.getByText(/with 50\.0 g of water in it, and the lid is on/)).toBeVisible();
  await page.getByRole("button", { name: "Continue to Measure" }).click();
  await expect(page.getByText("Step 5 of 10 · Measure")).toBeVisible();
}

/** Lift the solid out, choose how to move it, and put it in; wait until the lab shows it in. */
async function moveAcross(page: Page, { shake }: { shake: boolean }) {
  await page.getByRole("button", { name: "Stir", exact: true }).click();
  await page.getByRole("button", { name: "Lift it out of the boiling water" }).click();
  await expect(page.getByText("Moving the solid across")).toBeVisible();
  if (shake) await page.getByRole("button", { name: "Shake it" }).click();
  await page.getByRole("button", { name: "Lower it in" }).click();
  await page.getByRole("button", { name: "Put it in the calorimeter" }).click();
  await expect(page.getByRole("button", { name: "Read it now" })).toBeVisible();
}

test("the student weighs everything, moves the solid across, and reads every minute until it falls", async ({
  page,
}) => {
  await toMeasure(page);
  await moveAcross(page, { shake: true });
  for (let m = 1; m <= 3; m += 1) {
    await page.clock.fastForward("01:00");
    await page.getByRole("button", { name: "Read it now" }).click();
    await expect(page.locator("tbody tr")).toHaveCount(m + 1);
  }
  // The highest comes about 79 s in, between the first two readings, so the third has fallen.
  await expect(
    coach(page).getByRole("status").filter({ hasText: "It has started to fall" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Take this reading" }).click();
  await expect(page.locator("aside ol li").last()).toHaveText(
    /^Run 1: from 28\.0 °C to \d\d\.\d °C$/,
  );
  // Done carefully, with the lid on, stirred, shaken and lowered in: nothing to coach.
  await expect(
    coach(page)
      .getByRole("status")
      .filter({ hasText: /^(?!It has)/ }),
  ).toHaveCount(0);
});

test("the balance weighs only what is there, and the check waits for every weighing", async ({
  page,
}) => {
  await toBuild(page);
  await page.getByRole("button", { name: "Weigh it with the water" }).click();
  await expect(page.getByText("That is not on the balance as the bench stands.")).toBeVisible();
  await page.getByRole("button", { name: "Weigh the solid" }).click();
  await expect(page.getByText("100.0 g").first()).toBeVisible();
  await page.getByRole("button", { name: "Finish building" }).click();
  await expect(page.getByText(/Weigh the solid, the calorimeter empty/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue to Measure" })).toBeDisabled();
});

test("not shaken, boiling water goes in with the solid and the coach says what it does to c", async ({
  page,
}) => {
  await toMeasure(page);
  await moveAcross(page, { shake: false });
  const warning = coach(page)
    .getByRole("status")
    .filter({ hasText: "Boiling water went in with the solid" });
  await expect(warning).toBeVisible();
  await expect(warning).toContainText(/c will come out about \d+% too large/);
});

test("the hot-solid bench has no serious accessibility issues, weighing and measuring", async ({
  page,
}) => {
  // Buttons fade between colours as they are pressed; with reduced motion they change at once, so
  // axe measures the colours a student sees, not one caught halfway through a fade.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await toBuild(page);
  await weighAll(page);
  expect(await serious(page)).toEqual([]);
  await page.getByRole("button", { name: "Finish building" }).click();
  await page.getByRole("button", { name: "Continue to Measure" }).click();
  await moveAcross(page, { shake: true });
  await page.clock.fastForward("01:00");
  await page.getByRole("button", { name: "Read it now" }).click();
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

const C = { copper: 390, brass: 380, iron: 450, aluminium: 900 } as const;

test("at Auto the whole hot-solid lab runs: a run read every minute, θ against t, c, and the metal named", async ({
  page,
}, info) => {
  test.skip(info.project.name === "phone", "The help level is set on desktop");
  test.setTimeout(120_000);
  await toBuild(page);
  await page.getByLabel("Help level").selectOption("auto");
  await weighAll(page);
  await page.getByRole("button", { name: "Finish building" }).click();
  await page.getByRole("button", { name: "Continue to Measure" }).click();
  await moveAcross(page, { shake: true });
  for (let m = 1; m <= 3; m += 1) {
    await page.clock.fastForward("01:00");
    await page.getByRole("button", { name: "Read it now" }).click();
    await expect(page.locator("tbody tr")).toHaveCount(m + 1);
  }
  await page.getByRole("button", { name: "Take this reading" }).click();
  await finish(page, "Finish measuring", "Step 6 of 10 · Tabulate");
  await page.getByRole("button", { name: "Standard" }).click();
  await page.getByRole("button", { name: "Fill in my readings" }).click();
  await finish(page, "Finish tabulating", "Step 7 of 10 · Plot");
  await expect(page.getByText(/A graph of θ against t/)).toBeVisible();
  await finish(page, "Finish plotting", "Step 8 of 10 · Analyse");

  const read = async (id: string) =>
    Number((await page.locator(`[data-answer="${id}"]`).textContent())!.split(" ")[0]);
  const [T, c] = [await read("T"), await read("c")];
  expect(T).toBeGreaterThan(37);
  expect(T).toBeLessThan(49);
  await expect(page.locator('[data-answer="c"]')).toContainText("J kg⁻¹ K⁻¹");
  await finish(page, "Finish analysing", "Step 9 of 10 · Conclude");

  // The metal is named only now, and c is within 4% of its own (read every minute, to 0.1 °C).
  const conclusion = page.getByText(/^The specific heat capacity of the solid is/);
  await expect(conclusion).toBeVisible();
  const metal = (await conclusion.textContent())!.match(
    /The solid S is (copper|brass|iron|aluminium)/,
  )![1] as keyof typeof C;
  expect(Math.abs(c / C[metal] - 1)).toBeLessThan(0.04);
  await page.getByRole("button", { name: "Continue to Report" }).click();
  await expect(page.getByText("Step 10 of 10 · Report")).toBeVisible();

  // Step 10: the report, written from this run, naming the metal.
  await page.getByRole("link", { name: "Open your report" }).click();
  await expect(page).toHaveURL(/\/lab\/method-of-mixtures-solid\/report$/);
  const paper = page.getByRole("region", { name: "Report preview" });
  await expect(
    paper.getByText(
      "The method of mixtures: a hot solid: the specific heat capacity of a solid by the method of mixtures",
    ),
  ).toBeVisible();
  await expect(
    paper.getByText(/^Fig\. 1 The solid S in the water in the calorimeter C/),
  ).toBeVisible();
  await expect(
    paper.getByRole("img", { name: /a lagged copper calorimeter with the solid/ }),
  ).toBeVisible();
  await expect(paper.getByText(/^c_s = \(m_c c_c \+ m_w c_w\)/)).toBeVisible();
  await expect(
    paper.getByText(new RegExp(`^The solid is ${metal}, whose specific heat`)),
  ).toBeVisible();
  await expect(paper.getByText(/^I moved the solid into the calorimeter quickly/)).toBeVisible();
  await expect(paper.getByText(/^Read every minute, the highest reading can miss/)).toBeVisible();
});
