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
  const cards = page.getByRole("status");
  const before = await cards.count();
  await page.getByRole("button", { name: button }).click();
  await expect
    .poll(async () => (await step.isVisible()) || (await cards.count()) > before)
    .toBe(true);
  if (!(await step.isVisible())) await page.getByRole("button", { name: button }).click();
  await expect(step).toBeVisible();
}
