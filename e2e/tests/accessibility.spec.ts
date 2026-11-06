import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { ADMIN, WEB } from "../playwright.config";

// Every page we ship. Add each new route here when it is built.
const pages = [
  { name: "landing", url: WEB },
  { name: "admin home", url: ADMIN },
];

for (const { name, url } of pages) {
  test(`${name} has no serious or critical accessibility issues`, async ({ page }) => {
    await page.goto(url);
    const { violations } = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    const blocking = violations
      .filter((v) => v.impact === "serious" || v.impact === "critical")
      .map((v) => `${v.id}: ${v.help} (${v.nodes.length} element(s))`);
    expect(blocking).toEqual([]);
  });
}
