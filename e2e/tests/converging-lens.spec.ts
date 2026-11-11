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
  // Each press is waited for, as a student sees the gauze move before pressing again.
  for (let mm = 5; mm >= 0; mm -= 1) {
    await page.getByRole("button", { name: "Lower the gauze" }).click();
    await expect(page.getByText(mm ? `${mm} mm above the axis` : "On the axis")).toBeVisible();
  }
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
  await expect(page.getByRole("heading", { name: "Tabulate your readings" })).toBeVisible();
});

/**
 * Finish a step. The apparatus differs a little in every attempt, so on some the coach flags
 * something on the way out; the student reads it and finishes again to carry on.
 */
async function finish(page: Page, button: string, next: string) {
  const step = page.getByText(next);
  await page.getByRole("button", { name: button }).click();
  await step
    .waitFor({ timeout: 3000 })
    .catch(() => page.getByRole("button", { name: button }).click());
  await expect(step).toBeVisible();
}

/**
 * Where to look for the sharp image at each u, cm from the lens: around every lens the seed can
 * build (f = 15.0 cm ± 2%), sharpest short of the thin-lens v. Each sharp window is at least
 * 0.5 cm wide, so a 0.4 cm scan cannot miss it.
 */
const LOOK: Record<number, [number, number]> = {
  20: [52.5, 62.5],
  25: [34, 39],
  30: [27.5, 31.5],
  35: [24.2, 27.4],
  40: [22.2, 25],
};

test("at Auto the whole lab runs: five readings, the table, 1/v against 1/u, and f from the intercepts", async ({
  page,
}, info) => {
  test.skip(info.project.name === "phone", "The help level is set on desktop");
  test.setTimeout(180_000);
  await toBuild(page);
  await page.getByLabel("Help level").selectOption("auto");
  await centreGauze(page);
  await page.getByRole("button", { name: "Finish building" }).click();
  await page.getByRole("button", { name: "Continue to Measure" }).click();

  // The ray box stays at 10.0 cm; the lens is set for each u, then the screen finds the image.
  for (const u of [20, 25, 30, 35, 40]) {
    await slide(page, "Lens position", 10 + u);
    const [from, to] = LOOK[u]!;
    let found = false;
    for (let v = from; v <= to + 1e-9 && !found; v += 0.4) {
      await slide(page, "Screen position", Number((10 + u + v).toFixed(1)));
      found = (await chip(page).textContent()) === "Sharp";
    }
    expect(found, `a sharp image at u = ${u} cm`).toBe(true);
    await page.getByRole("button", { name: "Take this reading" }).click();
    await expect(page.locator("aside ol li").last()).toContainText(`u = ${u}.0 cm`);
  }
  await expect(page.locator("aside ol li")).toHaveCount(5);
  await finish(page, "Finish measuring", "Step 6 of 10 · Tabulate");

  await page.getByRole("button", { name: "Standard" }).click();
  await page.getByRole("button", { name: "Fill in my readings" }).click();
  await finish(page, "Finish tabulating", "Step 7 of 10 · Plot");

  await expect(page.getByText(/A graph of v⁻¹ against u⁻¹/)).toBeVisible();
  await finish(page, "Finish plotting", "Step 8 of 10 · Analyse");

  // Both intercepts are 1/f, and f from them is the lens's own, a little short (brief, decision 7).
  const read = async (id: string) =>
    Number((await page.locator(`[data-answer="${id}"]`).textContent())!.split(" ")[0]);
  const [m1, m2, f] = [await read("m1"), await read("m2"), await read("f")];
  expect(m1).toBeGreaterThan(0.064);
  expect(m1).toBeLessThan(0.07);
  expect(m2).toBeGreaterThan(0.064);
  expect(m2).toBeLessThan(0.07);
  expect(f).toBeGreaterThan(14.4);
  expect(f).toBeLessThan(15.4);
  await expect(page.locator('[data-answer="f"]')).toContainText("cm");
  await finish(page, "Finish analysing", "Step 9 of 10 · Conclude");

  await expect(page.getByText(`The focal length of the lens is ${f.toFixed(1)} cm.`)).toBeVisible();
  await page.getByRole("button", { name: "Continue to Report" }).click();
  await expect(page.getByText("Step 10 of 10 · Report")).toBeVisible();

  // Step 10: the report, written from this run.
  await page.getByRole("link", { name: "Open your report" }).click();
  await expect(page).toHaveURL(/\/lab\/converging-lens\/report$/);
  const paper = page.getByRole("region", { name: "Report preview" });
  await expect(
    paper.getByText("The converging lens: the focal length of a converging lens"),
  ).toBeVisible();
  await expect(
    paper.getByText(/^Fig\. 1 The ray box R, the lens L and the screen S/),
  ).toBeVisible();
  await expect(paper.getByRole("img", { name: /the optical bench/ })).toBeVisible();
  await expect(paper.getByRole("table")).toContainText("40.0");
  await expect(
    paper.getByText(
      new RegExp(
        `^f = 2 ⁄ \\(m₁ \\+ m₂\\) = 2 ⁄ \\([\\d.]+ cm⁻¹ \\+ [\\d.]+ cm⁻¹\\) = ${f.toFixed(1)} cm$`,
      ),
    ),
  ).toBeVisible();
  await expect(
    paper.getByText(/^I made sure the wire gauze and the lens were on one axis\./),
  ).toBeVisible();
  await expect(
    paper.getByText(/^A real lens bends the light through its edge a little more/),
  ).toBeVisible();
});

test("plotting v against u is caught, and the analysis asks for 1/v against 1/u", async ({
  page,
}, info) => {
  test.skip(info.project.name === "phone", "The help level is set on desktop");
  test.setTimeout(120_000);
  await toBuild(page);
  await page.getByLabel("Help level").selectOption("auto");
  await centreGauze(page);
  await page.getByRole("button", { name: "Finish building" }).click();
  await page.getByRole("button", { name: "Continue to Measure" }).click();
  for (const u of [20, 30]) {
    await slide(page, "Lens position", 10 + u);
    const [from, to] = LOOK[u]!;
    for (let v = from; v <= to + 1e-9; v += 0.4) {
      await slide(page, "Screen position", Number((10 + u + v).toFixed(1)));
      if ((await chip(page).textContent()) === "Sharp") break;
    }
    await page.getByRole("button", { name: "Take this reading" }).click();
  }
  await finish(page, "Finish measuring", "Step 6 of 10 · Tabulate");
  await page.getByRole("button", { name: "Standard" }).click();
  await page.getByRole("button", { name: "Fill in my readings" }).click();
  await finish(page, "Finish tabulating", "Step 7 of 10 · Plot");

  const column = (axis: string) =>
    page
      .getByRole("region", { name: "Graph sheet" })
      .getByRole("group", { name: axis })
      .getByLabel("Plot");
  await column("Across (x)").selectOption({ label: "u/cm" });
  await column("Up (y)").selectOption({ label: "v/cm" });
  await expect(
    page.getByRole("status").filter({ hasText: "Plot 1/v against 1/u" }).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Finish plotting" }).click();
  await page.getByRole("button", { name: "Finish plotting" }).click();
  await expect(page.getByText("Step 8 of 10 · Analyse")).toBeVisible();
  await expect(page.getByText(/Your graph is v against u/)).toBeVisible();
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
