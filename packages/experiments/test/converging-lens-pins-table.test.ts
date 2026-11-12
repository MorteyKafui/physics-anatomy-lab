import { fillDerived, fitLine, pointsFor, runRules, type TableDesign } from "@pa/analysis";
import { describe, expect, test } from "bun:test";

import {
  lensPins,
  lensWorld,
  lineUpAt,
  PINS_ANALYSIS_RULES,
  PINS_GRAPH_RULES,
  PINS_PLOT,
  PINS_STANDARD_TABLE,
  PINS_TEMPLATES,
  pinsExpected,
  pinsReadingsIntoTable,
  type PinsReading,
} from "../src";

const reading = (id: string, x: number, y: number): PinsReading => ({
  id,
  x,
  y,
  s: y / 100,
  at: y / 100,
  atOnAxis: y / 100,
  left: 0,
  eye: 0,
  tipGap: 0,
  readFrom: "centre",
});

function tabulate(columns: TableDesign["columns"], readings: PinsReading[]): TableDesign {
  let n = 0;
  const cells = pinsReadingsIntoTable({ columns, rows: [] }, readings, () => `row${++n}`);
  const rows = [...new Set(cells.map((c) => c.row))].map((id) => ({
    id,
    cells: Object.fromEntries(cells.filter((c) => c.row === id).map((c) => [c.column, c.value])),
  }));
  return fillDerived({ columns: [...columns], rows });
}

/** A slope triangle on the best straight line through the points, spanning them. */
function triangleOn(points: { x: number; y: number }[]) {
  const fit = fitLine(points);
  const xs = points.map((p) => p.x);
  const a = Math.min(...xs);
  const b = Math.max(...xs);
  return {
    a: { x: a, y: fit.slope * a + fit.intercept },
    b: { x: b, y: fit.slope * b + fit.intercept },
    c: { x: b, y: fit.slope * a + fit.intercept },
  };
}

const thinY = (f: number, x: number) => (x * f) / (x - f);
const units = { x: "cm", y: "cm²" };

describe("the two-pin table", () => {
  test("is x, y, xy and (x + y) as the question asks, with xy in cm² and x + y in cm", () => {
    expect(PINS_STANDARD_TABLE.map((c) => [c.symbol, c.unit])).toEqual([
      ["x", "cm"],
      ["y", "cm"],
      ["xy", "cm²"],
      ["x + y", "cm"],
    ]);
    const table = tabulate([...PINS_STANDARD_TABLE], [reading("r1", 20, 60)]);
    expect(table.rows[0]!.cells).toMatchObject({ x: "20.0", y: "60.0" });
    expect(Number(table.rows[0]!.cells.xy)).toBeCloseTo(1200, 6);
    expect(Number(table.rows[0]!.cells.xPlusY)).toBeCloseTo(80, 6);
  });

  test("lays two readings at one x into the repeat columns, in the order measured", () => {
    let n = 0;
    const cells = pinsReadingsIntoTable(
      { columns: [...PINS_TEMPLATES["two-repeats"]], rows: [] },
      [reading("r1", 20, 59.4), reading("r2", 30, 30.1), reading("r3", 20, 59.6)],
      () => `row${++n}`,
    );
    expect(cells.filter((c) => c.row === "row1").map((c) => c.value)).toEqual([
      "20.0",
      "59.4",
      "59.6",
    ]);
  });
});

describe("the graph", () => {
  test("is checked to be xy against (x + y), and y against x is caught", () => {
    expect(
      runRules(PINS_GRAPH_RULES, { columns: PINS_PLOT, symbols: { x: "x + y", y: "xy" } }),
    ).toEqual([]);
    expect(
      runRules(PINS_GRAPH_RULES, { columns: { x: "x", y: "y" }, symbols: { x: "x", y: "y" } }).map(
        (f) => [f.rule, f.severity, f.skill],
      ),
    ).toEqual([["pins-wrong-graph", "error", "graph"]]);
  });
});

describe("the analysis", () => {
  test("thin-lens readings give a slope of f exactly (analytic: xy = f (x + y))", () => {
    const f = 15;
    const points = [20, 30, 40, 50].map((x) => {
      const y = thinY(f, x);
      return { x: x + y, y: x * y };
    });
    const e = pinsExpected(triangleOn(points), PINS_PLOT, units, {});
    // In SI: cm² over cm is cm, so 0.15 m.
    expect(e.slope!.value).toBeCloseTo(f / 100, 10);
    expect(e.f!.value).toBeCloseTo(f / 100, 10);
  });

  test("readings at the model's no-parallax places give f within 2% of the lens's own", () => {
    for (const seed of [1, 2, 3, 424242]) {
      const world = lensWorld(seed);
      const readings = lensPins.objectDistances.map((x, i) =>
        reading(`r${i}`, x * 100, Number((lineUpAt(world, x, 0) * 100).toFixed(1))),
      );
      const table = tabulate([...PINS_STANDARD_TABLE], readings);
      const points = pointsFor(table, PINS_PLOT.x, PINS_PLOT.y);
      const f = pinsExpected(triangleOn(points), PINS_PLOT, units, {}).f!.value;
      expect(Math.abs(f - world.focalLength) / world.focalLength).toBeLessThan(0.02);
    }
  });

  test("f is the slope the student wrote, so a slip in the slope is not marked twice", () => {
    const tri = { a: { x: 60, y: 900 }, b: { x: 80, y: 1200 }, c: { x: 80, y: 900 } };
    const answers = {
      slope: { value: "16.0", unit: "cm" },
      f: { value: "16.0", unit: "cm" },
    };
    const e = pinsExpected(tri, PINS_PLOT, units, answers);
    expect(e.slope!.value).toBeCloseTo(0.15, 12);
    expect(e.f!.value).toBeCloseTo(0.16, 12);
    const findings = runRules(PINS_ANALYSIS_RULES, { answers, expected: e });
    expect(findings.some((x) => x.column === "slope" && x.rule === "analysis-value")).toBe(true);
    expect(findings.filter((x) => x.column === "f")).toEqual([]);
  });

  test("gives the slope but no f for another graph", () => {
    const tri = { a: { x: 20, y: 60 }, b: { x: 50, y: 21.4 }, c: { x: 50, y: 60 } };
    const e = pinsExpected(tri, { x: "x", y: "y" }, { x: "cm", y: "cm" }, {});
    expect(e.slope).toBeDefined();
    expect(e.f).toBeUndefined();
  });
});
