import { describe, expect, test } from "bun:test";

import fixtures from "../../../validation/fixtures/uncertainty.json";
import {
  checkQuote,
  parseFormula,
  quotedUncertainty,
  readingUncertainty,
  repeatsUncertainty,
  worstCase,
  worstLines,
} from "../src";

const close = (a: number, b: number, rel = 1e-9) =>
  Math.abs(a - b) <= rel * Math.max(1e-12, Math.abs(b));

describe("worst-case propagation agrees with SymPy (validation/fixtures/uncertainty.json)", () => {
  for (const c of fixtures.cases) {
    test(c.name, () => {
      const values = c.values as Record<string, number>;
      const parsed = parseFormula(c.formula, Object.keys(values));
      expect(parsed.ok).toBe(true);
      if (!parsed.ok) return;
      const got = worstCase(parsed.expr, values, c.uncertainties as Record<string, number>);
      expect(close(got, c.uncertainty)).toBe(true);
    });
  }
});

describe("an uncertainty as it is quoted agrees with the Python model", () => {
  for (const q of fixtures.quotes) {
    test(`± ${q.u}`, () => {
      const got = quotedUncertainty(q.u);
      expect(close(got.value, q.value)).toBe(true);
      expect(got.figures).toBe(q.figures as 1 | 2);
      expect(got.decimals).toBe(q.decimals);
    });
  }
});

describe("the worst lines agree with the Python model", () => {
  for (const l of fixtures.lines) {
    test(l.name, () => {
      const got = worstLines(l.x.map((x, i) => ({ x, y: l.y[i]!, dx: l.dx[i]!, dy: l.dy[i]! })));
      expect(close(got.steepest.slope, l.steepest)).toBe(true);
      expect(close(got.leastSteep.slope, l.leastSteep)).toBe(true);
      expect(close(got.half, l.half)).toBe(true);
    });
  }
});

describe("one reading, and repeats", () => {
  test("half the least count on a scale, the last digit on a display", () => {
    expect(readingUncertainty(0.1, "scale")).toBe(0.05);
    expect(readingUncertainty(0.01, "digital")).toBe(0.01);
  });
  test("half the range of repeats, never less than one reading", () => {
    expect(repeatsUncertainty([31.13, 31.03], 0.01)).toBeCloseTo(0.05, 12);
    expect(repeatsUncertainty([33.69, 33.69], 0.01)).toBe(0.01);
    expect(repeatsUncertainty([33.69], 0.1)).toBe(0.1);
  });
});

describe("a result quoted with its uncertainty", () => {
  test("the board's right answer passes every check, and agrees with 9.81", () => {
    expect(checkQuote({ value: "9.77", uncertainty: "0.08" }, 0.082, 9.81)).toEqual({
      uncertainty: true,
      figures: true,
      decimals: true,
      away: expect.closeTo(0.5, 9),
      agrees: true,
    });
  });
  test("± 0.5 is more than twice the slope's 0.08, and its decimals do not match", () => {
    const q = checkQuote({ value: "9.77", uncertainty: "0.5" }, 0.082);
    expect([q.uncertainty, q.figures, q.decimals]).toEqual([false, true, false]);
  });
  test("an uncertainty starting with 1 takes two figures", () => {
    expect(checkQuote({ value: "9.78", uncertainty: "0.14" }, 0.14).figures).toBe(true);
    expect(checkQuote({ value: "9.8", uncertainty: "0.1" }, 0.14).figures).toBe(false);
  });
});
