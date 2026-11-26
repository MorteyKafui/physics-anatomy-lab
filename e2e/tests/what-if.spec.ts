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
  await page.getByRole("button", { name: "What if" }).filter({ visible: true }).click();
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
  await page.getByRole("button", { name: "What if" }).filter({ visible: true }).click();
  const panel = page.getByRole("dialog", { name: "What if" });
  await expect(panel.getByText("g = 9.80665 m s⁻²", { exact: false })).toBeVisible();
  await expect(panel.getByText("not your bench's", { exact: false })).toBeVisible();
});

// Ask what if (online): the AI's scenario is checked again here and the real model runs it.
const ON = { available: true, reason: null, message: null, features: ["tutor", "what-if"] };
const itemStream = (item: object) =>
  `event: item\ndata: ${JSON.stringify({ item })}\n\nevent: done\ndata: {"cut_short": false}\n\n`;

async function askWhatIf(page: import("@playwright/test").Page, body: string) {
  await page.route("**/api/ai/status", (route) => route.fulfill({ json: ON }));
  await page.route("**/api/ai/what-if", (route) =>
    route.fulfill({ status: 200, contentType: "text/event-stream", body }),
  );
  await page.goto(LAB);
  await page.getByRole("button", { name: "What if" }).click();
  const panel = page.getByRole("dialog", { name: "What if" });
  await panel.getByLabel("Ask what if (online)").fill("What if I did this on the Moon?");
  await panel.getByRole("button", { name: "Try it" }).click();
  return panel;
}

test("asking what if fills the panel from the AI's scenario, and the model predicts", async ({
  page,
}) => {
  const panel = await askWhatIf(
    page,
    itemStream({
      kind: "scenario",
      title: "The pendulum on the Moon",
      reason: "Gravity changes to the Moon's.",
      changes: { place: "moon" },
    }),
  );
  await expect(panel.getByRole("status").filter({ hasText: "From your question" })).toContainText(
    "The pendulum on the Moon",
  );
  await expect(panel.getByRole("radio", { name: "The Moon" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await expect(panel.getByText(T({ ...asSet(), place: "moon" }))).toBeVisible();
});

test("a question the model cannot run is declined, with the nearest variant to try", async ({
  page,
}) => {
  const panel = await askWhatIf(
    page,
    itemStream({
      kind: "declined",
      title: "A longer string, 0.85 m",
      reason: "This model treats the string as one that does not stretch.",
      changes: { length: 0.85 },
    }),
  );
  await expect(panel.getByText("The model cannot do that")).toBeVisible();
  await panel.getByRole("button", { name: "Try this instead: A longer string, 0.85 m" }).click();
  await expect(panel.getByText("0.85 m", { exact: true })).toBeVisible();
  await expect(panel.getByText(T({ ...asSet(), length: 0.85 }))).toBeVisible();
});

test("a scenario outside the model's limits is not used, even if the API sent it", async ({
  page,
}) => {
  const panel = await askWhatIf(
    page,
    itemStream({ kind: "scenario", title: "Far", reason: "Longer.", changes: { length: 9 } }),
  );
  await expect(
    panel.getByText("could not be turned into something the model can run"),
  ).toBeVisible();
  await expect(panel.getByText(T(asSet()))).toHaveCount(2);
});

test("a scenario opens on the bench, not marked, and the practice run comes back", async ({
  page,
}) => {
  await page.goto(LAB);
  await expect(page.getByText("Step 1 of 7 · Build")).toBeVisible();
  await page.getByRole("button", { name: "What if" }).filter({ visible: true }).click();
  const panel = page.getByRole("dialog", { name: "What if" });
  await panel.getByRole("radio", { name: "The Moon" }).click();
  await panel.getByRole("button", { name: "Open on the bench" }).click();

  // The lab reopens on the scenario: at Measure, the bench built, the bar saying so.
  const bar = page.getByRole("status").filter({ hasText: "not marked" });
  await expect(bar).toContainText("What if: The Moon, 0.80 m, 8° · not marked");
  await expect(page.getByText("Step 2 of 7 · Measure")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Time 20 oscillations" })).toBeVisible();
  // Conclude and Report stay closed.
  await expect(
    page.getByRole("navigation", { name: "Stages" }).getByRole("button", { name: /Report/ }),
  ).toHaveAttribute("aria-disabled", "true");

  await bar.getByRole("button", { name: "Back to my practice" }).click();
  await expect(page.getByText("Step 1 of 7 · Build")).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "not marked" })).toHaveCount(0);
});
