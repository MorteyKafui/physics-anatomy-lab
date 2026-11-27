import { describe, expect, test } from "bun:test";
import fc from "fast-check";

import fixture from "../../../validation/fixtures/resonance-tube.json";
import {
  airAt,
  columnFrequency,
  endCorrection,
  FORK_TAU,
  forkAmplitude,
  fromTwoResonances,
  loudness,
  loudnessDb,
  resonanceLength,
  resonanceLengths,
  speedOfSound,
  standingWave,
  TUNING_FORKS,
  wavelength,
  type ResonanceTube,
} from "../src";

const TUBE: ResonanceTube = { length: 1, radius: 0.02, temperatureC: 20 };

describe("speed of sound", () => {
  test("is 331.3 m/s at 0 °C and 343.2 m/s at 20 °C", () => {
    expect(speedOfSound(0)!).toBeCloseTo(331.3, 1);
    expect(speedOfSound(20)!).toBeCloseTo(343.2, 1);
  });

  test("goes as the square root of the absolute temperature", () => {
    fc.assert(
      fc.property(fc.double({ min: -40, max: 60, noNaN: true }), (t) => {
        const ratio = speedOfSound(t)! / speedOfSound(0)!;
        expect(ratio).toBeCloseTo(Math.sqrt((t + 273.15) / 273.15), 12);
      }),
    );
  });

  test("has no value at or below absolute zero, or for a non-number", () => {
    expect(speedOfSound(-273.15)).toBeUndefined();
    expect(speedOfSound(Number.NaN)).toBeUndefined();
    expect(speedOfSound(Number.POSITIVE_INFINITY)).toBeUndefined();
  });
});

describe("resonance lengths", () => {
  test("the end correction is 0.6 r", () => {
    expect(endCorrection(TUBE)).toBeCloseTo(0.012, 15);
    expect(endCorrection({ ...TUBE, endCorrectionFactor: 0.58 })).toBeCloseTo(0.0116, 15);
  });

  test("L + e is an odd number of quarter wavelengths", () => {
    for (const f of TUNING_FORKS) {
      const lambda = wavelength(TUBE, f)!;
      for (const n of [1, 2, 3]) {
        const l = resonanceLength(TUBE, f, n)!;
        expect(l + 0.012).toBeCloseTo(((2 * n - 1) * lambda) / 4, 12);
      }
    }
  });

  test("a 512 Hz fork at 20 °C resonates at about 15.6 cm and 49.1 cm", () => {
    const [l1, l2, l3] = resonanceLengths(TUBE, 512);
    expect(l1!).toBeCloseTo(0.1556, 3);
    expect(l2!).toBeCloseTo(0.4908, 3);
    expect(l3!).toBeCloseTo(0.8259, 3);
    expect(resonanceLengths(TUBE, 512)).toHaveLength(3);
  });

  test("successive resonances are half a wavelength apart, and give back v and e", () => {
    for (const f of TUNING_FORKS) {
      const [l1, l2] = resonanceLengths(TUBE, f);
      expect(l2! - l1!).toBeCloseTo(wavelength(TUBE, f)! / 2, 12);
      const found = fromTwoResonances(f, l1!, l2!)!;
      expect(found.speed).toBeCloseTo(speedOfSound(20)!, 9);
      expect(found.endCorrection).toBeCloseTo(0.012, 12);
    }
  });

  test("every resonance fits in the tube", () => {
    for (const f of TUNING_FORKS)
      for (const l of resonanceLengths(TUBE, f)) expect(l).toBeLessThanOrEqual(TUBE.length);
  });

  test("the column's own frequency at a resonance length is the fork's", () => {
    for (const f of TUNING_FORKS)
      for (const n of [1, 2]) {
        const l = resonanceLength(TUBE, f, n)!;
        expect(columnFrequency(TUBE, l, n)!).toBeCloseTo(f, 9);
      }
  });

  test("invalid inputs give no result", () => {
    expect(resonanceLength(TUBE, 512, 0)).toBeUndefined();
    expect(resonanceLength(TUBE, 512, 1.5)).toBeUndefined();
    expect(resonanceLength(TUBE, -512, 1)).toBeUndefined();
    expect(resonanceLength({ ...TUBE, radius: -0.02 }, 512, 1)).toBeUndefined();
    expect(resonanceLength({ ...TUBE, temperatureC: Number.NaN }, 512, 1)).toBeUndefined();
    // A very high note would need the water above the mouth for n = 1.
    expect(resonanceLength({ ...TUBE, radius: 0.1 }, 2000, 1)).toBeUndefined();
    expect(resonanceLengths({ ...TUBE, length: 0 }, 512)).toEqual([]);
    expect(columnFrequency(TUBE, 1.2, 1)).toBeUndefined();
    expect(columnFrequency(TUBE, 0, 1)).toBeUndefined();
    expect(fromTwoResonances(512, 0.5, 0.2)).toBeUndefined();
  });
});

