import { topicHue } from "@pa/ui";

import { SOCIAL_CARD, socialCard } from "../../social-card";
import { CATALOGUE, entry } from "../catalogue";

export const alt = "An experiment in Physics Anatomy";
export const size = SOCIAL_CARD.size;
export const contentType = SOCIAL_CARD.contentType;
export const dynamicParams = false;

export function generateStaticParams() {
  return CATALOGUE.map((e) => ({ id: e.id }));
}

/** Each experiment's card (brief, decision 6): its title, its aim and its topic's colour. */
export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const e = entry((await params).id)!;
  return socialCard({
    title: e.title,
    line: "Physics Anatomy",
    more: e.aim,
    strip: [topicHue[e.topic]],
  });
}
