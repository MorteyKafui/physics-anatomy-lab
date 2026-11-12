import { fitLine } from "@pa/analysis";
import { METRE_RULE } from "@pa/instruments";
import { lensForFocalLength } from "@pa/physics";

import { convergingLens, type LensWorld } from "./converging-lens";
import { lensPins, lineUpAt, noParallaxStretch } from "./converging-lens-pins";

/**
 * The numbers on the two-pin print sheets (master plan, "Print sheets"), worked out by the exact
 * lens model on the approved lens and the approved way of looking (decisions 8 to 12), never typed
 * in (AGENTS.md rule 1).
 */

/** The sheet's number in the Physics Anatomy series. */
export const PINS_SHEET_NUMBER = "PA-004";

export interface PinsSheet {
  /** The approved lens: focal length, m; refractive index; diameter, m. */
  focalLength: number;
  index: number;
  aperture: number;
  /** The rule's least count, m; the eye's distance behind the image and the head's travel, m. */
  ruleResolution: number;
  eyeBehind: number;
  head: number;
  /** For each object distance the question sets, m: where the views line up, and the thin-lens y. */
  points: { x: number; y: number; thin: number }[];
  /** The best line through xy against (x + y): its slope, which is f, m. */
  slope: number;
  /** At the first object distance: the stretch of the search pin's travel with no parallax, m. */
  stretch: number;
}

export function pinsSheet(): PinsSheet {
  const L = convergingLens.lens;
  const lens = lensForFocalLength(L.focalLength, L.index, L.aperture, L.edge);
  const world: LensWorld = { focalLength: L.focalLength, lens };
  const points = lensPins.objectDistances.map((x) => ({
    x,
    y: lineUpAt(world, x, 0),
    thin: (x * L.focalLength) / (x - L.focalLength),
  }));
  const fit = fitLine(points.map((p) => ({ x: p.x + p.y, y: p.x * p.y })));
  const first = noParallaxStretch(world, points[0]!.x);
  return {
    focalLength: L.focalLength,
    index: L.index,
    aperture: L.aperture,
    // The rule reads in cm.
    ruleResolution: METRE_RULE.resolution / 100,
    eyeBehind: lensPins.view.eyeBehind,
    head: lensPins.view.head,
    points,
    slope: fit.slope,
    stretch: first.to - first.from,
  };
}