describe("loudness", () => {
  test("is 1 exactly at resonance and falls away on either side", () => {
    const l = resonanceLength(TUBE, 512, 1)!;
    expect(loudness(TUBE, l, 512)!).toBeCloseTo(1, 12);
    expect(loudnessDb(TUBE, l, 512)!).toBeCloseTo(0, 10);
    expect(loudness(TUBE, l + 0.01, 512)!).toBeLessThan(0.7);
    expect(loudness(TUBE, l - 0.01, 512)!).toBeLessThan(0.7);
    expect(loudness(TUBE, l + 0.17, 512)!).toBeLessThan(0.08);
  });

  test("the half-power width is f / Q", () => {
    // Near a mode A/Q ≈ 1/√(1 + (2QΔf/fₙ)²): half power at Δf = fₙ / 2Q.
    const q = 30;
    const l = resonanceLength({ ...TUBE, q }, 512, 1)!;
    const fn = columnFrequency({ ...TUBE, q }, l, 1)!;
    const edge = loudness({ ...TUBE, q }, l, fn * (1 + 1 / (2 * q)))!;
    expect(edge).toBeCloseTo(Math.SQRT1_2, 1);
  });

  test("lies between 0 and the oscillator's peak, 1/√(1 − 1/4Q²)", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.02, max: 1, noNaN: true }),
        fc.constantFrom(...TUNING_FORKS),
        fc.double({ min: 25, max: 35, noNaN: true }),
        (l, f, q) => {
          const a = loudness({ ...TUBE, q }, l, f)!;
          expect(a).toBeGreaterThan(0);
          expect(a).toBeLessThanOrEqual(1 / Math.sqrt(1 - 1 / (4 * q * q)) + 1e-12);
        },
      ),
    );
  });

  test("invalid inputs give no result", () => {
    expect(loudness(TUBE, 0.2, 0)).toBeUndefined();
    expect(loudness(TUBE, -0.1, 512)).toBeUndefined();
    expect(loudness({ ...TUBE, q: Number.NaN }, 0.2, 512)).toBeUndefined();
  });
});

describe("the struck fork", () => {
  test("decays as exp(−t/τ) and is silent before the strike", () => {
    expect(forkAmplitude(0, FORK_TAU)).toBe(1);
    expect(forkAmplitude(4, FORK_TAU)!).toBeCloseTo(Math.exp(-1), 15);
    expect(forkAmplitude(2, 5)!).toBeCloseTo(Math.exp(-0.4), 15);
    expect(forkAmplitude(-1, FORK_TAU)).toBe(0);
    expect(forkAmplitude(1, 0)).toBeUndefined();
    expect(forkAmplitude(Number.NaN, FORK_TAU)).toBeUndefined();
  });
});

