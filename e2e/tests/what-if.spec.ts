// The pendulum's What if panel (design/mockups/AI.dc.html; docs/content/ai-tutor-brief.md,
// decision 6). No AI and no API: it works signed out and offline, and every number it shows comes
// from the scenario model, so the expected values here come from that model too.
import { asSet, predictPendulum } from "@pa/experiments";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { WEB } from "../playwright.config";

const LAB = `${WEB}/lab/simple-pendulum`;
const T = (scenario: Parameters<typeof predictPendulum>[0]) =>
  `T = ${predictPendulum(scenario).period.toFixed(2)} s`;

test("a scenario on the Moon, then a wide swing, predicted by the model", async ({ page }) => {
  await page.goto(LAB);
  await page.getByRole("button", { name: "What if" }).click();
  const panel = page.getByRole("dialog", { name: "What if" });
  await expect(panel).toBeVisible();
  await expect(panel.getByText(T(asSet()))).toHaveCount(2); // as set, and the what if, the same

  await panel.getByRole("radio", { name: "The Moon" }).click();
  await expect(panel.getByRole("radio", { name: "The Moon" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await expect(panel.getByText(T({ ...asSet(), place: "moon" }))).toBeVisible();
  await expect(panel.getByText("NASA Moon Fact Sheet", { exact: false })).toBeVisible();

  await panel.getByRole("slider", { name: "Amplitude" }).fill("60");
  await expect(panel.getByText(T({ ...asSet(), place: "moon", amplitudeDeg: 60 }))).toBeVisible();
  const percent = (
    predictPendulum({ ...asSet(), amplitudeDeg: 60 }).beyondSmallAngle * 100
  ).toFixed(1);
  await expect(panel.getByText(`${percent} % longer`, { exact: false })).toBeVisible();

  await panel.getByRole("slider", { name: "Mass of the bob" }).fill("200");
  await expect(panel.getByText("has no effect on the period")).toBeVisible();
  await expect(panel.getByText(T({ ...asSet(), place: "moon", amplitudeDeg: 60 }))).toBeVisible();

  expect(
    (await new AxeBuilder({ page }).include('[role="dialog"]').analyze()).violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    ),
  ).toEqual([]);

  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
});

test("the Earth in a scenario is standard gravity, not the bench's", async ({ page }) => {
  await page.goto(LAB);
  await page.getByRole("button", { name: "What if" }).click();
  const panel = page.getByRole("dialog", { name: "What if" });
  await expect(panel.getByText("g = 9.80665 m s⁻²", { exact: false })).toBeVisible();
  await expect(panel.getByText("not your bench's", { exact: false })).toBeVisible();
});
