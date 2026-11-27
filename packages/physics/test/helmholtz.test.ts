import { describe, expect, test } from "bun:test";
import fc from "fast-check";

import fixture from "../../../validation/fixtures/helmholtz.json";
import { helmholtz as H } from "../src";

const FLASK = H.ROUND_BOTTOM_FLASK;
const rel = (a: number, b: number) => Math.abs(a - b) / Math.abs(b);
const at = (waterCm3: number, temperatureC = 28) => ({
  waterVolume: waterCm3 * 1e-6,
  temperatureC,
});
const must = <T>(v: T | null): T => {
  if (v === null) throw new Error("expected a result");
  return v;
};

describe("speed of sound", () => {
  test("is 331.3 m/s at 0 °C and 343.2 m/s at 20 °C", () => {
    expect(must(H.speedOfSound(0))).toBeCloseTo(331.3, 1);
    expect(must(H.speedOfSound(20))).toBeCloseTo(343.2, 1);
  });

  test("grows as the square root of the absolute temperature", () => {
    const ratio = must(H.speedOfSound(35)) / must(H.speedOfSound(0));
    expect(ratio).toBeCloseTo(Math.sqrt(308.15 / 273.15), 12);
  });

  test("γp₀/ρ gives the same c², so the mass-spring and wave pictures agree", () => {
    const rho = must(H.airDensity(28));
    expect(
      rel((H.AIR_GAMMA * H.STANDARD_PRESSURE) / rho, must(H.speedOfSound(28)) ** 2),
    ).toBeLessThan(1e-12);
  });
});

describe("resonant frequency", () => {
  test("equals (c / 2π) √(A / (V L′)) worked by hand", () => {
    const c = must(H.speedOfSound(28));
    const A = Math.PI * 0.012 ** 2;
    const L = 0.075 + 1.46 * 0.012;
    const f = (c / (2 * Math.PI)) * Math.sqrt(A / ((550e-6 - 200e-6) * L));
    expect(rel(must(H.resonantFrequency(FLASK, at(200))), f)).toBeLessThan(1e-12);
  });

  test("a 500 ml flask sings at about 166 Hz empty and rises as water goes in", () => {
    const empty = must(H.resonantFrequency(FLASK, at(0)));
    expect(empty).toBeGreaterThan(160);
    expect(empty).toBeLessThan(172);
    let last = empty;
    for (const w of [50, 100, 200, 300, 400]) {
      const f = must(H.resonantFrequency(FLASK, at(w)));
      expect(f).toBeGreaterThan(last);
      last = f;
    }
  });

  test("quartering the air doubles the frequency", () => {
    const f1 = must(H.resonantFrequency(FLASK, at(0)));
    const f2 = must(H.resonantFrequency(FLASK, at(550 - 550 / 4)));
    expect(f2 / f1).toBeCloseTo(2, 12);
  });

  test("1/f² is a straight line in the water volume that meets the axis at V₀", () => {
    const line = must(H.calibrationLine(FLASK, 28));
    expect(line.slope).toBeLessThan(0);
    for (const w of [0, 75, 150, 225, 300, 375, 450]) {
      const y = must(H.inverseFrequencySquared(FLASK, at(w)));
      expect(rel(y, line.intercept + line.slope * w * 1e-6)).toBeLessThan(1e-12);
    }
    expect(rel(-line.intercept / line.slope, FLASK.bulbVolume)).toBeLessThan(1e-12);
  });

  test("the calibration line reads an unknown water volume back from its frequency", () => {
    const f = must(H.resonantFrequency(FLASK, at(237)));
    expect(must(H.waterFromFrequency(FLASK, 28, f)) * 1e6).toBeCloseTo(237, 9);
  });
});

describe("loudness against the signal generator's frequency", () => {
  const state = at(150);
  const f0 = must(H.resonantFrequency(FLASK, state));

  test("is exactly 1 at resonance and lower everywhere else", () => {
    expect(must(H.loudness(FLASK, state, f0))).toBeCloseTo(1, 14);
    for (let f = 0.5 * f0; f < 2 * f0; f += f0 / 97) {
      expect(must(H.loudness(FLASK, state, f))).toBeLessThanOrEqual(1 + 1e-15);
    }
  });

  test("falls to 1/√2 at the half-power points, f₀/Q apart", () => {
    const [lo, hi] = must(H.halfPowerFrequencies(FLASK, state));
    expect(must(H.loudness(FLASK, state, lo))).toBeCloseTo(Math.SQRT1_2, 12);
    expect(must(H.loudness(FLASK, state, hi))).toBeCloseTo(Math.SQRT1_2, 12);
    expect((hi - lo) / f0).toBeCloseTo(1 / FLASK.q, 12);
  });

  test("an octave off resonance the flask is almost silent", () => {
    expect(must(H.loudness(FLASK, state, 2 * f0))).toBeLessThan(0.05);
    expect(must(H.loudness(FLASK, state, 0.5 * f0))).toBeLessThan(0.05);
  });
});

