import { fillDerived, pointsFor, referenceLine, runRules, type TableDesign } from "@pa/analysis";
import { bestFocus } from "@pa/physics";
import { describe, expect, test } from "bun:test";

import {
  convergingLens,
  focalLengthFrom,
  LENS_ANALYSIS_RULES,
  LENS_GRAPH_RULES,
  LENS_PLOT,
  LENS_STANDARD_TABLE,
  LENS_TEMPLATES,
  lensExpected,
  lensReadingsIntoTable,
  lensWorld,
  xInterceptOf,
  yInterceptOf,
  type LensReading,
} from "../src";

const reading = (id: string, u: number, v: number): LensReading => ({
  id,
  u,
  v,
  blur: 0,
  sharpestAt: v / 100,
  s: v / 100,
  readFrom: "centre",
  viewAngleDeg: 0,
  offAxis: 0,
});

/** Lay readings into a table of the given columns, then work out 1/u and 1/v. */
function tabulate(columns: TableDesign["columns"], readings: LensReading[]): TableDesign {
  let n = 0;
  const cells = lensReadingsIntoTable({ columns, rows: [] }, readings, () => `row${++n}`);
  const rows = [...new Set(cells.map((c) => c.row))].map((id) => ({
    id,
    cells: Object.fromEntries(cells.filter((c) => c.row === id).map((c) => [c.column, c.value])),
  }));
  return fillDerived({ columns: [...columns], rows });
}

/** The thin-lens v for u, both cm. */
const thinV = (f: number, u: number) => (u * f) / (u - f);

describe("the lens table", () => {
  test("is u, v, 1/u and 1/v as the question asks, with 1/u and 1/v worked out in cm⁻¹", () => {
    expect(LENS_STANDARD_TABLE.map((c) => [c.symbol, c.unit])).toEqual([
      ["u", "cm"],
      ["v", "cm"],
      ["u⁻¹", "cm⁻¹"],
      ["v⁻¹", "cm⁻¹"],
    ]);
    const table = tabulate([...LENS_STANDARD_TABLE], [reading("r1", 20, 60)]);
    expect(table.rows[0]!.cells).toMatchObject({ u: "20.0", v: "60.0" });
    expect(Number(table.rows[0]!.cells.invU)).toBeCloseTo(0.05, 6);
    expect(Number(table.rows[0]!.cells.invV)).toBeCloseTo(1 / 60, 4);
  });

  test("lays two readings at one u into the repeat columns, in the order measured", () => {
    const cells = lensReadingsIntoTable(
      { columns: [...LENS_TEMPLATES["two-repeats"]], rows: [] },
      [reading("r1", 20, 57.1), reading("r2", 25, 42.0), reading("r3", 20, 57.4)],
      (() => {
        let n = 0;
        return () => `row${++n}`;
      })(),
    );
    const row1 = cells.filter((c) => c.row === "row1").map((c) => c.value);
    expect(row1).toEqual(["20.0", "57.1", "57.4"]);
    expect(cells.filter((c) => c.row === "row2").map((c) => c.value)).toEqual(["25.0", "42.0"]);
  });
});

describe("the graph", () => {
  test("is checked to be 1/v against 1/u, and v against u is caught", () => {
    expect(
      runRules(LENS_GRAPH_RULES, {
        columns: LENS_PLOT,
        symbols: { x: "u⁻¹", y: "v⁻¹" },
      }),
    ).toEqual([]);
    const wrong = runRules(LENS_GRAPH_RULES, {
      columns: { x: "u", y: "v" },
      symbols: { x: "u", y: "v" },
    });
    expect(wrong.map((f) => [f.rule, f.severity, f.skill])).toEqual([
      ["lens-wrong-graph", "error", "graph"],
    ]);
  });

  test("intercepts are where the line meets each axis", () => {
    const line = { from: { x: 0.02, y: 0.045 }, to: { x: 0.05, y: 0.015 } };
    expect(yInterceptOf(line)).toBeCloseTo(0.065, 12);
    expect(xInterceptOf(line)).toBeCloseTo(0.065, 12);
    expect(yInterceptOf({ from: { x: 1, y: 0 }, to: { x: 1, y: 2 } })).toBeUndefined();
    expect(xInterceptOf({ from: { x: 0, y: 1 }, to: { x: 2, y: 1 } })).toBeUndefined();
  });
});

describe("the analysis", () => {
  test("thin-lens readings give back f exactly: both intercepts are 1/f (analytic)", () => {
    const f = 15;
    const readings = convergingLens.objectDistances.map((u, i) =>
      reading(`r${i}`, u * 100, thinV(f, u * 100)),
    );
    // Unrounded, so the line is exact.
    const points = readings.map((r) => ({ x: 1 / r.u, y: 1 / r.v }));
    const line = referenceLine(points)!.line;
    const e = lensExpected(line, LENS_PLOT, { x: "cm⁻¹", y: "cm⁻¹" }, {});
    expect(e.m1!.value).toBeCloseTo(100 / f, 9);
    expect(e.m2!.value).toBeCloseTo(100 / f, 9);
    expect(e.f!.value).toBeCloseTo(f / 100, 9);
  });

  test("readings at the model's sharpest image give f from the graph 1.0% to 1.2% short (brief)", () => {
    for (const seed of [1, 2, 3, 424242]) {
      const world = lensWorld(seed);
      const readings = convergingLens.objectDistances.map((u, i) =>
        reading(`r${i}`, u * 100, Number((bestFocus(world.lens, u) * 100).toFixed(1))),
      );
      const table = tabulate([...LENS_STANDARD_TABLE], readings);
      const line = referenceLine(pointsFor(table, LENS_PLOT.x, LENS_PLOT.y))!.line;
      const f = lensExpected(line, LENS_PLOT, { x: "cm⁻¹", y: "cm⁻¹" }, {}).f!.value;
      const short = 1 - f / world.focalLength;
      expect(short).toBeGreaterThan(0.007);
      expect(short).toBeLessThan(0.015);
    }
  });

  test("f is worked from the intercepts the student wrote, so a slip is not marked twice", () => {
    const line = { from: { x: 0, y: 0.0667 }, to: { x: 0.0667, y: 0 } };
    const e = lensExpected(
      line,
      LENS_PLOT,
      { x: "cm⁻¹", y: "cm⁻¹" },
      { m1: { value: "0.0700", unit: "cm⁻¹" }, m2: { value: "0.0667", unit: "cm⁻¹" } },
    );
    expect(e.f!.value).toBeCloseTo(2 / (7 + 6.67), 9);
    const findings = runRules(LENS_ANALYSIS_RULES, {
      answers: {
        m1: { value: "0.0700", unit: "cm⁻¹" },
        m2: { value: "0.0667", unit: "cm⁻¹" },
        f: { value: "14.6", unit: "cm" },
      },
      expected: e,
    });
    expect(findings.filter((x) => x.column === "f")).toEqual([]);
    expect(findings.some((x) => x.column === "m1" && x.rule === "analysis-value")).toBe(true);
  });

  test("has nothing to expect from another graph, and no f with intercepts at or below zero", () => {
    const line = { from: { x: 20, y: 60 }, to: { x: 40, y: 26.7 } };
    expect(lensExpected(line, { x: "u", y: "v" }, { x: "cm", y: "cm" }, {})).toEqual({});
    expect(
      focalLengthFrom({ value: -1, dims: [-1, 0, 0, 0, 0] }, { value: 1, dims: [-1, 0, 0, 0, 0] }),
    ).toBeUndefined();
  });
});
