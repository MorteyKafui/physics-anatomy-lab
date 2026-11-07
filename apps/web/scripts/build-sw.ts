/**
 * After `next build`: bundle pwa/sw.ts and inject the precache list, written to public/sw.js.
 *
 * The list is Next's own output, so nothing is listed by hand: every file under .next/static
 * (served at /_next/static/…, named by content), every route Next prerendered
 * (.next/prerender-manifest.json), and the public files the app needs offline (the report's
 * fonts). Pages are versioned by the build id.
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
const routes = Object.keys(prerendered.routes).filter((r) => !r.startsWith("/_"));

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
