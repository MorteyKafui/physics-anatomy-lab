import { describe, expect, test } from "bun:test";
import fc from "fast-check";

import circuits from "../../../validation/fixtures/circuits.json";
import lens from "../../../validation/fixtures/lens.json";
import mixtures from "../../../validation/fixtures/mixtures.json";
import {
  balanceLength,
  emfRatio,
  finalTemperature,
  focalLengthFromDistances,
  focalLengthFromIntercept,
  imageDistance,
  internalResistanceFromBalance,
  magnification,
  minimumObjectScreenDistance,
  ohmsLawReadings,
  parallel,
  potentialGradient,
  specificHeatCapacityFromMixture,
  terminalPd,
  WATER_SPECIFIC_HEAT_CAPACITY,
  type Potentiometer,
} from "../src";

const rel = (a: number, b: number) => Math.abs(a - b) / Math.abs(b);

describe("Ohm's law", () => {
  test("agrees with NumPy nodal analysis at every fixture", () => {
    expect(circuits.ohmsLaw.length).toBeGreaterThan(50);
    for (const c of circuits.ohmsLaw) {
      const r = ohmsLawReadings({ ...c, voltmeterResistance: c.voltmeterResistance ?? Infinity });
      expect(rel(r.current, c.current)).toBeLessThan(1e-12);
      expect(rel(r.voltage, c.voltage)).toBeLessThan(1e-12);
    }
  });

  test("with an ideal voltmeter, V / I is exactly R", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.5, max: 12, noNaN: true }),
        fc.double({ min: 0, max: 5, noNaN: true }),
        fc.double({ min: 0, max: 50, noNaN: true }),
        fc.double({ min: 0.1, max: 1000, noNaN: true }),
        (emf, r, rheostat, resistor) => {
          const { current, voltage } = ohmsLawReadings({
            emf,
            internalResistance: r,
            rheostat,
            resistor,
          });
          return rel(voltage / current, resistor) < 1e-12;
        },
      ),
    );
  });

  test("scripted student: a 1000 Ω voltmeter across 10 Ω reads R about 1% low", () => {
    const { current, voltage } = ohmsLawReadings({
      emf: 3,
      internalResistance: 1,
      rheostat: 4,
      resistor: 10,
      voltmeterResistance: 1000,
    });
    expect(voltage / current).toBeCloseTo(parallel(10, 1000), 12);
    expect(1 - voltage / current / 10).toBeCloseTo(10 / 1010, 12);
  });

  test("refuses impossible circuits", () => {
    expect(() =>
      ohmsLawReadings({ emf: 0, internalResistance: 1, rheostat: 0, resistor: 10 }),
    ).toThrow(RangeError);
    expect(() =>
      ohmsLawReadings({ emf: 3, internalResistance: -1, rheostat: 0, resistor: 10 }),
    ).toThrow(RangeError);
    expect(() =>
      ohmsLawReadings({ emf: 3, internalResistance: 1, rheostat: 0, resistor: 0 }),
    ).toThrow(RangeError);
    expect(() => parallel(0, 5)).toThrow(RangeError);
    expect(parallel(5, Infinity)).toBe(5);
  });
});

