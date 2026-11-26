import { readFile } from "node:fs/promises";

import { expect, test, type Page } from "@playwright/test";

import { ADMIN, WEB } from "../playwright.config";

// docs/security/asvs-review-brief.md: every page carries a Content Security Policy with a nonce of
// its own, and the fixed security headers; no page breaks the policy. The policy is enforced, so a
// break also fails the tests of whatever it stopped; the browser's violation events are collected
// here as well, because a blocked image or font may not show on screen.

const CSP = "content-security-policy";

/** Every page the service worker keeps for offline use: the web app's own list of its pages. */
async function webPages(): Promise<string[]> {
  const sw = await readFile(new URL("../../apps/web/public/sw.js", import.meta.url), "utf8");
  const urls = [...sw.matchAll(/"url":"(\/[^"]*)"/g)].map((m) => m[1]!);
  return urls.filter((u) => !/^\/(_next|fonts|icons)\/|\.(ico|svg|webmanifest)$|-icon$/.test(u));
}

const nonceOf = (policy: string) => /'nonce-([^']+)'/.exec(policy)?.[1];

/** Collects the page's CSP violations, from before its first script runs. */
async function watchViolations(page: Page): Promise<() => Promise<string[]>> {
  await page.addInitScript(() => {
    const seen: string[] = [];
    (window as unknown as { __violations: string[] }).__violations = seen;
    document.addEventListener("securitypolicyviolation", (e) =>
      seen.push(`${e.effectiveDirective} blocked ${e.blockedURI || "inline"}`),
    );
  });
  return () =>
    page.evaluate(() => (window as unknown as { __violations: string[] }).__violations ?? []);
}

test("the fixed security headers are on pages, files and the API", async ({ request }) => {
  for (const path of ["/", "/lab/simple-pendulum", "/icon.svg", "/sw.js"]) {
    const h = (await request.get(WEB + path)).headers();
    expect(h["strict-transport-security"], path).toBe("max-age=63072000; includeSubDomains");
    expect(h["x-content-type-options"], path).toBe("nosniff");
    expect(h["referrer-policy"], path).toBe("strict-origin-when-cross-origin");
    expect(h["x-frame-options"], path).toBe("DENY");
    expect(h["cross-origin-opener-policy"], path).toBe("same-origin");
    expect(h["permissions-policy"], path).toContain("microphone=()");
  }
  const admin = (await request.get(ADMIN + "/design-system")).headers();
  expect(admin["x-frame-options"]).toBe("DENY");
  expect(admin[CSP]).toContain("frame-ancestors 'none'");
});

test("every page has a nonce of its own, and every script it sends carries it", async ({
  request,
}) => {
  // Two renders of every page; about 9 s alone, much longer with the whole suite running.
  test.setTimeout(180_000);
  const pages = await webPages();
  expect(pages.length).toBeGreaterThan(50);
  for (const path of pages) {
    const first = await request.get(WEB + path);
    const second = await request.get(WEB + path);
    const policy = first.headers()[CSP];
    expect(policy, path).toContain("'strict-dynamic'");
    expect(policy, path).toContain("frame-ancestors 'none'");
    const nonce = nonceOf(policy!);
    expect(nonce, path).toBeTruthy();
    expect(nonceOf(second.headers()[CSP]!), path).not.toBe(nonce);

    // Every executable script in the HTML has this response's nonce; JSON-LD is data, not code.
    const html = await first.text();
    const scripts = [...html.matchAll(/<script\b([^>]*)>/g)].map((m) => m[1]!);
    const executable = scripts.filter((attrs) => !/type="application\/ld\+json"/.test(attrs));
    expect(executable.length, path).toBeGreaterThan(0);
    for (const attrs of executable) expect(attrs, path).toContain(`nonce="${nonce}"`);
  }
});

test("Turnstile's frame is allowed on the sign-in and join screens only", async ({ request }) => {
  const frames = async (path: string) =>
    /frame-src ([^;]+)/.exec((await request.get(WEB + path)).headers()[CSP]!)?.[1];
  expect(await frames("/sign-in")).toBe("https://challenges.cloudflare.com");
  expect(await frames("/join")).toBe("https://challenges.cloudflare.com");
  expect(await frames("/lab/simple-pendulum")).toBe("'none'");
});

test("no page of the web app breaks the policy as it loads", async ({ page }) => {
  test.setTimeout(240_000);
  const violations = await watchViolations(page);
  for (const path of await webPages()) {
    await page.goto(WEB + path, { waitUntil: "networkidle" });
    expect(await violations(), path).toEqual([]);
  }
});

test("no admin page breaks the policy as it loads", async ({ page }) => {
  const violations = await watchViolations(page);
  for (const path of ["/design-system", "/spikes/3d-bench/anatomy"]) {
    await page.goto(ADMIN + path, { waitUntil: "networkidle" });
    expect(await violations(), path).toEqual([]);
  }
});

test("the public site does not pass staff routes on to the API", async ({ request }) => {
  // Only the admin portal's server calls /admin (ADR 0040). Through the public site they are not
  // found; they never reach the API, which in this run is not even started.
  for (const path of ["/api/admin/me", "/api/admin/summary", "/api/admin/questions"]) {
    expect((await request.get(WEB + path)).status(), path).toBe(404);
  }
});
