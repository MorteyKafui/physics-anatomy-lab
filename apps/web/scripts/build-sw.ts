/**
 * After `next build`: bundle pwa/sw.ts and inject the precache list, written to public/sw.js.
 *
 * The list is Next's own output, so nothing is listed by hand: every file under .next/static
 * (served at /_next/static/…, named by content), every page the app has
 * (.next/app-path-routes-manifest.json), with each dynamic page expanded by its own
 * generateStaticParams, every file route Next prerendered (.next/prerender-manifest.json), except
 * the ones only crawlers read, and the public files the app needs offline (the report's fonts).
 * Pages are versioned by the build id.
 *
 * Pages render on each request, for their CSP nonce (src/proxy.ts), so Next no longer prerenders
 * them; the service worker fetches each one when it installs, exactly as before.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { injectManifest } from "@serwist/build";

const NEXT = ".next";
const BUNDLED = "pwa/.sw.bundled.js";
const buildId = readFileSync(join(NEXT, "BUILD_ID"), "utf8").trim();
const prerendered = JSON.parse(readFileSync(join(NEXT, "prerender-manifest.json"), "utf8")) as {
  routes: Record<string, unknown>;
};
const appPaths = JSON.parse(
  readFileSync(join(NEXT, "app-path-routes-manifest.json"), "utf8"),
) as Record<string, string>;

/** A page's addresses: itself, or one per entry its generateStaticParams returns. */
async function addresses(entry: string, route: string): Promise<string[]> {
  if (!route.includes("[")) return [route];
  const page = (await import(join(process.cwd(), "src/app", `${entry}.tsx`))) as {
    generateStaticParams?: () => Record<string, string>[] | Promise<Record<string, string>[]>;
  };
  if (!page.generateStaticParams) throw new Error(`${route} has no generateStaticParams`);
  return (await page.generateStaticParams()).map((params) =>
    route.replace(/\[(\w+)\]/g, (_, name: string) => {
      const value = params[name];
      if (!value) throw new Error(`${route}: generateStaticParams gave no ${name}`);
      return value;
    }),
  );
}

const pages = await Promise.all(
  Object.entries(appPaths)
    .filter(([entry]) => entry.endsWith("/page"))
    .map(([entry, route]) => addresses(entry, route)),
);
// Social cards, the sitemap and robots.txt are for crawlers and link previews, never needed
// offline, so they stay out of the offline pack.
const forCrawlers = /(^|\/)(opengraph-image|twitter-image)$|^\/(sitemap\.xml|robots\.txt)$/;
const routes = [...new Set([...pages.flat(), ...Object.keys(prerendered.routes)])]
  .filter((r) => !r.startsWith("/_") && !forCrawlers.test(r))
  .sort();

const bundle = await Bun.build({ entrypoints: ["pwa/sw.ts"], target: "browser", minify: true });
if (!bundle.success) {
  console.error(bundle.logs);
  process.exit(1);
}
await Bun.write(BUNDLED, bundle.outputs[0]!);

const statics = await injectManifest({
  swSrc: BUNDLED,
  swDest: "public/sw.js",
  globDirectory: join(NEXT, "static"),
  globPatterns: ["**/*.{js,css,woff2,woff,png,svg,ico,json}"],
  modifyURLPrefix: { "": "/_next/static/" },
  additionalPrecacheEntries: [
    ...routes.map((url) => ({ url, revision: buildId })),
    ...["NotoSans-Regular.ttf", "NotoSans-Bold.ttf"].map((f) => ({
      url: `/fonts/noto-sans/${f}`,
      revision: buildId,
    })),
  ],
  maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
});
for (const w of statics.warnings) console.warn(w);
console.log(
  `service worker: ${routes.length} pages and ${statics.count} files precached ` +
    `(${(statics.size / 1024 / 1024).toFixed(2)} MB of static files)`,
);
