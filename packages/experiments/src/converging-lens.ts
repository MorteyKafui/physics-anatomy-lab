import type { Finding, Rule } from "@pa/analysis";
import {
  METRE_RULE,
  parallaxShift,
  quantise,
  substream,
  takeReading,
  withTolerance,
  type Reading,
  type Rng,
} from "@pa/instruments";
import { bestFocus, lensForFocalLength, type SphericalLens } from "@pa/physics";

/**
 * The converging lens with a ray box and a screen: WASSCE's lens practical, as approved in
 * docs/content/converging-lens-brief.md (Experiment 95 of the practical book). Every number the
 * student sees comes from packages/physics (AGENTS.md rule 1). Lengths are in metres; the bench's
 * rule reads in centimetres, as the student records them.
 */
export const convergingLens = {
  id: "converging-lens",
  version: 1,
  topic: "light",
  /** The object distances the question sets, with 35 cm as the worked solution has it, m. */
  objectDistances: [0.2, 0.25, 0.3, 0.35, 0.4],
  /** The approved school lens: biconvex glass, 4.0 cm across. */
  lens: { focalLength: 0.15, index: 1.52, aperture: 0.04, edge: 0.001 },
  /** The blur on the screen the eye cannot tell from sharp, m (assumed until the UEW data). */
  sharpness: 0.0005,
  /** Lens to lens, as a fraction: each attempt's lens differs a little. */
  tolerance: { focalLength: 0.02 },
  /** The optical bench's rule, m. */
  benchLength: 1.0,
  /** A holder's centre mark to its edge, m: what a reading from the edge is off by. */
  holderHalfWidth: 0.01,
  /** How far the gauze's centre may sit off the lens's axis before the image visibly moves, m. */
  coaxialTolerance: 0.003,
  /** Half the screen's height and half the gauze's height, m. */
  screenHalfHeight: 0.05,
  objectHalfHeight: 0.01,
  /** Reading the rule more than this far off square-on is reading it at an angle, degrees. */
  angleLimitDeg: 5,
} as const;

/** The apparatus of one attempt, built from its seed. */
export interface LensWorld {
  /** This lens's focal length, m, and its exact shape. */
  focalLength: number;
  lens: SphericalLens;
}

/** The same seed always builds the same lens. */
export function lensWorld(seed: number): LensWorld {
  const L = convergingLens.lens;
  const focalLength = withTolerance(
    substream(seed, "converging-lens.lens"),
    L.focalLength,
    convergingLens.tolerance.focalLength,
  );
  return { focalLength, lens: lensForFocalLength(focalLength, L.index, L.aperture, L.edge) };
}

/** What is on the bench: each holder's centre mark on the rule, m, and the gauze's height off axis. */
export interface LensBench {
  object: number;
  lens: number;
  screen: number;
  /** Height of the gauze's centre above the lens's axis, m: 0 when they are coaxial. */
  offAxis: number;
}

/** What the screen shows. */
export type ScreenImage =
  | { kind: "misplaced" }
  | { kind: "no-image"; reason: "inside-focal-length"; u: number }
  | {
      kind: "image";
      u: number;
      s: number;
      /** Where the image is sharpest, m from the lens (the exact lens's best focus). */
      sharpestAt: number;
      /** The blur patch on the screen, m, and whether the eye takes it as sharp. */
      blur: number;
      sharp: boolean;
      /** Image size over object size; the image is inverted. */
      magnification: number;
      /** The image's centre on the screen, m from the axis, and whether all of it falls on the screen. */
      offset: number;
      onScreen: boolean;
    };

/**
 * The image on the screen. Its sharpest place is the exact lens's best focus (brief decision 7),
 * and its blur grows either side of it as D |1 − s ⁄ v*|. An object at or inside the focal length
 * makes no real image: nothing sharp forms anywhere on the screen.
 */
export function screenImage(world: LensWorld, bench: LensBench): ScreenImage {
  const u = bench.lens - bench.object;
  const s = bench.screen - bench.lens;
  if (!(u > 0) || !(s > 0)) return { kind: "misplaced" };
  if (u <= world.focalLength) return { kind: "no-image", reason: "inside-focal-length", u };
  const sharpestAt = bestFocus(world.lens, u);
  const blur = world.lens.aperture * Math.abs(1 - s / sharpestAt);
  const magnification = sharpestAt / u;
  const offset = -magnification * bench.offAxis;
  const half = magnification * convergingLens.objectHalfHeight;
  return {
    kind: "image",
    u,
    s,
    sharpestAt,
    blur,
    sharp: blur <= convergingLens.sharpness,
    magnification,
    offset,
    onScreen: Math.abs(offset) + half <= convergingLens.screenHalfHeight,
  };
}

/** The screen positions, m from the lens, where the image looks sharp, centred on its sharpest place. */
export function sharpScreenRange(world: LensWorld, u: number): { from: number; to: number } {
  const v = bestFocus(world.lens, u);
  const k = convergingLens.sharpness / world.lens.aperture;
  return { from: v * (1 - k), to: v * (1 + k) };
}

/** Where the student reads a holder: at its centre mark, or at one of its edges. */
export type ReadFrom = "centre" | "edge";

/**
 * A holder's place as the student reads it on the rule, cm: at the centre mark, or at an edge
 * (the edge nearer the far end of the rule, `side` = 1, or nearer the zero, −1), from square-on or
 * at an angle.
 */
