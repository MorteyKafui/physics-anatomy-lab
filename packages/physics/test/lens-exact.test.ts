import { describe, expect, test } from "bun:test";
import fc from "fast-check";

import exact from "../../../validation/fixtures/lens-exact.json";
import {
  bestFocus,
  defocusBlur,
  imageDistance,
  lensForFocalLength,
  paraxialImageDistance,
  sharpRange,
  thickLensFocalLength,
  traceAxialRay,
} from "../src";

const rel = (a: number, b: number) => Math.abs(a - b) / Math.abs(b);
const { focalLength, index, aperture, edge } = exact.lens;
const lens = lensForFocalLength(focalLength, index, aperture, edge);

describe("the approved school lens (docs/content/converging-lens-brief.md)", () => {
  test("its radius and thickness agree with the NumPy root-finder, and its focal length is 15.0 cm", () => {
    expect(rel(lens.radius, exact.lens.radius)).toBeLessThan(1e-12);
    expect(rel(lens.thickness, exact.lens.thickness)).toBeLessThan(1e-12);
    expect(rel(thickLensFocalLength(lens), focalLength)).toBeLessThan(1e-12);
  });

  test("every traced ray crosses the axis where 3-D vector Snell's law puts it", () => {
    expect(exact.rays.length).toBeGreaterThan(20);
    for (const r of exact.rays) {
      const t = traceAxialRay(lens, r.objectDistance, r.height);
      expect(rel(t!.crossing, r.crossing)).toBeLessThan(1e-10);
    }
  });

  test("the paraxial image is the limit of the real rays, and agrees with NumPy's", () => {
    for (const i of exact.images) {
      expect(rel(paraxialImageDistance(lens, i.objectDistance), i.paraxial)).toBeLessThan(1e-9);
      expect(rel(traceAxialRay(lens, i.objectDistance, 1e-4)!.crossing, i.paraxial)).toBeLessThan(
        1e-6,
      );
    }
  });

  test("the best focus agrees with NumPy's to within 0.02 cm, a fifth of the bench rule's least count", () => {
    for (const i of exact.images)
      expect(Math.abs(bestFocus(lens, i.objectDistance) - i.bestFocus)).toBeLessThan(0.02);
  });

  test("spherical aberration: edge rays focus nearer the lens, and the best focus lies between", () => {
    for (const i of exact.images) {
      const edgeRay = traceAxialRay(lens, i.objectDistance, 0.95 * (aperture / 2))!.crossing;
      const best = bestFocus(lens, i.objectDistance);
      expect(edgeRay).toBeLessThan(best);
      expect(best).toBeLessThan(i.paraxial);
    }
  });
});

describe("blur on the screen", () => {
  test("agrees with the edge ray traced through ray-transfer matrices", () => {
    expect(exact.blur.length).toBeGreaterThan(20);
    for (const b of exact.blur) {
      const got = defocusBlur(b.objectDistance, b.focalLength, b.screenDistance, b.aperture);
      expect(Math.abs(got - b.diameter)).toBeLessThan(1e-12 * Math.max(1, b.diameter));
    }
  });

  test("is nothing at the image, and the whole aperture for an object at the focal point", () => {
    expect(defocusBlur(20, 15, 60, 4)).toBe(0);
    expect(defocusBlur(15, 15, 30, 4)).toBe(4);
    // A virtual image: the rays spread from the lens, wider than the aperture on any screen.
    expect(defocusBlur(10, 15, 20, 4)).toBeGreaterThan(4);
  });

  test("the sharp range is v (1 ± c ⁄ D), centred on the image, and there is none inside f", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 16, max: 100, noNaN: true }),
        fc.double({ min: 0.01, max: 0.2, noNaN: true }),
        (u, c) => {
          const v = imageDistance(u, 15);
          const r = sharpRange(u, 15, 4, c)!;
          const atEdges = [defocusBlur(u, 15, r.from, 4), defocusBlur(u, 15, r.to, 4)];
          return (
            Math.abs((r.from + r.to) / 2 - v) < 1e-9 * v &&
            atEdges.every((b) => Math.abs(b - c) < 1e-9)
          );
        },
      ),
    );
    expect(sharpRange(15, 15, 4, 0.05)).toBeUndefined();
    expect(sharpRange(10, 15, 4, 0.05)).toBeUndefined();
  });

  test("the brief's table: at u = 20.0 cm the image is sharp from 59.25 cm to 60.75 cm", () => {
    const r = sharpRange(20, 15, 4, 0.05)!;
    expect(r.from).toBeCloseTo(59.25, 10);
    expect(r.to).toBeCloseTo(60.75, 10);
  });
});
