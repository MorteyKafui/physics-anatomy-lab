import AxeBuilder from "@axe-core/playwright";
import { countFromOneErrorPercent } from "@pa/experiments";
import { expect, test, type Page } from "@playwright/test";
import { WEB } from "../playwright.config";

const LAB = `${WEB}/lab/simple-pendulum`;

// These walk the lab from Question to Plot, so they get longer than the default 30 s.
test.describe.configure({ timeout: 60_000 });

const BUILD_ORDER = [
  ["Base plate", "Put the base plate on the bench"],
  ["Retort stand rod", "Put the retort stand rod into the base plate"],
  ["Boss and clamp", "Put the boss and clamp on the rod"],
  ["Split cork", "Put the split cork in the clamp jaw"],
  ["Thread", "Put the thread in the split cork"],
  ["Bob", "Put the bob on the end of the thread"],
  ["Stopwatch", "Put the stopwatch on the bench beside the stand"],
] as const;

/** Walk through Question and Predict (their activities are built next) to the parts tray. */
async function toBuild(page: Page) {
  // A fake clock: the bench only moves when the test says, so "the same pass" is exact.
  await page.clock.install();
  await page.goto(LAB);
  for (const next of ["Predict", "Build"]) {
    await page.getByRole("button", { name: `Continue to ${next}` }).click();
  }
  await expect(page.getByRole("heading", { name: "Set up the pendulum" })).toBeVisible();
}

const tray = (page: Page) => page.getByRole("region", { name: "Parts tray" });
const trayPart = (page: Page, part: string) =>
  tray(page).getByRole("button", { name: new RegExp(`^${part}`) });

/** Pick a part from the tray and choose its slot, as a tap or a keyboard user would. */
async function put(page: Page, part: string, slot: string) {
  await trayPart(page, part).click();
  await page.getByRole("button", { name: slot }).click();
}

/** Build everything, but tie the thread round the clamp arm (the catalogue's mistake). */
async function buildWithThreadOnClamp(page: Page) {
  for (const [part, slot] of BUILD_ORDER.slice(0, 4)) await put(page, part, slot);
  await put(page, "Thread", "Put the thread round the clamp arm");
  for (const [part, slot] of BUILD_ORDER.slice(5)) await put(page, part, slot);
}

/** Build the bench the right way round and walk on to Measure. */
async function toMeasure(page: Page) {
  await toBuild(page);
  for (const [part, slot] of BUILD_ORDER) await put(page, part, slot);
  await page.getByRole("button", { name: "Finish building" }).click();
  await page.getByRole("button", { name: "Continue to Measure" }).click();
  await expect(page.getByRole("heading", { name: "Time 20 oscillations" })).toBeVisible();
}

/** Start the stopwatch and count the starting pass as "one" (the plan's off-track mistake). */
async function timeCountingFromOne(page: Page) {
  // Stop time between Start and the first Count, so they fall on exactly the same pass.
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 3000));
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await page.getByRole("button", { name: "Count a pass" }).click();
  await page.clock.runFor(2000);
  await page.getByRole("button", { name: "Stop", exact: true }).click();
}

