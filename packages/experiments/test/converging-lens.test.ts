import { fitLine, runRules } from "@pa/analysis";
import { createRng, METRE_RULE, parallaxShift } from "@pa/instruments";
import { bestFocus, imageDistance } from "@pa/physics";
import { describe, expect, test } from "bun:test";
import fc from "fast-check";

import {
  convergingLens,
  correctLensBench,
  LENS_PROCEDURE_RULES,
  lensWorld,
  readPosition,
  recordedPosition,
  screenImage,
  sharpScreenRange,
  type LensReading,
} from "../src";

const E = convergingLens;
const world = lensWorld(7);

describe("each attempt's lens", () => {
  test("is the same for the same seed, and within ±2% of 15.0 cm for every seed", () => {
    expect(lensWorld(7)).toEqual(world);
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 2 ** 31 - 1 }), (seed) => {
        const f = lensWorld(seed).focalLength;
        return Math.abs(f / E.lens.focalLength - 1) <= E.tolerance.focalLength + 1e-12;
      }),
    );
  });

  test("every set position gives a real image that fits on the 1 m bench", () => {
    for (let seed = 0; seed < 200; seed += 1) {
      const w = lensWorld(seed);
      for (const u of E.objectDistances) {
        const b = correctLensBench(w, u);
        expect(b.screen).toBeLessThan(E.benchLength);
        expect(screenImage(w, b)).toMatchObject({ kind: "image", sharp: true, onScreen: true });
      }
    }
  });
});

describe("the screen", () => {
  test("shows the image sharpest at the exact lens's best focus (brief decision 7)", () => {
    const u = 0.2;
    const b = correctLensBench(world, u);
    const img = screenImage(world, b);
    expect(img.kind).toBe("image");
    if (img.kind !== "image") return;
    expect(img.blur).toBeCloseTo(0, 12);
    // Short of the thin-lens v, by the aberration the brief records.
    expect(img.sharpestAt).toBeLessThan(imageDistance(u, world.focalLength));
  });

  test("blurs either side of the sharp range, and is sharp across it", () => {
    for (const u of E.objectDistances) {
      const r = sharpScreenRange(world, u);
      const at = (s: number) =>
        screenImage(world, { object: 0.1, lens: 0.1 + u, screen: 0.1 + u + s, offAxis: 0 });
      expect(at((r.from + r.to) / 2)).toMatchObject({ sharp: true });
      expect(at(r.from + 1e-9)).toMatchObject({ sharp: true });
      expect(at(r.to - 1e-9)).toMatchObject({ sharp: true });
      expect(at(r.from - 1e-4)).toMatchObject({ sharp: false });
      expect(at(r.to + 1e-4)).toMatchObject({ sharp: false });
    }
  });

  test("shows no image for an object at or inside the focal length", () => {
    const u = world.focalLength * 0.9;
    expect(
      screenImage(world, { object: 0.1, lens: 0.1 + u, screen: 0.6, offAxis: 0 }),
    ).toMatchObject({ kind: "no-image", reason: "inside-focal-length" });
  });

  test("moves the inverted image off centre when the gauze is off axis, and off the screen when it is far off", () => {
    const b = correctLensBench(world, 0.2);
    const slightly = screenImage(world, { ...b, offAxis: 0.002 });
    const far = screenImage(world, { ...b, offAxis: 0.02 });
    expect(slightly).toMatchObject({ kind: "image", onScreen: true });
    if (slightly.kind === "image") expect(slightly.offset).toBeLessThan(0);
    expect(far).toMatchObject({ kind: "image", onScreen: false });
  });
});

describe("reading the rule", () => {
  test("from the centre mark, square-on, gives the holder's place to the millimetre", () => {
    expect(recordedPosition(readPosition(0.3, { rng: createRng(1) }))).toBe(30);
  });

  test("from an edge is out by half the holder's width", () => {
    const edge = recordedPosition(readPosition(0.3, { rng: createRng(1), from: "edge" }));
    expect(edge - 30).toBeCloseTo(E.holderHalfWidth * 100, 10);
  });

  test("at an angle is shifted by parallax", () => {
    const shown = readPosition(0.3, { rng: createRng(1), viewAngleDeg: 30 }).shown;
    expect(shown - 30).toBeCloseTo(parallaxShift(METRE_RULE.pointerHeight!, 30), 10);
  });
});

/** A careful student's readings at every set position, and f from their graph. */
function carefulRun(seed: number) {
  const w = lensWorld(seed);
  const readings: LensReading[] = E.objectDistances.map((u, i) => {
    const b = correctLensBench(w, u);
    const img = screenImage(w, b);
    if (img.kind !== "image") throw new Error("no image");
    const rng = createRng(seed + i);
    const read = (x: number) => recordedPosition(readPosition(x, { rng }));
    return {
      id: `r${i}`,
      u: read(b.lens) - read(b.object),
      v: read(b.screen) - read(b.lens),
      blur: img.blur,
      sharpestAt: img.sharpestAt,
      s: img.s,
      readFrom: "centre",
      viewAngleDeg: 0,
      offAxis: 0,
    };
  });
  const fit = fitLine(readings.map((r) => ({ x: 1 / r.u, y: 1 / r.v })));
  const m1 = fit.intercept;
  const m2 = -fit.intercept / fit.slope;
  return { w, readings, f: 2 / (m1 + m2) };
}

describe("the mistake catalogue", () => {
  test("a careful run draws no finding, and its f is about 1% short of the lens's, as the brief says", () => {
    const { w, readings, f } = carefulRun(7);
    expect(runRules(LENS_PROCEDURE_RULES, { readings, noImageAt: [] })).toEqual([]);
    expect(f / 100 / w.focalLength).toBeGreaterThan(0.97);
    expect(f / 100 / w.focalLength).toBeLessThan(1.0);
  });

  test("names each mistake once, with the size of its effect", () => {
    const { readings } = carefulRun(7);
    const r0 = readings[0]!;
    const fired = runRules(LENS_PROCEDURE_RULES, {
      readings: [
        { ...r0, id: "a", readFrom: "edge" },
        { ...r0, id: "b", offAxis: 0.01 },
        { ...r0, id: "c", s: r0.sharpestAt + 0.02, blur: 0.04 * (0.02 / r0.sharpestAt) },
        { ...r0, id: "d", viewAngleDeg: 30 },
      ],
      noImageAt: [0.1],
    });
    const by = Object.fromEntries(fired.map((f) => [f.rule, f]));
    expect(Object.keys(by).sort()).toEqual([
      "lens-blurred-image",
      "lens-inside-focal-length",
      "lens-not-coaxial",
      "lens-read-from-edge",
      "lens-scale-at-angle",
    ]);
    expect(by["lens-read-from-edge"]).toMatchObject({ params: { cm: 1 }, rows: ["a"] });
    expect(by["lens-not-coaxial"]).toMatchObject({ params: { mm: 10 }, rows: ["b"] });
    expect(by["lens-blurred-image"]).toMatchObject({ params: { cm: 2 }, rows: ["c"] });
    expect(by["lens-inside-focal-length"]).toMatchObject({ params: { u: 10 } });
    expect(by["lens-scale-at-angle"]).toMatchObject({ params: { angle: 30 }, rows: ["d"] });
    // The blurred image is the one that is wrong; the others are warnings and a tip.
    expect(fired[0]!.rule).toBe("lens-blurred-image");
  });

  test("the sharpest image comes from the physics package's exact lens", () => {
    expect(correctLensBench(world, 0.25).screen - (0.1 + 0.25)).toBeCloseTo(
      bestFocus(world.lens, 0.25),
      12,
    );
  });
});
