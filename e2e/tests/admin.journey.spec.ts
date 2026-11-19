import { expect, test } from "@playwright/test";
import { ADMIN } from "../playwright.config";

// No API runs beside the portal here, so the portal must say so plainly and show no numbers
// (D29, ADR 0040), while its navigation still works.
test("without the admin API the portal says so and shows no numbers", async ({ page }) => {
  await page.goto(ADMIN);
  await expect(page.getByRole("navigation", { name: "Admin" })).toBeVisible();
  await expect(page.getByText("The admin API did not answer")).toBeVisible();
  await expect(page.getByText("ADMIN_API_URL is not set on the admin server.")).toBeVisible();
  await expect(page.locator(".ad-big")).toHaveCount(0);
});
