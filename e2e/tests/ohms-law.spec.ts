import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { WEB } from "../playwright.config";

/*
 * The Ohm's law lab, steps 1 to 5 (Phase 2, PR 3): the approved board "Ohm's law: wiring and
 * measuring". Wiring by choosing terminals (keyboard and touch) and by dragging; the check; the
 * safety block; and live readings from the circuit solver.
 */
const OHMS = `${WEB}/lab/ohms-law`;

const DIAGRAM: [string, string][] = [
  ["cell+", "R.1"],
  ["R.2", "A+"],
  ["A-", "wire.Q"],
  ["jockey", "wire.P"],
  ["wire.P", "key.1"],
  ["key.2", "cell-"],
  ["V+", "cell+"],
  ["V-", "cell-"],
];

const serious = async (page: Page) => {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  return violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(" ")).join(", ")})`);
};

/**
 * Finish a step. The apparatus differs a little in every attempt, so on some the coach flags a
 * reading on the way out (an outlier, say); the student reads it and finishes again to carry on.
 */
async function finish(page: Page, button: string, next: string) {
  const step = page.getByText(next);
  await page.getByRole("button", { name: button }).click();
  // No advice: the next step opens. Advice: it stays, and finishing again carries on.
  await step
    .waitFor({ timeout: 3000 })
    .catch(() => page.getByRole("button", { name: button }).click());
  await expect(step).toBeVisible();
}

const terminal = (page: Page, t: string) => page.locator(`[data-terminal-button="${t}"]`);

/** Through the question and the prediction to the bench. */
async function toBuild(page: Page) {
  await page.goto(OHMS);
  await expect(page.getByText("Step 1 of 10 · Question")).toBeVisible();
  await page.getByRole("button", { name: "Continue to Predict" }).click();
  await page.getByRole("button", { name: "It falls" }).click();
  await expect(page.getByText("You said: It falls. Measure and see.")).toBeVisible();
  await page.getByRole("button", { name: "Continue to Build" }).click();
  await expect(page.getByText("Step 3 of 10 · Build")).toBeVisible();
}

async function wire(page: Page, leads: [string, string][]) {
  for (const [a, b] of leads) {
    await terminal(page, a).click();
    await terminal(page, b).click();
  }
}

test("the student wires the circuit terminal by terminal, the check passes, and the meters read the circuit", async ({
  page,
}) => {
  await toBuild(page);
  await wire(page, DIAGRAM);
  await expect(page.getByText("8 of 8 leads joined")).toBeVisible();
  await page.getByRole("button", { name: "Finish building" }).click();
  await expect(page.getByText("The circuit matches the diagram.")).toBeVisible();
  await page.getByRole("button", { name: "Continue to Measure" }).click();

  await page.getByRole("button", { name: "Close the key" }).click();
  await page.getByRole("slider").fill("60");
  await page.getByRole("button", { name: "Press the jockey" }).click();
  const bench = page.getByRole("img", { name: /The jockey is pressed at PJ = 60.0 cm/ });
  await expect(bench).toBeVisible();
  // Readings to the meters' least counts, from the solver: I near 0.72 A, V near 1.9 V.
  const label = (await bench.getAttribute("aria-label"))!;
  const [, amps, volts] = label.match(/reads ([\d.]+) A and the voltmeter ([\d.]+) V/)!;
  expect(Number(amps)).toBeGreaterThan(0.6);
  expect(Number(amps)).toBeLessThan(0.85);
  expect(Number(volts)).toBeGreaterThan(1.7);
  expect(Number(volts)).toBeLessThan(2.1);
  expect(Math.round(Number(amps) / 0.02) * 0.02).toBeCloseTo(Number(amps), 9);
  await expect(page.getByText("Key closed for")).toBeVisible();

  await page.getByRole("button", { name: "Open the key" }).click();
  await expect(page.getByRole("img", { name: /The key is open/ })).toBeVisible();
  await expect(page.getByRole("img", { name: /reads 0.00 A/ })).toBeVisible();
});

test("a lead straight across the cells is blocked: the key will not close", async ({ page }) => {
  await toBuild(page);
  await wire(page, [...DIAGRAM, ["cell+", "key.2"]]);
  await page.getByRole("button", { name: "Finish building" }).click();
  // The wiring check names the extra lead's terminals; the student goes on anyway.
  await page.getByRole("button", { name: "Finish building" }).click();
  await page.getByRole("button", { name: "Continue to Measure" }).click();
  await page.getByRole("button", { name: "Close the key" }).click();
  // Next.js's route announcer is an alert too, so find this one by what it says.
  await expect(page.getByRole("alert").filter({ hasText: "The key will not close" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Close the key" })).toBeVisible();
});

test("an ammeter the wrong way round is named when the student finishes wiring", async ({
  page,
}) => {
  await toBuild(page);
  await wire(
    page,
    DIAGRAM.map(([a, b]) => [
      a === "A+" ? "A-" : a === "A-" ? "A+" : a,
      b === "A+" ? "A-" : b === "A-" ? "A+" : b,
    ]),
  );
  await page.getByRole("button", { name: "Finish building" }).click();
  await expect(page.getByText("The ammeter is the wrong way round")).toBeVisible();
});

test("a lead can be dragged from one terminal to another, and taken off again", async ({
  page,
}, info) => {
  test.skip(info.project.name === "phone", "Mouse drag; the phone joins by tapping");
  await toBuild(page);
  const a = (await terminal(page, "R.2").boundingBox())!;
  const b = (await terminal(page, "A+").boundingBox())!;
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(a.x + 40, a.y + 20, { steps: 4 });
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 6 });
  await page.mouse.up();
  await expect(page.getByText("1 of 8 leads joined")).toBeVisible();
  await page
    .getByRole("button", {
      name: "Remove the lead from R's right terminal to the ammeter's + terminal",
    })
    .click();
  await expect(page.getByText("0 of 8 leads joined")).toBeVisible();
});

test("the Ohm's law bench has no serious accessibility issues, wiring and measuring", async ({
  page,
}) => {
  await toBuild(page);
  await terminal(page, "cell+").click();
  expect(await serious(page)).toEqual([]);
  await terminal(page, "cell+").press("Escape");
  await wire(page, DIAGRAM);
  await page.getByRole("button", { name: "Finish building" }).click();
  await page.getByRole("button", { name: "Continue to Measure" }).click();
  await page.getByRole("button", { name: "Close the key" }).click();
  expect(await serious(page)).toEqual([]);
});

test("no sideways scrolling at phone width in the Ohm's law lab", async ({ page }, info) => {
  test.skip(info.project.name !== "phone", "Phone layout");
  await toBuild(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    ),
  ).toBe(0);
});

test("at Auto the whole experiment runs: two sets of readings, the table, I against V, and E and r from the graph", async ({
  page,
}, info) => {
  test.skip(info.project.name === "phone", "The help level is set on desktop");
  test.setTimeout(120_000);
  await toBuild(page);
  await page.getByLabel("Help level").selectOption("auto");
  await wire(page, DIAGRAM);
  await page.getByRole("button", { name: "Finish building" }).click();
  await page.getByRole("button", { name: "Continue to Measure" }).click();

  // PJ increasing, then decreasing, as the book takes them: twelve readings.
  await page.getByRole("button", { name: "Close the key" }).click();
  const take = page.getByRole("button", { name: "Take this reading" });
  await take.click();
  const positions = [40, 50, 60, 70, 80, 80, 70, 60, 50, 40];
  for (const cm of positions) {
    await page.getByRole("slider").fill(String(cm));
    await page.getByRole("button", { name: "Press the jockey" }).click();
    // Take the reading only once the press has landed, as a student would: a reading taken
    // before it is a reading with the jockey still off the wire.
    await expect(page.getByRole("button", { name: "Lift the jockey" })).toBeVisible();
    await take.click();
    await page.getByRole("button", { name: "Lift the jockey" }).click();
    await expect(page.getByRole("button", { name: "Press the jockey" })).toBeVisible();
  }
  await take.click();
  await page.getByRole("button", { name: "Open the key" }).click();
  // Every reading where it was meant to be: off the wire first and last, then each position.
  const readings = page.locator("aside ol li");
  await expect(readings).toHaveCount(12);
  const where = (await readings.allTextContents()).map((r) => r.split(":")[0]!.trim());
  expect(where).toEqual(["No contact", ...positions.map((cm) => `${cm}.0 cm`), "No contact"]);
  await page.getByRole("button", { name: "Finish measuring" }).click();

  await expect(page.getByText("Step 6 of 10 · Tabulate")).toBeVisible();
  await page.getByRole("button", { name: "Standard" }).click();
  await page.getByRole("button", { name: "Fill in my readings" }).click();
  await finish(page, "Finish tabulating", "Step 7 of 10 · Plot");

  await expect(page.getByText(/A graph of I against V/)).toBeVisible();
  await finish(page, "Finish plotting", "Step 8 of 10 · Analyse");

  // The worked answers come from the graph: E near the cells' 3.0 V and r near their 1.5 Ω.
  const e = Number((await page.locator('[data-answer="E"]').textContent())!.split(" ")[0]);
  const r = Number((await page.locator('[data-answer="r"]').textContent())!.split(" ")[0]);
  expect(e).toBeGreaterThan(2.8);
  expect(e).toBeLessThan(3.2);
  expect(r).toBeGreaterThan(1.2);
  expect(r).toBeLessThan(1.8);
  await expect(page.locator('[data-answer="slope"]')).toContainText("A V⁻¹");
  await page.getByRole("button", { name: "Finish analysing" }).click();

  await expect(page.getByText("Step 9 of 10 · Conclude")).toBeVisible();
  await expect(page.getByText(`the cell's emf E is ${e.toFixed(2)} V`)).toBeVisible();
  await page.getByRole("button", { name: "Continue to Report" }).click();

  // Step 10: the report, written from this run.
  await page.getByRole("link", { name: "Open your report" }).click();
  await expect(page).toHaveURL(/\/lab\/ohms-law\/report$/);
  const paper = page.getByRole("region", { name: "Report preview" });
  await expect(
    paper.getByText("Ohm's law and the potentiometer: the emf and internal resistance of a cell"),
  ).toBeVisible();
  await expect(paper.getByText(/^Fig\. 1 The circuit\. The cells E, the key K/)).toBeVisible();
  await expect(paper.getByRole("img", { name: /the circuit on the bench/ })).toBeVisible();
  await expect(paper.getByRole("table")).toContainText("80.0");
  await expect(
    paper.getByText(`E = V where I = 0, read from the line: ${e.toFixed(2)} V`),
  ).toBeVisible();
  await expect(
    paper.getByText(/^r = −1 ⁄ slope = −1 ⁄ \(−[\d.]+ A V⁻¹\) = [\d.]+ Ω$/),
  ).toBeVisible();
  await expect(
    paper.getByText(/^I opened the key as soon as each reading was taken/),
  ).toBeVisible();
  await expect(
    paper.getByText(
      "I took a second set of readings with PJ decreasing and used the mean of each pair.",
    ),
  ).toBeVisible();

  await page.getByRole("button", { name: "University", exact: true }).click();
  await expect(paper.getByText(/^A cell of emf E and internal resistance r/)).toBeVisible();
  await expect(
    paper.getByText(`The emf of the cells was found to be ${e.toFixed(2)} V`, { exact: false }),
  ).toBeVisible();
  expect(await serious(page)).toEqual([]);
});
