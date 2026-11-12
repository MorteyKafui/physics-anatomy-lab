import { describe, expect, test } from "bun:test";
import fc from "fast-check";

import fixture from "../../../validation/fixtures/lens-parallax.json";
import { lensForFocalLength, noParallax, paraxialImageDistance, parallaxAngle } from "../src";

const { focalLength, index, aperture, edge } = fixture.lens;
const lens = lensForFocalLength(focalLength, index, aperture, edge);
const ARCMIN = Math.PI / 180 / 60;

describe("the parallax between the search pin and the image (Experiment 96)", () => {
  test("every apparent angle agrees with the 3-D vector-Snell trace in NumPy", () => {
    expect(fixture.angles.length).toBeGreaterThan(40);
    for (const a of fixture.angles) {
      const got = parallaxAngle(lens, a.objectDistance, a.pin, a.eye, a.head)!;
      expect(Math.abs(got - a.angle!)).toBeLessThan(
        1e-9 * Math.max(1e-6, Math.abs(a.angle!)) + 1e-12,
      );
    }
  });

  test("the image moves with the eye when it is further from the eye than the pin, and against it when nearer", () => {
    const u = 30;
    const v = paraxialImageDistance(lens, u);
    const eye = v + 25;
    // Pin nearer the lens than the image: the image is nearer the eye, so it moves against the head.
    expect(parallaxAngle(lens, u, 0.95 * v, eye, 0.3)!).toBeGreaterThan(0);
    // Pin beyond the image: the image is further from the eye, so it moves with the head.
    expect(parallaxAngle(lens, u, 1.05 * v, eye, 0.3)!).toBeLessThan(0);
    // The eye below the axis sees the same, mirrored.
    expect(parallaxAngle(lens, u, 1.05 * v, eye, -0.3)!).toBeCloseTo(
      -parallaxAngle(lens, u, 1.05 * v, eye, 0.3)!,
      14,
    );
    expect(parallaxAngle(lens, u, v, eye, 0)).toBe(0);
  });

  test("with the head hardly moving, no parallax is at the paraxial image (the thin lens's limit)", () => {
    fc.assert(
      fc.property(fc.double({ min: 18, max: 80, noNaN: true }), (u) => {
        const r = noParallax(lens, u, { eyeBehind: 25, head: 0.01, acuity: ARCMIN });
        return Math.abs(r.at - paraxialImageDistance(lens, u)) < 2e-3 * r.at && r.residual < 1e-6;
      }),
      { numRuns: 25 },
    );
  });

  test("the no-parallax places agree with NumPy's for the approved view, the full head and the eye off the axis", () => {
    expect(fixture.places.length).toBe(12);
    for (const p of fixture.places) {
      const r = noParallax(lens, p.objectDistance, {
        eyeBehind: p.eyeBehind,
        head: p.head ?? Infinity,
        acuity: p.acuity,
        centre: p.centre,
      });
      const where = `${p.view} at x = ${p.objectDistance} cm`;
      expect(Math.abs(r.at - p.at), where).toBeLessThan(0.02);
      expect(Math.abs(r.residual - p.residual), where).toBeLessThan(0.2 * ARCMIN);
      expect(Math.abs(r.head - p.reach), where).toBeLessThan(1e-6);
      if (p.from === null) expect(r.from, where).toBeUndefined();
      else {
        expect(Math.abs(r.from! - p.from), where).toBeLessThan(0.02);
        expect(Math.abs(r.to! - p.to!), where).toBeLessThan(0.02);
      }
    }
  });

  test("the brief's table (decisions 8 to 11): sharp no-parallax places with the head ±0.5 cm", () => {
    const at = (u: number) => noParallax(lens, u, { eyeBehind: 25, head: 0.5, acuity: ARCMIN });
    const x20 = at(20);
    expect(x20.from!).toBeCloseTo(59.39, 1);
    expect(x20.to!).toBeCloseTo(59.45, 1);
    for (const u of [30, 40, 50]) {
      const r = at(u);
      expect(r.to! - r.from!).toBeLessThan(0.8);
      expect(Math.abs(r.at - paraxialImageDistance(lens, u))).toBeLessThan(0.1);
    }
  });

  test("moved as far as the lens allows, the head always leaves some parallax (the aberration)", () => {
    for (const u of [20, 30, 40, 50]) {
      const r = noParallax(lens, u, { eyeBehind: 25, head: Infinity, acuity: ARCMIN });
      expect(r.from).toBeUndefined();
      expect(r.residual).toBeGreaterThan(1.5 * ARCMIN);
      expect(r.at).toBeLessThan(paraxialImageDistance(lens, u));
    }
  });

  test("with the eye off the axis, the no-parallax place moves nearer the lens", () => {
    for (const u of [20, 30, 40, 50]) {
      const on = noParallax(lens, u, { eyeBehind: 25, head: 0.5, acuity: ARCMIN });
      const off = noParallax(lens, u, { eyeBehind: 25, head: 0.5, acuity: ARCMIN, centre: 1 });
      expect(off.at).toBeLessThan(on.at);
    }
  });
});
