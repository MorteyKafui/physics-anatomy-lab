import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";

/** What the Ohm's law tests share: the diagram's leads, wiring them, and the accessibility check. */

export const DIAGRAM: [string, string][] = [
  ["cell+", "R.1"],
  ["R.2", "A+"],
  ["A-", "wire.Q"],
  ["jockey", "wire.P"],
  ["wire.P", "key.1"],
  ["key.2", "cell-"],
  ["V+", "cell+"],
  ["V-", "cell-"],
];

export const serious = async (page: Page) => {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  return violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(" ")).join(", ")})`);
};

export const terminal = (page: Page, t: string) => page.locator(`[data-terminal-button="${t}"]`);

export async function wire(page: Page, leads: [string, string][]) {
  for (const [a, b] of leads) {
    await terminal(page, a).click();
    await terminal(page, b).click();
  }
}
