import { expect, test, type Page } from "@playwright/test";

import { OPEN } from "../playwright.config";

// An open lab (ADR 0047): with accounts switched off, as they are by default, the site has no
// sign-in, sign-up, join, account, teacher or AI-help link, and the account pages send visitors
// home. The other specs run against a server with accounts on, so the account flows keep theirs.

const ACCOUNT_HREF = /^\/(sign-in|join|account|teach)(\/|$|\?)|#signup$/;
const ACCOUNT_WORDS =
  /\b(log in|sign in|sign up|join a class|your account|for teachers|ask the tutor)\b/i;

const PAGES = [
  "/experiments",
  "/experiments/simple-pendulum",
  "/experiments/ohms-law",
  "/about",
  "/partners",
  "/contribute",
  "/donate",
  "/terms",
  "/privacy",
  "/lab/simple-pendulum",
  "/lab/simple-pendulum/report",
  "/no-such-page",
];

async function accountLinks(page: Page) {
  const hrefs = await page
    .locator("a[href]")
    .evaluateAll((links) =>
      links.map(
        (a) =>
          new URL((a as HTMLAnchorElement).href).pathname +
          new URL((a as HTMLAnchorElement).href).hash,
      ),
    );
  return hrefs.filter((h) => ACCOUNT_HREF.test(h));
}

for (const path of PAGES) {
  test(`${path} has no account link`, async ({ page }) => {
    const ai: string[] = [];
    page.on("request", (r) => {
      if (new URL(r.url()).pathname.startsWith("/api/ai/")) ai.push(r.url());
    });
    await page.goto(`${OPEN}${path}`);
    await page.waitForLoadState("networkidle");
    expect(await accountLinks(page)).toEqual([]);
    const text = await page.locator("body").innerText();
    const words = text.split("\n").filter((line) => ACCOUNT_WORDS.test(line));
    // The Terms and Privacy pages say that nobody signs in; nothing else mentions it.
    expect(words.filter((w) => !/nobody signs in|no account/i.test(w))).toEqual([]);
    // AI help is off for everyone, so the lab does not even ask.
    expect(ai).toEqual([]);
  });
}

test("the landing page has no account link", async ({ page }) => {
  await page.goto(OPEN);
  expect(await accountLinks(page)).toEqual([]);
  const text = await page.locator("body").innerText();
  expect(text.split("\n").filter((line) => ACCOUNT_WORDS.test(line))).toEqual([]);
});

test("the account pages redirect home", async ({ request }) => {
  for (const path of [
    "/sign-in",
    "/sign-in/link",
    "/join",
    "/account",
    "/account/delete",
    "/teach",
    "/teach/live",
  ]) {
    const r = await request.get(`${OPEN}${path}`, { maxRedirects: 0 });
    expect(r.status(), path).toBe(307);
    expect(new URL(r.headers().location!, OPEN).pathname, path).toBe("/");
  }
});

test("the sitemap leaves the account pages out, and robots keeps them out", async ({ request }) => {
  const sitemap = await (await request.get(`${OPEN}/sitemap.xml`)).text();
  expect(sitemap).not.toMatch(/\/(sign-in|join|account|teach)\b/);
  const robots = await (await request.get(`${OPEN}/robots.txt`)).text();
  for (const path of ["/sign-in", "/join", "/account", "/teach"])
    expect(robots).toContain(`Disallow: ${path}`);
});

test("the Privacy page says only anonymous counts are kept", async ({ page }) => {
  await page.goto(`${OPEN}/privacy`);
  await expect(
    page.getByText("Nothing is stored about you except anonymous daily counts"),
  ).toBeVisible();
  await expect(page.getByText("Teacher or lecturer")).toHaveCount(0);
  await page.goto(`${OPEN}/terms`);
  await expect(page.getByRole("heading", { name: "4. Your account" })).toHaveCount(0);
});
