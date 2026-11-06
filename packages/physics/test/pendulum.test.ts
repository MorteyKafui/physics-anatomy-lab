import { describe, expect, test } from "bun:test";
import fixtures from "../../../validation/fixtures/pendulum.json";
import { fitLine, gFromPeriod, gFromSlope, periodExact, periodSmallAngle, recordedPeriod } from "../src";

const deg = (d: number) => (d * Math.PI) / 180;
const rel = (a: number, b: number) => Math.abs(a - b) / Math.abs(b);

describe("level 1: model against the analytic results", () => {
  test("at small angles the exact period matches 2π√(l/g) within 0.1%", () => {
    for (const a of [0, 1, 2, 5]) {
      const p = { length: 0.8, g: 9.81, amplitude: deg(a) };
      expect(rel(periodExact(p), periodSmallAngle(p))).toBeLessThan(0.001);
    }
  });

  test("agrees with the independent SciPy elliptic-integral model at every fixture", () => {
    expect(fixtures.cases.length).toBeGreaterThan(10);
    for (const c of fixtures.cases) {
      const T = periodExact({ length: c.length, g: c.g, amplitude: c.amplitude });
      expect(rel(T, c.period)).toBeLessThan(1e-12);
    }
  });

  test("at 30° the period is about 1.74% longer than the small-angle value", () => {
    const p = { length: 1, g: 9.81, amplitude: deg(30) };
    expect(periodExact(p) / periodSmallAngle(p)).toBeCloseTo(1.0174088, 7);
  });
});

describe("level 3: scripted students", () => {
  const truth = { length: 0.8, g: 9.81, amplitude: deg(5) };
  const T = periodExact(truth);

  test("a careful student who counts from zero recovers g within 0.1%", () => {
    const g = gFromPeriod(truth.length, recordedPeriod(T, 20, 0));
    expect(rel(g, truth.g)).toBeLessThan(0.001);
  });

  test("counting from one raises g by about 11%", () => {
    const g = gFromPeriod(truth.length, recordedPeriod(T, 20, 1));
    expect(g / truth.g).toBeGreaterThan(1.1);
    expect(g / truth.g).toBeLessThan(1.12);
  });
});

describe("the worked example in the approved mockups", () => {
  // Table board: means of two timings of 20 swings at five lengths.
  const rows: Array<[number, number]> = [
    [1.0, 40.1],
    [0.9, 38.1],
    [0.8, 35.9],
    [0.7, 33.5],
    [0.6, 31.1],
  ];

  test("the slope triangle ABC gives 4.03 s² m⁻¹ and g = 9.80 m s⁻²", () => {
    const slope = (3.944 - 2.494) / (0.98 - 0.62);
    expect(slope).toBeCloseTo(4.03, 2);
    expect(gFromSlope(4.03)).toBeCloseTo(9.80, 2);
  });

  test("a least-squares fit of T² against l passes close to the origin", () => {
    const fit = fitLine(rows.map(([l, t]) => [l, (t / 20) ** 2] as const));
    expect(fit.r2).toBeGreaterThan(0.999);
    expect(Math.abs(fit.intercept)).toBeLessThan(0.05);
    expect(gFromSlope(fit.slope)).toBeGreaterThan(9.7);
    expect(gFromSlope(fit.slope)).toBeLessThan(9.9);
  });
});

describe("inputs outside the physical range are refused", () => {
  test.each([
    [{ length: 0, g: 9.81 }],
    [{ length: -1, g: 9.81 }],
    [{ length: 1, g: 0 }],
    [{ length: 1, g: 9.81, amplitude: Math.PI }],
    [{ length: Number.NaN, g: 9.81 }],
  ])("%o", (p) => {
    expect(() => periodExact(p)).toThrow(RangeError);
  });

  test("recordedPeriod needs at least two swings", () => {
    expect(() => recordedPeriod(1.8, 1, 0)).toThrow(RangeError);
  });
});
