// The teacher's "AI for this class" switch and the Your data line (design/mockups/AI.dc.html,
// "Teacher switch" and "Your data"). The API is mocked in the browser.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Request } from "@playwright/test";
import { WEB } from "../playwright.config";

test.use({ serviceWorkers: "block" });

const CLASS = {
  id: "c-1",
  name: "Example class",
  code: "7KQ-42M",
  joining_open: true,
  ai_enabled: false,
  created_at: "2026-11-19T09:00:00Z",
  code_changed_at: "2026-11-19T09:00:00Z",
};

test("a teacher turns AI on for a class, and off again", async ({ page }) => {
  const patches: Request[] = [];
  await page.route("**/api/consents", (route) => route.abort());
  await page.route("**/api/classes", (route) => route.fulfill({ json: [CLASS] }));
  await page.route("**/api/classes/c-1", (route) => {
    patches.push(route.request());
    const body = route.request().postDataJSON() as { ai_enabled: boolean };
    return route.fulfill({ json: { ...CLASS, ai_enabled: body.ai_enabled } });
  });
  await page.goto(`${WEB}/teach`);
  const ai = page.getByRole("switch", { name: "AI for this class" });
  await expect(ai).not.toBeChecked();
  await expect(page.getByText("Off. Students see the coach only.")).toBeVisible();
  await expect(page.getByText("never a student's name", { exact: false })).toBeVisible();

  await ai.click();
  await expect(ai).toBeChecked();
  await expect(page.getByText("On. Students in this class can use AI help.")).toBeVisible();
  expect(patches[0]?.method()).toBe("PATCH");
  expect(patches[0]?.postDataJSON()).toEqual({ ai_enabled: true });

  await ai.click();
  await expect(ai).not.toBeChecked();
  expect(patches[1]?.postDataJSON()).toEqual({ ai_enabled: false });

  const serious = (await new AxeBuilder({ page }).analyze()).violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  expect(serious).toEqual([]);
});

test("Your data says what AI is sent and what is kept", async ({ page }) => {
  await page.route("**/api/auth/me", (route) =>
    route.fulfill({
      json: { kind: "teacher", id: "u-1", email: "t@example.org", display_name: "T" },
    }),
  );
  await page.route("**/api/consents", (route) => route.fulfill({ json: { consents: [] } }));
  await page.goto(`${WEB}/account`);
  await expect(page.getByText("AI help", { exact: true })).toBeVisible();
  await expect(page.getByText("Never your name or your class.", { exact: false })).toBeVisible();
  await expect(
    page.getByText("We keep a count of AI use for 90 days", { exact: false }),
  ).toBeVisible();
});
