import { expect, test } from "@playwright/test";
import { periodExact } from "@pa/physics";
import { WEB } from "../playwright.config";

test("the holding page shows the name, the tagline and a computed period", async ({ page }) => {
  await page.goto(WEB);
  await expect(page.getByRole("heading", { level: 1, name: "Physics Anatomy" })).toBeVisible();
  await expect(page.getByText("Physics from first principles.")).toBeVisible();

  // The number comes from the physics package, never typed in (AGENTS.md rule 1).
  const T = periodExact({ length: 0.8, g: 9.81, amplitude: (5 * Math.PI) / 180 });
  await expect(page.getByText(`has a period of ${T.toFixed(3)} s.`)).toBeVisible();
});

test("the page is written in British English", async ({ page }) => {
  await page.goto(WEB);
  await expect(page.locator("html")).toHaveAttribute("lang", "en-GB");
});