describe("the potentiometer", () => {
  test("balance lengths agree with NumPy nodal analysis, galvanometer included, at every fixture", () => {
    expect(circuits.potentiometer.length).toBeGreaterThan(50);
    let none = 0;
    for (const c of circuits.potentiometer) {
      const pd =
        c.load === null ? c.testEmf : terminalPd(c.testEmf, c.testInternalResistance, c.load);
      const l = balanceLength(c.driver, pd);
      if (c.balanceLength === null) {
        none++;
        expect(l).toBeUndefined();
      } else {
        expect(l).toBeDefined();
        expect(rel(l!, c.balanceLength)).toBeLessThan(1e-10);
      }
    }
    expect(none).toBeGreaterThan(0);
  });

  test("two balance lengths give back the cell's internal resistance", () => {
    let checked = 0;
    for (const c of circuits.potentiometer) {
      if (c.load === null) continue;
      const open = circuits.potentiometer.find(
        (o) =>
          o.load === null &&
          o.testEmf === c.testEmf &&
          o.testInternalResistance === c.testInternalResistance &&
          JSON.stringify(o.driver) === JSON.stringify(c.driver),
      );
      if (!open || open.balanceLength === null || c.balanceLength === null) continue;
      const r = internalResistanceFromBalance(c.load, open.balanceLength, c.balanceLength);
      expect(rel(r, c.testInternalResistance)).toBeLessThan(1e-9);
      checked++;
    }
    expect(checked).toBeGreaterThan(30);
  });

  const driver: Potentiometer = {
    driverEmf: 2,
    driverInternalResistance: 0,
    seriesResistance: 0,
    wireResistance: 4,
    wireLength: 1,
  };

  test("an ideal driver across the wire alone gives a gradient of E / L", () => {
    expect(potentialGradient(driver)).toBe(2);
    expect(balanceLength(driver, 1.5)).toBe(0.75);
  });

  test("comparing emfs: the ratio of balance lengths is the ratio of emfs", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.1, max: 1.9, noNaN: true }),
        fc.double({ min: 0.1, max: 1.9, noNaN: true }),
        (e1, e2) => {
          return (
            rel(emfRatio(balanceLength(driver, e1)!, balanceLength(driver, e2)!), e1 / e2) < 1e-12
          );
        },
      ),
    );
  });

  test("scripted student: too much series resistance leaves no balance point on the wire", () => {
    expect(balanceLength({ ...driver, seriesResistance: 5 }, 1.5)).toBeUndefined();
  });

  test("refuses impossible readings", () => {
    expect(() => internalResistanceFromBalance(5, 0.6, 0.7)).toThrow(RangeError);
    expect(() => balanceLength({ ...driver, wireLength: 0 }, 1)).toThrow(RangeError);
  });
});

describe("the converging lens", () => {
  test("agrees with ray-transfer matrices at every fixture, real and virtual images", () => {
    expect(lens.cases.length).toBeGreaterThan(20);
    expect(lens.cases.some((c) => c.imageDistance < 0)).toBe(true);
    for (const c of lens.cases) {
      expect(rel(imageDistance(c.objectDistance, c.focalLength), c.imageDistance)).toBeLessThan(
        1e-12,
      );
      expect(rel(magnification(c.objectDistance, c.focalLength), c.magnification)).toBeLessThan(
        1e-12,
      );
    }
  });

  test("an object at 2f gives an equal, inverted image at 2f", () => {
    expect(imageDistance(20, 10)).toBe(20);
    expect(magnification(20, 10)).toBe(1);
  });

  test("f from u and v undoes the lens formula", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1, max: 50, noNaN: true }),
        fc.double({ min: 1.01, max: 20, noNaN: true }),
        (f, k) => {
          const u = f * k;
          return rel(focalLengthFromDistances(u, imageDistance(u, f)), f) < 1e-12;
        },
      ),
    );
  });

  test("1/v against 1/u is a line of slope −1 meeting the axis at 1/f", () => {
    const f = 15;
    const us = [20, 25, 30, 40, 60];
    const pts = us.map((u) => ({ x: 1 / u, y: 1 / imageDistance(u, f) }));
    const slope = (pts[4]!.y - pts[0]!.y) / (pts[4]!.x - pts[0]!.x);
    expect(slope).toBeCloseTo(-1, 12);
    const intercept = pts[0]!.y - slope * pts[0]!.x;
    expect(focalLengthFromIntercept(intercept)).toBeCloseTo(f, 10);
  });

  test("no screen nearer than 4f catches a real image", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1, max: 50, noNaN: true }),
        fc.double({ min: 1.001, max: 100, noNaN: true }),
        (f, k) => {
          const u = f * k;
          return u + imageDistance(u, f) >= minimumObjectScreenDistance(f) * (1 - 1e-12);
        },
      ),
    );
  });

  test("an object at the focal point forms no image", () => {
    expect(() => imageDistance(10, 10)).toThrow(RangeError);
    expect(() => imageDistance(-5, 10)).toThrow(RangeError);
  });
});