describe("the standing wave", () => {
  test("first resonance: a node at the water, an antinode e above the mouth", () => {
    const l = resonanceLength(TUBE, 512, 1)!;
    const w = standingWave(TUBE, l, 512)!;
    expect(w.nodes).toHaveLength(1);
    expect(w.nodes[0]!).toBeCloseTo(l, 15);
    expect(w.antinodes).toHaveLength(1);
    expect(w.antinodes[0]!).toBeCloseTo(-0.012, 12);
    expect(w.amplitude).toBeCloseTo(1, 12);
  });

  test("second resonance: two nodes and two antinodes, λ/2 apart", () => {
    const l = resonanceLength(TUBE, 512, 2)!;
    const w = standingWave(TUBE, l, 512)!;
    expect(w.nodes).toHaveLength(2);
    expect(w.antinodes).toHaveLength(2);
    expect(w.nodes[1]! - w.nodes[0]!).toBeCloseTo(w.wavelength / 2, 12);
    expect(w.antinodes[0]!).toBeCloseTo(-0.012, 12);
  });

  test("the air does not move at the water and the pressure does not change at the antinode", () => {
    const l = resonanceLength(TUBE, 384, 1)!;
    expect(airAt(TUBE, l, 384, l, 0)!.displacement).toBeCloseTo(0, 12);
    expect(airAt(TUBE, l, 384, l, 0)!.pressure).toBeCloseTo(1, 12);
    expect(airAt(TUBE, l, 384, -0.012, 0)!.displacement).toBeCloseTo(1, 12);
    expect(airAt(TUBE, l, 384, -0.012, 0)!.pressure).toBeCloseTo(0, 12);
    expect(airAt(TUBE, l, 384, -0.012, Math.PI / 2)!.displacement).toBeCloseTo(0, 12);
  });

  test("has no air below the water or above the column", () => {
    const l = resonanceLength(TUBE, 384, 1)!;
    expect(airAt(TUBE, l, 384, l + 0.001, 0)).toBeUndefined();
    expect(airAt(TUBE, l, 384, -0.02, 0)).toBeUndefined();
    expect(standingWave(TUBE, 2, 384)).toBeUndefined();
  });
});

describe("agrees with the independent Python model (validation/pa_validation/resonance_tube.py)", () => {
  test("speed of sound", () => {
    for (const c of fixture.speed)
      expect(Math.abs(speedOfSound(c.temperatureC)! - c.speed)).toBeLessThan(1e-6);
  });

  test("resonance lengths found by shooting the wave equation", () => {
    expect(fixture.resonances.length).toBeGreaterThan(20);
    for (const c of fixture.resonances) {
      const tube: ResonanceTube = {
        length: c.length,
        radius: c.radius,
        temperatureC: c.temperatureC,
      };
      expect(resonanceLengths(tube, c.frequency)).toHaveLength(c.lengths.length);
      c.lengths.forEach((l, i) =>
        expect(Math.abs(resonanceLength(tube, c.frequency, i + 1)! - l)).toBeLessThan(1e-8),
      );
    }
  });

  test("loudness from the driven, damped mode solved as a linear system", () => {
    for (const c of fixture.loudness) {
      const tube: ResonanceTube = {
        length: 1,
        radius: c.radius,
        temperatureC: c.temperatureC,
        q: c.q,
      };
      expect(Math.abs(loudness(tube, c.airColumn, c.frequency)! - c.loudness)).toBeLessThan(1e-9);
    }
  });

  test("the air's displacement and pressure along the column", () => {
    for (const c of fixture.standingWave) {
      const tube: ResonanceTube = { length: 1, radius: c.radius, temperatureC: c.temperatureC };
      for (const p of c.points) {
        const a = airAt(tube, c.airColumn, c.frequency, p.depth, 0)!;
        expect(Math.abs(a.displacement - p.displacement)).toBeLessThan(1e-7);
        expect(Math.abs(a.pressure - p.pressure)).toBeLessThan(1e-7);
      }
    }
  });
});
