import { describe, expect, test } from "bun:test";
import fixtures from "../../../validation/fixtures/sonometer.json";
import {
  antinodePositions,
  drivenDisplacement,
  drivenPhase,
  drivenResponse,
  forkAmplitude,
  harmonicFrequency,
  harmonicWavelength,
  linearDensity,
  modeDisplacement,
  nodePositions,
  resonanceBand,
  resonantLength,
  riderExcitation,
  riderThrown,
  SONOMETER_WIRES,
  sonometer,
  sonometerWireById,
  STANDARD_GRAVITY,
  tensionFromLoad,
  waveSpeed,
  wireLinearDensity,
} from "../src";

const rel = (a: number, b: number) => Math.abs(a - b) / Math.abs(b);
const must = <T>(x: T | undefined): T => {
  if (x === undefined) throw new Error("expected a result");
  return x;
};

describe("level 1: model against the analytic results", () => {
  test("a 30 SWG steel wire has μ ≈ 0.61 g m⁻¹", () => {
    const mu = wireLinearDensity(must(sonometerWireById("steel-30")));
    expect(mu).toBeCloseTo((7850 * Math.PI * (0.0124 * 0.0254) ** 2) / 4, 15);
    expect(mu * 1000).toBeCloseTo(0.6118, 3);
  });

  test("thinner gauges are lighter, 28 to 32 SWG", () => {
    const mus = SONOMETER_WIRES.map(wireLinearDensity);
    for (let i = 1; i < mus.length; i++) expect(mus[i]!).toBeLessThan(mus[i - 1]!);
  });

  test("tension is M g less the pulley's loss", () => {
    expect(tensionFromLoad(2, 9.81)).toBeCloseTo(19.62, 12);
    expect(tensionFromLoad(2, 9.81, 0.005)).toBeCloseTo(19.62 * 0.995, 12);
    expect(tensionFromLoad(1)).toBe(STANDARD_GRAVITY);
  });

  test("a worked example: 2.5 kg on 30 SWG over 0.40 m sounds about 252 Hz", () => {
    const mu = wireLinearDensity(must(sonometerWireById("steel-30")));
    const r = must(sonometer({ mu, load: 2.5, length: 0.4, g: 9.81 }));
    expect(r.tension).toBeCloseTo(24.525, 10);
    expect(r.speed).toBeCloseTo(Math.sqrt(24.525 / mu), 10);
    expect(r.frequency).toBeCloseTo(r.speed / 0.8, 10);
    expect(r.frequency).toBeGreaterThan(250);
    expect(r.frequency).toBeLessThan(254);
    expect(r.wavelength).toBe(0.8);
  });

  test("harmonics are whole multiples of the fundamental; λₙ = 2l / n", () => {
    const f1 = must(harmonicFrequency(1, 0.5, 200));
    expect(f1).toBe(200);
    for (const n of [2, 3, 4, 7]) {
      expect(must(harmonicFrequency(n, 0.5, 200))).toBeCloseTo(n * f1, 9);
      expect(must(harmonicWavelength(n, 0.5)) * must(harmonicFrequency(n, 0.5, 200))).toBeCloseTo(
        200,
        9,
      );
    }
  });

  test("resonant length inverts the harmonic frequency", () => {
    const l = must(resonantLength(256, 200, 2));
    expect(must(harmonicFrequency(2, l, 200))).toBeCloseTo(256, 9);
  });

  test("the mode has nodes at kl/n and antinodes halfway between", () => {
    const n = 3;
    const l = 0.6;
    for (const x of must(nodePositions(n, l))) {
      expect(Math.abs(must(modeDisplacement(n, x, 0.0001, l, 200, 0.002)))).toBeLessThan(1e-15);
    }
    for (const x of must(antinodePositions(n, l))) {
      expect(Math.abs(must(modeDisplacement(n, x, 0, l, 200, 0.002)))).toBeCloseTo(0.002, 15);
    }
  });

  test("the mode repeats every period 1 / fₙ", () => {
    const f2 = must(harmonicFrequency(2, 0.6, 200));
    const a = must(modeDisplacement(2, 0.11, 0.00037, 0.6, 200, 0.002));
    const b = must(modeDisplacement(2, 0.11, 0.00037 + 1 / f2, 0.6, 200, 0.002));
    expect(b).toBeCloseTo(a, 15);
  });

  test("the driven response peaks near Q at resonance, a quarter turn behind", () => {
    expect(must(drivenResponse(256, 256, 170))).toBeCloseTo(170, 9);
    expect(must(drivenPhase(256, 256, 170))).toBeCloseTo(Math.PI / 2, 12);
    expect(must(drivenResponse(1e-6, 256, 170))).toBeCloseTo(1, 9);
    expect(must(drivenPhase(1e4, 256, 170))).toBeGreaterThan(3.1);
  });

  test("a centred rider is thrown at the resonant length, not 1 % away", () => {
    const v = 200;
    const l0 = must(resonantLength(256, v));
    const d = { length: l0, speed: v, frequency: 256, q: 170 };
    expect(riderThrown(d, 0.5)).toBe(true);
    expect(riderThrown({ ...d, length: l0 * 1.01 }, 0.5)).toBe(false);
    expect(riderThrown({ ...d, length: l0 * 0.99 }, 0.5)).toBe(false);
  });

  test("a rider at a node of the resonating mode stays put", () => {
    const v = 200;
    // Second harmonic resonant: the middle of the wire is a node.
    const l = must(resonantLength(256, v, 2));
    const d = { length: l, speed: v, frequency: 256, q: 170 };
    expect(riderThrown(d, 0.5)).toBe(false);
    expect(riderThrown(d, 0.25)).toBe(true);
  });

  test("the resonance band brackets the resonant length and narrows as Q rises", () => {
    const l0 = must(resonantLength(256, 200));
    const [lo, hi] = must(resonanceBand(256, 200, 140));
    expect(lo).toBeLessThan(l0);
    expect(hi).toBeGreaterThan(l0);
    const [lo2, hi2] = must(resonanceBand(256, 200, 200));
    expect(hi2 - lo2).toBeLessThan(hi - lo);
    // Its edges are exactly where the centred rider's excitation reaches 1.
    for (const edge of [lo, hi]) {
      const e = must(riderExcitation({ length: edge, speed: 200, frequency: 256, q: 140 }, 0.5));
      expect(e).toBeCloseTo(1, 9);
    }
  });

  test("a weak strike throws no rider at any length", () => {
    expect(resonanceBand(256, 200, 170, 0.4)).toBeUndefined();
  });

  test("a fork struck on the pad decays from 1 with its time constant", () => {
    expect(forkAmplitude(0, 4)).toBe(1);
    expect(must(forkAmplitude(4, 4))).toBeCloseTo(Math.exp(-1), 15);
    expect(must(forkAmplitude(1, 4, false))).toBeLessThan(must(forkAmplitude(1, 4)));
    expect(forkAmplitude(-1, 4)).toBe(0);
  });
});

