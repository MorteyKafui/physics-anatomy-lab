import { expect, test } from "@playwright/test";

import { WEB } from "../playwright.config";

// The team, partners, contributors and donate pages (docs/content/people-pages-brief.md;
// People.dc.html). Their data files start empty, so each page shows its empty state.

test("the footer reaches all four pages", async ({ page, request }) => {
  await page.goto(WEB);
  const about = page.getByRole("navigation", { name: "About" });
  for (const [name, path] of [
    ["The team", "/about"],
    ["Partners and sponsors", "/partners"],
    ["Contribute", "/contribute"],
    ["Donate", "/donate"],
  ] as const) {
    await expect(about.getByRole("link", { name })).toHaveAttribute("href", path);
    expect((await request.get(`${WEB}${path}`)).status()).toBe(200);
  }
});

test("each page says plainly what is not there yet", async ({ page }) => {
  for (const [path, text] of [
    ["/about", "The team's page is being written."],
    ["/partners", "No partners or sponsors yet."],
    ["/contribute", "No one is listed yet."],
    ["/donate", "Donations open once the route is agreed with the university."],
  ] as const) {
    await page.goto(`${WEB}${path}`);
    await expect(page.locator("main [data-empty]")).toContainText(text);
  }
});

test("the partners page states the two rules", async ({ page }) => {
  await page.goto(`${WEB}/partners`);
  await expect(page.getByText("No ads are ever shown to students.")).toBeVisible();
  await expect(page.getByText("No sponsor has a say in the content.")).toBeVisible();
});

test("the donate page takes no payment details and links no payment provider", async ({ page }) => {
  await page.goto(`${WEB}/donate`);
  await expect(page.locator("main input, main form, main iframe")).toHaveCount(0);
  const external = await page
    .locator("main a[href^='http']")
    .evaluateAll((as) => as.map((a) => a.getAttribute("href")));
  expect(external).toEqual([]);
});
