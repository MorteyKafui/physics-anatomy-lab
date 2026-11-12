import { fitLine } from "@pa/analysis";
import { METRE_RULE } from "@pa/instruments";
import { bestFocus, lensForFocalLength } from "@pa/physics";

import { convergingLens, sharpScreenRange, type LensWorld } from "./converging-lens";

/**
 * The numbers on the converging lens print sheets (master plan, "Print sheets"), worked out by
 * the exact lens model on the approved lens (docs/content/converging-lens-brief.md), never typed
 * in (AGENTS.md rule 1). The sheet shows what the class will see: each sharpest image a little
 * nearer the lens than the thin-lens formula gives, and f from the graph a little short.
 */

/** The sheet's number in the Physics Anatomy series. */
export const LENS_SHEET_NUMBER = "PA-003";

export interface LensSheet {
  /** The approved lens: focal length, m; refractive index; diameter, m. */
  focalLength: number;
  index: number;
  aperture: number;
  /** The rule's least count, m. */
  ruleResolution: number;
  /** For each object distance the question sets, m: the sharpest image and the thin-lens v, m. */
  points: { u: number; v: number; thin: number }[];
  /** The best line through 1/v against 1/u (in m⁻¹): its intercepts m₁ and m₂, and f = 2 ⁄ (m₁ + m₂). */
  m1: number;
  m2: number;
  f: number;
  /** At the first object distance: how far the screen can move with the image still sharp, m. */
  sharpRange: number;
}

export function lensSheet(): LensSheet {
  const L = convergingLens.lens;
  const lens = lensForFocalLength(L.focalLength, L.index, L.aperture, L.edge);
  const world: LensWorld = { focalLength: L.focalLength, lens };
  const points = convergingLens.objectDistances.map((u) => ({
    u,
    v: bestFocus(lens, u),
    thin: (u * L.focalLength) / (u - L.focalLength),
  }));
  const fit = fitLine(points.map((p) => ({ x: 1 / p.u, y: 1 / p.v })));
  const m1 = fit.intercept;
  const m2 = -fit.intercept / fit.slope;
  const first = sharpScreenRange(world, points[0]!.u);
  return {
    focalLength: L.focalLength,
    index: L.index,
    aperture: L.aperture,
    // The rule reads in cm.
    ruleResolution: METRE_RULE.resolution / 100,
    points,
    m1,
    m2,
    f: 2 / (m1 + m2),
    sharpRange: first.to - first.from,
  };
}
