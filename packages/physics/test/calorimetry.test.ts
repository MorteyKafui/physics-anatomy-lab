import { describe, expect, test } from "bun:test";
import fc from "fast-check";

import fixture from "../../../validation/fixtures/calorimetry.json";
import {
  type Calorimeter,
  calorimeterAt,
  finalTemperature,
  newtonCooling,
  specificHeatCapacityFromMixture,
  thermometerPeak,
  WATER_SPECIFIC_HEAT_CAPACITY as WATER,
  waterEquivalent,
} from "../src";

const COPPER = 390;
const K = 0.01 / 60;

/** Experiment 62 as approved: 50 g at 65 °C into V g in a 50 g copper calorimeter at 28 °C. */
function bench(v: number, change: Partial<Calorimeter> = {}): Calorimeter {
  return {
    hot: { mass: 0.05, specificHeatCapacity: WATER, temperature: 65 },
    cold: [
      { mass: v / 1000, specificHeatCapacity: WATER, temperature: 28 },
      { mass: 0.05, specificHeatCapacity: COPPER, temperature: 28 },
    ],
    room: 28,
    loss: K,
    mixing: 5,
    lag: 8,
    ...change,
  };
}

describe("the lumped heat model of the method of mixtures (Experiment 62)", () => {
  test("every temperature and every peak agrees with SciPy's integration of the heat flows", () => {
    expect(fixture.cases.length).toBe(22);
    for (const c of fixture.cases) {
      c.times.forEach((t, i) => {
        const got = calorimeterAt(c, t);
        const want = c.states[i]!;
        expect(Math.abs(got.hot - want.hot)).toBeLessThan(1e-8);
        expect(Math.abs(got.cold - want.cold)).toBeLessThan(1e-8);
        expect(Math.abs(got.mean - want.mean)).toBeLessThan(1e-8);
        expect(Math.abs(got.thermometer - want.thermometer)).toBeLessThan(1e-8);
      });
      const peak = thermometerPeak(c);
      if (c.peak === null) {
        expect(peak).toBeNull();
      } else {
        expect(Math.abs(peak!.at - c.peak.at)).toBeLessThan(1e-6 * c.peak.at);
        expect(Math.abs(peak!.temperature - c.peak.temperature)).toBeLessThan(1e-8);
      }
    }
  });

  test("with no loss, the water settles at the ideal mixture and the heat is all still there", () => {
    const c = bench(50, { loss: 0 });
    const ideal = finalTemperature([...[c.hot].flat(), ...c.cold]);
    const ch = 0.05 * WATER;
    const cc = 0.05 * WATER + 0.05 * COPPER;
    for (const t of [0, 1, 7, 30, 120]) {
      const s = calorimeterAt(c, t);
      expect((ch * s.hot + cc * s.cold) / (ch + cc)).toBeCloseTo(ideal, 11);
    }
    expect(calorimeterAt(c, 3600).thermometer).toBeCloseTo(ideal, 9);
    expect(thermometerPeak(c)).toBeNull();
  });

  test("the mixture's mean cools by Newton's law, whatever the stirring and the thermometer", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 20, max: 200, noNaN: true }),
        fc.double({ min: 0.5, max: 300, noNaN: true }),
        fc.double({ min: 0, max: 30, noNaN: true }),
        fc.double({ min: 0, max: 1800, noNaN: true }),
        (v, mixing, lag, t) => {
          const c = bench(v, { mixing, lag, loss: 4 * K });
          const start = calorimeterAt(c, 0).mean;
          return Math.abs(calorimeterAt(c, t).mean - newtonCooling(start, 28, 4 * K, t)) < 1e-10;
        },
      ),
      { numRuns: 200 },
    );
  });

  test("the thermometer obeys its lag, τ dθ/dt = θ_water − θ, even where the closed form changes", () => {
    const b = K + 1 / 5;
    for (const lag of [1 / b, 1 / b + 1e-6, 1 / b - 1e-6, 1 / b + 0.02, 3, 8, 40]) {
      const c = bench(50, { lag });
      for (const t of [0.5, 5, 20, 90]) {
        const h = 1e-4;
        const rate =
          (calorimeterAt(c, t + h).thermometer - calorimeterAt(c, t - h).thermometer) / 2 / h;
        const now = calorimeterAt(c, t);
        expect(Math.abs(lag * rate - (now.cold - now.thermometer))).toBeLessThan(1e-6);
      }
    }
  });

  test("done carefully, the peak is 0.1 to 0.25 °C below the ideal rise, and V against 1/T keeps its intercept", () => {
    const vs = [40, 50, 60, 70];
    const points = vs.map((v) => {
      const c = bench(v);
      const ideal = finalTemperature([...[c.hot].flat(), ...c.cold]) - 28;
      const rise = thermometerPeak(c)!.temperature - 28;
      expect(ideal - rise).toBeGreaterThan(0.1);
      expect(ideal - rise).toBeLessThan(0.25);
      return { x: 1 / rise, y: v };
    });
    const mx = points.reduce((a, p) => a + p.x, 0) / points.length;
    const my = points.reduce((a, p) => a + p.y, 0) / points.length;
    const slope =
      points.reduce((a, p) => a + (p.x - mx) * (p.y - my), 0) /
      points.reduce((a, p) => a + (p.x - mx) ** 2, 0);
    const w = waterEquivalent({ mass: 0.05, specificHeatCapacity: COPPER, temperature: 28 }) * 1000;
    expect(w).toBeCloseTo(4.643, 3);
    expect(Math.abs(my - slope * mx + (50 + w))).toBeLessThan(0.5);
    expect(Math.abs(slope / (50 * 37) - 1)).toBeLessThan(0.02);
  });

  test("each approved mistake costs the reading what the brief says", () => {
    const rise = (c: Calorimeter) => thermometerPeak(c)!.temperature - 28;
    const careful = rise(bench(40));
    // Read at 30 s, before the peak: about 1 °C low.
    expect(careful - (calorimeterAt(bench(40), 30).thermometer - 28)).toBeGreaterThan(0.8);
    // Not stirred: the peak comes minutes later and lower.
    const unstirred = thermometerPeak(bench(40, { mixing: 120 }))!;
    expect(unstirred.at).toBeGreaterThan(240);
    expect(careful - (unstirred.temperature - 28)).toBeGreaterThan(1);
    // Not covered: eight times the loss, about 0.9 °C low.
    expect(careful - rise(bench(40, { loss: 8 * K }))).toBeGreaterThan(0.7);
  });

  test("refuses what is not a calorimeter", () => {
    expect(() => calorimeterAt(bench(50, { mixing: 0 }), 1)).toThrow(RangeError);
    expect(() => calorimeterAt(bench(50, { lag: -1 }), 1)).toThrow(RangeError);
    expect(() => calorimeterAt(bench(50), -1)).toThrow(RangeError);
    expect(() =>
      calorimeterAt(
        bench(50, {
          cold: [
            { mass: 0.05, specificHeatCapacity: WATER, temperature: 28 },
            { mass: 0.05, specificHeatCapacity: COPPER, temperature: 30 },
          ],
        }),
        1,
      ),
    ).toThrow(RangeError);
    expect(
      thermometerPeak(
        bench(50, { hot: { mass: 0.05, specificHeatCapacity: WATER, temperature: 20 } }),
      ),
    ).toBeNull();
  });
});

