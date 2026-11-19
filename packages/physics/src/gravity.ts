/**
 * The strength of gravity at the surface of places a what-if scenario can take an experiment
 * (docs/content/ai-tutor-brief.md, decision 6). Stated facts, each with its source, never the
 * bench's own g: a lab's g is the hidden value the student is measuring, so a scenario uses
 * standard gravity for the Earth and would not give that value away.
 */

export interface Place {
  readonly id: "earth" | "moon" | "mars" | "jupiter";
  /** Acceleration of free fall at the surface, m s⁻². */
  readonly g: number;
  readonly source: string;
}

export const PLACES: readonly Place[] = [
  {
    id: "earth",
    g: 9.80665,
    source: "Standard acceleration of gravity, 3rd CGPM (1901); SI Brochure, 9th edition",
  },
  { id: "moon", g: 1.62, source: "NASA Moon Fact Sheet, surface gravity (equatorial)" },
  { id: "mars", g: 3.71, source: "NASA Mars Fact Sheet, surface gravity (equatorial)" },
  {
    id: "jupiter",
    g: 24.79,
    source: "NASA Jupiter Fact Sheet, gravity at the 1 bar level (equatorial)",
  },
];

export type PlaceId = Place["id"];

export function placeById(id: PlaceId): Place {
  const place = PLACES.find((p) => p.id === id);
  if (!place) throw new RangeError(`no such place: ${String(id)}`);
  return place;
}
