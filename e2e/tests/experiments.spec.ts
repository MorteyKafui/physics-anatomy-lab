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

test("the index lists every lab, and each opens its page", async ({ page }) => {
  await page.goto(`${WEB}/experiments`);
  const links = page.getByRole("list", { name: "Every experiment" }).getByRole("link");
  await expect(links).toHaveCount(IDS.length);
  await links.first().click();
  await expect(page).toHaveURL(`${WEB}/experiments/${IDS[0]}`);
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
    await expect(page.getByRole("link", { name: "Open the lab" })).toHaveAttribute(
      "href",
      `/lab/${id}`,
    );
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
  await page.goto(`${WEB}/experiments/converging-lens`);
  const hrefs = await page
    .locator("main a[href]")
    .evaluateAll((as) => [...new Set(as.map((a) => a.getAttribute("href")!))]);
  for (const href of hrefs) {
    const r = await request.get(new URL(href, WEB).href, { headers: { connection: "close" } });
    expect(r.status(), href).toBe(200);
  }
});
