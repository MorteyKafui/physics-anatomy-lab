import { describe, expect, test } from "bun:test";
import fc from "fast-check";

import fixture from "../../../validation/fixtures/diffraction.json";
import { singleSlitIntensity, slitsIntensity, whichSlitIntensity, type Slits } from "../src";

const NM = 1e-9;
const UM = 1e-6;

describe("N-slit diffraction (landing page brief, decision 1)", () => {
  test("agrees with SciPy's integration over the openings at every fixture point", () => {
    expect(fixture.cases.length).toBe(6);
    for (const c of fixture.cases) {
      const s: Slits = {
        count: c.count,
        width: c.width,
        spacing: c.spacing,
        wavelength: c.wavelength,
      };
      for (const p of c.points) {
        expect(Math.abs(slitsIntensity(s, p.sinTheta) - p.intensity)).toBeLessThan(1e-10);
        expect(Math.abs(whichSlitIntensity(s, p.sinTheta) - p.whichSlit)).toBeLessThan(1e-10);
      }
    }
  });

  test("the centre of every pattern is 1", () => {
    for (const count of [1, 2, 4, 7]) {
      expect(
        slitsIntensity({ count, width: 2 * UM, spacing: 8 * UM, wavelength: 500 * NM }, 0),
      ).toBe(1);
    }
  });

  test("one slit is dark where a sin θ is a whole number of wavelengths", () => {
    const s: Slits = { count: 1, width: 5 * UM, spacing: 5 * UM, wavelength: 500 * NM };
    for (const m of [1, 2, 3])
      expect(singleSlitIntensity(s, (m * 500 * NM) / (5 * UM))).toBeLessThan(1e-25);
  });

  test("two slits are bright at every order d sin θ = mλ, up to the envelope, and dark halfway", () => {
    const s: Slits = { count: 2, width: 1 * UM, spacing: 10 * UM, wavelength: 500 * NM };
    for (const m of [1, 2, 3]) {
      const order = (m * 500 * NM) / (10 * UM);
      expect(slitsIntensity(s, order)).toBeCloseTo(singleSlitIntensity(s, order), 12);
      expect(slitsIntensity(s, order + (0.5 * 500 * NM) / (10 * UM))).toBeLessThan(1e-25);
    }
  });

  test("a which-slit detector removes the fringes: what is left is one slit's envelope", () => {
    const s: Slits = { count: 2, width: 2 * UM, spacing: 11.25 * UM, wavelength: 500 * NM };
    fc.assert(
      fc.property(fc.double({ min: -0.3, max: 0.3, noNaN: true }), (x) => {
        expect(whichSlitIntensity(s, x)).toBe(singleSlitIntensity(s, x));
      }),
    );
  });

  test("never negative and never above the centre", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 8 }),
        fc.double({ min: -0.5, max: 0.5, noNaN: true }),
        (count, x) => {
          const v = slitsIntensity(
            { count, width: 1 * UM, spacing: 3 * UM, wavelength: 500 * NM },
            x,
          );
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThanOrEqual(1 + 1e-12);
        },
      ),
    );
  });

  test("refuses impossible slits", () => {
    expect(() => slitsIntensity({ count: 0, width: 1, spacing: 1, wavelength: 1 }, 0)).toThrow(
      RangeError,
    );
    expect(() => slitsIntensity({ count: 2, width: 2, spacing: 1, wavelength: 1 }, 0)).toThrow(
      RangeError,
    );
    expect(() => slitsIntensity({ count: 1, width: 0, spacing: 1, wavelength: 1 }, 0)).toThrow(
      RangeError,
    );
  });
});