describe("a hot solid into water (Experiment 64)", () => {
  /** A 100 g solid from boiling water into 50 g of water in the approved calorimeter. */
  const solid = (c: number, change: Partial<Calorimeter> = {}): Calorimeter =>
    bench(50, {
      hot: [{ mass: 0.1, specificHeatCapacity: c, temperature: 100 }],
      mixing: 10,
      ...change,
    });

  test("several hot bodies at one temperature are one body with their heat capacities added", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.01, max: 0.5, noNaN: true }),
        fc.double({ min: 0.0001, max: 0.01, noNaN: true }),
        fc.double({ min: 0, max: 600, noNaN: true }),
        (solidKg, filmKg, t) => {
          const both = solid(390, {
            hot: [
              { mass: solidKg, specificHeatCapacity: COPPER, temperature: 100 },
              { mass: filmKg, specificHeatCapacity: WATER, temperature: 100 },
            ],
          });
          const one = solid(390, {
            hot: {
              mass: 1,
              specificHeatCapacity: solidKg * COPPER + filmKg * WATER,
              temperature: 100,
            },
          });
          return (
            Math.abs(calorimeterAt(both, t).thermometer - calorimeterAt(one, t).thermometer) < 1e-9
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  test("with no loss, each metal's specific heat capacity comes back from the mixture", () => {
    for (const c of [390, 380, 450, 900]) {
      const s = solid(c, { loss: 0 });
      const final = calorimeterAt(s, 3600).thermometer;
      expect(
        specificHeatCapacityFromMixture({
          solidMass: 0.1,
          solidTemperature: 100,
          waterMass: 0.05,
          calorimeterMass: 0.05,
          calorimeterSpecificHeatCapacity: COPPER,
          initialTemperature: 28,
          finalTemperature: final,
        }),
      ).toBeCloseTo(c, 6);
    }
  });

  test("the solid carried through the air cools by Newton's law, as SciPy integrates it", () => {
    const moved = fixture.cases.filter((c) => "transfer" in c && c.transfer > 0);
    expect(moved.length).toBe(1);
    for (const c of moved) {
      const hot = (c.hot as { temperature: number }[])[0]!;
      const k = (c as { airLoss: number }).airLoss;
      expect(
        Math.abs(newtonCooling(100, 28, k, (c as { transfer: number }).transfer) - hot.temperature),
      ).toBeLessThan(1e-9);
    }
  });

  test("refuses a hot side that goes in at two temperatures", () => {
    expect(() =>
      calorimeterAt(
        solid(390, {
          hot: [
            { mass: 0.1, specificHeatCapacity: COPPER, temperature: 100 },
            { mass: 0.001, specificHeatCapacity: WATER, temperature: 90 },
          ],
        }),
        1,
      ),
    ).toThrow(RangeError);
    expect(() => calorimeterAt(solid(390, { hot: [] }), 1)).toThrow(RangeError);
  });
});
