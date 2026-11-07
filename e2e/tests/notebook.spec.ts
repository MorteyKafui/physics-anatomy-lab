import { readFile } from "node:fs/promises";

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { WEB } from "../playwright.config";

const LAB = `${WEB}/lab/simple-pendulum`;
const NOTEBOOK = `${LAB}/notebook`;

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

async function toBuild(page: Page) {
  await page.goto(LAB);
  for (const next of ["Predict", "Build"])
    await page.getByRole("button", { name: `Continue to ${next}` }).click();
  await expect(page.getByRole("heading", { name: "Set up the pendulum" })).toBeVisible();
}

async function build(page: Page) {
  const tray = page.getByRole("region", { name: "Parts tray" });
  for (const [part, slot] of BUILD_ORDER) {
    await tray.getByRole("button", { name: new RegExp(`^${part}`) }).click();
    await page.getByRole("button", { name: slot }).click();
  }
  await page.getByRole("button", { name: "Finish building" }).click();
}

const snapshotButton = (page: Page) => page.getByRole("button", { name: "Take a snapshot" });
const options = (page: Page) =>
  page.getByRole("listbox", { name: "Snapshots" }).getByRole("option");
const preview = (page: Page) => page.getByRole("region", { name: "Snapshot preview" });
const details = (page: Page) => page.getByRole("complementary", { name: "Snapshot details" });

/** Take two snapshots of your own at the start of the lab, then open the notebook. */
async function twoOfMine(page: Page) {
  await page.goto(LAB);
  await expect(page.getByText("Step 1 of 10 · Question")).toBeVisible();
  await snapshotButton(page).click();
  await expect(page.getByRole("status").filter({ hasText: "Fig. 1 taken" })).toBeVisible();
  await page.getByRole("button", { name: "Continue to Predict" }).click();
  await snapshotButton(page).click();
  await expect(page.getByRole("status").filter({ hasText: "Fig. 2 taken" })).toBeVisible();
  await page.goto(NOTEBOOK);
  await expect(options(page)).toHaveCount(2);
}

test("finishing building puts a labelled figure of the bench in the notebook", async ({ page }) => {
  await toBuild(page);
  await build(page);
  await expect(page.getByRole("status").filter({ hasText: "Fig. 1 taken" })).toBeVisible();
  await page.goto(NOTEBOOK);
  await expect(page.getByText("1 snapshot, 0 yours")).toBeVisible();
  await expect(options(page)).toHaveCount(1);
  await expect(options(page).first()).toContainText("Auto");
  const figure = preview(page).getByRole("img", { name: /^Fig\. 1\. Apparatus set up/ });
  await expect(figure).toBeVisible();
  // Every part on the bench is lettered and keyed in the legend.
  await expect(figure.locator("[data-letter]")).toHaveCount(7);
  await expect(figure.getByText("A: Base plate")).toBeVisible();
  await expect(figure.getByText("G: Stopwatch")).toBeVisible();
  await expect(figure.getByText("l = 0.800 m")).toBeVisible();
  await expect(figure.getByText(/Simple pendulum, version 1 · .* · seed \d+/)).toBeVisible();
  await expect(details(page).getByText("Step 3: Build")).toBeVisible();
});

test("C takes a snapshot anywhere in the lab", async ({ page }, info) => {
  test.skip(info.project.name === "phone", "Keyboard shortcuts are for desktop");
  await page.goto(LAB);
  await expect(page.getByText("Step 1 of 10 · Question")).toBeVisible();
  await page.keyboard.press("c");
  await expect(page.getByRole("status").filter({ hasText: "Fig. 1 taken" })).toBeVisible();
  await page.goto(NOTEBOOK);
  await expect(options(page)).toHaveCount(1);
  await expect(options(page).first()).toContainText("Yours");
});

