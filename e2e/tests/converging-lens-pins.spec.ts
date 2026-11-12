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
  const y = await findNoParallax(page, 30, 48, 68);
  // Near the image of every lens the seed can build (f = 15.0 cm, 2% either way); the exact
  // place is checked against the model in packages/experiments.
  expect(y).toBeLessThan(65);
  expect(y).toBeGreaterThan(52);
  await expect(
    page.getByRole("img", { name: /^Centre: the image's tip and the search pin's tip together/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Take this reading" }).click();
  await expect(page.locator("aside ol li")).toHaveCount(1);
  await expect(page.locator("aside ol li").first()).toContainText("x = 20.0 cm");
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

/** Where to look for no parallax at each x, cm from the lens, around every lens the seed builds. */
const LOOK: Record<number, [number, number]> = {
  20: [48, 68],
  30: [26, 35],
  40: [21, 27],
  50: [18, 24],
};

/** Through Measure at Auto, with a reading at each of the question's distances. */
async function measureAll(page: Page, xs: number[]) {
  await toBuild(page);
  await page.getByLabel("Help level").selectOption("auto");
  await levelTips(page);
  await page.getByRole("button", { name: "Finish building" }).click();
  await page.getByRole("button", { name: "Continue to Measure" }).click();
  // The object pin stays at 10.0 cm; the lens is set for each x, then the search pin is found.
  for (const x of xs) {
    await slide(page, "Lens position", 10 + x);
    const [from, to] = LOOK[x]!;
    await findNoParallax(page, 10 + x, from, to);
    await page.getByRole("button", { name: "Take this reading" }).click();
    await expect(page.locator("aside ol li").last()).toContainText(`x = ${x}.0 cm`);
  }
  await finish(page, "Finish measuring", "Step 6 of 10 · Tabulate");
  await page.getByRole("button", { name: "Standard" }).click();
  await page.getByRole("button", { name: "Fill in my readings" }).click();
  await finish(page, "Finish tabulating", "Step 7 of 10 · Plot");
}

test("at Auto the whole two-pin lab runs: four readings, the table, xy against (x + y), and f from its slope", async ({
  page,
}, info) => {
  test.skip(info.project.name === "phone", "The help level is set on desktop");
  test.setTimeout(180_000);
  await measureAll(page, [20, 30, 40, 50]);
  await expect(page.getByText(/A graph of xy against \(x \+ y\)/)).toBeVisible();
  await finish(page, "Finish plotting", "Step 8 of 10 · Analyse");

  // f is the slope. The lens is 15.0 cm, 2% either way, and the walk takes the first place of no
  // parallax it finds, anywhere in a 7 to 8 mm stretch, as a student may: so f is within about 7%.
  // The exact place is checked against the model in packages/experiments.
  const read = async (id: string) =>
    Number((await page.locator(`[data-answer="${id}"]`).textContent())!.split(" ")[0]);
  const [slope, f] = [await read("slope"), await read("f")];
  expect(f).toBeCloseTo(slope, 6);
  expect(f).toBeGreaterThan(14.0);
  expect(f).toBeLessThan(16.0);
  await expect(page.locator('[data-answer="f"]')).toContainText("cm");
  await finish(page, "Finish analysing", "Step 9 of 10 · Conclude");

  await expect(page.getByText(`The focal length of the lens is ${f.toFixed(1)} cm.`)).toBeVisible();
  await page.getByRole("button", { name: "Continue to Report" }).click();
  await expect(page.getByText("Step 10 of 10 · Report")).toBeVisible();
  await expect(page.getByText(/The report, the print sheets and the exam/)).toBeVisible();
});

test("plotting y against x is caught, and the analysis asks for xy against (x + y)", async ({
  page,
}, info) => {
  test.skip(info.project.name === "phone", "The help level is set on desktop");
  test.setTimeout(120_000);
  await measureAll(page, [30, 50]);
  const column = (axis: string) =>
    page
      .getByRole("region", { name: "Graph sheet" })
      .getByRole("group", { name: axis })
      .getByLabel("Plot");
  await column("Across (x)").selectOption({ label: "x/cm" });
  await column("Up (y)").selectOption({ label: "y/cm" });
  await expect(
    page.getByRole("status").filter({ hasText: "Plot xy against (x + y)" }).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Finish plotting" }).click();
  await page.getByRole("button", { name: "Finish plotting" }).click();
  await expect(page.getByText("Step 8 of 10 · Analyse")).toBeVisible();
  await expect(page.getByText(/Your graph is y against x/)).toBeVisible();
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
