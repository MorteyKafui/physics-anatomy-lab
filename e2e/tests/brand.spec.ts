import { expect, test } from "@playwright/test";

import { ADMIN, WEB } from "../playwright.config";

// The logo set (docs/content/logo-set-brief.md, decision 7): every icon, the manifest and the
// social card the pages point to answer, with the right type and size.

/** Width and height from a PNG's header. */
const pngSize = (body: Buffer) => [body.readUInt32BE(16), body.readUInt32BE(20)];

/** A path on the server under test, from a URL that may carry the build's SITE_URL. */
const local = (base: string, href: string) =>
  new URL(new URL(href, base).pathname + new URL(href, base).search, base).href;

test("the site's icons, manifest and social card all resolve", async ({ page, request }) => {
  await page.goto(WEB);
  const icons = await page
    .locator('link[rel="icon"]')
    .evaluateAll((links) =>
      links.map((l) => ({ href: l.getAttribute("href")!, type: l.getAttribute("type") })),
    );
  expect(icons.map((i) => i.type).sort()).toEqual(["image/svg+xml", "image/x-icon"]);
  for (const icon of icons) {
    const response = await request.get(local(WEB, icon.href));
    expect(response.ok(), icon.href).toBe(true);
    expect(response.headers()["content-type"]).toContain(icon.type!);
  }

  const apple = await page.locator('link[rel="apple-touch-icon"]').getAttribute("href");
  expect(pngSize(await (await request.get(local(WEB, apple!))).body())).toEqual([180, 180]);

  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute("href");
  const manifest = await (await request.get(local(WEB, manifestHref!))).json();
  for (const icon of manifest.icons as { src: string; sizes: string }[]) {
    const body = await (await request.get(local(WEB, icon.src))).body();
    expect(pngSize(body).join("x"), icon.src).toBe(icon.sizes);
  }

  for (const name of ["og:image", "twitter:image"]) {
    const attr = name.startsWith("og") ? "property" : "name";
    const href = await page.locator(`meta[${attr}="${name}"]`).getAttribute("content");
    const response = await request.get(local(WEB, href!));
    expect(response.headers()["content-type"]).toContain("image/png");
    expect(pngSize(await response.body())).toEqual([1200, 630]);
  }
  await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute(
    "content",
    "Physics Anatomy: physics from first principles.",
  );
});

test("the admin portal has its own tab icon", async ({ request }) => {
  const html = await (await request.get(ADMIN)).text();
  const href = html.match(/<link rel="icon" href="([^"]+)"[^>]*image\/svg\+xml/)?.[1];
  expect(href).toBeTruthy();
  const svg = await (await request.get(local(ADMIN, href!))).text();
  expect(svg).toContain('fill="#0D0D0D"');
});
