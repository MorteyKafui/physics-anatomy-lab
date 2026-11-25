import type { MetadataRoute } from "next";

import { absolute } from "./site";

/**
 * Search engines may read the public pages; the lab's screens, the teacher's pages and accounts
 * are tools, not pages to find (experiment pages brief, decision 7).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/lab/", "/teach", "/account", "/sign-in", "/join", "/api/"],
    },
    sitemap: absolute("/sitemap.xml"),
  };
}