export function readPosition(
  position: number,
  opts: { rng: Rng; from?: ReadFrom; side?: 1 | -1; viewAngleDeg?: number },
): Reading {
  const edge = opts.from === "edge" ? (opts.side ?? 1) * convergingLens.holderHalfWidth : 0;
  const view = opts.viewAngleDeg === undefined ? {} : { viewAngleDeg: opts.viewAngleDeg };
  return takeReading(METRE_RULE, (position + edge) * 100, { rng: opts.rng, ...view });
}

/** A rule reading as a careful student records it: to the nearest millimetre. */
export const recordedPosition = (reading: Reading) =>
  quantise(reading.shown, METRE_RULE.resolution);

/** The correct bench for an object distance, for the coach's demonstration and for tests. */
export function correctLensBench(world: LensWorld, u: number, objectAt = 0.1): LensBench {
  return {
    object: objectAt,
    lens: objectAt + u,
    screen: objectAt + u + bestFocus(world.lens, u),
    offAxis: 0,
  };
}

/** One reading the student took: the distances as read, and how the bench stood when they read it. */
export interface LensReading {
  id: string;
  /** u and v as the student read them off the rule, cm. */
  u: number;
  v: number;
  /** The blur on the screen when they read it, m, and the sharpest place, m from the lens. */
  blur: number;
  sharpestAt: number;
  /** The true screen distance, m from the lens. */
  s: number;
  readFrom: ReadFrom;
  viewAngleDeg: number;
  offAxis: number;
}

export interface LensProcedureContext {
  readings: readonly LensReading[];
  /** Object distances, m, at which the student looked for an image and there was none. */
  noImageAt: readonly number[];
}

const cm = (m: number) => Number((m * 100).toFixed(1));

/** From the mistake catalogue: u or v read from a holder's edge, not its centre mark. */
export const readFromEdge: Rule<LensProcedureContext> = {
  id: "lens-read-from-edge",
  skill: "measurement",
  check: ({ readings }): Finding[] => {
    const off = readings.filter((r) => r.readFrom === "edge");
    if (!off.length) return [];
    return [
      {
        rule: "lens-read-from-edge",
        severity: "warning",
        skill: "measurement",
        key: "findings.lens.readFromEdge",
        params: { count: off.length, cm: cm(convergingLens.holderHalfWidth) },
        rows: off.map((r) => r.id),
      },
    ];
  },
};

/** From the mistake catalogue: the gauze and the lens not on one axis, so the image moves off centre. */
export const notCoaxial: Rule<LensProcedureContext> = {
  id: "lens-not-coaxial",
  skill: "apparatus",
  check: ({ readings }): Finding[] => {
    const off = readings.filter((r) => Math.abs(r.offAxis) > convergingLens.coaxialTolerance);
    if (!off.length) return [];
    const mm = Math.round(Math.max(...off.map((r) => Math.abs(r.offAxis))) * 1000);
    return [
      {
        rule: "lens-not-coaxial",
        severity: "warning",
        skill: "apparatus",
        key: "findings.lens.notCoaxial",
        params: { mm },
        rows: off.map((r) => r.id),
      },
    ];
  },
};

/** From the mistake catalogue: a blurred image taken as sharp, so v is off its sharpest place. */
export const blurredImage: Rule<LensProcedureContext> = {
  id: "lens-blurred-image",
  skill: "measurement",
  check: ({ readings }): Finding[] => {
    const blurred = readings.filter((r) => r.blur > convergingLens.sharpness);
    if (!blurred.length) return [];
    const worst = Math.max(...blurred.map((r) => Math.abs(r.s - r.sharpestAt)));
    return [
      {
        rule: "lens-blurred-image",
        severity: "error",
        skill: "measurement",
        key: "findings.lens.blurredImage",
        params: { count: blurred.length, cm: cm(worst) },
        rows: blurred.map((r) => r.id),
      },
    ];
  },
};

/** From the mistake catalogue: looking for an image with the object at or inside the focal length. */
export const insideFocalLength: Rule<LensProcedureContext> = {
  id: "lens-inside-focal-length",
  skill: "apparatus",
  check: ({ noImageAt }): Finding[] =>
    noImageAt.length
      ? [
          {
            rule: "lens-inside-focal-length",
            severity: "tip",
            skill: "apparatus",
            key: "findings.lens.insideFocalLength",
            params: { u: cm(Math.min(...noImageAt)) },
          },
        ]
      : [],
};

/** From the mistake catalogue: the rule read at an angle, so each reading is shifted by parallax. */
export const scaleAtAngle: Rule<LensProcedureContext> = {
  id: "lens-scale-at-angle",
  skill: "measurement",
  check: ({ readings }): Finding[] => {
    const slanted = readings.filter((r) => Math.abs(r.viewAngleDeg) > convergingLens.angleLimitDeg);
    if (!slanted.length) return [];
    const angle = Math.max(...slanted.map((r) => Math.abs(r.viewAngleDeg)));
    const mm = Number((parallaxShift(METRE_RULE.pointerHeight ?? 0, angle) * 10).toFixed(1));
    return [
      {
        rule: "lens-scale-at-angle",
        severity: "warning",
        skill: "measurement",
        key: "findings.lens.scaleAtAngle",
        params: { angle: Math.round(angle), mm },
        rows: slanted.map((r) => r.id),
      },
    ];
  },
};

export const LENS_PROCEDURE_RULES: Rule<LensProcedureContext>[] = [
  readFromEdge,
  notCoaxial,
  blurredImage,
  insideFocalLength,
  scaleAtAngle,
];
