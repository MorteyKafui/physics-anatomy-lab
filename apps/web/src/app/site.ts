/**
 * The site's own address, which social cards, canonical links, the sitemap and citations need in
 * full. Set SITE_URL when building for staging or production; until the domain is bought, local
 * builds use the dev server.
 */
export const SITE_URL = (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export const absolute = (path: string) => `${SITE_URL}${path}`;
