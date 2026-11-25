import type { MetadataRoute } from "next";

import { CATALOGUE } from "./experiments/catalogue";
import { page } from "./experiments/seo";
import { absolute } from "./site";

/**
 * The pages search engines should find (experiment pages brief, decision 7): the landing page,
 * the experiments, the people pages, and the draft Terms and Privacy. The lab's own screens are left out.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: absolute("/") },
    { url: absolute("/experiments") },
    ...CATALOGUE.map((e) => ({ url: absolute(page(e.id)) })),
    ...["/about", "/partners", "/contribute", "/donate"].map((p) => ({ url: absolute(p) })),
    { url: absolute("/terms") },
    { url: absolute("/privacy") },
  ];
}
