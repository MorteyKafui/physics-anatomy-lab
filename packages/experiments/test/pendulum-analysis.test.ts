import { describe, expect, test } from "bun:test";
import { fitLine, runRules, type SlopeTriangle } from "@pa/analysis";

import {
  ANALYSIS_RULES,
  benchPeriod,
  expectedAnswers,
  G_DIMS,
  gFromSlope,
  PENDULUM_PLOT,
  slopeOf,
} from "../src";

const units = { x: "m", y: "s²" };
// The Table mockup's triangle: A (0.62, 2.494) and B (0.98, 3.944).
const mockup: SlopeTriangle = { a: { x: 0.62, y: 2.494 }, b: { x: 0.98, y: 3.944 } };

describe("the slope and g", () => {
  test("the mockup's triangle gives its slope, 4.03 s² m⁻¹, and g = 9.80 m s⁻²", () => {
    const s = slopeOf(mockup, units)!;
    expect(s.rise).toBeCloseTo(1.45, 12);
    expect(s.run).toBeCloseTo(0.36, 12);
    expect(s.slope.value).toBeCloseTo(4.0278, 4);
    expect(s.slope.dims).toEqual([-1, 0, 2, 0, 0]);
    const g = gFromSlope(s.slope);
    expect(g.dims).toEqual(G_DIMS);
    expect(g.value).toBeCloseTo(9.8015, 3);
  });

  test("a slope worked in other units comes out the same in SI", () => {
    const inCm: SlopeTriangle = { a: { x: 62, y: 2.494 }, b: { x: 98, y: 3.944 } };
    expect(slopeOf(inCm, { x: "cm", y: "s²" })!.slope.value).toBeCloseTo(4.0278, 4);
  });

  test("the bench's own periods give back g, less the 8° amplitude effect (rule 1)", () => {
    const lengths = [0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
    const fit = fitLine(lengths.map((l) => ({ x: l, y: benchPeriod(9.81, l) ** 2 })));
    const g = gFromSlope({ value: fit.slope, dims: [-1, 0, 2, 0, 0] }).value;
    // At 8° the period is about 0.12% longer than 2π√(l/g), so g reads about 0.24% low.
    expect(g).toBeLessThan(9.81);
    expect(g).toBeGreaterThan(9.78);
  });
});

describe("checking the student's answers", () => {
  const check = (slope: { value: string; unit: string }, g?: { value: string; unit: string }) => {
    const answers = { slope, ...(g ? { g } : {}) };
    return runRules(ANALYSIS_RULES, {
      answers,
      expected: expectedAnswers(mockup, PENDULUM_PLOT, units, answers),
    }).map((f) => [f.rule, f.column]);
  };

  test("right answers, to 3 figures with their units, draw nothing", () => {
    expect(check({ value: "4.03", unit: "s² m⁻¹" }, { value: "9.80", unit: "m s⁻²" })).toEqual([]);
  });

  test("the catalogue's mistake: slope to 2 figures with no unit", () => {
    expect(check({ value: "4.0", unit: "" })).toEqual([
      ["analysis-unit", "slope"],
      ["analysis-sig-figs", "slope"],
    ]);
  });

  test("g is checked against the student's own slope: an error is carried forward", () => {
    // A slope worked wrongly as 3.50 is marked once; g = 4π² ⁄ 3.50 = 11.3 is then right.
    expect(check({ value: "3.50", unit: "s² m⁻¹" }, { value: "11.3", unit: "m s⁻²" })).toEqual([
      ["analysis-value", "slope"],
    ]);
  });

  test("a g in the wrong unit", () => {
    expect(check({ value: "4.03", unit: "s² m⁻¹" }, { value: "9.80", unit: "m s⁻¹" })).toEqual([
      ["analysis-unit", "g"],
    ]);
  });
});
