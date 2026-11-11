import { expect, test, type Page } from "@playwright/test";

import { WEB } from "../playwright.config";
import { serious } from "./ohms-walk";

/*
 * The converging lens lab, steps 1 to 5: the approved board "The converging lens: finding the
 * image". Setting up the bench (u = 20.0 cm, the gauze on the axis), the check, and finding the
 * sharp image by moving the screen, with the image from the lens model.
 */
const LENS = `${WEB}/lab/converging-lens`;
const chip = (page: Page) => page.getByText(/^(Sharp|Blurred|No image)$/).first();

async function slide(page: Page, name: "Lens position" | "Screen position", cm: number) {
  const s = page.getByRole("slider", { name });
  await s.fill(cm.toFixed(1));
  await s.blur();
  await expect(page.getByLabel(name)).toHaveAttribute("aria-valuetext", `${cm.toFixed(1)} cm`);
}

/** Through the question and the prediction to the bench. */
async function toBuild(page: Page) {
  await page.goto(LENS);
  await expect(page.getByText("Step 1 of 10 · Question")).toBeVisible();
  await page.getByRole("button", { name: "Continue to Predict" }).click();
  await page.getByRole("button", { name: "It moves closer to the lens" }).click();
  await expect(
    page.getByText("You said: It moves closer to the lens. Measure and see."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Continue to Build" }).click();
  await expect(page.getByText("Step 3 of 10 · Build")).toBeVisible();
}

/** Lower the gauze onto the lens's axis: it starts 6 mm above. */
async function centreGauze(page: Page) {
  await expect(page.getByText("6 mm above the axis")).toBeVisible();
  for (let i = 0; i < 6; i += 1)
    await page.getByRole("button", { name: "Lower the gauze" }).click();
  await expect(page.getByText("On the axis")).toBeVisible();
}

/** Move the screen out from the lens until the image looks sharp. */
async function findSharp(page: Page) {
  for (let cm = 84; cm <= 92; cm += 0.5) {
    await slide(page, "Screen position", cm);
    if ((await chip(page).textContent()) === "Sharp") return cm;
  }
  throw new Error("no sharp image found between 84 and 92 cm");
}

test("the student sets up the bench, the check passes, and the screen finds the sharp image", async ({
  page,
}) => {
  await toBuild(page);
  // The gauze starts off the axis: the coach says so on finishing.
  await page.getByRole("button", { name: "Finish building" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "The gauze and the lens are not on one axis" }),
  ).toBeVisible();
  await centreGauze(page);
  await page.getByRole("button", { name: "Finish building" }).click();
  await expect(page.getByText("Step 4 of 10 · Check")).toBeVisible();
  await expect(page.getByText(/The gauze, the lens and the screen are on one axis/)).toBeVisible();
  await page.getByRole("button", { name: "Continue to Measure" }).click();
  await expect(page.getByText("Step 5 of 10 · Measure")).toBeVisible();

  // Short of the image the screen shows it blurred; at the right place, sharp.
  await expect(chip(page)).toHaveText("Blurred");
  const at = await findSharp(page);
  // The sharpest image is short of the thin-lens 60.0 cm, by the lens's aberration (brief decision 7).
  expect(at - 30).toBeLessThan(60);
  await expect(page.getByRole("img", { name: /The gauze, upside down and sharp/ })).toBeVisible();
  await page.getByRole("button", { name: "Take this reading" }).click();
  await expect(page.locator("aside ol li")).toHaveCount(1);
  await expect(page.locator("aside ol li").first()).toContainText("u = 20.0 cm");
  await page.getByRole("button", { name: "Finish measuring" }).click();
  await expect(page.getByText("Step 6 of 10 · Tabulate")).toBeVisible();
  await expect(page.getByText(/come with the next part of this lab/)).toBeVisible();
});

test("with the object inside the focal length there is no image, and the coach says why", async ({
  page,
}) => {
  await toBuild(page);
  await centreGauze(page);
  await page.getByRole("button", { name: "Finish building" }).click();
  await page.getByRole("button", { name: "Continue to Measure" }).click();
  await slide(page, "Lens position", 22);
  await slide(page, "Screen position", 75);
  await expect(chip(page)).toHaveText("No image");
  await expect(
    page.getByRole("img", { name: "A faint, even patch of light: no image" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Take this reading" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "There is no image on the screen to read." }),
  ).toBeVisible();
  // At Auto the coach shows what it finds as the student works.
  await expect(
    page.getByRole("status").filter({ hasText: "No image on the screen" }),
  ).toBeVisible();
});

test("holders cannot pass each other on the bench", async ({ page }) => {
  await toBuild(page);
  await slide(page, "Lens position", 10.5).catch(() => undefined);
  await expect(
    page.getByRole("alert").filter({ hasText: "The holders cannot pass each other on the bench." }),
  ).toBeVisible();
});

test("the lens bench has no serious accessibility issues, building and measuring", async ({
  page,
}) => {
  await toBuild(page);
  expect(await serious(page)).toEqual([]);
  await centreGauze(page);
  await page.getByRole("button", { name: "Finish building" }).click();
  await page.getByRole("button", { name: "Continue to Measure" }).click();
  expect(await serious(page)).toEqual([]);
});

test("no sideways scrolling at phone width in the lens lab", async ({ page }, info) => {
  test.skip(info.project.name !== "phone", "Phone layout");
  await page.goto(LENS);
  await expect(page.getByText("Step 1 of 10 · Question")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    ),
  ).toBe(0);
});
