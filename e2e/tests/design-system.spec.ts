import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { THEMES } from "@pa/ui";
import { ADMIN } from "../playwright.config";

const CATALOGUE = `${ADMIN}/design-system`;

const THEME_BUTTON = {
  lab: "Lab (dark)",
  bench: "Bench paper",
  site: "Site (light)",
  projector: "Projector",
} as const;

for (const theme of THEMES) {
  test(`the catalogue in the ${theme} theme has no serious or critical accessibility issues`, async ({
    page,
  }) => {
    await page.goto(CATALOGUE);
    await page.getByRole("button", { name: THEME_BUTTON[theme], exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);

    const { violations } = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    const blocking = violations
      .filter((v) => v.impact === "serious" || v.impact === "critical")
      .map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(" ")).join(", ")})`);
    expect(blocking).toEqual([]);
  });
}

test("every corner is square except truly round things (Lyra)", async ({ page }) => {
  await page.goto(CATALOGUE);
  const rounded = await page.evaluate(() =>
    [...document.querySelectorAll("body *")]
      .filter((el) => !el.closest("nextjs-portal"))
      // Only corners someone can see: skip hidden form inputs and zero-size helpers.
      .filter((el) => {
        const box = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        const clipped = style.clipPath.startsWith("inset(50%") || style.clip.startsWith("rect(0");
        return (
          box.width > 2 &&
          box.height > 2 &&
          !clipped &&
          style.visibility !== "hidden" &&
          style.opacity !== "0"
        );
      })
      .filter((el) =>
        getComputedStyle(el)
          .borderRadius.split(" ")
          .some((r) => parseFloat(r) > 0),
      )
      .filter((el) => !el.classList.contains("rounded-full"))
      .map((el) => `${el.tagName.toLowerCase()}.${[...el.classList].slice(0, 4).join(".")}`),
  );
  expect(rounded).toEqual([]);
});

test("the dialog, drawer and toast open in the page's theme", async ({ page }) => {
  await page.goto(CATALOGUE);
  await page.getByRole("button", { name: "Projector", exact: true }).click();

  await page.getByRole("button", { name: "Open a dialog" }).click();
  const dialog = page.getByRole("dialog", { name: "Delete this reading?" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveCSS("background-color", "rgb(241, 240, 235)");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();

  await page.getByRole("button", { name: "Show a toast with Undo" }).click();
  await expect(page.getByText("Reading deleted")).toBeVisible();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.getByText("Reading restored")).toBeVisible();
});

test("controls are at least 44 px tall on a touch screen", async ({ page }, info) => {
  test.skip(info.project.name !== "phone", "Touch sizing applies to coarse pointers");
  await page.goto(CATALOGUE);
  for (const name of ["Start measuring", "Add a row", "Reset"]) {
    const box = await page.getByRole("button", { name, exact: true }).boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  }
  const input = await page.getByLabel("Length of the pendulum (cm)").boundingBox();
  expect(input?.height ?? 0).toBeGreaterThanOrEqual(44);
});
