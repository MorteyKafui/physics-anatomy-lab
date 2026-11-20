import { SOCIAL_CARD, socialCard } from "./social-card";

export const alt = SOCIAL_CARD.alt;
export const size = SOCIAL_CARD.size;
export const contentType = SOCIAL_CARD.contentType;
export const dynamic = "force-static";

/** The card shown when someone shares the site (logo set brief, decision 4). */
export default function Image() {
  return socialCard();
}
