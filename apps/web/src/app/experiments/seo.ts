import { t, type MessageKey } from "@pa/i18n";
import "@pa/i18n/catalogue";

import { absolute } from "../site";
import type { Entry } from "./catalogue";

/** An experiment page's own path. */
export const page = (id: string) => `/experiments/${id}`;

/** The suggested citation (brief, decision 4): the year the page was built, and its address. */
export function citation(e: Entry, year = new Date().getFullYear()) {
  return `Physics Anatomy (${year}). ${e.title}, version ${e.version}. ${absolute(page(e.id))}`;
}

/** The page's `LearningResource` (brief, decision 5). The test reads it back from the HTML. */
export function learningResource(e: Entry) {
  return {
    "@context": "https://schema.org",
    "@type": "LearningResource",
    name: e.title,
    description: e.aim,
    url: absolute(page(e.id)),
    image: absolute(`${page(e.id)}/opengraph-image`),
    learningResourceType: "Virtual laboratory",
    educationalLevel: ["Senior high school (WASSCE)", "University"],
    teaches: e.teaches,
    about: t(`catalogue.topic.${e.topic}` as MessageKey),
    inLanguage: "en-GB",
    isAccessibleForFree: true,
    version: String(e.version),
    provider: { "@type": "Organization", name: "Physics Anatomy", url: absolute("/") },
  };
}