describe("level 2: agrees with the independent Python model", () => {
  test("wires: μ from diameter and density", () => {
    expect(fixtures.wires.length).toBe(5);
    for (const w of fixtures.wires) {
      const ours = must(SONOMETER_WIRES.find((x) => x.swg === w.swg));
      expect(rel(ours.diameter, w.diameter)).toBeLessThan(1e-15);
      expect(rel(must(linearDensity(w.diameter, w.density)), w.mu)).toBeLessThan(1e-14);
      expect(rel(wireLinearDensity(ours), w.mu)).toBeLessThan(1e-14);
    }
  });

  test("set-ups: T, v, and fₙ against the string's eigenfrequencies", () => {
    expect(fixtures.setups.length).toBeGreaterThan(30);
    for (const s of fixtures.setups) {
      for (const h of s.harmonics) {
        const r = must(sonometer({ ...s, harmonic: h.n }));
        expect(rel(r.tension, s.tension)).toBeLessThan(1e-14);
        expect(rel(r.speed, s.speed)).toBeLessThan(1e-14);
        // The eigenvalue solver is accurate to about 1e-10 after extrapolation.
        expect(rel(r.frequency, h.frequency)).toBeLessThan(1e-8);
        expect(rel(r.wavelength, h.wavelength)).toBeLessThan(1e-15);
      }
    }
  });

  test("driven response and phase", () => {
    for (const c of fixtures.responses) {
      expect(rel(must(drivenResponse(c.drive, c.natural, c.q)), c.response)).toBeLessThan(1e-12);
      expect(Math.abs(must(drivenPhase(c.drive, c.natural, c.q)) - c.phase)).toBeLessThan(1e-12);
    }
  });

  test("mode displacement", () => {
    for (const c of fixtures.modes) {
      const y = must(modeDisplacement(c.n, c.x, c.t, c.length, c.speed, c.amplitude));
      expect(Math.abs(y - c.displacement)).toBeLessThan(1e-15);
    }
  });

  test("driven displacement, summed over four modes", () => {
    for (const c of fixtures.driven) {
      const y = must(drivenDisplacement(c, c.x, c.t, c.drive));
      expect(Math.abs(y - c.displacement)).toBeLessThan(
        1e-12 * Math.max(1e-5, Math.abs(c.displacement)) + 1e-18,
      );
    }
  });

  test("rider excitation", () => {
    for (const c of fixtures.riders) {
      const e = must(riderExcitation(c, c.riderAt, c.strength));
      expect(rel(e, c.excitation)).toBeLessThan(1e-12);
    }
  });

  test("resonance bands, closed form against root-finding", () => {
    expect(fixtures.bands.some((b) => b.band === null)).toBe(true);
    for (const c of fixtures.bands) {
      const ours = resonanceBand(c.frequency, c.speed, c.q, c.strength, c.n);
      if (c.band === null) {
        expect(ours).toBeUndefined();
      } else {
        const [lo, hi] = must(ours);
        expect(rel(lo, c.band[0]!)).toBeLessThan(1e-10);
        expect(rel(hi, c.band[1]!)).toBeLessThan(1e-10);
      }
    }
  });
});

