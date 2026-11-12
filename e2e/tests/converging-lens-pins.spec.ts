import { expect, test, type Page } from "@playwright/test";

import { WEB } from "../playwright.config";
import { serious } from "./ohms-walk";

/*
 * The converging lens with two pins, steps 1 to 5: the approved board "The converging lens: two
 * pins and no parallax". Setting the pins' tips level, the check, and finding the place of no
 * parallax with the search pin, with every view from the lens model.
 */
const PINS = `${WEB}/lab/converging-lens-pins`;
const chip = (page: Page) => page.getByText(/^(No parallax|Parallax|No image)$/).first();

async function slide(page: Page, name: "Lens position" | "Search pin position", cm: number) {
  const digits = 1;
  const s = page.getByRole("slider", { name });
  await s.fill(cm.toFixed(digits));
  await s.blur();
  await expect(page.getByLabel(name)).toHaveAttribute("aria-valuetext", `${cm.toFixed(digits)} cm`);
}

/** Through the question and the prediction to the bench. */
async function toBuild(page: Page) {
  await page.goto(PINS);
  await expect(page.getByText("Step 1 of 10 · Question")).toBeVisible();
  await page.getByRole("button", { name: "Continue to Predict" }).click();
  await page.getByRole("button", { name: "Closer to the lens" }).click();
  await expect(page.getByText("You said: Closer to the lens. Measure and see.")).toBeVisible();
  await page.getByRole("button", { name: "Continue to Build" }).click();
  await expect(page.getByText("Step 3 of 10 · Build")).toBeVisible();
}

/** Lower the object pin's tip onto the lens's axis: it starts 4 mm above. */
async function levelTips(page: Page) {
  await expect(page.getByText("4 mm above the axis")).toBeVisible();
  // Each press is waited for, as a student sees the pin move before pressing again.
  for (let mm = 3; mm >= 0; mm -= 1) {
    await page.getByRole("button", { name: "Lower the object pin" }).click();
    await expect(
      page.getByText(mm ? `${mm} mm above the axis` : "On the axis").first(),
    ).toBeVisible();
  }
}

/**
 * Find the place of no parallax as a student does: look from the right. If the image's tip is to
 * the left, it moves against the head, so it is nearer the eye and the pin goes away from the
 * lens; to the right, the pin goes towards it. Halve the step each time.
 */
async function findNoParallax(page: Page, lensCm: number, from: number, to: number) {
  const right = page.getByRole("img", { name: /^Right: / });
  let lo = from;
  let hi = to;
  for (let i = 0; i < 12; i += 1) {
    const at = Math.round(((lo + hi) / 2) * 10) / 10;
    await slide(page, "Search pin position", lensCm + at);
    if ((await chip(page).textContent()) === "No parallax") return at;
    const label = (await right.getAttribute("aria-label")) ?? "";
    if (/to the left/.test(label)) lo = at;
    else hi = at;
  }
  throw new Error(`no place of no parallax found between ${from} and ${to} cm`);
}

test("the student levels the tips, the check passes, and the search pin finds no parallax", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await toBuild(page);
  // The object pin's tip starts off the axis: the coach says so on finishing.
  await page.getByRole("button", { name: "Finish building" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "The tips are not level" }).first(),
  ).toBeVisible();
  await levelTips(page);
  await page.getByRole("button", { name: "Finish building" }).click();
  await expect(page.getByText("Step 4 of 10 · Check")).toBeVisible();
  await expect(page.getByText(/Both tips are level with the lens's centre/)).toBeVisible();
  await page.getByRole("button", { name: "Continue to Measure" }).click();
  await expect(page.getByText("Step 5 of 10 · Measure")).toBeVisible();

  // Far from the image there is parallax; at the right place, none.
  await expect(chip(page)).toHaveText("Parallax");
  const y = await findNoParallax(page, 30, 50, 66);
  // Short of the paraxial image, by the lens's aberration (brief, decisions 9 and 10).
  expect(y).toBeLessThan(62);
  expect(y).toBeGreaterThan(56);
  await expect(
    page.getByRole("img", { name: /^Centre: the image's tip and the search pin's tip together/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Take this reading" }).click();
  await expect(page.locator("aside ol li")).toHaveCount(1);
  await expect(page.locator("aside ol li").first()).toContainText("x = 20.0 cm");
  await page.getByRole("button", { name: "Finish measuring" }).click();
  await expect(page.getByText("Step 6 of 10 · Tabulate")).toBeVisible();
  await expect(page.getByText(/come with the next part of this lab/)).toBeVisible();
});

test("a reading with parallax left is caught by the coach", async ({ page }) => {
  await toBuild(page);
  await levelTips(page);
  await page.getByRole("button", { name: "Finish building" }).click();
  await page.getByRole("button", { name: "Continue to Measure" }).click();
  await slide(page, "Search pin position", 30 + 52);
  await expect(chip(page)).toHaveText("Parallax");
  await page.getByRole("button", { name: "Take this reading" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "There was still parallax" }).first(),
  ).toBeVisible();
});

test("with the object pin inside the focal length there is no image to find", async ({ page }) => {
  await toBuild(page);
  await levelTips(page);
  await page.getByRole("button", { name: "Finish building" }).click();
  await page.getByRole("button", { name: "Continue to Measure" }).click();
  await slide(page, "Lens position", 22);
  await expect(chip(page)).toHaveText("No image");
  await page.getByRole("button", { name: "Take this reading" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "There is no real image behind the lens to find." }),
  ).toBeVisible();
});

test("the two-pin bench has no serious accessibility issues, building and measuring", async ({
  page,
}) => {
  await toBuild(page);
  expect(await serious(page)).toEqual([]);
  await levelTips(page);
  await page.getByRole("button", { name: "Finish building" }).click();
  await page.getByRole("button", { name: "Continue to Measure" }).click();
  expect(await serious(page)).toEqual([]);
});

test("no sideways scrolling at phone width in the two-pin lab", async ({ page }, info) => {
  test.skip(info.project.name !== "phone", "Phone layout");
  await page.goto(PINS);
  await expect(page.getByText("Step 1 of 10 · Question")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    ),
  ).toBe(0);
});
