import { expect, test } from "@playwright/test";
import { WEB } from "../playwright.config";

test("the page is written in British English", async ({ page }) => {
  await page.goto(WEB);
  await expect(page.locator("html")).toHaveAttribute("lang", "en-GB");
});
