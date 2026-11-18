import { expect, type Page } from "@playwright/test";

/**
 * Finish a step. The apparatus differs a little in every attempt, so on some the coach flags
 * something on the way out; the student reads it and finishes again to carry on.
 *
 * Wait for what the press did (the next step, or a new coach card), never for a fixed time: a
 * timed wait that falls back to pressing again is a retry, and under load it presses twice.
 */
export async function finish(page: Page, button: string, next: string) {
  const step = page.getByText(next);
  // The coach's cards as text, so a card that replaces another (same count) still counts.
  const cards = async () => (await page.getByRole("status").allTextContents()).join("\n");
  const before = await cards();
  await page.getByRole("button", { name: button }).click();
  await expect.poll(async () => (await step.isVisible()) || (await cards()) !== before).toBe(true);
  if (!(await step.isVisible())) await page.getByRole("button", { name: button }).click();
  await expect(step).toBeVisible();
}
