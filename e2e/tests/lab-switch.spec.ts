// The lab's two additions on the LabOpen board (design/mockups/LabOpen.dc.html; redesign brief
// section 4): Switch practical and Share link. And no lab mentions a step that is not built.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { WEB } from "../playwright.config";

import { LAB } from "./walk";

// One test opens all six labs, so these get longer than the default 30 s.
test.describe.configure({ timeout: 90_000 });

const PRACTICALS = [
  ["simple-pendulum", "Simple pendulum"],
  ["ohms-law", "Ohm's law and the potentiometer"],
  ["converging-lens", "The converging lens"],
  ["converging-lens-pins", "The converging lens: two pins"],
  ["method-of-mixtures", "The method of mixtures"],
  ["method-of-mixtures-solid", "Mixtures: a hot solid"],
] as const;

const switchButton = (page: Page) =>
  page.getByRole("heading", { level: 1 }).getByRole("button", { name: "Simple pendulum" });
const menu = (page: Page) => page.getByRole("menu", { name: "Switch practical" });

test("the practical's name opens a menu of all six, each a link, the current one marked", async ({
  page,
}) => {
  await page.goto(LAB);
  await expect(page.getByText("Step 1 of 7 · Build")).toBeVisible();
  await expect(switchButton(page)).toHaveAttribute("aria-haspopup", "menu");
  await switchButton(page).click();

  const items = menu(page).getByRole("menuitem");
  await expect(items).toHaveCount(6);
  for (const [i, [id, name]] of PRACTICALS.entries()) {
    await expect(items.nth(i)).toContainText(name);
    await expect(items.nth(i)).toHaveAttribute("href", `/lab/${id}`);
  }
  await expect(items.first()).toHaveAttribute("aria-current", "page");
  await expect(items.first()).toContainText("Step 1 of 7");
  await expect(menu(page)).toContainText("Your work on each practical stays on this device.");
  expect(await serious(page)).toEqual([]);
});

test("the menu works from the keyboard, and switching opens the other lab", async ({
  page,
}, info) => {
  test.skip(info.project.name === "phone", "Keyboard use is for desktop");
  await page.goto(LAB);
  await switchButton(page).focus();
  await page.keyboard.press("Enter");
  await expect(menu(page)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(menu(page)).toBeHidden();
  await expect(switchButton(page)).toBeFocused();

  await page.keyboard.press("Enter");
  await expect(menu(page).getByRole("menuitem").first()).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(menu(page).getByRole("menuitem", { name: /Ohm's law/ })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(`${WEB}/lab/ohms-law`);
  await expect(
    page.getByRole("heading", { level: 1, name: "Ohm's law and the potentiometer" }),
  ).toBeVisible();
  await expect(page.getByText("Step 1 of 10 · Question")).toBeVisible();
});

test("Share link copies the practical's link and says so for a moment", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: WEB });
  await page.goto(`${WEB}/lab/converging-lens`);
  await page.getByRole("button", { name: "Share link" }).click();
  await expect(page.getByRole("button", { name: "Link copied" })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    `${WEB}/lab/converging-lens`,
  );
  await expect(page.getByRole("button", { name: "Share link" })).toBeVisible({ timeout: 5000 });
});

test("with no clipboard, Share link shows the link in a field, selected", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true });
  });
  await page.goto(LAB);
  await page.getByRole("button", { name: "Share link" }).click();
  const field = page.getByRole("textbox", { name: "Link to this practical" });
  await expect(field).toHaveValue(LAB);
  await expect(field).toHaveAttribute("readonly", "");
  await expect(field).toBeFocused();
  expect(
    await field.evaluate((el: HTMLInputElement) => el.selectionEnd! - el.selectionStart!),
  ).toBe(LAB.length);
});

test("no lab mentions a step or section that is not built", async ({ page }) => {
  for (const [id] of PRACTICALS) {
    await page.goto(`${WEB}/lab/${id}`);
    await expect(page.getByRole("navigation", { name: "Stages" })).toBeVisible();
    const text = await page.locator("body").innerText();
    expect(text, id).not.toMatch(/built (next|later)|Phase 1/);
  }
  // The pendulum's strip starts at Build: Question, Predict and Check are not built for it.
  await page.goto(LAB);
  const strip = page.getByRole("navigation", { name: "Stages" });
  await expect(strip.getByRole("button")).toHaveText([
    /01\s*Build/,
    /02\s*Measure/,
    /03\s*Tabulate/,
    /04\s*Plot/,
    /05\s*Analyse/,
    /06\s*Conclude/,
    /07\s*Report/,
    /Review/,
  ]);
});

test("the pendulum's first step shows the stand to build, not an empty bench", async ({ page }) => {
  await page.goto(LAB);
  await expect(page.getByRole("heading", { name: "Set up the pendulum" })).toBeVisible();
  // The finished stand, drawn faintly over the bench as the target, until Build is done.
  const target = page.locator("[data-bench-target] svg");
  await expect(target).toBeVisible();
  expect((await target.boundingBox())!.height).toBeGreaterThan(100);
});

async function serious(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  return violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(" ")).join(", ")})`);
}
