import AxeBuilder from "@axe-core/playwright";
import { countFromOneErrorPercent } from "@pa/experiments";
import { expect, test, type Page } from "@playwright/test";
import { WEB } from "../playwright.config";

const LAB = `${WEB}/lab/simple-pendulum`;

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
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
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
  await expect(page.getByText(/^Readings: \d+\.\d{2} s$/)).toBeVisible();

  await page.reload();
  await expect(page.getByText("Step 5 of 10 · Measure")).toBeVisible();
  await expect(page.getByText(/^Readings: \d+\.\d{2} s$/)).toBeVisible();

  await timeCountingFromOne(page);
  await page.getByRole("button", { name: "Reset and try again" }).click();
  await expect(page.getByText(/^Readings: \d+\.\d{2} s$/)).toBeVisible();
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
  await expect(page.getByText(/^Readings: \d+\.\d{2} s$/)).toBeVisible();
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
