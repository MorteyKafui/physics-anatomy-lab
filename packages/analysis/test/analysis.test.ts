import { describe, expect, test } from "bun:test";
import fc from "fast-check";

import fitFixtures from "../../../validation/fixtures/fit.json";
import sigfigFixtures from "../../../validation/fixtures/sigfigs.json";
import {
  decimalsForResolution,
  fitLine,
  fitThroughOrigin,
  formatSigFigs,
  fromSI,
  parseFigure,
  percentDifference,
  residuals,
  suspectedUnitSlip,
  toSI,
  toSigFigs,
  UNITS,
  type QuantityKind,
} from "../src";

/** Relative agreement, with an absolute floor for values that should be zero. */
const close = (a: number, b: number, rel = 1e-10) =>
  Math.abs(a - b) <= rel * Math.max(1, Math.abs(b));

describe("line fits agree with SciPy (validation/fixtures/fit.json)", () => {
  expect(fitFixtures.cases.length).toBeGreaterThanOrEqual(6);

  for (const c of fitFixtures.cases) {
    test(c.name, () => {
      const points = c.x.map((x, i) => ({ x, y: c.y[i]! }));
      const fit = fitLine(points);
      for (const key of [
        "slope",
        "intercept",
        "slopeError",
        "interceptError",
        "r2",
        "residualSd",
      ] as const) {
        expect({ key, ok: close(fit[key], c.line[key]) }).toEqual({ key, ok: true });
      }
      if ("throughOrigin" in c && c.throughOrigin) {
        const origin = fitThroughOrigin(points);
        expect(close(origin.slope, c.throughOrigin.slope)).toBe(true);
        expect(close(origin.slopeError, c.throughOrigin.slopeError)).toBe(true);
      }
    });
  }
});

describe("line fits: properties", () => {
  const pointsArb = fc
    .array(
      fc.record({
        // Readings, in steps of 0.1: realistic spreads, never two x values a denormal apart.
        x: fc.integer({ min: -1000, max: 1000 }).map((v) => v / 10),
        y: fc.double({ min: -100, max: 100, noNaN: true }),
      }),
      { minLength: 3, maxLength: 20 },
    )
    .filter((ps) => new Set(ps.map((p) => p.x)).size >= 2);

  test("the line passes through the centroid", () => {
    fc.assert(
      fc.property(pointsArb, (ps) => {
        const f = fitLine(ps);
        return close(f.slope * f.centroid.x + f.intercept, f.centroid.y, 1e-9);
      }),
    );
  });

  test("shifting every y by c shifts only the intercept", () => {
    fc.assert(
      fc.property(pointsArb, fc.double({ min: -50, max: 50, noNaN: true }), (ps, c) => {
        const a = fitLine(ps);
        const b = fitLine(ps.map((p) => ({ x: p.x, y: p.y + c })));
        return close(b.slope, a.slope, 1e-7) && close(b.intercept, a.intercept + c, 1e-7);
      }),
    );
  });

  test("r² is between 0 and 1", () => {
    fc.assert(
      fc.property(pointsArb, (ps) => {
        const { r2 } = fitLine(ps);
        return r2 >= -1e-12 && r2 <= 1 + 1e-12;
      }),
    );
  });

  test("refuses fits it cannot make", () => {
    expect(() => fitLine([{ x: 1, y: 1 }])).toThrow(RangeError);
    expect(() =>
      fitLine([
        { x: 1, y: 1 },
        { x: 1, y: 2 },
      ]),
    ).toThrow(RangeError);
    expect(() =>
      fitLine([
        { x: 1, y: Number.NaN },
        { x: 2, y: 2 },
      ]),
    ).toThrow(RangeError);
    expect(() => fitThroughOrigin([{ x: 0, y: 1 }])).toThrow(RangeError);
  });

  test("an outlier among 12 readings has a standardised residual above 2.5", () => {
    const xs = Array.from({ length: 12 }, (_, i) => i + 1);
    const ps = xs.map((x) => ({ x, y: 2 * x + (x === 6 ? 3 : 0.05 * (x % 2)) }));
    const r = residuals(ps, fitLine(ps));
    expect(Math.abs(r[5]!)).toBeGreaterThan(2.5);
  });

  test("with n readings no standardised residual can exceed √(n − 2)", () => {
    // The outlier counts in its own spread, so a single wild reading among 8 tops out near 2.45:
    // a fixed 2.5 cut-off never fires on a typical school table of 5 to 8 readings.
    fc.assert(
      fc.property(
        fc.integer({ min: 3, max: 12 }),
        fc.double({ min: 1, max: 1000, noNaN: true }),
        (n, jump) => {
          const ps = Array.from({ length: n }, (_, i) => ({ x: i, y: i === 1 ? jump : 0 }));
          const r = residuals(ps, fitLine(ps));
          return r.every((v) => Math.abs(v) <= Math.sqrt(n - 2) + 1e-9);
        },
      ),
    );
  });

  test("percent difference", () => {
    expect(percentDifference(9.7, 9.81)).toBeCloseTo(-1.1213, 4);
    expect(() => percentDifference(1, 0)).toThrow(RangeError);
  });
});

