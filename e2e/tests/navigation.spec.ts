import { expect, test } from "@playwright/test";

import { WEB } from "../playwright.config";

// Pages render on each request (ADR 0046), so a link's default prefetch fetches almost nothing and
// the click would wait for a whole render. The app's links prefetch the whole page instead, as
// they did when the pages were static: moving between lab pages asks the server for nothing new.

test("moving between lab pages waits for no new request once the links have prefetched", async ({
  page,
}) => {
  await page.goto(`${WEB}/lab/converging-lens/exam`);
  await page.waitForLoadState("networkidle");

  const afterClick: string[] = [];
  let clicked = false;
  page.on("request", (r) => {
    const rsc = r.url().includes("_rsc=") || r.headers()["rsc"] === "1";
    if (clicked && rsc && !r.headers()["next-router-prefetch"]) afterClick.push(r.url());
  });

  clicked = true;
  await page.locator('header a[href="/lab/converging-lens"]').first().click();
  await expect(page).toHaveURL(`${WEB}/lab/converging-lens`);
  expect(afterClick).toEqual([]);
});
