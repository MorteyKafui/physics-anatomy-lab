import { describe, expect, test } from "bun:test";
import fc from "fast-check";

import {
  actualConditions,
  ANTICIPATED_EVENT,
  classifySlip,
  createRng,
  DEFAULT_ENVIRONMENT,
  gaussian,
  handTimedInterval,
  METRE_RULE,
  parallaxShift,
  quantise,
  STOPWATCH,
  substream,
  takeReading,
  withTolerance,
} from "../src";

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const sd = (xs: number[]) => {
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
};

describe("seeded world", () => {
  test("the same seed builds the same apparatus", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 2 ** 32 - 1 }), (seed) => {
        const a = Array.from({ length: 5 }, createRng(seed));
        const b = Array.from({ length: 5 }, createRng(seed));
        return a.every((v, i) => v === b[i]);
      }),
    );
  });

  test("every draw is in [0, 1)", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 2 ** 32 - 1 }), (seed) => {
        const rng = createRng(seed);
        return Array.from({ length: 50 }, rng).every((v) => v >= 0 && v < 1);
      }),
    );
  });

  test("named substreams are reproducible and independent", () => {
    expect(substream(7, "bob")()).toBe(substream(7, "bob")());
    expect(substream(7, "bob")()).not.toBe(substream(7, "stopwatch")());
  });

  test("a part is never outside its stated tolerance", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 2 ** 32 - 1 }),
        fc.double({ min: 0.001, max: 0.2, noNaN: true }),
        (seed, tolerance) => {
          const v = withTolerance(createRng(seed), 100, tolerance);
          return v >= 100 * (1 - tolerance) - 1e-9 && v <= 100 * (1 + tolerance) + 1e-9;
        },
      ),
    );
  });

  test("the Gaussian has the asked-for mean and spread", () => {
    const rng = createRng(2026);
    const xs = Array.from({ length: 20_000 }, () => gaussian(rng, 5, 2));
    expect(mean(xs)).toBeCloseTo(5, 1);
    expect(sd(xs) / 2).toBeGreaterThan(0.97);
    expect(sd(xs) / 2).toBeLessThan(1.03);
  });

  test("the room drifts at most 1.5 °C and the mains stays within 0.2%", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 2 ** 32 - 1 }), (seed) => {
        const c = actualConditions(DEFAULT_ENVIRONMENT, seed);
        return (
          Math.abs(c.temperatureC - 27) <= 1.5 &&
          Math.abs(c.mainsHz - 50) <= 50 * 0.002 + 1e-9 &&
          c.g === 9.81
        );
      }),
    );
  });
});

describe("readings", () => {
  test("parallax is height × tan(angle)", () => {
    expect(parallaxShift(0.4, 0)).toBe(0);
    expect(parallaxShift(0.4, 45)).toBeCloseTo(0.4, 12);
    expect(parallaxShift(0.4, -30)).toBeCloseTo(-0.4 / Math.sqrt(3), 12);
  });

  test("reading square-on with a zeroed, noiseless rule shows the truth", () => {
    const r = takeReading(METRE_RULE, 54.3, { rng: createRng(1), zeroed: true, viewAngleDeg: 0 });
    expect(r.shown).toBe(54.3);
  });

  test("an un-zeroed instrument shows its zero error", () => {
    const spec = { ...METRE_RULE, zeroError: 0.2 };
    expect(takeReading(spec, 50, { rng: createRng(1) }).shown).toBeCloseTo(50.2, 12);
    expect(takeReading(spec, 50, { rng: createRng(1), zeroed: true }).shown).toBe(50);
  });

  test("quantise rounds to the nearest division without binary noise", () => {
    expect(quantise(54.3499, 0.1)).toBe(54.3);
    expect(String(quantise(0.1 + 0.2, 0.1))).toBe("0.3");
    expect(quantise(1.234, STOPWATCH.resolution)).toBe(1.23);
  });

  test("quantised values are always within half a division", () => {
    fc.assert(
      fc.property(fc.double({ min: -1000, max: 1000, noNaN: true }), (v) => {
        return Math.abs(quantise(v, 0.1) - v) <= 0.05 + 1e-9;
      }),
    );
  });

  test("names transcription slips", () => {
    expect(classifySlip(45.3, 54.3, 0.1).kind).toBe("transposed-digits");
    expect(classifySlip(54.4, 54.3, 0.1).kind).toBe("one-division");
    expect(classifySlip(54.3, 54.3, 0.1).kind).toBe("none");
    expect(classifySlip(60.0, 54.3, 0.1).kind).toBe("misread");
  });
});

describe("hand timing", () => {
  const rng = createRng(20);
  const T = 1.795;
  const errors = Array.from(
    { length: 20_000 },
    () => handTimedInterval(rng, T, ANTICIPATED_EVENT) - T,
  );

  test("is unbiased: the start and stop delays cancel on average", () => {
    expect(Math.abs(mean(errors))).toBeLessThan(0.002);
  });

  test("spreads by √2 × the spread of one press", () => {
    const expected = Math.SQRT2 * ANTICIPATED_EVENT.delaySd;
    expect(sd(errors) / expected).toBeGreaterThan(0.97);
    expect(sd(errors) / expected).toBeLessThan(1.03);
  });

  test("timing 20 swings divides the error in one period by 20", () => {
    const r = createRng(21);
    const perPeriod = Array.from(
      { length: 20_000 },
      () => handTimedInterval(r, 20 * T, ANTICIPATED_EVENT) / 20 - T,
    );
    expect(sd(perPeriod) / (sd(errors) / 20)).toBeGreaterThan(0.95);
    expect(sd(perPeriod) / (sd(errors) / 20)).toBeLessThan(1.05);
  });
});