async function seriousViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  return violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(" ")).join(", ")})`);
}

test("opens a fresh attempt on step 1 and walks to Measure", async ({ page }) => {
  await page.goto(LAB);
  await expect(page.getByRole("heading", { level: 1, name: "Simple pendulum" })).toBeVisible();
  await expect(page.getByText("Step 1 of 10 · Question")).toBeVisible();
  await toMeasure(page);
  await expect(page.getByText("Step 5 of 10 · Measure")).toBeVisible();
});

test("the bench is built part by part, each resting on the one before", async ({ page }) => {
  await toBuild(page);
  const bench = page.getByRole("img", { name: /^(The bench is empty|On the bench)/ });
  await expect(bench).toHaveAccessibleName("The bench is empty.");
  await expect(page.getByRole("button", { name: "Finish building" })).toBeDisabled();
  await expect(trayPart(page, "Boss and clamp")).toContainText("Needs the retort stand rod first");
  await trayPart(page, "Boss and clamp").click();
  await expect(tray(page).getByRole("status")).toHaveText(
    "The boss and clamp needs the retort stand rod on the bench first.",
  );

  for (const [part, slot] of BUILD_ORDER) await put(page, part, slot);
  await expect(bench).toHaveAccessibleName(/the bob and the stopwatch\.$/);
  await expect(page.getByRole("button", { name: "Finish building" })).toBeEnabled();

  // Taking the rod off takes everything resting on it back to the tray.
  await tray(page).getByRole("button", { name: "Take off the retort stand rod" }).click();
  await expect(tray(page).getByRole("status")).toHaveText(
    "Back in the tray: the retort stand rod, the boss and clamp, the split cork, the thread and the bob.",
  );
  await expect(page.getByRole("button", { name: "Finish building" })).toBeDisabled();
});

test("a part dragged from the tray snaps into place on the bench", async ({ page }, info) => {
  test.skip(info.project.name === "phone", "Mouse drag; the phone places by tapping");
  await toBuild(page);
  const figure = (await page.getByRole("img", { name: "The bench is empty." }).boundingBox())!;
  const from = (await trayPart(page, "Base plate").boundingBox())!;
  // Drop a little off the base plate's slot (215, 362 in the 420 × 460 drawing): it snaps.
  const to = {
    x: figure.x + ((215 + 20) / 420) * figure.width,
    y: figure.y + ((362 - 15) / 460) * figure.height,
  };
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 8 });
  await expect(page.locator('circle[data-bench-slot="bench"]')).toBeVisible();
  await page.mouse.up();
  await expect(tray(page).getByRole("status")).toHaveText("You put the base plate on the bench.");

  // Dropped far from anywhere it fits, a part goes back to the tray.
  const rod = (await trayPart(page, "Retort stand rod").boundingBox())!;
  await page.mouse.move(rod.x + rod.width / 2, rod.y + rod.height / 2);
  await page.mouse.down();
  await page.mouse.move(figure.x + 10, figure.y + 10, { steps: 8 });
  await page.mouse.up();
  await expect(tray(page).getByRole("status")).toHaveText(
    "That is not a place for the retort stand rod, so it went back in the tray.",
  );
});

test("building works from the keyboard, and M turns on the magnifier", async ({ page }, info) => {
  test.skip(info.project.name === "phone", "Keyboard shortcuts are for desktop");
  await toBuild(page);
  await trayPart(page, "Base plate").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Put the base plate on the bench" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(trayPart(page, "Retort stand rod")).toBeFocused();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Escape");
  await expect(tray(page).getByRole("status")).toHaveText(
    "Back in the tray: the retort stand rod.",
  );
  await expect(trayPart(page, "Retort stand rod")).toBeFocused();

  await page.keyboard.press("m");
  await expect(page.getByRole("button", { name: "Magnifier" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator("[data-magnifier]")).toBeVisible();
  await page.keyboard.press("m");
  await expect(page.locator("[data-magnifier]")).toHaveCount(0);
});

test("a thread tied round the clamp is caught when building ends, and can be let through", async ({
  page,
}) => {
  await toBuild(page);
  await buildWithThreadOnClamp(page);
  await page.getByRole("button", { name: "Finish building" }).click();
  const card = page.getByRole("status").filter({ hasText: "The thread is tied round the clamp" });
  await expect(card).toBeVisible();

  await card.getByRole("button", { name: "Show me" }).click();
  await expect(page.locator('circle[data-bench-slot="cork"]')).toBeVisible();

  // Findings never block a step (allowed mistakes): the student may carry on as it is.
  await page.getByRole("button", { name: "Carry on as it is" }).click();
  await expect(page.getByText("Step 4 of 10 · Check")).toBeVisible();
});

test("taking the thread off clears the coach's card", async ({ page }) => {
  await toBuild(page);
  await buildWithThreadOnClamp(page);
  await page.getByRole("button", { name: "Finish building" }).click();
  await page.getByRole("button", { name: "Take the thread off", exact: true }).click();
  await expect(page.getByText("The thread is tied round the clamp")).toHaveCount(0);
  await expect(tray(page).getByRole("status")).toHaveText(
    "Back in the tray: the thread and the bob.",
  );
});

test("counting from one is caught, with the size of the error worked out from the physics", async ({
  page,
}) => {
  await toMeasure(page);
  await timeCountingFromOne(page);
  const card = page.getByRole("status").filter({ hasText: 'You said "one" on the first pass' });
  await expect(card).toBeVisible();
  // Rule 1: the percentage is computed by packages/experiments from packages/physics.
  await expect(card).toContainText(`about ${countFromOneErrorPercent(9.81)}% too high`);
  await expect(card).toContainText("times 19 swings");
});

test("a reading survives a reload, and Reset and try again removes it", async ({ page }) => {
  await toMeasure(page);
  await timeCountingFromOne(page);
  await expect(page.getByText(/^Readings: 0\.800 m: \d+\.\d{2} s$/)).toBeVisible();

  await page.reload();
  await expect(page.getByText("Step 5 of 10 · Measure")).toBeVisible();
  await expect(page.getByText(/^Readings: 0\.800 m: \d+\.\d{2} s$/)).toBeVisible();

  await timeCountingFromOne(page);
  await page.getByRole("button", { name: "Reset and try again" }).click();
  await expect(page.getByText(/^Readings: 0\.800 m: \d+\.\d{2} s$/)).toBeVisible();
  await expect(page.getByText(/^Readings: .*, /)).toHaveCount(0);
});

test("the step strip opens only steps the student has reached", async ({ page }) => {
  await page.goto(LAB);
  const strip = page.getByRole("navigation", { name: "Stages" });
  await expect(strip.getByRole("button", { name: /Measure/ })).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  await strip.getByRole("button", { name: /Measure/ }).click({ force: true });
  await expect(page.getByText("Step 1 of 10 · Question")).toBeVisible();
});

test("the stopwatch works from the keyboard", async ({ page }, info) => {
  test.skip(info.project.name === "phone", "Keyboard shortcuts are for desktop");
  await toMeasure(page);
  await page.locator("body").click({ position: { x: 5, y: 5 } });
  await page.keyboard.press("s");
  await page.keyboard.press(" ");
  await page.clock.runFor(1000);
  await page.keyboard.press("s");
  await expect(page.getByText(/^Readings: 0\.800 m: \d+\.\d{2} s$/)).toBeVisible();
});

test("building, with a part in hand and the coach speaking, has no serious accessibility issues", async ({
  page,
}) => {
  await toBuild(page);
  await buildWithThreadOnClamp(page);
  await page.getByRole("button", { name: "Finish building" }).click();
  await tray(page).getByRole("button", { name: "Take off the bob" }).click();
  await trayPart(page, "Bob").click();
  await page.clock.resume(); // axe uses the page's timers
  expect(await seriousViolations(page)).toEqual([]);
});

test("the lab, mid-measurement with the coach speaking, has no serious accessibility issues", async ({
  page,
}) => {
  await toMeasure(page);
  await timeCountingFromOne(page);
  await expect(page.getByRole("status").first()).toBeVisible();
  await page.clock.resume(); // axe uses the page's timers
  expect(await seriousViolations(page)).toEqual([]);
});

test("no sideways scrolling at phone width, building or measuring", async ({ page }, info) => {
  test.skip(info.project.name !== "phone", "Phone layout");
  const sideways = () =>
    page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
  await toBuild(page);
  await trayPart(page, "Base plate").click();
  expect(await sideways()).toBe(0);
  await page.getByRole("button", { name: "Put the base plate on the bench" }).click();
  for (const [part, slot] of BUILD_ORDER.slice(1)) await put(page, part, slot);
  await page.getByRole("button", { name: "Finish building" }).click();
  await page.getByRole("button", { name: "Continue to Measure" }).click();
  expect(await sideways()).toBe(0);
});

/** Time 20 oscillations that take `seconds` on the fake clock. */
async function timeFor(page: Page, seconds: number) {
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await page.clock.runFor(seconds * 1000);
  await page.getByRole("button", { name: "Stop", exact: true }).click();
}

/** Measure twice at 0.800 m and twice at 0.850 m, then go on to Tabulate. */
async function toTabulate(page: Page) {
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

const results = (page: Page) => page.getByRole("region", { name: "Results table" });
const cell = (page: Page, row: number, head: string) =>
  results(page).getByRole("textbox", { name: `Row ${row}, ${head}`, exact: true });

/** The help level is chosen on the desktop header; the phone keeps the default (Auto). */
async function chooseHelp(page: Page, level: "Auto" | "Check my work" | "On my own") {
  test.skip(test.info().project.name === "phone", "The help level is set on desktop");
  await page.getByRole("combobox", { name: "Help level" }).selectOption({ label: level });
}

test("the pendulum is timed at several lengths, each reading keeping its length", async ({
  page,
}) => {
  await toMeasure(page);
  const length = page.getByRole("group", { name: "Length l" });
  await expect(length).toContainText("0.800 m");
  await page.getByRole("button", { name: "Make the pendulum longer" }).click();
  await expect(length).toContainText("0.850 m");
  await page.getByRole("button", { name: "Make the pendulum shorter" }).click();
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 3000));
  await timeFor(page, 2);
  await page.getByRole("button", { name: "Make the pendulum longer" }).click();
  await timeFor(page, 2.2);
  await expect(
    page.getByText(/^Readings: 0\.800 m: \d+\.\d{2} s · 0\.850 m: \d+\.\d{2} s$/),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByRole("group", { name: "Length l" })).toContainText("0.850 m");
});

test("at Auto the standard table fills in the readings and works out t, T and T²", async ({
  page,
}) => {
  await toTabulate(page);
  await results(page).getByRole("button", { name: "Standard" }).click();
  await expect(results(page).getByRole("columnheader")).toHaveText([
    /^l\/m/,
    /^t₁\/s/,
    /^t₂\/s/,
    /^t\/s/,
    /^T\/s/,
    /^T²\/s²/,
    /Remove row/,
  ]);
  await results(page).getByRole("button", { name: "Fill in my readings" }).click();
  await expect(cell(page, 1, "l/m")).toHaveValue("0.800");
  await expect(cell(page, 2, "l/m")).toHaveValue("0.850");
  await expect(cell(page, 1, "t₁/s")).toHaveValue(/^\d+\.\d{2}$/);
  // The worked-out cells are shown, not typed: the mean to one more place, T and T² to 4 figures.
  await expect(results(page).getByRole("row").nth(1)).toContainText(/\d+\.\d{3}/);
  await expect(page.getByText("Worked out for you")).toBeVisible();
});

test("at Check my work each worked-out cell is ticked or flagged with its reason", async ({
  page,
}) => {
  await toTabulate(page);
  await chooseHelp(page, "Check my work");
  await results(page).getByRole("button", { name: "Standard" }).click();
  await cell(page, 1, "l/m").fill("0.800");
  await cell(page, 1, "t₁/s").fill("2.00");
  await cell(page, 1, "t₂/s").fill("2.00");
  await cell(page, 1, "t/s").fill("2.0");
  await cell(page, 1, "T/s").fill("0.1000");
  await cell(page, 1, "T/s").press("Tab");
  // A mean takes one more decimal place than its readings: 2.0 needs three.
  await expect(cell(page, 1, "t/s")).toHaveAttribute("aria-invalid", "true");
  await expect(cell(page, 1, "t/s")).toHaveAccessibleDescription(
    "Row 1, mean t: 2.0 needs 3 decimal places",
  );
  await cell(page, 1, "t/s").fill("2.000");
  await cell(page, 1, "t/s").press("Tab");
  await expect(cell(page, 1, "t/s")).not.toHaveAttribute("aria-invalid", "true");
  await expect(results(page).getByRole("row").nth(1).getByLabel("checked")).toHaveCount(2);

  await cell(page, 1, "T/s").fill("0.2500");
  await cell(page, 1, "T/s").press("Tab");
  await expect(cell(page, 1, "T/s")).toHaveAttribute("aria-invalid", "true");

  // Asked, the coach gives the single most serious problem: one complete row is too few.
  await page.getByRole("button", { name: "Check my table" }).click();
  const card = page.getByRole("status").filter({ hasText: "1 of 5 sets of readings so far" });
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: "Back to Measure" }).click();
  await expect(page.getByText("Step 5 of 10 · Measure")).toBeVisible();
});

test("a table of the student's own design is checked for what it means", async ({ page }) => {
  await toTabulate(page);
  await chooseHelp(page, "Check my work");
  await results(page).getByRole("button", { name: "Draw your own" }).click();
  await expect(results(page)).toContainText("Your table has no columns yet");

  const addColumn = async (
    button: "Column" | "Formula column",
    symbol: string,
    role: string,
    quantity: string,
    unit: string,
    formula?: string,
  ) => {
    await results(page).getByRole("button", { name: button, exact: true }).click();
    const form = results(page).getByRole("form", { name: "New column" });
    await form.getByLabel("Symbol", { exact: true }).fill(symbol);
    await form.getByLabel("What goes in it").selectOption({ label: role });
    await form.getByLabel("Quantity").selectOption({ label: quantity });
    await form.getByLabel("Unit").selectOption({ label: unit });
    if (formula !== undefined) await form.getByLabel("Formula", { exact: true }).fill(formula);
    return form;
  };
  const save = (form: Awaited<ReturnType<typeof addColumn>>) =>
    form.getByRole("button", { name: "Save column" }).click();

  await save(await addColumn("Column", "l", "A setting you choose", "Length", "cm"));
  await save(await addColumn("Column", "t", "A reading", "Time", "s"));
  // A formula may only use the table's own columns.
  const bad = await addColumn(
    "Formula column",
    "T",
    "Worked out by a formula",
    "Time",
    "s",
    "t / n",
  );
  await expect(bad).toContainText("Your table has no column called n.");
  await expect(bad.getByRole("button", { name: "Save column" })).toBeDisabled();
  await bad.getByLabel("Formula", { exact: true }).fill("t / 20");
  await save(bad);
  // A heading without its unit is flagged on the heading itself.
  await save(
    await addColumn(
      "Formula column",
      "T²",
      "Worked out by a formula",
      "Time squared",
      "No unit yet",
      "T²",
    ),
  );
  await expect(results(page).getByRole("columnheader", { name: /^T²/ })).toContainText(
    "Add the unit to T²: T²/s²",
  );

  // Selecting the reading column lets it be repeated: t becomes t₁ and t₂ with their mean.
  await results(page)
    .getByRole("button", { name: /^t\/s reading ?, change this column$/ })
    .click();
  await results(page).getByRole("button", { name: "Cancel" }).click();
  await results(page).getByRole("button", { name: "Repeat", exact: true }).click();
  await expect(results(page).getByRole("columnheader")).toHaveText([
    /^l\/cm/,
    /^t₁\/s/,
    /^t₂\/s/,
    /^t\/s/,
    /^T\/s/,
    /^T²/,
    /Remove row/,
  ]);
});

test("tabulating, with cells flagged and the coach speaking, has no serious accessibility issues", async ({
  page,
}) => {
  await toTabulate(page);
  await chooseHelp(page, "Check my work");
  await results(page).getByRole("button", { name: "Standard" }).click();
  await cell(page, 1, "t/s").fill("35,9O");
  await cell(page, 1, "t/s").press("Tab");
  await page.getByRole("button", { name: "Check my table" }).click();
  await page.clock.resume();
  expect(await seriousViolations(page)).toEqual([]);
});

test("no sideways scrolling at phone width while tabulating, even with a cell flagged", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "phone", "Phone layout");
  await toTabulate(page);
  await results(page).getByRole("button", { name: "Standard" }).click();
  await cell(page, 1, "t₁/s").fill("35,9O");
  await cell(page, 1, "t₁/s").press("Tab");
  await expect(cell(page, 1, "t₁/s")).toHaveAttribute("aria-invalid", "true");
  const sideways = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(sideways).toBe(0);
});

/** Tabulate at Auto from the Measure readings, carry on, and arrive at Plot. */
async function toPlot(page: Page) {
  await toTabulate(page);
  await results(page).getByRole("button", { name: "Standard" }).click();
  await results(page).getByRole("button", { name: "Fill in my readings" }).click();
  await expect(cell(page, 2, "l/m")).toHaveValue("0.850");
  await page.getByRole("button", { name: "Finish tabulating" }).click();
  await page.getByRole("button", { name: "Carry on as it is" }).click();
  await expect(page.getByText("Step 7 of 10 · Plot")).toBeVisible();
}

const graph = (page: Page) => page.getByRole("region", { name: "Graph sheet" });
const sheetSvg = (page: Page) => graph(page).locator('svg[role="application"]');

/** Click the sheet where a value goes, using the axes the page shows. */
async function clickAt(page: Page, x: number, y: number) {
  const axis = async (name: "Across (x)" | "Up (y)") => {
    const group = graph(page).getByRole("group", { name });
    return {
      per: Number(await group.getByLabel("2 cm stands for").inputValue()),
      start: Number(await group.getByLabel("Starts at").inputValue()),
    };
  };
  const ax = await axis("Across (x)");
  const ay = await axis("Up (y)");
  const box = (await sheetSvg(page).boundingBox())!;
  // The sheet's viewBox: -26 -10 234 276, paper 200 × 240 mm with y measured up.
  const mmX = ((x - ax.start) / ax.per) * 20;
  const mmY = ((y - ay.start) / ay.per) * 20;
  await page.mouse.click(
    box.x + ((mmX + 26) / 234) * box.width,
    box.y + ((240 - mmY + 10) / 276) * box.height,
  );
}

/**
 * At Check my work nothing is worked out for the student, so plot l against the first timing,
 * which the table holds as typed, on scales that use the sheet well.
 */
async function againstFirstTiming(page: Page) {
  const across = graph(page).getByRole("group", { name: "Across (x)" });
  const up = graph(page).getByRole("group", { name: "Up (y)" });
  await up.getByLabel("Plot").selectOption({ label: "t₁/s" });
  await across.getByLabel("2 cm stands for").selectOption("0.01");
  await up.getByLabel("2 cm stands for").selectOption("0.02");
  // Each axis starts at the highest value at or below its smallest reading.
  for (const axis of [across, up]) {
    const starts = axis.getByLabel("Starts at").locator("option");
    await axis.getByLabel("Starts at").selectOption({ index: (await starts.count()) - 1 });
  }
}

const checksRow = (page: Page, part: string) =>
  graph(page)
    .getByText(new RegExp(`^${part}: `))
    .locator("..");

test("at Auto the graph is drawn for you: scales, points, line and a large triangle", async ({
  page,
}) => {
  await toPlot(page);
  await expect(graph(page).getByText("Drawn for you")).toBeVisible();
  await expect(graph(page).getByText("Fig. 2  A graph of T² against l")).toBeVisible();
  await expect(sheetSvg(page).locator('[data-graph="line"]')).toBeVisible();
  await expect(sheetSvg(page).locator('[data-graph="triangle"]')).toBeVisible();
  await expect(graph(page).getByText(/^A \(/)).toBeVisible();
  await expect(graph(page).getByText(/^C \(/)).toBeVisible();
});

test("at Check my work the student plots, draws the line and the triangle, and each is checked", async ({
  page,
}) => {
  await toPlot(page);
  await chooseHelp(page, "Check my work");
  await againstFirstTiming(page);
  await expect(checksRow(page, "Scales")).toContainText("fine");

  // Where each row belongs, as the points list reads it off the table.
  const coords = async (row: number) => {
    const text = await graph(page)
      .getByRole("button", { name: new RegExp(`^Row ${row}: `) })
      .textContent();
    const [, x, y] = /: ([\d.]+), ([\d.]+)/.exec(text ?? "")!;
    return { x: Number(x), y: Number(y) };
  };
  const p1 = await coords(1);
  const p2 = await coords(2);
  const slope = (p2.y - p1.y) / (p2.x - p1.x);
  await clickAt(page, p1.x, p1.y);
  await expect(checksRow(page, "Points")).toContainText("1 of 2 points plotted");
  await clickAt(page, p2.x, p2.y);
  await expect(checksRow(page, "Points")).toContainText("fine");

  await graph(page).getByRole("button", { name: "Draw the line" }).click();
  await clickAt(page, p1.x, p1.y);
  await clickAt(page, p2.x + 0.01, p2.y + slope * 0.01);
  await expect(sheetSvg(page).locator('[data-graph="line"]')).toBeVisible();

  // A triangle squeezed between the points is too small, and its corners sit on them.
  await graph(page).getByRole("button", { name: "Slope triangle" }).click();
  await clickAt(page, p1.x, p1.y);
  await clickAt(page, p1.x + 0.01, p1.y + slope * 0.01);
  await expect(checksRow(page, "Slope triangle")).toContainText(
    /spans only|sits on a plotted point/,
  );
  await expect(graph(page).getByText(/^C \(/)).toBeVisible();

  await page.getByRole("button", { name: "Check my graph" }).click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: /triangle/ })
      .first(),
  ).toBeVisible();
});

test("points can be plotted from the keyboard", async ({ page }) => {
  test.skip(test.info().project.name === "phone", "Keyboard plotting is for desktop");
  await toPlot(page);
  await chooseHelp(page, "Check my work");
  await graph(page)
    .getByRole("group", { name: "Up (y)" })
    .getByLabel("Plot")
    .selectOption({ label: "t₁/s" });
  await sheetSvg(page).focus();
  await page.keyboard.press("Shift+ArrowRight");
  await page.keyboard.press("Shift+ArrowUp");
  await page.keyboard.press("Enter");
  await expect(graph(page).getByRole("button", { name: /^Row 1: .*plotted/ })).toBeVisible();
  await expect(sheetSvg(page)).toHaveAccessibleName("Graph sheet: 1 of 2 points plotted");
});

test("the graph is drawn in colour or black and white, and the choice is remembered", async ({
  page,
}) => {
  await toPlot(page);
  const mono = graph(page).getByRole("button", { name: "Black and white" });
  await mono.click();
  await expect(mono).toHaveAttribute("aria-pressed", "true");
  await expect(sheetSvg(page).locator('[data-graph="line"]')).toHaveAttribute(
    "stroke",
    "var(--pa-graph-mono-fit)",
  );
  await page.reload();
  await expect(graph(page).getByRole("button", { name: "Black and white" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("plotting, with the checks showing, has no serious accessibility issues", async ({ page }) => {
  await toPlot(page);
  await chooseHelp(page, "Check my work");
  await againstFirstTiming(page);
  await clickAt(page, 0.8, 2.0);
  await page.getByRole("button", { name: "Check my graph" }).click();
  await page.clock.resume();
  expect(await seriousViolations(page)).toEqual([]);
});

test("no sideways scrolling at phone width on the graph sheet", async ({ page }, info) => {
  test.skip(info.project.name !== "phone", "Phone layout");
  await toPlot(page);
  const sideways = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(sideways).toBe(0);
});