describe("the plug of air in the neck", () => {
  const state = at(100, 20);
  const f0 = must(H.resonantFrequency(FLASK, state));
  const V = 450e-6;
  const A = Math.PI * 0.012 ** 2;

  test("at resonance the bulb's pressure swings Q times the drive and lags it by a quarter", () => {
    const p = must(H.plugState(FLASK, state, { frequency: f0, drivePressure: 0.5, time: 0 }));
    expect(p.pressureAmplitude).toBeCloseTo(0.5 * FLASK.q, 10);
    expect(p.lag).toBeCloseTo(Math.PI / 2, 12);
  });

  test("driven slowly, the bulb just follows the drive and the plug moves V p / (γ p₀ A)", () => {
    const p = must(H.plugState(FLASK, state, { frequency: f0 / 1000, drivePressure: 1, time: 0 }));
    expect(p.pressureAmplitude).toBeCloseTo(1, 5);
    expect(rel(p.displacementAmplitude, V / (H.AIR_GAMMA * H.STANDARD_PRESSURE * A))).toBeLessThan(
      1e-5,
    );
  });

  test("the bulb's pressure is γ p₀ A ξ / V at every instant", () => {
    for (const t of [0, 0.0007, 0.0013, 0.0041]) {
      const p = must(
        H.plugState(FLASK, state, { frequency: f0 * 1.03, drivePressure: 0.8, time: t }),
      );
      const expected = (H.AIR_GAMMA * H.STANDARD_PRESSURE * A * p.displacement) / V;
      expect(Math.abs(p.bulbPressure - expected)).toBeLessThan(1e-12);
    }
  });

  test("its velocity is the time derivative of its displacement", () => {
    const drive = { frequency: f0, drivePressure: 0.5 };
    const dt = 1e-8;
    const a = must(H.plugState(FLASK, state, { ...drive, time: 0.002 - dt }));
    const b = must(H.plugState(FLASK, state, { ...drive, time: 0.002 + dt }));
    const v = must(H.plugState(FLASK, state, { ...drive, time: 0.002 })).velocity;
    expect(rel((b.displacement - a.displacement) / (2 * dt), v)).toBeLessThan(1e-5);
  });
});

describe("water level in the round bulb", () => {
  const R = must(H.bulbRadius(FLASK));

  test("half the bulb fills to the equator and a full one to the top", () => {
    expect(rel(must(H.waterDepth(FLASK, FLASK.bulbVolume / 2)), R)).toBeLessThan(1e-12);
    expect(rel(must(H.waterDepth(FLASK, FLASK.bulbVolume)), 2 * R)).toBeLessThan(1e-12);
    expect(must(H.waterDepth(FLASK, 0))).toBe(0);
  });

  test("the cap holds the water poured in", () => {
    for (const w of [20, 137, 300, 505]) {
      const h = must(H.waterDepth(FLASK, w * 1e-6));
      expect(rel((Math.PI * h * h * (3 * R - h)) / 3, w * 1e-6)).toBeLessThan(1e-12);
    }
  });
});

describe("agrees with the independent lumped mass-spring model", () => {
  test("at every fixture case", () => {
    expect(fixture.cases.length).toBe(72);
    for (const c of fixture.cases) {
      const flask = {
        bulbVolume: c.bulbVolume,
        neckRadius: c.neckRadius,
        neckLength: c.neckLength,
        q: c.q,
      };
      const state = { waterVolume: c.waterVolume, temperatureC: c.temperatureC };
      expect(rel(must(H.resonantFrequency(flask, state)), c.frequency)).toBeLessThan(1e-12);
      const depth = must(H.waterDepth(flask, c.waterVolume));
      expect(Math.abs(depth - c.waterDepth)).toBeLessThan(1e-12);
      for (const d of c.drive) {
        expect(Math.abs(must(H.loudness(flask, state, d.frequency)) - d.loudness)).toBeLessThan(
          1e-12,
        );
        const p = must(
          H.plugState(flask, state, { frequency: d.frequency, drivePressure: 0.5, time: 0 }),
        );
        expect(rel(p.displacementAmplitude, d.displacementAmplitude)).toBeLessThan(1e-10);
        expect(rel(p.pressureAmplitude, d.pressureAmplitude)).toBeLessThan(1e-10);
        expect(Math.abs(p.lag - d.lag)).toBeLessThan(1e-12);
      }
    }
  });
});

describe("inputs outside the physical range give no result", () => {
  test.each([
    ["water fills the bulb", FLASK, { waterVolume: FLASK.bulbVolume, temperatureC: 28 }],
    ["negative water", FLASK, at(-1)],
    ["below absolute zero", FLASK, at(0, -274)],
    ["no temperature", FLASK, { waterVolume: 0, temperatureC: Number.NaN }],
    ["no neck", { ...FLASK, neckRadius: 0 }, at(0)],
    ["no bulb", { ...FLASK, bulbVolume: -1e-6 }, at(0)],
    ["no quality factor", { ...FLASK, q: 0 }, at(0)],
  ])("%s", (_name, flask, state) => {
    expect(H.resonantFrequency(flask, state)).toBeNull();
    expect(H.loudness(flask, state, 200)).toBeNull();
    expect(H.plugState(flask, state, { frequency: 200, drivePressure: 1, time: 0 })).toBeNull();
  });

  test("a frequency of zero has no loudness and no plug motion", () => {
    expect(H.loudness(FLASK, at(0), 0)).toBeNull();
    expect(H.plugState(FLASK, at(0), { frequency: 0, drivePressure: 1, time: 0 })).toBeNull();
    expect(H.waterFromFrequency(FLASK, 28, 0)).toBeNull();
  });

  test("never NaN for any input", () => {
    fc.assert(
      fc.property(fc.double(), fc.double(), fc.double(), fc.double(), (water, temp, freq, time) => {
        const state = { waterVolume: water, temperatureC: temp };
        const values = [
          H.resonantFrequency(FLASK, state),
          H.loudness(FLASK, state, freq),
          H.waterDepth(FLASK, water),
          H.waterFromFrequency(FLASK, temp, freq),
          ...Object.values(
            H.plugState(FLASK, state, { frequency: freq, drivePressure: 1, time }) ?? {},
          ),
        ];
        return values.every((v) => v === null || Number.isFinite(v));
      }),
    );
  });
});
