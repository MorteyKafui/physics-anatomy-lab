import { expect, test } from "@playwright/test";

import { WEB } from "../playwright.config";

// The experiment pages (docs/content/experiment-pages-brief.md; ExperimentPage.dc.html).
const IDS = [
  "simple-pendulum",
  "ohms-law",
  "converging-lens",
  "converging-lens-pins",
  "method-of-mixtures",
  "method-of-mixtures-solid",
];

const pngSize = (body: Buffer) => [body.readUInt32BE(16), body.readUInt32BE(20)];

test("the practicals page lists every lab, and each opens its lab and its page", async ({
  page,
}) => {
  await page.goto(`${WEB}/experiments`);
  const cards = page.getByRole("list", { name: "Every practical" }).getByRole("listitem");
  await expect(cards).toHaveCount(IDS.length);
  for (const [i, id] of IDS.entries()) {
    const card = cards.nth(i);
    await expect(card.getByRole("link", { name: "Open the lab" })).toHaveAttribute(
      "href",
      `/lab/${id}`,
    );
    await expect(card.getByRole("link", { name: "About this practical" })).toHaveAttribute(
      "href",
      `/experiments/${id}`,
    );
    await expect(card.locator("[data-badge]")).toHaveText(/^\S+ = \d+\.\d+ \S+$/);
  }
  await cards.first().getByRole("link", { name: "About this practical" }).click();
  // The page is rendered on its request (ADR 0046), which can be slow with the whole suite running.
  await expect(page).toHaveURL(`${WEB}/experiments/${IDS[0]}`, { timeout: 20_000 });
});

test("the topic chips show only that topic's practicals", async ({ page }) => {
  await page.goto(`${WEB}/experiments`);
  const filter = page.getByRole("group", { name: "Filter by topic" });
  const shown = page.getByRole("list", { name: "Every practical" }).locator("li:visible");
  await expect(filter.getByRole("button", { name: "All 6" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await filter.getByRole("button", { name: "Light 2" }).click();
  await expect(shown).toHaveCount(2);
  await expect(shown.first()).toHaveAttribute("data-practical", "converging-lens");
  await expect(filter.getByRole("button", { name: "Light 2" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await filter.getByRole("button", { name: "Mechanics 1" }).click();
  await expect(shown).toHaveCount(1);
  await filter.getByRole("button", { name: "All 6" }).click();
  await expect(shown).toHaveCount(IDS.length);
});

test("the header has no account links, and Practicals is the current page", async ({ page }) => {
  await page.goto(`${WEB}/experiments`);
  // On a phone the main nav is behind the menu button, so this reads the header's markup.
  await expect(page.locator('header a[aria-current="page"]')).toHaveText("Practicals");
  await expect(page.locator('header a[aria-current="page"]')).toHaveAttribute(
    "href",
    "/experiments",
  );
  await expect(page.getByRole("link", { name: /log in|sign up/i })).toHaveCount(0);
});

for (const id of IDS) {
  test(`${id}: its page, its LearningResource and its social card`, async ({ page, request }) => {
    await page.goto(`${WEB}/experiments/${id}`);
    const title = (await page.getByRole("heading", { level: 1 }).textContent())!;
    const ld = JSON.parse(
      (await page.locator('script[type="application/ld+json"]').textContent())!,
    ) as Record<string, unknown>;
    expect(ld).toMatchObject({
      "@type": "LearningResource",
      name: title,
      inLanguage: "en-GB",
      isAccessibleForFree: true,
      learningResourceType: "Virtual laboratory",
    });
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      new RegExp(`/experiments/${id}$`),
    );
    await expect(
      page.getByRole("main").getByRole("link", { name: "Open the lab" }),
    ).toHaveAttribute("href", `/lab/${id}`);
    await expect(page.locator("[data-model-card]")).toContainText("How it is checked:");

    const card = await request.get(`${WEB}/experiments/${id}/opengraph-image`);
    expect(card.headers()["content-type"]).toContain("image/png");
    expect(pngSize(await card.body())).toEqual([1200, 630]);
  });
}

test("the sitemap lists every page, and robots keeps the lab's screens out", async ({
  request,
}) => {
  const sitemap = await (await request.get(`${WEB}/sitemap.xml`)).text();
  for (const id of IDS) expect(sitemap).toContain(`/experiments/${id}</loc>`);
  const robots = await (await request.get(`${WEB}/robots.txt`)).text();
  expect(robots).toContain("Disallow: /lab/");
  expect(robots).toMatch(/Sitemap: .+\/sitemap\.xml/);
});

test("every link on an experiment page goes somewhere real", async ({ page, request }) => {
  // Each link is a page rendered on its request (ADR 0046); with the whole suite running against
  // one local server, ten of them can take longer than the default 30 s. Alone it takes about 6 s.
  test.setTimeout(90_000);
  await page.goto(`${WEB}/experiments/converging-lens`);
  const hrefs = await page
    .locator("main a[href]")
    .evaluateAll((as) => [...new Set(as.map((a) => a.getAttribute("href")!))]);
  for (const href of hrefs) {
    const r = await request.get(new URL(href, WEB).href, { headers: { connection: "close" } });
    expect(r.status(), href).toBe(200);
  }
});
