import { expect, test } from "bun:test";
import fc from "fast-check";
import {
  drivenResponse,
  harmonicFrequency,
  modeDisplacement,
  resonanceBand,
  resonantLength,
  riderExcitation,
  sonometer,
} from "../src";

const mu = fc.double({ min: 2e-4, max: 2e-3, noNaN: true });
const load = fc.double({ min: 0.1, max: 10, noNaN: true });
const length = fc.double({ min: 0.05, max: 1, noNaN: true });
const n = fc.integer({ min: 1, max: 8 });
const q = fc.double({ min: 5, max: 500, noNaN: true });
const anything = fc.double();

test("quadrupling the load doubles the frequency", () => {
  fc.assert(
    fc.property(mu, load, length, n, (m, M, l, h) => {
      const a = sonometer({ mu: m, load: M, length: l, harmonic: h })!;
      const b = sonometer({ mu: m, load: 4 * M, length: l, harmonic: h })!;
      return Math.abs(b.frequency / a.frequency - 2) < 1e-12;
    }),
  );
});

test("frequency times length is fixed for one wire and load (fₙ ∝ 1/l)", () => {
  fc.assert(
    fc.property(mu, load, length, length, n, (m, M, l1, l2, h) => {
      const a = sonometer({ mu: m, load: M, length: l1, harmonic: h })!;
      const b = sonometer({ mu: m, load: M, length: l2, harmonic: h })!;
      return Math.abs((a.frequency * l1) / (b.frequency * l2) - 1) < 1e-12;
    }),
  );
});

test("v = fₙ λₙ for every harmonic", () => {
  fc.assert(
    fc.property(mu, load, length, n, (m, M, l, h) => {
      const r = sonometer({ mu: m, load: M, length: l, harmonic: h })!;
      return Math.abs((r.frequency * r.wavelength) / r.speed - 1) < 1e-12;
    }),
  );
});

test("the standing wave never exceeds its amplitude", () => {
  fc.assert(
    fc.property(
      n,
      length,
      fc.double({ min: 0, max: 1, noNaN: true }),
      fc.double({ min: 0, max: 1, noNaN: true }),
      (h, l, s, t) => {
        const y = modeDisplacement(h, s * l, t, l, 200, 0.003)!;
        return Math.abs(y) <= 0.003 * (1 + 1e-12);
      },
    ),
  );
});

test("the driven response is largest at resonance", () => {
  fc.assert(
    fc.property(q, fc.double({ min: 0.5, max: 2, noNaN: true }), (Q, r) => {
      // The true peak sits at r = √(1 − 1/2Q²); away from it the response is smaller.
      const peak = drivenResponse(Math.sqrt(1 - 1 / (2 * Q * Q)) * 256, 256, Q)!;
      return drivenResponse(r * 256, 256, Q)! <= peak * (1 + 1e-12);
    }),
  );
});

test("every length inside the resonance band throws a centred rider", () => {
  fc.assert(
    fc.property(
      fc.double({ min: 100, max: 600, noNaN: true }),
      fc.double({ min: 100, max: 300, noNaN: true }),
      fc.double({ min: 0, max: 1, noNaN: true }),
      (f, v, s) => {
        const band = resonanceBand(f, v, 170)!;
        const l = band[0] + s * (band[1] - band[0]);
        return riderExcitation({ length: l, speed: v, frequency: f, q: 170 }, 0.5)! >= 1 - 1e-9;
      },
    ),
  );
});

test("resonant length and harmonic frequency are inverses", () => {
  fc.assert(
    fc.property(
      fc.double({ min: 50, max: 2000, noNaN: true }),
      fc.double({ min: 50, max: 500, noNaN: true }),
      n,
      (f, v, h) => {
        const l = resonantLength(f, v, h)!;
        return Math.abs(harmonicFrequency(h, l, v)! / f - 1) < 1e-12;
      },
    ),
  );
});

test("no input ever gives NaN: a number or no result", () => {
  fc.assert(
    fc.property(anything, anything, anything, fc.integer({ min: -2, max: 10 }), (m, M, l, h) => {
      const r = sonometer({ mu: m, load: M, length: l, harmonic: h });
      if (r === undefined) return true;
      expect(Object.values(r).every(Number.isFinite)).toBe(true);
      return true;
    }),
  );
});