describe("inputs outside the physical range give no result", () => {
  test.each([
    ["no wire", () => linearDensity(0, 7850)],
    ["negative density", () => linearDensity(3e-4, -1)],
    ["no load", () => tensionFromLoad(0)],
    ["NaN load", () => tensionFromLoad(Number.NaN)],
    ["the pulley takes it all", () => tensionFromLoad(1, 9.81, 1)],
    ["negative loss", () => tensionFromLoad(1, 9.81, -0.1)],
    ["slack wire", () => waveSpeed(0, 6e-4)],
    ["infinite tension", () => waveSpeed(Infinity, 6e-4)],
    ["harmonic 0", () => harmonicFrequency(0, 0.5, 200)],
    ["harmonic 1.5", () => harmonicFrequency(1.5, 0.5, 200)],
    ["no length", () => harmonicWavelength(1, 0)],
    ["no frequency", () => resonantLength(0, 200)],
    ["negative amplitude", () => modeDisplacement(1, 0.1, 0, 0.5, 200, -1)],
    ["no Q", () => drivenResponse(256, 256, 0)],
    [
      "rider off the wire",
      () => riderExcitation({ length: 0.4, speed: 200, frequency: 256, q: 170 }, 1.2),
    ],
    [
      "no modes",
      () => riderExcitation({ length: 0.4, speed: 200, frequency: 256, q: 170, modes: 0 }, 0.5),
    ],
    ["no time constant", () => forkAmplitude(1, 0)],
    ["a set-up with no load", () => sonometer({ mu: 6e-4, load: 0, length: 0.4 })],
  ])("%s", (_name, f) => {
    expect(f()).toBeUndefined();
  });

  test("outside the bridges the wire does not move", () => {
    expect(modeDisplacement(1, 0, 0, 0.5, 200, 1)).toBe(0);
    expect(modeDisplacement(1, 0.7, 0, 0.5, 200, 1)).toBe(0);
  });
});