test("a caption is kept, snapshots are reordered, and a deleted one comes back with Undo", async ({
  page,
}) => {
  await twoOfMine(page);
  await expect(page.getByText("2 snapshots, 2 yours")).toBeVisible();
  // The newest is chosen; give it a caption of its own.
  const caption = details(page).getByRole("textbox", { name: "Caption" });
  await caption.fill("Before predicting");
  await caption.press("Enter");
  await expect(options(page).nth(1)).toContainText("Before predicting");
  await page.reload();
  await expect(options(page).nth(1)).toContainText("Before predicting");

  await options(page).nth(1).click();
  await details(page).getByRole("button", { name: "Move earlier" }).click();
  await expect(options(page).first()).toContainText("Before predicting");
  await expect(
    preview(page).getByRole("img", { name: /^Fig\. 1\. Before predicting/ }),
  ).toBeVisible();

  await details(page).getByRole("button", { name: "Delete this snapshot" }).click();
  await expect(options(page)).toHaveCount(1);
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(options(page)).toHaveCount(2);
  await expect(options(page).first()).toContainText("Before predicting");
});

test("the arrow keys move along the timeline", async ({ page }, info) => {
  test.skip(info.project.name === "phone", "Keyboard use is for desktop");
  await twoOfMine(page);
  await options(page).nth(1).focus();
  await page.keyboard.press("ArrowLeft");
  await expect(options(page).first()).toBeFocused();
  await expect(options(page).first()).toHaveAttribute("aria-selected", "true");
  await expect(details(page).getByText("Fig. 1", { exact: true })).toBeVisible();
});

test("a figure downloads as PNG, SVG and PDF, and everything as one ZIP", async ({ page }) => {
  await twoOfMine(page);
  const get = async (open: () => Promise<void>) => {
    const [download] = await Promise.all([page.waitForEvent("download"), open()]);
    return { name: download.suggestedFilename(), bytes: await readFile((await download.path())!) };
  };
  const format = (f: string) => async () => {
    await details(page).getByRole("button", { name: "Download (PNG, SVG, PDF)" }).click();
    await page.getByRole("button", { name: f, exact: true }).click();
  };

  const png = await get(format("PNG"));
  expect(png.name).toBe("fig-2-simple-pendulum-bench.png");
  expect([...png.bytes.subarray(1, 4)].map((b) => String.fromCharCode(b)).join("")).toBe("PNG");

  const svg = await get(format("SVG"));
  expect(svg.name).toBe("fig-2-simple-pendulum-bench.svg");
  const text = svg.bytes.toString("utf8");
  expect(text).toContain("<svg");
  expect(text).toContain("Physics Anatomy");
  // A file opened on its own has no style sheet, so every theme colour is written in.
  expect(text).not.toContain("var(--");

  const pdf = await get(format("PDF"));
  expect(pdf.name).toBe("fig-2-simple-pendulum-bench.pdf");
  expect(pdf.bytes.subarray(0, 5).toString("latin1")).toBe("%PDF-");

  const zip = await get(() => page.getByRole("button", { name: "Download all (ZIP)" }).click());
  expect(zip.name).toBe("simple-pendulum-notebook.zip");
  const names = zip.bytes.toString("latin1");
  for (const file of [
    "fig-1-simple-pendulum-bench.svg",
    "fig-1-simple-pendulum-bench.png",
    "fig-1-simple-pendulum-bench.pdf",
    "fig-2-simple-pendulum-bench.pdf",
    "attempt.json",
  ])
    expect(names).toContain(file);
});

test("the notebook, empty and with snapshots, has no serious accessibility issues", async ({
  page,
}) => {
  const serious = async () => {
    const { violations } = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    return violations
      .filter((v) => v.impact === "serious" || v.impact === "critical")
      .map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(" ")).join(", ")})`);
  };
  await page.goto(NOTEBOOK);
  await expect(page.getByText("No snapshots yet").first()).toBeVisible();
  expect(await serious()).toEqual([]);
  await twoOfMine(page);
  await page.getByRole("button", { name: "Delete this snapshot" }).click();
  await expect(page.getByRole("button", { name: "Undo" })).toBeVisible();
  expect(await serious()).toEqual([]);
});

test("no sideways scrolling at phone width in the notebook", async ({ page }, info) => {
  test.skip(info.project.name !== "phone", "Phone layout");
  await twoOfMine(page);
  const sideways = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(sideways).toBe(0);
});