describe("the method of mixtures", () => {
  test("final temperatures agree with SciPy root-finding, and c is recovered, at every fixture", () => {
    expect(mixtures.cases.length).toBeGreaterThan(30);
    expect(mixtures.waterSpecificHeatCapacity).toBe(WATER_SPECIFIC_HEAT_CAPACITY);
    for (const c of mixtures.cases) {
      const bodies = [
        {
          mass: c.solidMass,
          specificHeatCapacity: c.solidSpecificHeatCapacity,
          temperature: c.solidTemperature,
        },
        {
          mass: c.waterMass,
          specificHeatCapacity: WATER_SPECIFIC_HEAT_CAPACITY,
          temperature: c.initialTemperature,
        },
      ];
      if (c.calorimeterMass > 0) {
        bodies.push({
          mass: c.calorimeterMass,
          specificHeatCapacity: c.calorimeterSpecificHeatCapacity,
          temperature: c.initialTemperature,
        });
      }
      expect(rel(finalTemperature(bodies), c.finalTemperature)).toBeLessThan(1e-12);
      const recovered = specificHeatCapacityFromMixture({ ...c });
      expect(rel(recovered, c.recoveredSpecificHeatCapacity)).toBeLessThan(1e-10);
      expect(rel(recovered, c.solidSpecificHeatCapacity)).toBeLessThan(1e-10);
    }
  });

  test("the final temperature lies between the hottest and coldest", () => {
    const body = fc.record({
      mass: fc.double({ min: 0.001, max: 2, noNaN: true }),
      specificHeatCapacity: fc.double({ min: 100, max: 5000, noNaN: true }),
      temperature: fc.double({ min: 0, max: 100, noNaN: true }),
    });
    fc.assert(
      fc.property(fc.array(body, { minLength: 2, maxLength: 5 }), (bodies) => {
        const t = finalTemperature(bodies);
        const temps = bodies.map((b) => b.temperature);
        return t >= Math.min(...temps) - 1e-9 && t <= Math.max(...temps) + 1e-9;
      }),
    );
  });

  const readings = {
    solidMass: 0.1,
    solidTemperature: 100,
    waterMass: 0.2,
    calorimeterMass: 0.05,
    calorimeterSpecificHeatCapacity: 390,
    initialTemperature: 27,
  };
  const trueFinal = finalTemperature([
    { mass: 0.1, specificHeatCapacity: 390, temperature: 100 },
    { mass: 0.2, specificHeatCapacity: 4200, temperature: 27 },
    { mass: 0.05, specificHeatCapacity: 390, temperature: 27 },
  ]);

  test("scripted student: a slow transfer (the solid cools 3 °C on the way) gives c too low", () => {
    // The solid really goes in at 97 °C, but the student records 100 °C.
    const reached = finalTemperature([
      { mass: 0.1, specificHeatCapacity: 390, temperature: 97 },
      { mass: 0.2, specificHeatCapacity: 4200, temperature: 27 },
      { mass: 0.05, specificHeatCapacity: 390, temperature: 27 },
    ]);
    const c = specificHeatCapacityFromMixture({ ...readings, finalTemperature: reached });
    expect(c).toBeLessThan(390);
    expect(rel(c, 390)).toBeGreaterThan(0.03);
  });

  test("scripted student: leaving out the calorimeter gives c too low", () => {
    const withCalorimeter = specificHeatCapacityFromMixture({
      ...readings,
      finalTemperature: trueFinal,
    });
    const without = specificHeatCapacityFromMixture({
      ...readings,
      calorimeterMass: 0,
      finalTemperature: trueFinal,
    });
    expect(withCalorimeter).toBeCloseTo(390, 9);
    expect(without).toBeLessThan(withCalorimeter);
  });

  test("refuses a final temperature outside the starting ones", () => {
    expect(() => specificHeatCapacityFromMixture({ ...readings, finalTemperature: 26 })).toThrow(
      RangeError,
    );
    expect(() => specificHeatCapacityFromMixture({ ...readings, finalTemperature: 100 })).toThrow(
      RangeError,
    );
    expect(() =>
      finalTemperature([{ mass: 1, specificHeatCapacity: 4200, temperature: 20 }]),
    ).toThrow(RangeError);
  });
});
