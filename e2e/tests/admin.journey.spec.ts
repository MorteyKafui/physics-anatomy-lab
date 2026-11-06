import { expect, test } from "@playwright/test";
import { ADMIN } from "../playwright.config";

test("the admin portal says it is for signed-in team members", async ({ page }) => {
  await page.goto(ADMIN);
  await expect(page.getByRole("heading", { level: 1, name: "Admin" })).toBeVisible();
  await expect(page.getByText("Signed-in team members only.")).toBeVisible();
});
