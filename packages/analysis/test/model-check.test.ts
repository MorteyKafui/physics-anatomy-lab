import { describe, expect, test } from "bun:test";

import fixtures from "../../../validation/fixtures/model-check.json";
import {
  combineSpreads,
  fitLine,
  leastCountSpread,
  modelCheck,
  MODEL_CHECK_FACTOR,
  type ModelCheckInput,
  xIntercept,
} from "../src";

const close = (a: number, b: number, rel = 1e-9) =>
  Math.abs(a - b) <= rel * Math.max(1, Math.abs(b));

type Case = (typeof fixtures.cases)[number] & { modelSlope?: number };

describe("the model check agrees with NumPy (validation/fixtures/model-check.json)", () => {
  expect(fixtures.factor).toBe(MODEL_CHECK_FACTOR);
  expect(fixtures.cases.length).toBeGreaterThanOrEqual(10);

  for (const c of fixtures.cases as Case[]) {
    test(c.name, () => {
      const input: ModelCheckInput = {
        points: c.x.map((x, i) => ({ x, y: c.y[i]! })),
        model: c.model,
        carefulSpread: c.careful,
        curve: c.curve,
        ...(c.modelSlope !== undefined ? { modelSlope: c.modelSlope } : {}),
      };
      const got = modelCheck(input);
      if (c.check === null) {
        expect(got).toBeUndefined();
        return;
      }
      const want = c.check as {
        n: number;
        shift: { value: number; error: number; errors: number; found: boolean };
        spread: { value: number; careful: number; ratio: number; found: boolean };
        tilt?: { value: number; model: number; error: number; errors: number; found: boolean };
      };
      expect(got).toBeDefined();
      expect(got!.n).toBe(want.n);
      for (const part of ["shift", "spread", "tilt"] as const) {
        const w = want[part];
        const g = got![part];
        if (!w) {
          expect(g).toBeUndefined();
          continue;
        }
        expect(g).toBeDefined();
        for (const [key, value] of Object.entries(w)) {
          const v = (g as unknown as Record<string, number | boolean>)[key];
          if (typeof value === "boolean") expect(v).toBe(value);
          else expect(close(v as number, value)).toBe(true);
        }
      }
    });
  }
});

/** A small seeded generator for the tests (mulberry32) and a normal draw from it. */
function rng(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return () => Math.sqrt(-2 * Math.log(1 - next())) * Math.cos(2 * Math.PI * next());
}

describe("the verdict over many runs", () => {
  const xs = [0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
  const k = 4.024;
  const line = xs.map((x) => k * x);
  const careful = 0.012;
  const runs = (offset: number, sd: number, scale = 1, n = 2000, seed = 1) => {
    const normal = rng(seed);
    const found = { shift: 0, tilt: 0, spread: 0 };
    for (let i = 0; i < n; i++) {
      const points = xs.map((x, j) => ({ x, y: scale * line[j]! + offset + sd * normal() }));
      const c = modelCheck({ points, model: line, modelSlope: k, carefulSpread: careful })!;
      found.shift += Number(c.shift.found);
      found.tilt += Number(c.tilt!.found);
      found.spread += Number(c.spread.found);
    }
    return { shift: found.shift / n, tilt: found.tilt / n, spread: found.spread / n };
  };

  test("careful runs are rarely found out", () => {
    const r = runs(0, careful);
    expect(r.shift).toBeLessThan(0.05);
    expect(r.tilt).toBeLessThan(0.05);
    expect(r.spread).toBeLessThan(0.01);
  });

  test("a 1 cm end correction is found as a shift nearly every time, and nothing else", () => {
    const r = runs(k * 0.01, careful);
    expect(r.shift).toBeGreaterThan(0.95);
    expect(r.tilt).toBeLessThan(0.05);
    expect(r.spread).toBeLessThan(0.01);
  });

  test("five times the careful spread is found as a scatter nearly every time", () => {
    const r = runs(0, 5 * careful);
    expect(r.spread).toBeGreaterThan(0.95);
  });

  test("points on the model are never found out", () => {
    const c = modelCheck({
      points: xs.map((x, i) => ({ x, y: line[i]! })),
      model: line,
      modelSlope: k,
      carefulSpread: careful,
    })!;
    expect([c.shift.found, c.tilt!.found, c.spread.found]).toEqual([false, false, false]);
  });

  test("a careful spread must be above zero", () => {
    const points = xs.map((x, i) => ({ x, y: line[i]! }));
    expect(() => modelCheck({ points, model: line, carefulSpread: 0 })).toThrow(RangeError);
  });

  test("the spread of a least count, and spreads combined", () => {
    expect(leastCountSpread(0.01)).toBeCloseTo(0.01 / Math.sqrt(12), 15);
    expect(combineSpreads(3, 4)).toBe(5);
  });
});

describe("where a line meets the x axis agrees with NumPy's covariance", () => {
  for (const c of fixtures.xIntercepts) {
    test(c.name, () => {
      const got = xIntercept(fitLine(c.x.map((x, i) => ({ x, y: c.y[i]! }))));
      expect(close(got.value, c.xIntercept.value)).toBe(true);
      expect(close(got.error, c.xIntercept.error)).toBe(true);
    });
  }
  test("a flat line never meets it", () => {
    const flat = fitLine([
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ]);
    expect(() => xIntercept(flat)).toThrow(RangeError);
  });
});