describe("significant figures agree with Python's decimal (validation/fixtures/sigfigs.json)", () => {
  for (const c of sigfigFixtures.parse) {
    test(`parse "${c.raw}"`, () => {
      const f = parseFigure(c.raw);
      expect(f).toEqual({
        value: c.value,
        sigFigs: c.sigFigs,
        decimals: c.decimals,
        ambiguousTrailingZeros: c.ambiguousTrailingZeros,
      });
    });
  }

  for (const c of sigfigFixtures.format) {
    test(`format ${c.value} to ${c.n} figures`, () => {
      expect(formatSigFigs(c.value, c.n)).toBe(c.text);
    });
  }
});

describe("significant figures", () => {
  test("rejects text", () => {
    expect(parseFigure("about 5")).toBeUndefined();
    expect(parseFigure("")).toBeUndefined();
    expect(parseFigure(".")).toBeUndefined();
  });

  test("rounding a value up to the next power of ten keeps the figure count", () => {
    expect(formatSigFigs(9.996, 3)).toBe("10.0");
    expect(formatSigFigs(0.09996, 3)).toBe("0.100");
    expect(formatSigFigs(99.96, 3)).toBe("100");
  });

  test("a formatted number reads back with the asked-for figures", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.001, max: 999, noNaN: true }),
        fc.integer({ min: 1, max: 6 }),
        (v, n) => {
          const f = parseFigure(formatSigFigs(v, n));
          return f !== undefined && (f.sigFigs === n || f.ambiguousTrailingZeros);
        },
      ),
    );
  });

  test("decimals match an instrument's resolution", () => {
    expect(decimalsForResolution(0.1)).toBe(1);
    expect(decimalsForResolution(0.01)).toBe(2);
    expect(decimalsForResolution(0.5)).toBe(1);
    expect(decimalsForResolution(1)).toBe(0);
    expect(toSigFigs(0.0045678, 3)).toBeCloseTo(0.00457, 12);
  });
});

describe("units", () => {
  test("converts to and from SI", () => {
    expect(toSI(54.3, "length", "cm")).toBeCloseTo(0.543, 12);
    expect(fromSI(0.543, "length", "mm")).toBeCloseTo(543, 9);
    expect(toSI(27, "temperature", "°C")).toBeCloseTo(300.15, 9);
    expect(toSI(2.2, "resistance", "kΩ")).toBe(2200);
    expect(toSI(4.2, "specific-heat-capacity", "J g⁻¹ K⁻¹")).toBe(4200);
  });

  test("a temperature rise is not offset like a temperature reading", () => {
    expect(toSI(15, "temperature-difference", "°C")).toBe(15);
    expect(toSI(15, "temperature", "°C")).toBeCloseTo(288.15, 9);
  });

  test("every unit round-trips through SI", () => {
    const pairs = (Object.keys(UNITS) as QuantityKind[]).flatMap((kind) =>
      UNITS[kind].map((u) => [kind, u.symbol] as const),
    );
    fc.assert(
      fc.property(
        fc.constantFrom(...pairs),
        fc.double({ min: -1e6, max: 1e6, noNaN: true }),
        ([kind, symbol], v) => close(fromSI(toSI(v, kind, symbol), kind, symbol), v, 1e-9),
      ),
    );
  });

  test("an unknown unit is refused", () => {
    expect(() => toSI(1, "length", "ft")).toThrow(RangeError);
  });

  test("spots a value recorded in the wrong unit, not a column's natural spread", () => {
    expect(suspectedUnitSlip(45.3, 0.5)).toBe(100);
    expect(suspectedUnitSlip(0.0453, 45)).toBe(1000);
    expect(suspectedUnitSlip(0.48, 0.5)).toBeUndefined();
    expect(suspectedUnitSlip(1.0, 0.6)).toBeUndefined();
  });
});

test("r² stays within 0 and 1 even when the values underflow (found by fast-check)", () => {
  const { r2 } = fitLine([
    { x: 0, y: 2.7435964668646077e-162 },
    { x: -50.5, y: 0 },
    { x: -43.9, y: 0 },
  ]);
  expect(r2).toBeGreaterThanOrEqual(0);
  expect(r2).toBeLessThanOrEqual(1);
});
